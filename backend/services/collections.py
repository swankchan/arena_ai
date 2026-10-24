"""Collection orchestration kept independent from the HTTP and UI layers."""

import os
import shutil
from typing import List

from backend import db
from backend.config import get_documents_dir
from backend.lance_store import LanceStore


def normalize_name(name: str) -> str:
    normalized = name.strip().lower()
    valid, message = LanceStore.validate_table_name(normalized)
    if not valid:
        raise ValueError(message)
    return normalized


def table_name(collection_name: str) -> str:
    return f"rag_{collection_name}"


def list_collections() -> List[str]:
    vector_collections = {
        name[4:]
        for name in LanceStore.get_all_tables(prefix="rag_")
        if name[4:] and not name[4:].startswith("test_collection_")
    }
    with db.get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT collection_name FROM conversations
            UNION
            SELECT collection_name FROM tabular_files
            """
        ).fetchall()
    database_collections = {row[0] for row in rows}
    return sorted(vector_collections | database_collections)


def create_collection(name: str) -> tuple[bool, str]:
    normalized = normalize_name(name)
    table = table_name(normalized)
    existed = table in LanceStore.get_all_tables(prefix="rag_")
    success, message = LanceStore.create_table(table)
    if not success:
        raise RuntimeError(message)
    return not existed, normalized


def rename_collection(old_name: str, new_name: str) -> str:
    old = normalize_name(old_name)
    new = normalize_name(new_name)
    if old == new:
        raise ValueError("The new collection name is unchanged.")
    if old not in list_collections():
        raise FileNotFoundError(f"Collection '{old}' does not exist.")
    if new in list_collections():
        raise FileExistsError(f"Collection '{new}' already exists.")

    documents_root = get_documents_dir()
    old_documents = documents_root / old
    new_documents = documents_root / new
    if new_documents.exists():
        raise FileExistsError(f"Document directory '{new}' already exists.")

    old_table = table_name(old)
    if old_table not in LanceStore.get_all_tables(prefix="rag_"):
        success, message = LanceStore.create_table(old_table)
        if not success:
            raise RuntimeError(message)

    success, message = LanceStore.rename_table(old_table, table_name(new))
    if not success:
        raise RuntimeError(message)

    documents_moved = False
    try:
        if old_documents.exists():
            new_documents.parent.mkdir(parents=True, exist_ok=True)
            old_documents.rename(new_documents)
            documents_moved = True

        db.update_collection_name(
            old,
            new,
            documents_root=os.fspath(documents_root),
        )
        return new
    except Exception:
        if documents_moved:
            new_documents.rename(old_documents)
        LanceStore.rename_table(table_name(new), old_table)
        raise


def delete_collection(name: str) -> None:
    normalized = normalize_name(name)
    if normalized not in list_collections():
        raise FileNotFoundError(f"Collection '{normalized}' does not exist.")
    if not LanceStore.delete_table_by_name(table_name(normalized)):
        raise RuntimeError("Could not delete the LanceDB collection table.")

    db.delete_tabular_files_by_collection(normalized)
    db.delete_collection_data(normalized)
    documents = get_documents_dir() / normalized
    if documents.exists():
        shutil.rmtree(documents)
