from __future__ import annotations

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

"""
SQLite persistence for conversations, Q&A runs, messages, and user ratings.
"""

import json
import math
import os
import sqlite3
import time
import uuid
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Sequence, Tuple

# Default path relative to the repository root, not the backend package.
DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "rag_app.db",
)


def get_db_path() -> str:
    return os.getenv("APP_DB_PATH", DEFAULT_DB_PATH)


def get_connection() -> sqlite3.Connection:
    path = get_db_path()
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False, cached_statements=128)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db_connection():
    """Context manager for database connections with automatic cleanup."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def _qa_runs_has_column(conn: sqlite3.Connection, column: str) -> bool:
    """Check if qa_runs table has a specific column."""
    columns = [col[1] for col in conn.execute("PRAGMA table_info(qa_runs)").fetchall()]
    return column in columns


def _tabular_files_has_column(conn: sqlite3.Connection, column: str) -> bool:
    """Check if tabular_files table has a specific column."""
    columns = [col[1] for col in conn.execute("PRAGMA table_info(tabular_files)").fetchall()]
    return column in columns


def _conversations_has_column(conn: sqlite3.Connection, column: str) -> bool:
    """Check if conversations table has a specific column."""
    columns = [col[1] for col in conn.execute("PRAGMA table_info(conversations)").fetchall()]
    return column in columns


def extract_topic_from_text(text: str, max_length: int = 50) -> str:
    """Extract a topic name from text, using the first max_length characters."""
    if not text:
        return "Untitled"
    # Strip whitespace and get first max_length chars
    clean_text = text.strip()[:max_length]
    # Remove any trailing partial words
    if len(text) > max_length and text[max_length] != ' ':
        last_space = clean_text.rfind(' ')
        if last_space > 0:
            clean_text = clean_text[:last_space]
    return clean_text.strip() if clean_text else "Untitled"


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
                name TEXT,
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS collection_summaries (
                collection_name TEXT PRIMARY KEY,
                summary TEXT NOT NULL,
                updated_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS qa_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                collection_name TEXT NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                sources_json TEXT,
                metrics_json TEXT,
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

            CREATE TABLE IF NOT EXISTS system_prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                content TEXT NOT NULL,
                is_default INTEGER DEFAULT 0,
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tabular_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collection_name TEXT NOT NULL,
                filename TEXT NOT NULL,
                table_name TEXT NOT NULL,
                row_count INTEGER DEFAULT 0,
                columns_json TEXT,
                metadata_json TEXT,
                db_path TEXT,
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tabular_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tabular_file_id INTEGER NOT NULL REFERENCES tabular_files(id) ON DELETE CASCADE,
                analysis_type TEXT NOT NULL,
                parameters_json TEXT,
                results_json TEXT,
                created_at REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_qa_runs_collection ON qa_runs(collection_name);
            CREATE INDEX IF NOT EXISTS idx_qa_runs_created ON qa_runs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_system_prompts_default ON system_prompts(is_default);
            """
        )

        # Migrate: add db_path column if it doesn't exist
        if not _tabular_files_has_column(conn, "db_path"):
            conn.execute("ALTER TABLE tabular_files ADD COLUMN db_path TEXT")

        # Migrate: add name column to conversations if it doesn't exist
        if not _conversations_has_column(conn, "name"):
            conn.execute("ALTER TABLE conversations ADD COLUMN name TEXT")

        conn.commit()
    finally:
        if own:
            conn.close()

    # Initialize default system prompts if none exist
    init_system_prompts()


def get_collection_summary(
    collection_name: str,
    conn: Optional[sqlite3.Connection] = None,
) -> Optional[dict]:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT summary, updated_at FROM collection_summaries
            WHERE collection_name = ?
            """,
            (collection_name,),
        ).fetchone()
        if not row:
            return None
        return {
            "collection": collection_name,
            "summary": row["summary"],
            "updated_at": row["updated_at"],
        }
    finally:
        if own:
            conn.close()


def set_collection_summary(
    collection_name: str,
    summary: str,
    conn: Optional[sqlite3.Connection] = None,
) -> dict:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        updated_at = time.time()
        conn.execute(
            """
            INSERT INTO collection_summaries (collection_name, summary, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(collection_name) DO UPDATE SET
                summary = excluded.summary,
                updated_at = excluded.updated_at
            """,
            (collection_name, summary, updated_at),
        )
        conn.commit()
        return {
            "collection": collection_name,
            "summary": summary,
            "updated_at": updated_at,
        }
    finally:
        if own:
            conn.close()


def delete_collection_summary(
    collection_name: str,
    conn: Optional[sqlite3.Connection] = None,
) -> bool:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        result = conn.execute(
            "DELETE FROM collection_summaries WHERE collection_name = ?",
            (collection_name,),
        )
        conn.commit()
        return result.rowcount > 0
    finally:
        if own:
            conn.close()


def create_conversation(collection_name: str, name: Optional[str] = None, conn: Optional[sqlite3.Connection] = None) -> str:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        cid = str(uuid.uuid4())
        if name:
            conn.execute(
                "INSERT INTO conversations (id, collection_name, name, created_at) VALUES (?, ?, ?, ?)",
                (cid, collection_name, name, time.time()),
            )
        else:
            conn.execute(
                "INSERT INTO conversations (id, collection_name, created_at) VALUES (?, ?, ?)",
                (cid, collection_name, time.time()),
            )
        conn.commit()
        return cid
    finally:
        if own:
            conn.close()


def list_conversations(collection_name: str, conn: Optional[sqlite3.Connection] = None) -> List[Dict[str, Any]]:
    """List all conversations for a collection, ordered by most recent first."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, name, created_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id) as message_count,
                   (SELECT MAX(created_at) FROM messages WHERE conversation_id = conversations.id) as last_active
            FROM conversations
            WHERE collection_name = ?
            ORDER BY last_active DESC, created_at DESC
            """,
            (collection_name,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        if own:
            conn.close()


def get_conversation_by_id(conversation_id: str, conn: Optional[sqlite3.Connection] = None) -> Optional[Dict[str, Any]]:
    """Get a specific conversation by ID."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        if own:
            conn.close()


def set_conversation_name_from_first_message(conversation_id: str, conn: Optional[sqlite3.Connection] = None) -> Optional[str]:
    """Extract and set thread name from the first user message."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        # Get the first user message for this conversation
        row = conn.execute(
            "SELECT content FROM messages WHERE conversation_id = ? AND role = 'user' ORDER BY created_at ASC LIMIT 1",
            (conversation_id,),
        ).fetchone()

        if row:
            topic = extract_topic_from_text(row["content"])
            conn.execute(
                "UPDATE conversations SET name = ? WHERE id = ?",
                (topic, conversation_id)
            )
            conn.commit()
            return topic
        return None
    finally:
        if own:
            conn.close()


def delete_conversation(conversation_id: str, conn: Optional[sqlite3.Connection] = None) -> bool:
    """Delete a conversation and all its associated data (messages, qa_runs)."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        # Verify conversation exists and get collection_name
        row = conn.execute(
            "SELECT collection_name FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone()
        if not row:
            return False

        conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        conn.commit()
        return True
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

        # Set thread name from first user message
        if role == "user":
            # Check if this is the first user message by counting all user messages
            # After commit, if count is 1, this was the first user message
            existing_user_msg = conn.execute(
                "SELECT COUNT(*) FROM messages WHERE conversation_id = ? AND role = 'user'",
                (conversation_id,),
            ).fetchone()
            if existing_user_msg and existing_user_msg[0] == 1:
                set_conversation_name_from_first_message(conversation_id, conn)

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
    optimization_log: str,
    engine_key: str,
    question_embedding: Optional[Sequence[float]],
    conn: Optional[sqlite3.Connection] = None,
) -> int:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        # Store embedding as BLOB (binary) for space efficiency
        emb_blob = None
        if question_embedding is not None:
            import struct
            emb_list = list(question_embedding)
            # Pack floats as binary (4 bytes each)
            emb_blob = struct.pack(f'{len(emb_list)}f', *emb_list)
        cur = conn.execute(
            """
            INSERT INTO qa_runs (
                conversation_id, collection_name, question, answer,
                sources_json, metrics_json, optimization_log, engine_key,
                created_at, question_embedding
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                conversation_id,
                collection_name,
                question,
                answer,
                json.dumps(sources, default=str) if sources is not None else None,
                json.dumps(metrics, default=str) if metrics is not None else None,
                optimization_log or "",
                engine_key or "",
                time.time(),
                emb_blob,
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
        import struct
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
                # Try to load as BLOB first, fall back to JSON for compatibility
                emb_blob = row["question_embedding"]
                if isinstance(emb_blob, bytes):
                    # BLOB format
                    emb = list(struct.unpack(f'{len(qe)}f', emb_blob))
                else:
                    # JSON format (fallback for older records)
                    emb = json.loads(emb_blob)
            except (TypeError, json.JSONDecodeError, struct.error):
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


def delete_qa_run(qa_run_id: int, conn: Optional[sqlite3.Connection] = None) -> None:
    """Delete a specific QA run and its associated messages."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        conn.execute("DELETE FROM qa_runs WHERE id = ?", (qa_run_id,))
        conn.commit()
    finally:
        if own:
            conn.close()


def get_conversation_messages(conversation_id: str, conn: Optional[sqlite3.Connection] = None) -> List[Dict[str, Any]]:
    """Get all messages for a conversation, ordered by creation time."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, role, content, qa_run_id, created_at
            FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
            """,
            (conversation_id,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        if own:
            conn.close()


def init_system_prompts(conn: Optional[sqlite3.Connection] = None) -> None:
    """Initialize system prompts with default values if none exist."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        # Check if any prompts exist
        count = conn.execute("SELECT COUNT(*) FROM system_prompts").fetchone()[0]
        if count == 0:
            # Default prompts for AI safety
            default_prompts = [
                (
                    "collection_guard",
                    """You are a helpful AI assistant specialized in answering questions based on the provided knowledge base.

IMPORTANT GUIDELINES:
- ONLY answer questions about the content in the provided context
- If the question is about a topic outside the context, respond: "I cannot find information about this in the provided knowledge base."
- Do not use your general knowledge - stick strictly to the context
- If the context does not contain enough information to answer fully, say what you can based on the context""",
                    1
                ),
                (
                    "general_assistant",
                    """You are a helpful AI assistant. The context below may include:
(1) recent conversation with the user,
(2) similar past Q&A from stored history,
(3) retrieved document excerpts from the knowledge base.

Use all relevant parts to answer. If the answer is not supported by the context, say that you don't know.
For follow-up questions, use the recent conversation when the user refers to "it", "that", etc.

IMPORTANT: Respond in the SAME LANGUAGE as the user's question. If the question is in Chinese, answer in Chinese. If in English, answer in English.

First, provide your step-by-step reasoning based ONLY on the provided context (including memory blocks).
Then, provide the final concise answer.""",
                    0
                ),
                (
                    "strict_retrieval",
                    """You are a strict retrieval assistant. Your task is to extract and summarize information from the provided context ONLY.

RULES:
- NEVER infer or assume information not explicitly stated in the context
- If the context does not contain the answer, say "The context does not contain information about this."
- Do not add personal opinions or explanations
- Use bullet points for clarity when summarizing multiple facts""",
                    0
                ),
            ]
            for name, content, is_default in default_prompts:
                conn.execute(
                    "INSERT INTO system_prompts (name, content, is_default, created_at) VALUES (?, ?, ?, ?)",
                    (name, content, is_default, time.time()),
                )
            conn.commit()
    finally:
        if own:
            conn.close()


def list_system_prompts(conn: Optional[sqlite3.Connection] = None) -> List[Dict[str, Any]]:
    """List all available system prompts."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, name, content, is_default, created_at FROM system_prompts ORDER BY name",
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        if own:
            conn.close()


def get_default_system_prompt(conn: Optional[sqlite3.Connection] = None) -> Optional[Dict[str, Any]]:
    """Get the default system prompt."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM system_prompts WHERE is_default = 1 LIMIT 1",
        ).fetchone()
        return dict(row) if row else None
    finally:
        if own:
            conn.close()


def get_system_prompt_by_name(name: str, conn: Optional[sqlite3.Connection] = None) -> Optional[Dict[str, Any]]:
    """Get a system prompt by its name."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM system_prompts WHERE name = ? LIMIT 1",
            (name,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        if own:
            conn.close()


def insert_system_prompt(name: str, content: str, is_default: bool = False, conn: Optional[sqlite3.Connection] = None) -> int:
    """Insert a new system prompt. Returns the ID."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        # If setting as default, unset others
        if is_default:
            conn.execute("UPDATE system_prompts SET is_default = 0 WHERE is_default = 1")
        cur = conn.execute(
            "INSERT INTO system_prompts (name, content, is_default, created_at) VALUES (?, ?, ?, ?)",
            (name, content, 1 if is_default else 0, time.time()),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        if own:
            conn.close()


def update_system_prompt(prompt_id: int, name: Optional[str] = None, content: Optional[str] = None,
                         is_default: Optional[bool] = None, conn: Optional[sqlite3.Connection] = None) -> bool:
    """Update an existing system prompt. Returns True if successful."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        updates = []
        params = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if content is not None:
            updates.append("content = ?")
            params.append(content)
        if is_default is not None:
            # If setting as default, unset others
            if is_default:
                conn.execute("UPDATE system_prompts SET is_default = 0 WHERE is_default = 1")
            updates.append("is_default = ?")
            params.append(1 if is_default else 0)

        if not updates:
            return False

        params.append(prompt_id)
        conn.execute(f"UPDATE system_prompts SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        return True
    finally:
        if own:
            conn.close()


def delete_system_prompt(prompt_id: int, conn: Optional[sqlite3.Connection] = None) -> bool:
    """Delete a system prompt. Cannot delete the last remaining prompt."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        count = conn.execute("SELECT COUNT(*) FROM system_prompts").fetchone()[0]
        if count <= 1:
            return False  # Cannot delete the last prompt

        conn.execute("DELETE FROM system_prompts WHERE id = ?", (prompt_id,))
        conn.commit()
        return True
    finally:
        if own:
            conn.close()


def delete_tabular_file_by_id(file_id: int, conn: Optional[sqlite3.Connection] = None) -> bool:
    """Delete a specific tabular file by its ID.

    Args:
        file_id: The ID of the tabular file to delete
        conn: Optional database connection

    Returns:
        True if file was deleted, False if not found
    """
    own = conn is None
    if own:
        conn = get_connection()
    try:
        # Get the database path before deleting
        row = conn.execute(
            "SELECT db_path, collection_name FROM tabular_files WHERE id = ?", (file_id,)
        ).fetchone()

        if not row:
            return False

        db_path = row['db_path']

        # Delete analysis records first (cascade)
        conn.execute("DELETE FROM tabular_analysis WHERE tabular_file_id = ?", (file_id,))
        # Delete tabular file
        conn.execute("DELETE FROM tabular_files WHERE id = ?", (file_id,))
        conn.commit()

        # Delete associated database file
        if db_path and os.path.exists(db_path):
            os.remove(db_path)

        return True
    finally:
        if own:
            conn.close()


def delete_tabular_files_by_collection(collection_name: str, conn: Optional[sqlite3.Connection] = None) -> int:
    """Delete all tabular files associated with a collection."""
    own = conn is None
    if own:
        conn = get_connection()
    try:
        # Get list of database paths to delete
        db_paths = conn.execute(
            "SELECT db_path FROM tabular_files WHERE collection_name = ?", (collection_name,)
        ).fetchall()

        # Delete analysis records first (cascade)
        conn.execute("DELETE FROM tabular_analysis WHERE tabular_file_id IN (SELECT id FROM tabular_files WHERE collection_name = ?)", (collection_name,))
        # Delete tabular files
        result = conn.execute("DELETE FROM tabular_files WHERE collection_name = ?", (collection_name,))
        conn.commit()

        # Delete associated database files
        import os
        for row in db_paths:
            db_path = row['db_path']
            if db_path and os.path.exists(db_path):
                os.remove(db_path)

        return result.rowcount
    finally:
        if own:
            conn.close()


def delete_collection_data(collection_name: str, conn: Optional[sqlite3.Connection] = None) -> dict:
    """Delete all collection-related data from database.

    Returns a dict with counts of deleted records for each table.
    """
    own = conn is None
    if own:
        conn = get_connection()
    try:
        deleted = {}

        # Delete ratings (depends on qa_runs)
        deleted['ratings'] = conn.execute("DELETE FROM ratings WHERE qa_run_id IN (SELECT id FROM qa_runs WHERE collection_name = ?)", (collection_name,)).rowcount

        # Delete qa_runs
        deleted['qa_runs'] = conn.execute("DELETE FROM qa_runs WHERE collection_name = ?", (collection_name,)).rowcount

        # Delete messages (depends on conversations, cascades from qa_runs)
        deleted['messages'] = conn.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE collection_name = ?)", (collection_name,)).rowcount

        # Delete conversations
        deleted['conversations'] = conn.execute("DELETE FROM conversations WHERE collection_name = ?", (collection_name,)).rowcount

        # Delete generated collection metadata
        deleted['collection_summaries'] = conn.execute(
            "DELETE FROM collection_summaries WHERE collection_name = ?",
            (collection_name,),
        ).rowcount

        conn.commit()
        return deleted
    finally:
        if own:
            conn.close()


def update_collection_name(
    old_name: str,
    new_name: str,
    conn: Optional[sqlite3.Connection] = None,
    documents_root: Optional[str] = None,
) -> bool:
    """Update collection names and, optionally, stored tabular DB paths.

    Updates conversations, qa_runs, and tabular_files in one transaction.
    """
    own = conn is None
    if own:
        conn = get_connection()
    try:
        # Update conversations
        conn.execute("UPDATE conversations SET collection_name = ? WHERE collection_name = ?", (new_name, old_name))

        # Move generated collection metadata with the collection
        conn.execute(
            "UPDATE collection_summaries SET collection_name = ? WHERE collection_name = ?",
            (new_name, old_name),
        )

        # Update qa_runs
        conn.execute("UPDATE qa_runs SET collection_name = ? WHERE collection_name = ?", (new_name, old_name))

        # Update tabular_files
        conn.execute("UPDATE tabular_files SET collection_name = ? WHERE collection_name = ?", (new_name, old_name))

        if documents_root:
            old_prefix = os.path.normpath(os.path.join(documents_root, old_name))
            new_prefix = os.path.normpath(os.path.join(documents_root, new_name))
            rows = conn.execute(
                "SELECT id, db_path FROM tabular_files WHERE collection_name = ?",
                (new_name,),
            ).fetchall()
            for row in rows:
                stored_path = row["db_path"]
                if not stored_path:
                    continue
                normalized_path = os.path.normpath(stored_path)
                if normalized_path == old_prefix or normalized_path.startswith(
                    old_prefix + os.sep
                ):
                    suffix = normalized_path[len(old_prefix):].lstrip(os.sep)
                    updated_path = os.path.join(new_prefix, suffix)
                    conn.execute(
                        "UPDATE tabular_files SET db_path = ? WHERE id = ?",
                        (updated_path, row["id"]),
                    )

        conn.commit()
        return True
    finally:
        if own:
            conn.close()


