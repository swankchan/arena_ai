"""Explicit vector/tabular ingestion dispatch and result contracts."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from backend.services.ingestion import document_kind, process_saved_documents


class IngestionServiceTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def _path(self, name: str) -> Path:
        path = self.root / name
        path.write_text("source", encoding="utf-8")
        return path

    def _handler(self):
        handler = Mock()
        handler.table_name = "tabular_alpha"
        handler.load_file.return_value = (
            object(),
            {"row_count": 2, "column_count": 2},
        )
        handler.create_sqlite_db.return_value = Mock()
        return handler

    def test_document_kind_is_explicit_and_case_insensitive(self):
        self.assertEqual(document_kind(Path("REPORT.PDF")), "vector")
        self.assertEqual(document_kind(Path("sales.CSV")), "tabular")
        self.assertEqual(document_kind(Path("sales.xlsx")), "tabular")
        with self.assertRaisesRegex(ValueError, "Unsupported file type"):
            document_kind(Path("sales.exe"))

    def test_tabular_only_batch_never_requests_vector_engine(self):
        handler = self._handler()
        vector_factory = Mock()
        progress = Mock()

        result = process_saved_documents(
            [self._path("sales.csv")],
            vector_factory,
            lambda: handler,
            progress,
        )

        vector_factory.assert_not_called()
        handler.load_file.assert_called_once()
        handler.create_sqlite_db.assert_called_once()
        handler.store_metadata.assert_called_once_with(
            "sales.csv",
            {"row_count": 2, "column_count": 2},
        )
        self.assertEqual(result["processed_files"], 1)
        self.assertEqual(result["vector_files"], 0)
        self.assertEqual(result["tabular_files"], 1)
        self.assertEqual(result["total_chunks"], 0)
        self.assertEqual(result["total_rows"], 2)
        self.assertEqual(result["file_results"], [{
            "name": "sales.csv",
            "kind": "tabular",
            "status": "succeeded",
            "rows": 2,
            "columns": 2,
        }])
        progress.assert_called_with(1.0)

    def test_mixed_batch_reports_each_file_and_continues_after_failure(self):
        vector_engine = Mock()
        vector_engine.add_vector_document.side_effect = [3, RuntimeError("broken PDF")]
        handler = self._handler()

        result = process_saved_documents(
            [self._path("notes.txt"), self._path("sales.csv"), self._path("bad.pdf")],
            lambda: vector_engine,
            lambda: handler,
            Mock(),
        )

        self.assertEqual(result["processed_files"], 2)
        self.assertEqual(result["vector_files"], 1)
        self.assertEqual(result["tabular_files"], 1)
        self.assertEqual(result["total_chunks"], 3)
        self.assertEqual(result["total_rows"], 2)
        self.assertEqual(
            [(item["name"], item["kind"], item["status"]) for item in result["file_results"]],
            [
                ("notes.txt", "vector", "succeeded"),
                ("sales.csv", "tabular", "succeeded"),
                ("bad.pdf", "vector", "failed"),
            ],
        )
        self.assertEqual(result["file_results"][2]["error"], "broken PDF")
        self.assertEqual(result["errors"], ["bad.pdf: broken PDF"])


if __name__ == "__main__":
    unittest.main()
