"""Explicit vector/tabular dispatch for saved document uploads."""

from collections.abc import Callable
from pathlib import Path
from typing import Literal

from backend.config import SUPPORTED_EXTENSIONS

TABULAR_EXTENSIONS = frozenset({"csv", "xlsx", "xls"})
IngestionKind = Literal["vector", "tabular"]


def document_kind(path: Path) -> IngestionKind:
    extension = path.suffix.lower().lstrip(".")
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {extension or 'none'}")
    return "tabular" if extension in TABULAR_EXTENSIONS else "vector"


def ingest_tabular_document(handler, path: Path, progress_callback) -> dict:
    """Build the collection's SQL store and metadata, never vector chunks."""
    df, metadata = handler.load_file(str(path))
    connection = handler.create_sqlite_db(df, handler.table_name)
    connection.close()
    handler.store_metadata(path.name, metadata)
    progress_callback(1.0)
    return {
        "rows": int(metadata.get("row_count", 0)),
        "columns": int(metadata.get("column_count", 0)),
    }


def process_saved_documents(
    paths: list[Path],
    vector_engine_factory: Callable[[], object],
    tabular_handler_factory: Callable[[], object],
    progress_callback,
) -> dict:
    total_chunks = 0
    total_rows = 0
    vector_files = 0
    tabular_files = 0
    errors: list[str] = []
    file_results = []
    total = len(paths)

    for index, path in enumerate(paths):
        kind = document_kind(path)

        def update(progress: float, _index=index) -> None:
            progress_callback((_index + progress) / total)

        try:
            file_result = {
                "name": path.name,
                "kind": kind,
                "status": "succeeded",
            }
            if kind == "tabular":
                outcome = ingest_tabular_document(
                    tabular_handler_factory(),
                    path,
                    update,
                )
                tabular_files += 1
                total_rows += outcome["rows"]
                file_result.update(outcome)
            else:
                chunks = vector_engine_factory().add_vector_document(
                    str(path),
                    progress_callback=update,
                )
                vector_files += 1
                total_chunks += chunks
                file_result["chunks"] = chunks
            file_results.append(file_result)
        # One unreadable upload must not prevent the remaining files from running.
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{path.name}: {exc}")
            file_results.append({
                "name": path.name,
                "kind": kind,
                "status": "failed",
                "error": str(exc),
            })

    progress_callback(1.0)
    return {
        "processed_files": vector_files + tabular_files,
        "vector_files": vector_files,
        "tabular_files": tabular_files,
        "total_chunks": total_chunks,
        "total_rows": total_rows,
        "file_results": file_results,
        "errors": errors,
    }
