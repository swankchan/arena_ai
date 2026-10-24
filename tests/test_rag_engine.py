"""Regression tests for optimized-query retrieval in both RAG execution paths."""

import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from langchain_core.documents import Document

from backend.rag_engine import RAGEngine


class FakeLLM:
    """Provide deterministic optimizer output and a minimal final response."""

    def invoke(self, prompt):
        if prompt.startswith("You are a retrieval expert."):
            return SimpleNamespace(content="rewritten question")
        if prompt.startswith("Generate 3 different variations"):
            if getattr(self, "fail_expansion", False):
                raise RuntimeError("expansion unavailable")
            return SimpleNamespace(content="variation one\nvariation two")
        return SimpleNamespace(content="REASONING: Grounded.\nANSWER: Test answer.")

    def stream(self, prompt):
        yield SimpleNamespace(content="REASONING: Grounded.\n")
        yield SimpleNamespace(content="ANSWER: Test answer.")


class RecordingRetriever:
    def __init__(self):
        self.queries = []

    def invoke(self, query):
        self.queries.append(query)
        return [
            Document(
                page_content=f"Context for {query}",
                metadata={"source": "document.txt"},
            )
        ]


class OptimizedQueryRetrievalTest(unittest.TestCase):
    def _make_engine(self, fail_expansion=False):
        engine = RAGEngine.__new__(RAGEngine)
        engine.collection_name = "alpha"
        engine.llm = FakeLLM()
        engine.llm.fail_expansion = fail_expansion
        retriever = RecordingRetriever()
        engine.get_retriever = Mock(return_value=retriever)
        engine._get_system_prompt = Mock(return_value="Answer from context.")
        engine._get_long_term_memory = Mock(return_value="")
        engine._has_tabular_data = Mock(return_value=False)
        engine._count_tokens = Mock(return_value=1)
        return engine, retriever

    def _run(self, engine, method, query_expansion):
        options = {
            "query_transformation": True,
            "query_expansion": query_expansion,
        }
        if method == "query":
            return engine.query("original question", **options)
        return list(engine.query_stream("original question", **options))

    def test_transformation_only_is_used_for_retrieval(self):
        for method in ("query", "query_stream"):
            with self.subTest(method=method):
                engine, retriever = self._make_engine()
                self._run(engine, method, query_expansion=False)
                self.assertEqual(retriever.queries, ["rewritten question"])

    def test_expansion_failure_still_uses_transformed_query(self):
        for method in ("query", "query_stream"):
            with self.subTest(method=method):
                engine, retriever = self._make_engine(fail_expansion=True)
                with self.assertLogs(level="ERROR") as logs:
                    self._run(engine, method, query_expansion=True)
                self.assertEqual(retriever.queries, ["rewritten question"])
                self.assertTrue(
                    any("Query Expansion Error" in line for line in logs.output)
                )

    def test_successful_expansion_still_retrieves_every_query(self):
        expected = {"rewritten question", "variation one", "variation two"}
        for method in ("query", "query_stream"):
            with self.subTest(method=method):
                engine, retriever = self._make_engine()
                self._run(engine, method, query_expansion=True)
                self.assertEqual(set(retriever.queries), expected)
                self.assertEqual(len(retriever.queries), len(expected))


if __name__ == "__main__":
    unittest.main()
