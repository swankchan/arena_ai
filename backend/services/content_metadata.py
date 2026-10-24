"""Bounded, storage-agnostic content metadata for collection-level features."""

from backend.lance_store import LanceStore
from backend.services import tabular
from backend.services.collections import table_name


class ContentMetadataProvider:
    """Expose vector excerpts and tabular schemas through one interface."""

    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    def get_excerpts(
        self,
        max_sources: int = 12,
        max_tabular_files: int = 4,
        max_chars_per_source: int = 1200,
    ) -> list[dict[str, str]]:
        """Return bounded source excerpts without loading complete source files."""
        excerpts = LanceStore.get_table_summary_excerpts(
            table_name(self.collection_name),
            max_sources=max_sources,
            max_chars_per_source=max_chars_per_source,
        )
        excerpts.extend(
            self._get_tabular_excerpts(max_tabular_files, max_chars_per_source)
        )
        return excerpts

    def _get_tabular_excerpts(
        self,
        max_files: int,
        max_chars: int,
    ) -> list[dict[str, str]]:
        excerpts = []
        files = tabular.list_files(self.collection_name)[:max_files]
        for item in files:
            columns = ", ".join((item.get("columns") or {}).keys())
            text = (
                f"Structured data table with {item.get('row_count', 0)} rows. "
                f"Columns: {columns or 'not available'}."
            )
            excerpts.append({
                "source": item["filename"],
                "text": text[:max_chars],
            })
        return excerpts
