"""
SQLite persistence for conversations, Q&A runs, messages, and user ratings.
"""
from __future__ import annotations

import json
import math
import os
import sqlite3
import time
import uuid
from typing import Any, Dict, List, Optional, Sequence, Tuple

# Default path relative to project root
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "rag_app.db")


def get_db_path() -> str:
    return os.getenv("APP_DB_PATH", DEFAULT_DB_PATH)


def get_connection() -> sqlite3.Connection:
    path = get_db_path()
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: Optional[sqlite3.Connection] = None) -> None:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        conn.executescript(
            """
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                collection_name TEXT NOT NULL,
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS qa_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                collection_name TEXT NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                sources_json TEXT,
                metrics_json TEXT,
                ragas_json TEXT,
                optimization_log TEXT,
                engine_key TEXT,
                created_at REAL NOT NULL,
                question_embedding TEXT
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                qa_run_id INTEGER,
                created_at REAL NOT NULL,
                FOREIGN KEY (qa_run_id) REFERENCES qa_runs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qa_run_id INTEGER NOT NULL REFERENCES qa_runs(id) ON DELETE CASCADE,
                rating TEXT NOT NULL CHECK (rating IN ('like', 'dislike')),
                comment TEXT,
                created_at REAL NOT NULL,
                UNIQUE (qa_run_id)
            );

            CREATE INDEX IF NOT EXISTS idx_qa_runs_collection ON qa_runs(collection_name);
            CREATE INDEX IF NOT EXISTS idx_qa_runs_created ON qa_runs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
            """
        )
        conn.commit()
    finally:
        if own:
            conn.close()


def create_conversation(collection_name: str, conn: Optional[sqlite3.Connection] = None) -> str:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        cid = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO conversations (id, collection_name, created_at) VALUES (?, ?, ?)",
            (cid, collection_name, time.time()),
        )
        conn.commit()
        return cid
    finally:
        if own:
            conn.close()


def insert_message(
    conversation_id: str,
    role: str,
    content: str,
    qa_run_id: Optional[int] = None,
    conn: Optional[sqlite3.Connection] = None,
) -> int:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        cur = conn.execute(
            """
            INSERT INTO messages (conversation_id, role, content, qa_run_id, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (conversation_id, role, content, qa_run_id, time.time()),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        if own:
            conn.close()


def insert_qa_run(
    conversation_id: str,
    collection_name: str,
    question: str,
    answer: str,
    sources: Any,
    metrics: Any,
    ragas: Any,
    optimization_log: str,
    engine_key: str,
    question_embedding: Optional[Sequence[float]],
    conn: Optional[sqlite3.Connection] = None,
) -> int:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        emb_json = json.dumps(list(question_embedding)) if question_embedding is not None else None
        ragas_json = json.dumps(ragas, default=str) if ragas is not None else None
        cur = conn.execute(
            """
            INSERT INTO qa_runs (
                conversation_id, collection_name, question, answer,
                sources_json, metrics_json, ragas_json, optimization_log, engine_key,
                created_at, question_embedding
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                conversation_id,
                collection_name,
                question,
                answer,
                json.dumps(sources, default=str) if sources is not None else None,
                json.dumps(metrics, default=str) if metrics is not None else None,
                ragas_json,
                optimization_log or "",
                engine_key or "",
                time.time(),
                emb_json,
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        if own:
            conn.close()


def _cosine_sim(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return -1.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return -1.0
    return dot / (na * nb)


def search_similar_qa(
    collection_name: str,
    query_embedding: Sequence[float],
    top_k: int = 3,
    exclude_qa_run_id: Optional[int] = None,
    conn: Optional[sqlite3.Connection] = None,
) -> List[Dict[str, Any]]:
    """Return past Q/A rows for the same collection ranked by cosine similarity to query_embedding."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        qe = list(query_embedding)
        rows = conn.execute(
            """
            SELECT id, question, answer, question_embedding
            FROM qa_runs
            WHERE collection_name = ? AND question_embedding IS NOT NULL
            """,
            (collection_name,),
        ).fetchall()
        scored: List[Tuple[float, sqlite3.Row]] = []
        for row in rows:
            if exclude_qa_run_id is not None and row["id"] == exclude_qa_run_id:
                continue
            try:
                emb = json.loads(row["question_embedding"])
            except (TypeError, json.JSONDecodeError):
                continue
            sim = _cosine_sim(qe, emb)
            scored.append((sim, row))
        scored.sort(key=lambda x: x[0], reverse=True)
        out: List[Dict[str, Any]] = []
        for sim, row in scored[:top_k]:
            if sim < 0:
                continue
            out.append(
                {
                    "id": row["id"],
                    "question": row["question"],
                    "answer": row["answer"],
                    "similarity": sim,
                }
            )
        return out
    finally:
        if own:
            conn.close()


def upsert_rating(
    qa_run_id: int,
    rating: str,
    comment: Optional[str] = None,
    conn: Optional[sqlite3.Connection] = None,
) -> None:
    if rating not in ("like", "dislike"):
        raise ValueError("rating must be 'like' or 'dislike'")
    own = conn is None
    if own:
        conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO ratings (qa_run_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(qa_run_id) DO UPDATE SET
                rating = excluded.rating,
                comment = excluded.comment,
                created_at = excluded.created_at
            """,
            (qa_run_id, rating, comment, time.time()),
        )
        conn.commit()
    finally:
        if own:
            conn.close()


def list_recent_qa_runs(
    collection_name: str,
    limit: int = 30,
    conn: Optional[sqlite3.Connection] = None,
) -> List[Dict[str, Any]]:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, conversation_id, question,
                   substr(answer, 1, 200) AS answer_preview,
                   created_at
            FROM qa_runs
            WHERE collection_name = ?
            ORDER BY created_at ASC
            LIMIT ?
            """,
            (collection_name, limit),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        if own:
            conn.close()


def get_qa_run(qa_run_id: int, conn: Optional[sqlite3.Connection] = None) -> Optional[Dict[str, Any]]:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM qa_runs WHERE id = ?",
            (qa_run_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        if own:
            conn.close()


def iter_qa_runs_with_ratings(
    collection_name: Optional[str] = None,
    rating_filter: Optional[str] = None,
    require_rating: bool = False,
    conn: Optional[sqlite3.Connection] = None,
):
    """
    Yield qa_runs joined with ratings for training export.

    rating_filter: None (all), 'like', 'dislike'
    require_rating: if True, only rows that have a rating
    """
    own = conn is None
    if own:
        conn = get_connection()
    try:
        sql = """
            SELECT
                q.id AS qa_run_id,
                q.conversation_id,
                q.collection_name,
                q.question,
                q.answer,
                q.sources_json,
                q.metrics_json,
                q.ragas_json,
                q.optimization_log,
                q.engine_key,
                q.created_at,
                r.rating AS user_rating,
                r.comment AS rating_comment
            FROM qa_runs q
            LEFT JOIN ratings r ON r.qa_run_id = q.id
            WHERE 1=1
        """
        params: List[Any] = []
        if collection_name:
            sql += " AND q.collection_name = ?"
            params.append(collection_name)
        if require_rating:
            sql += " AND r.rating IS NOT NULL"
        if rating_filter in ("like", "dislike"):
            sql += " AND r.rating = ?"
            params.append(rating_filter)
        sql += " ORDER BY q.created_at ASC"
        rows = conn.execute(sql, params).fetchall()
        for row in rows:
            d = dict(row)
            for key in ("sources_json", "metrics_json", "ragas_json"):
                raw = d.get(key)
                if raw:
                    try:
                        d[key.replace("_json", "")] = json.loads(raw)
                    except (TypeError, json.JSONDecodeError):
                        d[key.replace("_json", "")] = raw
                else:
                    d[key.replace("_json", "")] = None
            yield d
    finally:
        if own:
            conn.close()


def build_training_jsonl_line(
    row: Dict[str, Any],
    format_name: str = "record",
) -> Dict[str, Any]:
    """
    format_name:
      - record: rich flat record (default)
      - sft_messages: OpenAI-style chat for supervised fine-tuning
      - sft_alpaca: instruction/input/output style
    """
    q = row.get("question") or ""
    a = row.get("answer") or ""
    if format_name == "sft_messages":
        return {
            "messages": [
                {"role": "user", "content": q},
                {"role": "assistant", "content": a},
            ],
            "metadata": {
                "qa_run_id": row.get("qa_run_id"),
                "collection_name": row.get("collection_name"),
                "user_rating": row.get("user_rating"),
                "rating_comment": row.get("rating_comment"),
            },
        }
    if format_name == "sft_alpaca":
        return {
            "instruction": "Answer the user question using your knowledge and any prior context.",
            "input": q,
            "output": a,
            "metadata": {
                "qa_run_id": row.get("qa_run_id"),
                "collection_name": row.get("collection_name"),
                "user_rating": row.get("user_rating"),
            },
        }
    # record
    return {
        "qa_run_id": row.get("qa_run_id"),
        "conversation_id": row.get("conversation_id"),
        "collection_name": row.get("collection_name"),
        "question": q,
        "answer": a,
        "sources": row.get("sources"),
        "metrics": row.get("metrics"),
        "ragas": row.get("ragas"),
        "user_rating": row.get("user_rating"),
        "rating_comment": row.get("rating_comment"),
        "created_at": row.get("created_at"),
        "engine_key": row.get("engine_key"),
    }


def export_training_jsonl_bytes(
    collection_name: Optional[str] = None,
    rating_filter: Optional[str] = None,
    require_rating: bool = False,
    format_name: str = "record",
) -> bytes:
    """Return UTF-8 JSONL bytes for download or file write."""
    lines: List[str] = []
    for row in iter_qa_runs_with_ratings(
        collection_name=collection_name,
        rating_filter=rating_filter,
        require_rating=require_rating,
    ):
        obj = build_training_jsonl_line(row, format_name=format_name)
        lines.append(json.dumps(obj, ensure_ascii=False, default=str))
    return ("\n".join(lines) + ("\n" if lines else "")).encode("utf-8")
