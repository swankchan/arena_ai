"""Collection-scoped tabular metadata and read-only SQL execution."""

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote

from backend import db
from backend.config import get_documents_dir, get_max_sql_rows


def _json_value(value):
    if isinstance(value, bytes):
        return value.hex()
    return value


def _public_file(row: sqlite3.Row) -> dict:
    item = dict(row)
    item.pop("db_path", None)
    item.pop("metadata_json", None)
    item["columns"] = json.loads(item.pop("columns_json", None) or "{}")
    return item


def get_file(collection_name: str, file_id: int) -> Optional[dict]:
    with db.get_db_connection() as conn:
        row = conn.execute(
            "SELECT * FROM tabular_files WHERE id = ? AND collection_name = ?",
            (file_id, collection_name),
        ).fetchone()
    return dict(row) if row else None


def list_files(collection_name: str) -> List[dict]:
    with db.get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM tabular_files
            WHERE collection_name = ? ORDER BY created_at DESC
            """,
            (collection_name,),
        ).fetchall()
    return [_public_file(row) for row in rows]


def _read_only_connection(file_info: dict) -> sqlite3.Connection:
    configured = file_info.get("db_path")
    if not configured:
        raise FileNotFoundError("The tabular database is missing.")

    path = Path(configured).resolve()
    collection_root = (
        get_documents_dir() / file_info["collection_name"] / "tabular"
    ).resolve()
    if path.parent != collection_root:
        raise ValueError("Invalid tabular database path.")
    if not path.is_file():
        raise FileNotFoundError("The tabular database file does not exist.")

    uri = f"file:{quote(os.fspath(path))}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA query_only = ON")
    return conn


def execute_sql(file_info: dict, query: str) -> Dict[str, Any]:
    stripped = query.strip().rstrip(";").strip()
    if not stripped.upper().startswith(("SELECT", "WITH")):
        raise ValueError("Only read-only SELECT or WITH queries are allowed.")

    conn = _read_only_connection(file_info)
    try:
        cursor = conn.execute(stripped)
        if cursor.description is None:
            raise ValueError("The query did not return a result set.")
        columns = [item[0] for item in cursor.description]
        max_rows = get_max_sql_rows()
        rows = cursor.fetchmany(max_rows + 1)
        truncated = len(rows) > max_rows
        rows = rows[:max_rows]
        return {
            "columns": columns,
            "rows": [
                {key: _json_value(value) for key, value in dict(row).items()}
                for row in rows
            ],
            "row_count": len(rows),
            "truncated": truncated,
        }
    except sqlite3.Error as exc:
        raise ValueError(str(exc)) from exc
    finally:
        conn.close()


def delete_file(collection_name: str, file_id: int) -> bool:
    if not get_file(collection_name, file_id):
        return False
    return db.delete_tabular_file_by_id(file_id)
