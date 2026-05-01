"""
Elasticsearch storage backend for RAG system.
Replaces ChromaDB with Elasticsearch for vector storage and retrieval.
"""
import os
import re
from typing import Any, Dict, List, Optional

from langchain_core.documents import Document

# Load environment variables
from dotenv import load_dotenv
load_dotenv(override=True)


class ElasticStore:
    """Elasticsearch wrapper for RAG storage and retrieval."""

    def __init__(self, index_name: str, embeddings=None):
        """
        Initialize Elasticsearch store.

        Args:
            index_name: Name of the Elasticsearch index
            embeddings: Embedding model instance
        """
        self.index_name = index_name
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")

        # Initialize embeddings if not provided
        if embeddings:
            self.embeddings = embeddings
        else:
            from langchain_huggingface import HuggingFaceEmbeddings
            self.embeddings = HuggingFaceEmbeddings(model_name=self.embedding_model_name)

        # Elasticsearch connection
        self.es_url = os.getenv("ES_URL", "http://localhost:9200")
        self.es_user = os.getenv("ES_USER", "elastic")
        self.es_pass = os.getenv("ES_PASS", "openrag")

        # Create Elasticsearch client
        self._create_client()

        # Create index if not exists
        self._create_index()

    def _create_client(self):
        """Create Elasticsearch client."""
        from elasticsearch import Elasticsearch

        self.client = Elasticsearch(
            hosts=[self.es_url],
            basic_auth=(self.es_user, self.es_pass),
            verify_certs=False
        )

    def _create_index(self):
        """Create Elasticsearch index with proper mapping for vector search."""
        if self.client.indices.exists(index=self.index_name):
            return

        mapping = {
            "mappings": {
                "properties": {
                    "text": {"type": "text"},
                    "source": {"type": "keyword"},
                    "embedding": {
                        "type": "dense_vector",
                        "dims": 1024,
                        "index": True,
                        "similarity": "cosine"
                    },
                    "metadata": {"type": "object", "dynamic": True},
                    "created_at": {"type": "date"}
                }
            },
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0
            }
        }

        self.client.indices.create(index=self.index_name, body=mapping)

    def add_documents(self, chunks: List[Document], progress_callback=None) -> int:
        """Add documents to Elasticsearch with embeddings."""
        if not chunks:
            return 0

        total_chunks = len(chunks)
        batch_size = 50

        texts = [chunk.page_content for chunk in chunks]
        embeddings = self.embeddings.embed_documents(texts)

        for i in range(0, total_chunks, batch_size):
            batch_chunks = chunks[i:i+batch_size]
            batch_embeddings = embeddings[i:i+batch_size]

            actions = []
            for chunk, embedding in zip(batch_chunks, batch_embeddings):
                action = {
                    "_index": self.index_name,
                    "_source": {
                        "text": chunk.page_content,
                        "source": chunk.metadata.get("source", ""),
                        "embedding": embedding,
                        "metadata": chunk.metadata,
                        "created_at": None
                    }
                }
                actions.append(action)

            from elasticsearch.helpers import bulk
            bulk(self.client, actions)

            if progress_callback:
                progress_callback((i + len(batch_chunks)) / total_chunks)

        self.client.indices.refresh(index=self.index_name)
        return total_chunks

    def get_retriever(self, top_k: int = 4):
        """Get a LangChain-compatible retriever."""
        from elasticsearch import Elasticsearch
        from langchain_elasticsearch import ElasticsearchRetriever
        from langchain_core.documents import Document
        import numpy as np

        es_client = Elasticsearch(
            hosts=[self.es_url],
            basic_auth=(self.es_user, self.es_pass),
            verify_certs=False
        )

        # Create a function that generates search body for a given query
        def body_func(query: str) -> dict:
            # Generate embedding for the query
            query_embedding = self.embeddings.embed_query(query)
            # Convert to list if numpy array
            if hasattr(query_embedding, 'tolist'):
                query_embedding = query_embedding.tolist()

            return {
                "size": top_k * 2 if os.getenv("RERANKING", "false").lower() == "true" else top_k,
                "query": {
                    "script_score": {
                        "query": {"match_all": {}},
                        "script": {
                            "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                            "params": {
                                "query_vector": query_embedding
                            }
                        }
                    }
                },
                "_source": ["text", "source", "metadata"]
            }

        retriever = ElasticsearchRetriever(
            index_name=self.index_name,
            body_func=body_func,
            content_field="text",
            client=es_client
        )

        return retriever

    def delete_documents_by_source(self, source_path: str) -> int:
        """Delete all documents with a specific source path."""
        query = {
            "query": {"term": {"source": source_path}}
        }

        result = self.client.delete_by_query(
            index=self.index_name,
            body=query,
            refresh=True
        )

        return result.get("deleted", 0)

    def list_documents(self) -> List[str]:
        """List all document sources in the index."""
        # Return empty list if index doesn't exist
        if not self.client.indices.exists(index=self.index_name):
            return []

        query = {
            "size": 0,
            "aggs": {"sources": {"terms": {"field": "source", "size": 10000}}}
        }

        result = self.client.search(index=self.index_name, body=query)
        buckets = result["aggregations"]["sources"]["buckets"]
        sources = [bucket["key"] for bucket in buckets if bucket["key"]]
        return sorted(sources)

    def delete_index(self) -> bool:
        """Delete the entire index."""
        try:
            if self.client.indices.exists(index=self.index_name):
                self.client.indices.delete(index=self.index_name)
            return True
        except Exception as e:
            print(f"Error deleting index {self.index_name}: {e}")
            return False

    @staticmethod
    def get_all_indices(prefix: str = "rag_") -> List[str]:
        """List all indices matching the prefix."""
        from elasticsearch import Elasticsearch

        es_url = os.getenv("ES_URL", "http://localhost:9200")
        es_user = os.getenv("ES_USER", "elastic")
        es_pass = os.getenv("ES_PASS", "openrag")

        client = Elasticsearch(
            hosts=[es_url],
            basic_auth=(es_user, es_pass),
            verify_certs=False
        )

        # Get all indices (not aliases)
        indices = client.indices.get(index="*")
        result = []
        for index in indices.keys():
            # Skip prefix matching if prefix is "*" (return all)
            if prefix != "*" and not index.startswith(prefix):
                continue
            if index.startswith(".") or index.startswith("_"):
                continue
            result.append(index)

        return sorted(result)

    @staticmethod
    def validate_index_name(name: str) -> tuple:
        """Validate index name follows Elasticsearch rules."""
        name = name.lower()

        if not (3 <= len(name) <= 63):
            return False, "Name must be between 3 and 63 characters."

        if not re.match(r"^[a-z0-9][a-z0-9._-]*[a-z0-9]$", name):
            return False, "Name must contain only lowercase letters, digits, dots, underscores, or hyphens."

        if ".." in name:
            return False, "Name cannot contain consecutive dots."

        return True, ""

    @staticmethod
    def create_index(index_name: str) -> tuple:
        """Create an Elasticsearch index."""
        from elasticsearch import Elasticsearch

        es_url = os.getenv("ES_URL", "http://localhost:9200")
        es_user = os.getenv("ES_USER", "elastic")
        es_pass = os.getenv("ES_PASS", "openrag")

        client = Elasticsearch(
            hosts=[es_url],
            basic_auth=(es_user, es_pass),
            verify_certs=False
        )

        mapping = {
            "mappings": {
                "properties": {
                    "text": {"type": "text"},
                    "source": {"type": "keyword"},
                    "embedding": {
                        "type": "dense_vector",
                        "dims": 1024,
                        "index": True,
                        "similarity": "cosine"
                    },
                    "metadata": {"type": "object", "dynamic": True}
                }
            },
            "settings": {"number_of_shards": 1, "number_of_replicas": 0}
        }

        try:
            if client.indices.exists(index=index_name):
                return True, f"Index '{index_name}' already exists."
            client.indices.create(index=index_name, body=mapping)
            return True, "Index created successfully."
        except Exception as e:
            if "resource_already_exists_exception" in str(e):
                return True, f"Index '{index_name}' already exists."
            return False, f"Error creating index: {e}"

    @staticmethod
    def delete_index_by_name(index_name: str) -> bool:
        """Delete an Elasticsearch index by name."""
        from elasticsearch import Elasticsearch

        es_url = os.getenv("ES_URL", "http://localhost:9200")
        es_user = os.getenv("ES_USER", "elastic")
        es_pass = os.getenv("ES_PASS", "openrag")

        client = Elasticsearch(
            hosts=[es_url],
            basic_auth=(es_user, es_pass),
            verify_certs=False
        )

        try:
            if client.indices.exists(index=index_name):
                client.indices.delete(index=index_name)
            return True
        except Exception as e:
            print(f"Error deleting index {index_name}: {e}")
            return False

    @staticmethod
    def rename_index(old_name: str, new_name: str) -> tuple:
        """Rename an Elasticsearch index using reindex API."""
        from elasticsearch import Elasticsearch

        es_url = os.getenv("ES_URL", "http://localhost:9200")
        es_user = os.getenv("ES_USER", "elastic")
        es_pass = os.getenv("ES_PASS", "openrag")

        client = Elasticsearch(
            hosts=[es_url],
            basic_auth=(es_user, es_pass),
            verify_certs=False
        )

        old_exists = client.indices.exists(index=old_name)
        new_exists = client.indices.exists(index=new_name)

        if not old_exists:
            return False, f"Source index '{old_name}' does not exist."

        if new_exists:
            return False, f"Target index '{new_name}' already exists."

        try:
            # Step 1: Get old index settings and mapping
            old_mapping = client.indices.get_mapping(index=old_name)
            old_settings = client.indices.get_settings(index=old_name)

            # Extract settings, filtering out read-only system settings
            old_settings_dict = old_settings.get(old_name, {}).get("settings", {}).get("index", {})
            filtered_settings = {}
            for key, value in old_settings_dict.items():
                # Skip read-only system settings that cannot be set
                if key not in ['creation_date', 'uuid', 'version', 'provided_name', 'routing']:
                    filtered_settings[key] = value

            # Get mappings
            mappings = old_mapping.get(old_name, {}).get("mappings", {})

            # Step 2: Create new index with same settings and mappings
            client.indices.create(
                index=new_name,
                body={
                    "settings": {"index": filtered_settings},
                    "mappings": mappings
                }
            )

            # Step 3: Reindex data from old to new
            client.reindex(
                body={"source": {"index": old_name}, "dest": {"index": new_name}},
                wait_for_completion=True
            )

            # Step 4: Refresh both indices to ensure data is visible
            client.indices.refresh(index=old_name)
            client.indices.refresh(index=new_name)

            # Step 5: Verify reindex succeeded by checking doc counts
            old_stats = client.indices.stats(index=old_name)
            new_stats = client.indices.stats(index=new_name)

            old_docs = old_stats['indices'][old_name]['primaries']['docs']['count']
            new_docs = new_stats['indices'][new_name]['primaries']['docs']['count']

            if new_docs == 0:
                client.indices.delete(index=new_name)
                return False, "Rename failed: No documents were copied to new index"

            if old_docs != new_docs:
                client.indices.delete(index=new_name)
                return False, f"Rename incomplete: {old_docs} docs in old index but only {new_docs} in new index"

            # Step 6: Delete old index
            client.indices.delete(index=old_name)

            return True, "Index renamed successfully."

        except Exception as e:
            error_msg = str(e)
            # Try to clean up new index if it was created but operation failed
            try:
                if client.indices.exists(index=new_name):
                    client.indices.delete(index=new_name)
                    error_msg += " (cleaned up partial target index)"
            except:
                pass
            return False, f"Error renaming index: {error_msg}"
