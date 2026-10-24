"""
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

"""Embedded LanceDB storage and exact cosine retrieval for the RAG system."""

import json
import logging
import ntpath
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import lancedb
import pyarrow as pa
from dotenv import load_dotenv
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

from backend.embeddings import (
    create_embeddings,
    get_embedding_dimensions,
    get_embedding_model_name,
)


load_dotenv(override=True)
logger = logging.getLogger(__name__)

DEFAULT_LANCEDB_PATH = "./lance_db"
COLLECTION_PREFIX = "rag_"


def get_lancedb_path() -> str:
    """Return the local directory containing all LanceDB tables."""
    return os.getenv("LANCEDB_PATH", DEFAULT_LANCEDB_PATH)


def _connect():
    """Open an embedded LanceDB connection; no server is required."""
    return lancedb.connect(get_lancedb_path())


def _list_table_names(database) -> List[str]:
    """List every table, following LanceDB's paginated list_tables API."""
    names: List[str] = []
    page_token: Optional[str] = None

    while True:
        response = database.list_tables(page_token=page_token, limit=1000)
        names.extend(response.tables)
        page_token = response.page_token
        if not page_token:
            return names


def _table_schema(embedding_dims: int) -> pa.Schema:
    """Build a schema that also supports collections with no documents."""
    return pa.schema([
        pa.field("id", pa.string(), nullable=False),
        pa.field("text", pa.string(), nullable=False),
        pa.field("source", pa.string(), nullable=False),
        pa.field("embedding", pa.list_(pa.float32(), embedding_dims), nullable=False),
        pa.field("metadata_json", pa.string(), nullable=False),
        pa.field("created_at", pa.string(), nullable=False),
    ])


def _as_float_list(vector) -> List[float]:
    """Convert numpy and other vector implementations to plain Python floats."""
    values = vector.tolist() if hasattr(vector, "tolist") else list(vector)
    return [float(value) for value in values]


def _sql_literal(value: str) -> str:
    """Quote a string for LanceDB's SQL-style filter expressions."""
    return "'" + value.replace("'", "''") + "'"


def _list_sources(table) -> List[str]:
    """Read unique source paths without loading an embedding model."""
    rows = (
        table.search()
        .select(["source"])
        .limit(None)
        .to_list()
    )
    return sorted({
        row["source"]
        for row in rows
        if row.get("source")
    })


class LanceDBRetriever(BaseRetriever):
    """Small LangChain retriever adapter around :class:`LanceStore`."""

    store: Any
    top_k: int = 4

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
    ) -> List[Document]:
        return self.store.similarity_search(query, top_k=self.top_k)


class LanceStore:
    """A collection-scoped LanceDB table with local persistent storage."""

    def __init__(self, table_name: str, embeddings=None):
        self.table_name = table_name
        self.embedding_model_name = get_embedding_model_name()

        if embeddings is not None:
            self.embeddings = embeddings
        else:
            self.embeddings = create_embeddings()

        self.embedding_dims = len(self.embeddings.embed_query("dimension probe"))
        self.database = _connect()
        self.table = self._create_or_open_table()

    def _create_or_open_table(self):
        """Create the table if needed and verify its vector dimensions."""
        if self.table_name not in _list_table_names(self.database):
            self.database.create_table(
                self.table_name,
                schema=_table_schema(self.embedding_dims),
            )

        table = self.database.open_table(self.table_name)
        vector_type = table.schema.field("embedding").type
        existing_dims = getattr(vector_type, "list_size", None)

        if existing_dims != self.embedding_dims:
            raise ValueError(
                f"Table '{self.table_name}' uses {existing_dims}-dim vectors, "
                f"but '{self.embedding_model_name}' produces "
                f"{self.embedding_dims}-dim vectors. Recreate the collection "
                "and re-ingest the original documents with a matching "
                "embedding model and dimension."
            )

        return table

    def add_documents(
        self,
        chunks: List[Document],
        progress_callback=None,
    ) -> int:
        """Embed and append document chunks to this collection."""
        if not chunks:
            return 0

        total_chunks = len(chunks)
        batch_size = 10000

        for start in range(0, total_chunks, batch_size):
            batch = chunks[start:start + batch_size]
            embeddings = self.embeddings.embed_documents(
                [chunk.page_content for chunk in batch]
            )
            created_at = datetime.now(timezone.utc).isoformat()
            rows = []

            for chunk, embedding in zip(batch, embeddings):
                vector = _as_float_list(embedding)
                if len(vector) != self.embedding_dims:
                    raise ValueError(
                        f"Expected {self.embedding_dims}-dim embeddings, "
                        f"received {len(vector)}."
                    )

                clean_metadata: Dict[str, Any] = {
                    key: value
                    for key, value in chunk.metadata.items()
                    if not (isinstance(value, str) and not value.strip())
                }
                rows.append({
                    "id": uuid.uuid4().hex,
                    "text": chunk.page_content,
                    "source": str(chunk.metadata.get("source") or ""),
                    "embedding": vector,
                    "metadata_json": json.dumps(
                        clean_metadata,
                        ensure_ascii=False,
                        default=str,
                    ),
                    "created_at": created_at,
                })

            self.table.add(rows)

            if progress_callback:
                progress_callback((start + len(batch)) / total_chunks)

        return total_chunks

    def similarity_search(self, query: str, top_k: int = 4) -> List[Document]:
        """Return exact cosine nearest neighbours for a text query."""
        if top_k <= 0:
            return []

        query_embedding = _as_float_list(self.embeddings.embed_query(query))
        rows = (
            self.table.search(
                query_embedding,
                vector_column_name="embedding",
            )
            .distance_type("cosine")
            .bypass_vector_index()
            .select([
                "id",
                "text",
                "source",
                "metadata_json",
                "created_at",
                "_distance",
            ])
            .limit(top_k)
            .to_list()
        )

        documents = []
        for row in rows:
            try:
                metadata = json.loads(row.get("metadata_json") or "{}")
            except (TypeError, json.JSONDecodeError):
                metadata = {}

            metadata["source"] = row.get("source", "")
            distance = row.get("_distance")
            if distance is not None:
                metadata["distance"] = float(distance)
                metadata["score"] = 1.0 - float(distance)

            documents.append(Document(
                page_content=row["text"],
                metadata=metadata,
            ))

        return documents

    def get_retriever(self, top_k: int = 4) -> LanceDBRetriever:
        """Return a LangChain retriever, expanding candidates for reranking."""
        search_k = (
            top_k * 2
            if os.getenv("RERANKING", "false").lower() == "true"
            else top_k
        )
        return LanceDBRetriever(store=self, top_k=search_k)

    def delete_documents_by_source(self, source_path: str) -> int:
        """Delete every chunk associated with one source path."""
        where = f"source = {_sql_literal(source_path)}"
        result = self.table.delete(where)
        return int(getattr(result, "num_deleted_rows", 0))

    def find_document_source(self, source_basename: str) -> Optional[str]:
        """Resolve a displayed basename to its exact stored source path."""
        for source in self.list_documents():
            if source == source_basename or ntpath.basename(source) == source_basename:
                return source
        return None

    def list_documents(self) -> List[str]:
        """List unique, non-empty source paths in this collection."""
        return _list_sources(self.table)

    @staticmethod
    def list_table_documents(table_name: str) -> List[str]:
        """List sources without initializing embeddings or an LLM."""
        database = _connect()
        if table_name not in _list_table_names(database):
            return []
        return _list_sources(database.open_table(table_name))

    @staticmethod
    def delete_table_document(table_name: str, source: str) -> int:
        """Delete by exact path or displayed basename without model startup."""
        database = _connect()
        if table_name not in _list_table_names(database):
            return 0

        table = database.open_table(table_name)
        full_path = next((
            candidate
            for candidate in _list_sources(table)
            if candidate == source or ntpath.basename(candidate) == source
        ), None)
        if full_path is None:
            return 0

        result = table.delete(f"source = {_sql_literal(full_path)}")
        return int(getattr(result, "num_deleted_rows", 0))

    def delete_table(self) -> bool:
        """Delete this collection's table."""
        return self.delete_table_by_name(self.table_name)

    @staticmethod
    def get_all_tables(prefix: str = COLLECTION_PREFIX) -> List[str]:
        """List table names, optionally restricted by prefix."""
        database = _connect()
        tables = _list_table_names(database)
        return sorted(
            name
            for name in tables
            if not name.startswith((".", "_"))
            and (prefix == "*" or name.startswith(prefix))
        )

    @staticmethod
    def validate_table_name(name: str) -> tuple:
        """Validate collection/table names consistently with the existing UI."""
        name = name.lower()

        if not (3 <= len(name) <= 63):
            return False, "Name must be between 3 and 63 characters."

        if not re.fullmatch(r"[a-z0-9][a-z0-9._-]*[a-z0-9]", name):
            return False, (
                "Name must contain only lowercase letters, digits, dots, "
                "underscores, or hyphens."
            )

        if ".." in name:
            return False, "Name cannot contain consecutive dots."

        return True, ""

    @staticmethod
    def create_table(table_name: str, embedding_dims: int = None) -> tuple:
        """Create an empty collection table with a fixed vector dimension."""
        try:
            if embedding_dims is None:
                embedding_dims = get_embedding_dimensions()
            elif embedding_dims <= 0:
                raise ValueError("Embedding dimensions must be a positive integer.")

            database = _connect()
            if table_name in _list_table_names(database):
                return True, f"Collection '{table_name}' already exists."

            database.create_table(
                table_name,
                schema=_table_schema(embedding_dims),
            )
            return True, "Collection created successfully."
        except Exception as exc:
            logger.warning("Error creating table %s: %s", table_name, exc)
            return False, f"Error creating collection: {exc}"

    @staticmethod
    def delete_table_by_name(table_name: str) -> bool:
        """Delete a collection table if it exists."""
        try:
            database = _connect()
            if table_name in _list_table_names(database):
                database.drop_table(table_name)
            return True
        except Exception as exc:
            logger.warning("Error deleting table %s: %s", table_name, exc)
            return False

    @staticmethod
    def rename_table(old_name: str, new_name: str) -> tuple:
        """Rename by streaming rows to a new table without new embeddings."""
        created_target = False

        try:
            database = _connect()
            tables = set(_list_table_names(database))

            if old_name not in tables:
                return False, f"Source table '{old_name}' does not exist."
            if new_name in tables:
                return False, f"Target table '{new_name}' already exists."

            source_table = database.open_table(old_name)
            old_count = source_table.count_rows()

            # LanceDB OSS does not currently support rename_table. Stream the
            # original Arrow batches instead, preserving vectors and metadata.
            database.create_table(
                new_name,
                data=source_table.search().to_batches(),
            )
            created_target = True

            new_count = database.open_table(new_name).count_rows()
            if new_count != old_count:
                raise RuntimeError(
                    f"Rename copied {new_count} of {old_count} rows."
                )

            database.drop_table(old_name)
            return True, "Collection renamed successfully."
        except Exception as exc:
            if created_target:
                try:
                    database.drop_table(new_name)
                except Exception:
                    logger.warning("Could not clean up partial table %s", new_name)

            logger.warning("Error renaming table %s to %s: %s", old_name, new_name, exc)
            return False, f"Error renaming collection: {exc}"
