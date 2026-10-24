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

import os
import tempfile
import unittest
from unittest.mock import Mock, patch

from langchain_core.documents import Document

from backend.lance_store import LanceStore


class FakeEmbeddings:
    """Deterministic three-dimensional embeddings; no model download needed."""

    @staticmethod
    def _vector(text: str):
        lowered = text.lower()
        if "banana" in lowered:
            return [0.0, 1.0, 0.0]
        if "quoted" in lowered:
            return [0.0, 0.0, 1.0]
        return [1.0, 0.0, 0.0]

    def embed_query(self, text: str):
        return self._vector(text)

    def embed_documents(self, texts):
        return [self._vector(text) for text in texts]


class LanceStoreTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {
            "LANCEDB_PATH": self.temp_dir.name,
            "RERANKING": "false",
        })
        self.env.start()
        self.embeddings = FakeEmbeddings()
        self.store = LanceStore("rag_demo", embeddings=self.embeddings)

    def tearDown(self):
        self.env.stop()
        self.temp_dir.cleanup()

    @staticmethod
    def _document(text: str, source: str, **metadata) -> Document:
        return Document(
            page_content=text,
            metadata={"source": source, **metadata},
        )

    def test_add_search_and_persist_documents(self):
        added = self.store.add_documents([
            self._document(
                "apple document",
                "/docs/apple.txt",
                page=1,
                empty_value=" ",
            ),
            self._document("banana document", "/docs/banana.txt", page=2),
        ])
        self.assertEqual(added, 2)

        results = self.store.similarity_search("apple query", top_k=2)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].page_content, "apple document")
        self.assertAlmostEqual(results[0].metadata["score"], 1.0)
        self.assertEqual(results[0].metadata["page"], 1)
        self.assertNotIn("empty_value", results[0].metadata)
        self.assertEqual(self.store.similarity_search("apple query", top_k=0), [])

        # A new store instance reads the same on-disk table without reindexing.
        reopened = LanceStore("rag_demo", embeddings=self.embeddings)
        self.assertEqual(reopened.table.count_rows(), 2)
        self.assertEqual(reopened.list_documents(), [
            "/docs/apple.txt",
            "/docs/banana.txt",
        ])
        self.assertEqual(
            reopened.find_document_source("apple.txt"),
            "/docs/apple.txt",
        )

    def test_retriever_and_reranking_candidate_count(self):
        self.store.add_documents([
            self._document("apple document", "/docs/apple.txt"),
            self._document("banana document", "/docs/banana.txt"),
        ])

        retriever = self.store.get_retriever(top_k=1)
        self.assertEqual(retriever.top_k, 1)
        results = retriever.invoke("apple query")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].page_content, "apple document")

        with patch.dict(os.environ, {"RERANKING": "true"}):
            self.assertEqual(self.store.get_retriever(top_k=4).top_k, 8)

    def test_delete_by_source_handles_quotes(self):
        source = "/docs/O'Reilly.txt"
        self.store.add_documents([
            self._document("quoted document", source),
            self._document("quoted document", source),
        ])

        self.assertEqual(self.store.delete_documents_by_source(source), 2)
        self.assertEqual(self.store.table.count_rows(), 0)
        self.assertEqual(self.store.list_documents(), [])

    def test_empty_collection_create_list_and_delete(self):
        success, _ = LanceStore.create_table("rag_empty", embedding_dims=3)
        self.assertTrue(success)
        self.assertIn("rag_empty", LanceStore.get_all_tables())

        success, _ = LanceStore.create_table("rag_empty", embedding_dims=3)
        self.assertTrue(success, "Creating an existing collection should be idempotent")

        empty = LanceStore("rag_empty", embeddings=self.embeddings)
        self.assertEqual(empty.list_documents(), [])
        self.assertEqual(empty.similarity_search("apple query"), [])
        self.assertTrue(empty.delete_table())
        self.assertNotIn("rag_empty", LanceStore.get_all_tables())

    def test_rename_preserves_vectors_and_metadata(self):
        self.store.add_documents([
            self._document("apple document", "/docs/apple.txt", page=7),
        ])

        success, message = LanceStore.rename_table("rag_demo", "rag_renamed")
        self.assertTrue(success, message)
        self.assertNotIn("rag_demo", LanceStore.get_all_tables())
        self.assertIn("rag_renamed", LanceStore.get_all_tables())

        renamed = LanceStore("rag_renamed", embeddings=self.embeddings)
        self.assertEqual(renamed.table.count_rows(), 1)
        result = renamed.similarity_search("apple query", top_k=1)[0]
        self.assertEqual(result.metadata["page"], 7)
        self.assertEqual(result.metadata["source"], "/docs/apple.txt")

        success, _ = LanceStore.rename_table("rag_renamed", "rag_renamed")
        self.assertFalse(success)
        success, _ = LanceStore.rename_table("rag_missing", "rag_other")
        self.assertFalse(success)

        LanceStore.create_table("rag_empty_rename", embedding_dims=3)
        success, message = LanceStore.rename_table(
            "rag_empty_rename", "rag_empty_renamed"
        )
        self.assertTrue(success, message)
        empty = LanceStore("rag_empty_renamed", embeddings=self.embeddings)
        self.assertEqual(empty.table.count_rows(), 0)

    def test_dimension_mismatch_fails_early(self):
        LanceStore.create_table("rag_mismatch", embedding_dims=4)
        with self.assertRaisesRegex(ValueError, "4-dim vectors"):
            LanceStore("rag_mismatch", embeddings=self.embeddings)

    def test_old_bge_table_rejects_gemma_vectors(self):
        LanceStore.create_table("rag_old_bge", embedding_dims=1024)
        gemma_embeddings = Mock()
        gemma_embeddings.embed_query.return_value = [0.0] * 768

        with patch.dict(os.environ, {
            "EMBEDDING_MODEL": "google/embeddinggemma-2",
            "EMBEDDING_DIMS": "768",
        }):
            with self.assertRaisesRegex(
                ValueError,
                "1024-dim vectors.*768-dim vectors",
            ):
                LanceStore("rag_old_bge", embeddings=gemma_embeddings)

    def test_gemma_default_creates_native_768_dimension_schema(self):
        with patch.dict(os.environ, {
            "EMBEDDING_MODEL": "google/embeddinggemma-2",
            "EMBEDDING_DIMS": "768",
        }):
            success, message = LanceStore.create_table("rag_gemma_default")

        self.assertTrue(success, message)
        table = self.store.database.open_table("rag_gemma_default")
        self.assertEqual(table.schema.field("embedding").type.list_size, 768)

    def test_unsupported_gemma_mrl_dimension_does_not_create_table(self):
        with patch.dict(os.environ, {
            "EMBEDDING_MODEL": "google/embeddinggemma-2",
            "EMBEDDING_DIMS": "384",
        }):
            success, message = LanceStore.create_table("rag_gemma_invalid")

        self.assertFalse(success)
        self.assertIn("supports EMBEDDING_DIMS", message)
        self.assertNotIn("rag_gemma_invalid", LanceStore.get_all_tables())

    def test_table_listing_prefix_and_name_validation(self):
        LanceStore.create_table("rag_alpha", embedding_dims=3)
        LanceStore.create_table("other_table", embedding_dims=3)

        rag_tables = LanceStore.get_all_tables(prefix="rag_")
        self.assertIn("rag_alpha", rag_tables)
        self.assertNotIn("other_table", rag_tables)
        self.assertIn("other_table", LanceStore.get_all_tables(prefix="*"))

        self.assertTrue(LanceStore.validate_table_name("valid-name")[0])
        self.assertTrue(LanceStore.validate_table_name("abc")[0])
        self.assertTrue(LanceStore.validate_table_name("a" * 63)[0])
        self.assertFalse(LanceStore.validate_table_name("x")[0])
        self.assertFalse(LanceStore.validate_table_name("ab")[0])
        self.assertFalse(LanceStore.validate_table_name("a" * 64)[0])
        self.assertFalse(LanceStore.validate_table_name("bad name")[0])
        self.assertFalse(LanceStore.validate_table_name("bad..name")[0])
        self.assertFalse(LanceStore.validate_table_name("_leading")[0])
        self.assertFalse(LanceStore.validate_table_name("trailing-")[0])


if __name__ == "__main__":
    unittest.main()
