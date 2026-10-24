"""Automatic collection summary generation and persistence tests."""

import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from backend import db
from backend.services.summaries import (
    SUMMARY_SYSTEM_PROMPT,
    refresh_collection_summary,
)


class FakeSummaryLLM:
    def __init__(self, content="A collection of technical guides.", error=None):
        self.content = content
        self.error = error
        self.calls = []

    def invoke(self, messages, **kwargs):
        self.calls.append((messages, kwargs))
        if self.error:
            raise self.error
        return SimpleNamespace(content=self.content)


class CollectionSummaryTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {
            "APP_DB_PATH": os.path.join(self.temp_dir.name, "app.db"),
        })
        self.env.start()
        db.init_db()

    def tearDown(self):
        self.env.stop()
        self.temp_dir.cleanup()

    def test_generates_and_persists_one_bounded_description(self):
        llm = FakeSummaryLLM(" Summary: Hardware setup and troubleshooting. ")
        excerpts = [{
            "source": "/docs/setup.txt",
            "text": "Install the driver and diagnose hardware failures.",
        }]
        with patch(
            "backend.services.summaries.LanceStore.get_table_summary_excerpts",
            return_value=excerpts,
        ):
            summary = refresh_collection_summary("Alpha", lambda: llm)

        self.assertEqual(summary, "Hardware setup and troubleshooting.")
        stored = db.get_collection_summary("alpha")
        self.assertEqual(stored["summary"], summary)
        self.assertIsNotNone(stored["updated_at"])
        messages, options = llm.calls[0]
        self.assertEqual(messages[0].content, SUMMARY_SYSTEM_PROMPT)
        self.assertIn("untrusted data", messages[0].content)
        self.assertIn("setup.txt", messages[1].content)
        self.assertIn("diagnose hardware failures", messages[1].content)
        self.assertEqual(options, {"max_tokens": 96, "temperature": 0.1})

    def test_tabular_only_collection_uses_bounded_schema_metadata(self):
        llm = FakeSummaryLLM("Sales records with regional amounts.")
        with patch(
            "backend.services.summaries.LanceStore.get_table_summary_excerpts",
            return_value=[],
        ), patch(
            "backend.services.summaries.tabular.list_files",
            return_value=[{
                "filename": "sales.csv",
                "row_count": 25,
                "columns": {"region": {"type": "TEXT"}, "amount": {"type": "REAL"}},
            }],
        ):
            summary = refresh_collection_summary("alpha", lambda: llm)

        self.assertEqual(summary, "Sales records with regional amounts.")
        prompt = llm.calls[0][0][1].content
        self.assertIn("sales.csv", prompt)
        self.assertIn("25 rows", prompt)
        self.assertIn("region, amount", prompt)

    def test_empty_collection_clears_summary_without_starting_llm(self):
        db.set_collection_summary("alpha", "Old description")
        llm_factory = Mock()
        with patch(
            "backend.services.summaries.LanceStore.get_table_summary_excerpts",
            return_value=[],
        ):
            self.assertEqual(refresh_collection_summary("alpha", llm_factory), "")

        llm_factory.assert_not_called()
        self.assertIsNone(db.get_collection_summary("alpha"))

    def test_generation_failure_preserves_last_good_summary(self):
        db.set_collection_summary("alpha", "Last known good description")
        llm = FakeSummaryLLM(error=RuntimeError("llama.cpp offline"))
        with patch(
            "backend.services.summaries.LanceStore.get_table_summary_excerpts",
            return_value=[{"source": "/docs/a.txt", "text": "new content"}],
        ), self.assertRaisesRegex(RuntimeError, "offline"):
            refresh_collection_summary("alpha", lambda: llm)

        self.assertEqual(
            db.get_collection_summary("alpha")["summary"],
            "Last known good description",
        )


if __name__ == "__main__":
    unittest.main()
