"""
Tests for local authentication and per-user history isolation.

The isolation tests matter most: before accounts existed, every conversation
was visible to everyone using the machine.
"""

import os
import shutil

import pytest

from backend.storage.conversations import ConversationStore
from backend.storage.users import AuthError, UserStore

TEST_ROOT = os.path.join("backend", "storage", "test_auth")


@pytest.fixture
def db_path(request):
    shutil.rmtree(TEST_ROOT, ignore_errors=True)
    os.makedirs(TEST_ROOT, exist_ok=True)
    yield os.path.join(TEST_ROOT, f"{request.node.name}.db")
    shutil.rmtree(TEST_ROOT, ignore_errors=True)


@pytest.fixture
def users(db_path):
    return UserStore(db_path=db_path)


# ── Accounts ─────────────────────────────────────────────────────────────

def test_fresh_deployment_needs_bootstrap(users):
    assert users.needs_bootstrap() is True
    users.create_user("admin", "KavachAdmin1!", "Admin", role="admin")
    assert users.needs_bootstrap() is False


def test_password_is_hashed_never_stored_plain(users):
    users.create_user("alice", "Sup3rSecret!", "Alice")
    row = users.get_by_username("alice")
    assert row["password_hash"] != "Sup3rSecret!"
    assert "Sup3rSecret" not in row["password_hash"]


def test_public_user_never_exposes_password_hash(users):
    user = users.create_user("alice", "Sup3rSecret!", "Alice")
    assert "password_hash" not in user


def test_short_passwords_are_rejected(users):
    with pytest.raises(AuthError):
        users.create_user("bob", "short", "Bob")


def test_usernames_are_unique(users):
    users.create_user("alice", "Sup3rSecret!", "Alice")
    with pytest.raises(AuthError):
        users.create_user("alice", "Another1234!", "Alice Two")


def test_usernames_are_case_insensitive(users):
    users.create_user("Alice", "Sup3rSecret!", "Alice")
    assert users.get_by_username("ALICE") is not None


# ── Authentication ───────────────────────────────────────────────────────

def test_login_succeeds_with_correct_password(users):
    users.create_user("alice", "Sup3rSecret!", "Alice")
    session = users.authenticate("alice", "Sup3rSecret!")
    assert session["token"]
    assert session["user"]["username"] == "alice"


def test_login_fails_with_wrong_password(users):
    users.create_user("alice", "Sup3rSecret!", "Alice")
    with pytest.raises(AuthError):
        users.authenticate("alice", "wrong-password")


def test_login_fails_for_unknown_user(users):
    with pytest.raises(AuthError):
        users.authenticate("nobody", "whatever12")


def test_session_resolves_then_stops_after_revoke(users):
    users.create_user("alice", "Sup3rSecret!", "Alice")
    token = users.authenticate("alice", "Sup3rSecret!")["token"]

    assert users.resolve_session(token)["username"] == "alice"
    users.revoke_session(token)
    assert users.resolve_session(token) is None


def test_invalid_token_resolves_to_nothing(users):
    assert users.resolve_session("not-a-real-token") is None
    assert users.resolve_session("") is None


def test_deactivating_a_user_revokes_live_sessions(users):
    user = users.create_user("alice", "Sup3rSecret!", "Alice")
    token = users.authenticate("alice", "Sup3rSecret!")["token"]

    users.set_active(user["id"], False)
    assert users.resolve_session(token) is None
    with pytest.raises(AuthError):
        users.authenticate("alice", "Sup3rSecret!")


def test_tokens_are_stored_hashed(users):
    """A stolen database must not hand over working sessions."""
    users.create_user("alice", "Sup3rSecret!", "Alice")
    token = users.authenticate("alice", "Sup3rSecret!")["token"]

    rows = users._conn.execute("SELECT token_hash FROM sessions").fetchall()
    assert all(r["token_hash"] != token for r in rows)


# ── Per-user history isolation ───────────────────────────────────────────

@pytest.fixture
def conversations(db_path):
    return ConversationStore(db_path=db_path)


def test_users_only_see_their_own_conversations(conversations):
    mine = conversations.create_conversation("Mine", user_id="usr_a")
    theirs = conversations.create_conversation("Theirs", user_id="usr_b")

    a_ids = [c["id"] for c in conversations.list_conversations(user_id="usr_a")]
    assert mine in a_ids
    assert theirs not in a_ids


def test_a_conversation_cannot_be_read_by_another_user(conversations):
    cid = conversations.create_conversation("Private", user_id="usr_a")

    assert conversations.get_conversation(cid, user_id="usr_a") is not None
    assert conversations.get_conversation(cid, user_id="usr_b") is None


def test_a_conversation_cannot_be_deleted_by_another_user(conversations):
    cid = conversations.create_conversation("Private", user_id="usr_a")

    assert conversations.delete_conversation(cid, user_id="usr_b") is False
    assert conversations.get_conversation(cid, user_id="usr_a") is not None


def test_a_conversation_cannot_be_renamed_by_another_user(conversations):
    cid = conversations.create_conversation("Private", user_id="usr_a")

    assert conversations.rename_conversation(cid, "Hijacked", user_id="usr_b") is False
    assert conversations.get_conversation(cid, user_id="usr_a")["title"] == "Private"


def test_continuing_someone_elses_conversation_starts_a_fresh_one(conversations):
    """A guessed or stale id must never append to another user's history."""
    theirs = conversations.create_conversation("Theirs", user_id="usr_b")

    resolved = conversations.ensure_conversation(theirs, "hello", user_id="usr_a")
    assert resolved != theirs
    assert conversations.get_conversation(resolved, user_id="usr_a") is not None


def test_pre_auth_database_gains_user_column(db_path):
    """An existing install must keep working after the auth upgrade."""
    import sqlite3

    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE conversations (
            id TEXT PRIMARY KEY, title TEXT NOT NULL,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        INSERT INTO conversations VALUES ('conv_old', 'Legacy', '2026-01-01', '2026-01-01');
        """
    )
    conn.commit()
    conn.close()

    store = ConversationStore(db_path=db_path)
    columns = {r["name"] for r in store._conn.execute("PRAGMA table_info(conversations)")}
    assert "user_id" in columns

    # Ownerless history is not handed to whoever signs in first.
    assert store.list_conversations(user_id="usr_a") == []
