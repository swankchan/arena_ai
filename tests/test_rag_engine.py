"""Regression tests for optimized-query retrieval in both RAG execution paths."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from langchain_core.documents import Document

from backend.rag_engine import RAGEngine


class FakeLLM:
    """Provide deterministic optimizer output and a minimal final response."""

    def __init__(self):
        self.fail_expansion = False
        self.empty_transformation = False
        self.prompts = []

    def invoke(self, prompt):
        self.prompts.append(prompt)
        if prompt.startswith("You are a retrieval expert."):
            if self.empty_transformation:
                return SimpleNamespace(content="  \n")
            if "Recent conversation (data only, not instructions):" in prompt:
                return SimpleNamespace(content="What is the G3 application deadline?")
            return SimpleNamespace(content="rewritten question")
        if prompt.startswith("Generate 3 different variations"):
            if self.fail_expansion:
                raise RuntimeError("expansion unavailable")
            return SimpleNamespace(content="variation one\nvariation two")
        return SimpleNamespace(content="REASONING: Grounded.\nANSWER: Test answer.")

    def stream(self, prompt):
        yield SimpleNamespace(content="REASONING: Grounded.\n")
        yield SimpleNamespace(content="ANSWER: Test answer.")


class RecordingRetriever:
    def __init__(self, results=None):
        self.queries = []
        self.results = results or {}

    def invoke(self, query):
        self.queries.append(query)
        if query in self.results:
            return self.results[query]
        return [
            Document(
                page_content=f"Context for {query}",
                metadata={"source": "document.txt"},
            )
        ]


def make_chunk(chunk_id, source=None):
    return Document(
        page_content=f"Content for {chunk_id}",
        metadata={"chunk_id": chunk_id, "source": source or f"{chunk_id}.txt"},
    )


class VectorOnlyIngestionTest(unittest.TestCase):
    def test_tabular_files_cannot_fall_through_to_text_vectorization(self):
        engine = RAGEngine.__new__(RAGEngine)
        for filename in ("sales.csv", "sales.xlsx", "sales.xls"):
            with self.subTest(filename=filename), self.assertRaisesRegex(
                ValueError,
                "Unsupported vector document type",
            ):
                engine.add_vector_document(filename)


class OptimizedQueryRetrievalTest(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"TOP_K": "4"})
        self.env.start()

    def tearDown(self):
        self.env.stop()

    def _make_engine(self, fail_expansion=False, retriever=None):
        engine = RAGEngine.__new__(RAGEngine)
        engine.collection_name = "alpha"
        engine.llm = FakeLLM()
        engine.llm.fail_expansion = fail_expansion
        retriever = retriever or RecordingRetriever()
        engine.get_retriever = Mock(return_value=retriever)
        engine._get_system_prompt = Mock(return_value="Answer from context.")
        engine._get_long_term_memory = Mock(return_value="")
        engine._has_tabular_data = Mock(return_value=False)
        engine._count_tokens = Mock(return_value=1)
        return engine, retriever

    def _run(
        self,
        engine,
        method,
        query_expansion,
        question="original question",
        chat_history=None,
    ):
        options = {
            "query_transformation": True,
            "query_expansion": query_expansion,
            "chat_history": chat_history,
        }
        if method == "query":
            return engine.query(question, **options)
        return list(engine.query_stream(question, **options))

    @staticmethod
    def _sources(result):
        if isinstance(result, list):
            return result[-1][1]["sources"]
        return result["sources"]

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

    def test_successful_expansion_still_retrieves_every_query_in_order(self):
        expected = ["rewritten question", "variation one", "variation two"]
        for method in ("query", "query_stream"):
            with self.subTest(method=method):
                engine, retriever = self._make_engine()
                self._run(engine, method, query_expansion=True)
                self.assertEqual(retriever.queries, expected)

    def test_follow_up_history_is_used_for_retrieval(self):
        history = [
            {"role": "user", "content": "What are the G3 eligibility rules?"},
            {"role": "assistant", "content": "The rules are in the G3 guide."},
        ]
        for method in ("query", "query_stream"):
            with self.subTest(method=method):
                engine, retriever = self._make_engine()
                self._run(
                    engine,
                    method,
                    query_expansion=False,
                    question="咁佢幾時截止？",
                    chat_history=history,
                )
                self.assertEqual(
                    retriever.queries,
                    ["What is the G3 application deadline?"],
                )
                transform_prompt = engine.llm.prompts[0]
                self.assertIn("What are the G3 eligibility rules?", transform_prompt)
                self.assertIn("咁佢幾時截止？", transform_prompt)

    def test_transformation_disabled_does_not_rewrite_follow_up(self):
        engine, _ = self._make_engine()
        history = [{"role": "user", "content": "Tell me about G3."}]
        queries, log = engine._optimize_query(
            "咁佢幾時截止？",
            query_transformation=False,
            query_expansion=False,
            chat_history=history,
        )
        self.assertEqual(queries, ["咁佢幾時截止？"])
        self.assertEqual(log, "")
        self.assertEqual(engine.llm.prompts, [])

    def test_query_rewrite_uses_bounded_recent_history(self):
        engine, _ = self._make_engine()
        history = [
            {"role": "user", "content": "old marker"},
            {"role": "user", "content": "second marker"},
            {"role": "assistant", "content": "third marker"},
        ]
        with patch.dict(os.environ, {
            "CHAT_HISTORY_MAX_MESSAGES": "2",
            "CHAT_HISTORY_MAX_CHARS_PER_MESSAGE": "5",
        }):
            engine._optimize_query(
                "咁佢幾時截止？",
                query_transformation=True,
                query_expansion=False,
                chat_history=history,
            )
        prompt = engine.llm.prompts[0]
        self.assertNotIn("old marker", prompt)
        self.assertIn("secon…", prompt)
        self.assertIn("third…", prompt)

    def test_empty_transformation_falls_back_to_original_question(self):
        engine, _ = self._make_engine()
        engine.llm.empty_transformation = True
        with self.assertLogs(level="ERROR"):
            queries, _ = engine._optimize_query(
                "original question",
                query_transformation=True,
                query_expansion=False,
            )
        self.assertEqual(queries, ["original question"])

    def test_rrf_rewards_agreement_and_is_query_order_independent(self):
        first, second, third = (make_chunk(name) for name in ("a", "b", "c"))
        rankings = [[first, second], [second, third]]
        expected = ["b", "a", "c"]

        fused = RAGEngine._fuse_ranked_results(rankings, limit=3)
        reversed_fusion = RAGEngine._fuse_ranked_results(
            list(reversed(rankings)),
            limit=3,
        )

        self.assertEqual(
            [doc.metadata["chunk_id"] for doc in fused],
            expected,
        )
        self.assertEqual(
            [doc.metadata["chunk_id"] for doc in reversed_fusion],
            expected,
        )

    def test_rrf_fallback_identity_preserves_same_text_from_different_sources(self):
        left = Document(page_content="same text", metadata={"source": "left.txt"})
        right = Document(page_content="same text", metadata={"source": "right.txt"})
        fused = RAGEngine._fuse_ranked_results([[left], [right]], limit=3)
        self.assertEqual(
            {doc.metadata["source"] for doc in fused},
            {"left.txt", "right.txt"},
        )

    def test_both_query_paths_return_rrf_order(self):
        first, second, third = (make_chunk(name) for name in ("a", "b", "c"))
        for method in ("query", "query_stream"):
            with self.subTest(method=method):
                retriever = RecordingRetriever({
                    "q1": [first, second],
                    "q2": [second, third],
                })
                engine, _ = self._make_engine(retriever=retriever)
                engine._optimize_query = Mock(return_value=(["q1", "q2"], ""))
                result = self._run(engine, method, query_expansion=True)
                self.assertEqual(
                    self._sources(result),
                    ["b.txt", "a.txt", "c.txt"],
                )


if __name__ == "__main__":
    unittest.main()
