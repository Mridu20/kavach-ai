"""
Local conversation store (SQLite).

Persists chat history on disk so the assistant can resolve follow-up questions
against earlier turns, and so users can reopen past conversations.

SQLite is deliberate: it ships with Python, needs no server, and keeps the
deployment air-gapped. One file under backend/storage/ holds everything.
"""

import os
import json
import sqlite3
import logging
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("kavach.conversations")

DEFAULT_DB_PATH = os.path.join("backend", "storage", "conversations.db")

# How many prior turns are replayed into the model prompt. Each turn costs
# context; 10 covers ordinary follow-up chains without crowding out retrieved
# knowledge base passages in a 32k window.
DEFAULT_HISTORY_TURNS = 10

_SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    user_id     TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id  TEXT NOT NULL,
    role             TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content          TEXT NOT NULL,
    citations        TEXT,
    task_id          TEXT,
    created_at       TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversation_id, id);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _derive_title(text: str, limit: int = 60) -> str:
    """Names a conversation after its opening message."""
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return "New conversation"
    return cleaned[: limit - 1] + "…" if len(cleaned) > limit else cleaned


class ConversationStore:
    """Thread-safe SQLite-backed conversation history."""

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        # Uvicorn serves requests across threads; a single shared connection
        # needs check_same_thread off plus an explicit lock around writes.
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.executescript(_SCHEMA)
        self._migrate()
        self._conn.commit()

    def _migrate(self) -> None:
        """
        Brings an existing database up to the current schema.

        Conversations predating user accounts have no owner. They are left with
        a NULL user_id rather than being assigned to whoever logs in first,
        which would hand one user another's history.
        """
        columns = {
            row["name"]
            for row in self._conn.execute("PRAGMA table_info(conversations)").fetchall()
        }
        if "user_id" not in columns:
            logger.info("Adding user_id to conversations (pre-auth database).")
            self._conn.execute("ALTER TABLE conversations ADD COLUMN user_id TEXT")

    # ── Conversations ────────────────────────────────────────────────────

    def create_conversation(self, title: Optional[str] = None, user_id: Optional[str] = None) -> str:
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        timestamp = _now()
        with self._lock:
            self._conn.execute(
                "INSERT INTO conversations (id, title, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (conversation_id, title or "New conversation", user_id, timestamp, timestamp),
            )
            self._conn.commit()
        return conversation_id

    def ensure_conversation(
        self,
        conversation_id: Optional[str],
        first_message: str,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Returns a usable conversation id, creating one when absent.

        An id belonging to somebody else is treated as absent, so a guessed or
        stale id can never append to another user's history. The same path
        covers a conversation deleted in another tab.
        """
        if conversation_id:
            existing = self.get_conversation(conversation_id, user_id=user_id)
            if existing:
                return conversation_id
        return self.create_conversation(_derive_title(first_message), user_id=user_id)

    def get_conversation(
        self, conversation_id: str, user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Fetches a conversation, scoped to its owner when a user is given.

        Passing user_id=None returns it regardless of owner; that is for
        internal callers only, never for a request-handling path.
        """
        with self._lock:
            if user_id is None:
                row = self._conn.execute(
                    "SELECT * FROM conversations WHERE id = ?", (conversation_id,)
                ).fetchone()
            else:
                row = self._conn.execute(
                    "SELECT * FROM conversations WHERE id = ? AND user_id IS ?",
                    (conversation_id, user_id),
                ).fetchone()
        return dict(row) if row else None

    def list_conversations(
        self, limit: int = 50, user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Lists a user's own conversations, most recently updated first."""
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT c.*, COUNT(m.id) AS message_count
                FROM conversations c
                LEFT JOIN messages m ON m.conversation_id = c.id
                WHERE c.user_id IS ?
                GROUP BY c.id
                ORDER BY c.updated_at DESC
                LIMIT ?
                """,
                (user_id, limit),
            ).fetchall()
        return [dict(r) for r in rows]

    def rename_conversation(
        self, conversation_id: str, title: str, user_id: Optional[str] = None
    ) -> bool:
        if not self.get_conversation(conversation_id, user_id=user_id):
            return False
        with self._lock:
            cur = self._conn.execute(
                "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
                (title, _now(), conversation_id),
            )
            self._conn.commit()
        return cur.rowcount > 0

    def delete_conversation(self, conversation_id: str, user_id: Optional[str] = None) -> bool:
        # Ownership is checked first: without it, any signed-in user could
        # delete another user's conversation by guessing its id.
        if not self.get_conversation(conversation_id, user_id=user_id):
            return False
        with self._lock:
            # Messages are removed explicitly: ON DELETE CASCADE only fires
            # when foreign key enforcement is on for this connection.
            self._conn.execute(
                "DELETE FROM messages WHERE conversation_id = ?", (conversation_id,)
            )
            cur = self._conn.execute(
                "DELETE FROM conversations WHERE id = ?", (conversation_id,)
            )
            self._conn.commit()
        return cur.rowcount > 0

    # ── Messages ─────────────────────────────────────────────────────────

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        citations: Optional[List[Dict[str, Any]]] = None,
        task_id: Optional[str] = None,
    ) -> int:
        timestamp = _now()
        with self._lock:
            cur = self._conn.execute(
                """
                INSERT INTO messages (conversation_id, role, content, citations, task_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    conversation_id,
                    role,
                    content,
                    json.dumps(citations) if citations else None,
                    task_id,
                    timestamp,
                ),
            )
            self._conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (timestamp, conversation_id),
            )
            self._conn.commit()
        return cur.lastrowid

    def get_messages(
        self, conversation_id: str, limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Returns messages oldest-first. With a limit, returns the most recent N."""
        with self._lock:
            if limit is None:
                rows = self._conn.execute(
                    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC",
                    (conversation_id,),
                ).fetchall()
            else:
                # Take the newest N, then restore chronological order.
                rows = self._conn.execute(
                    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?",
                    (conversation_id, limit),
                ).fetchall()
                rows = list(reversed(rows))

        messages = []
        for row in rows:
            item = dict(row)
            if item.get("citations"):
                try:
                    item["citations"] = json.loads(item["citations"])
                except (ValueError, TypeError):
                    item["citations"] = None
            messages.append(item)
        return messages

    def get_history_for_prompt(
        self, conversation_id: str, turns: int = DEFAULT_HISTORY_TURNS
    ) -> List[Dict[str, str]]:
        """
        Returns prior turns as {role, content} for prompt construction.

        Excludes the message just stored for the current request — callers add
        the live query separately, and repeating it confuses the model into
        answering twice.
        """
        messages = self.get_messages(conversation_id, limit=turns * 2)
        return [
            {"role": m["role"], "content": m["content"]}
            for m in messages
            if m.get("content")
        ]


_store_instance: Optional[ConversationStore] = None


def get_conversation_store() -> ConversationStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = ConversationStore()
    return _store_instance
