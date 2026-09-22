"""
Local user accounts and sessions (SQLite + bcrypt).

Runs entirely on the host. No identity provider, no cloud auth service: a
deployment with no internet must still be able to log people in, and any
outbound auth call would contradict the sovereignty the system claims.

Account model: the first account created becomes an administrator, and only an
administrator can create further accounts. Open self-registration is wrong for
a plant or government deployment, where access is granted rather than claimed.
"""

import os
import hashlib
import logging
import secrets
import sqlite3
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import bcrypt

logger = logging.getLogger("kavach.users")

DEFAULT_DB_PATH = os.path.join("backend", "storage", "conversations.db")
SESSION_TTL_HOURS = 12

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    username       TEXT NOT NULL UNIQUE,
    full_name      TEXT NOT NULL,
    email          TEXT,
    employee_id    TEXT,
    role           TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    password_hash  TEXT NOT NULL,
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL,
    created_by     TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
"""


class AuthError(Exception):
    """Raised for any authentication or authorisation failure."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    """
    Sessions are stored as a digest, never in the clear.

    A stolen database should not hand over live sessions, and the raw token
    exists only in the caller's browser.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class UserStore:
    """Thread-safe local account store."""

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    # ── Accounts ─────────────────────────────────────────────────────────

    def count_users(self) -> int:
        with self._lock:
            return self._conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]

    def needs_bootstrap(self) -> bool:
        """True when no accounts exist yet, so the first sign-up creates the admin."""
        return self.count_users() == 0

    def create_user(
        self,
        username: str,
        password: str,
        full_name: str,
        email: Optional[str] = None,
        employee_id: Optional[str] = None,
        role: str = "user",
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        username = (username or "").strip().lower()
        if not username:
            raise AuthError("Username is required.")
        if len(password or "") < 8:
            raise AuthError("Password must be at least 8 characters.")
        if role not in ("admin", "user"):
            raise AuthError("Role must be 'admin' or 'user'.")

        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode()

        try:
            with self._lock:
                self._conn.execute(
                    """
                    INSERT INTO users (id, username, full_name, email, employee_id,
                                       role, password_hash, is_active, created_at, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (
                        user_id,
                        username,
                        full_name or username,
                        email,
                        employee_id,
                        role,
                        password_hash,
                        _now().isoformat(),
                        created_by,
                    ),
                )
                self._conn.commit()
        except sqlite3.IntegrityError as e:
            raise AuthError(f"Username '{username}' is already taken.") from e

        return self.get_user(user_id)

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            row = self._conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return self._public(row) if row else None

    def get_by_username(self, username: str) -> Optional[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(
                "SELECT * FROM users WHERE username = ?", ((username or "").strip().lower(),)
            ).fetchone()

    def list_users(self) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM users ORDER BY created_at ASC"
            ).fetchall()
        return [self._public(r) for r in rows]

    def set_active(self, user_id: str, is_active: bool) -> bool:
        with self._lock:
            cur = self._conn.execute(
                "UPDATE users SET is_active = ? WHERE id = ?", (1 if is_active else 0, user_id)
            )
            if not is_active:
                # Revoke live sessions immediately; a deactivated account must
                # not keep working until its token happens to expire.
                self._conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
            self._conn.commit()
        return cur.rowcount > 0

    def delete_user(self, user_id: str) -> bool:
        with self._lock:
            self._conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
            cur = self._conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            self._conn.commit()
        return cur.rowcount > 0

    @staticmethod
    def _public(row: sqlite3.Row) -> Dict[str, Any]:
        """Account fields safe to return. Never includes the password hash."""
        return {
            "id": row["id"],
            "username": row["username"],
            "full_name": row["full_name"],
            "email": row["email"],
            "employee_id": row["employee_id"],
            "role": row["role"],
            "is_active": bool(row["is_active"]),
            "created_at": row["created_at"],
        }

    # ── Authentication ───────────────────────────────────────────────────

    def authenticate(self, username: str, password: str) -> Dict[str, Any]:
        """Verifies credentials and returns a session token plus the account."""
        row = self.get_by_username(username)

        # Hash even when the user does not exist, so response timing does not
        # reveal which usernames are registered.
        stored_hash = row["password_hash"] if row else bcrypt.hashpw(b"x", bcrypt.gensalt()).decode()
        password_ok = bcrypt.checkpw((password or "").encode("utf-8"), stored_hash.encode("utf-8"))

        if not row or not password_ok:
            raise AuthError("Incorrect username or password.")
        if not row["is_active"]:
            raise AuthError("This account has been deactivated.")

        token = secrets.token_urlsafe(32)
        expires = _now() + timedelta(hours=SESSION_TTL_HOURS)
        with self._lock:
            self._conn.execute(
                "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                (_hash_token(token), row["id"], _now().isoformat(), expires.isoformat()),
            )
            self._conn.commit()

        return {"token": token, "expires_at": expires.isoformat(), "user": self._public(row)}

    def resolve_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Returns the account for a valid token, or None. Expired tokens are purged."""
        if not token:
            return None

        with self._lock:
            row = self._conn.execute(
                """
                SELECT s.expires_at, u.*
                FROM sessions s JOIN users u ON u.id = s.user_id
                WHERE s.token_hash = ?
                """,
                (_hash_token(token),),
            ).fetchone()

        if not row:
            return None
        if datetime.fromisoformat(row["expires_at"]) < _now():
            self.revoke_session(token)
            return None
        if not row["is_active"]:
            return None
        return self._public(row)

    def revoke_session(self, token: str) -> None:
        with self._lock:
            self._conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash_token(token),))
            self._conn.commit()

    def purge_expired_sessions(self) -> int:
        with self._lock:
            cur = self._conn.execute("DELETE FROM sessions WHERE expires_at < ?", (_now().isoformat(),))
            self._conn.commit()
        return cur.rowcount


_store_instance: Optional[UserStore] = None


def get_user_store() -> UserStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = UserStore()
    return _store_instance
