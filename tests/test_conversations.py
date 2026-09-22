"""
Tests for local conversation history persistence.

Covers the contract the chat UI depends on: turns are stored in order, prior
turns are replayed into the prompt so follow-ups resolve, and a stale or
deleted conversation id never breaks a user's request.
"""

import os
import shutil

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.storage.conversations import ConversationStore, _derive_title
from backend.storage.users import get_user_store


def auth_headers(client: TestClient) -> dict:
    """
    Signs in against the live app store, creating an account if needed.

    These endpoints require a session now that history is per-user, so a test
    without one only proves the 401 path.
    """
    store = get_user_store()
    username, password = "pytest_user", "PytestPassw0rd!"
    if not store.get_by_username(username):
        store.create_user(
            username, password, "Pytest User",
            role="admin" if store.needs_bootstrap() else "user",
        )
    token = client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}

TEST_DB_ROOT = os.path.join("backend", "storage", "test_conversations")


@pytest.fixture
def store(request):
    """A throwaway store per test, so ordering never leaks between them."""
    path = os.path.join(TEST_DB_ROOT, f"{request.node.name}.db")
    shutil.rmtree(TEST_DB_ROOT, ignore_errors=True)
    os.makedirs(TEST_DB_ROOT, exist_ok=True)
    yield ConversationStore(db_path=path)
    shutil.rmtree(TEST_DB_ROOT, ignore_errors=True)


# ── Storage ──────────────────────────────────────────────────────────────

def test_messages_persist_in_order(store):
    cid = store.create_conversation("Corrosion limits")
    store.add_message(cid, "user", "What is our corrosion limit?")
    store.add_message(cid, "assistant", "0.5 mm.", [{"doc": "SOP.txt", "page": 1}])
    store.add_message(cid, "user", "What happens if we exceed it?")

    messages = store.get_messages(cid)
    assert [m["role"] for m in messages] == ["user", "assistant", "user"]
    assert messages[1]["citations"] == [{"doc": "SOP.txt", "page": 1}]


def test_history_for_prompt_returns_role_content_pairs(store):
    cid = store.create_conversation()
    store.add_message(cid, "user", "first")
    store.add_message(cid, "assistant", "second")

    history = store.get_history_for_prompt(cid)
    assert history == [
        {"role": "user", "content": "first"},
        {"role": "assistant", "content": "second"},
    ]


def test_history_is_capped_but_stays_chronological(store):
    cid = store.create_conversation()
    for i in range(20):
        store.add_message(cid, "user", f"msg{i}")

    history = store.get_history_for_prompt(cid, turns=3)
    assert len(history) == 6  # turns * 2
    # Most recent window, still oldest-first within it.
    assert history[0]["content"] == "msg14"
    assert history[-1]["content"] == "msg19"


def test_ensure_conversation_creates_when_missing(store):
    cid = store.ensure_conversation(None, "Draft the inspection note")
    assert cid.startswith("conv_")
    assert store.get_conversation(cid)["title"] == "Draft the inspection note"


def test_ensure_conversation_recovers_from_stale_id(store):
    """
    A deleted conversation id (stale tab, cleared history) must not fail the
    request — it should quietly start a fresh conversation.
    """
    cid = store.ensure_conversation("conv_doesnotexist", "hello")
    assert store.get_conversation(cid) is not None
    assert cid != "conv_doesnotexist"


def test_delete_removes_conversation_and_messages(store):
    cid = store.create_conversation()
    store.add_message(cid, "user", "hi")

    assert store.delete_conversation(cid) is True
    assert store.get_conversation(cid) is None
    assert store.get_messages(cid) == []
    assert store.delete_conversation(cid) is False


def test_listing_orders_by_most_recently_updated(store):
    first = store.create_conversation("older")
    second = store.create_conversation("newer")
    store.add_message(first, "user", "bump the older one")

    listed = store.list_conversations()
    assert listed[0]["id"] == first
    assert listed[0]["message_count"] == 1
    assert any(c["id"] == second for c in listed)


def test_rejects_unknown_role(store):
    cid = store.create_conversation()
    with pytest.raises(Exception):
        store.add_message(cid, "system", "not allowed")


@pytest.mark.parametrize("text,expected", [
    ("", "New conversation"),
    ("   ", "New conversation"),
    ("Short question", "Short question"),
])
def test_title_derivation(text, expected):
    assert _derive_title(text) == expected


def test_long_title_is_truncated():
    title = _derive_title("x" * 200)
    assert len(title) <= 60
    assert title.endswith("…")


# ── API ──────────────────────────────────────────────────────────────────

def test_conversation_endpoints_require_authentication():
    """History is per-user, so an anonymous caller must be refused."""
    client = TestClient(app)
    assert client.get("/api/conversations").status_code == 401


def test_conversation_endpoints_are_mounted():
    client = TestClient(app)
    assert client.get("/api/conversations", headers=auth_headers(client)).status_code == 200


def test_missing_conversation_returns_404():
    client = TestClient(app)
    headers = auth_headers(client)
    assert client.get("/api/conversations/conv_nope", headers=headers).status_code == 404
    assert client.delete("/api/conversations/conv_nope", headers=headers).status_code == 404


def test_create_rename_delete_roundtrip():
    client = TestClient(app)
    headers = auth_headers(client)

    created = client.post("/api/conversations", json={"title": "Roundtrip"}, headers=headers)
    assert created.status_code == 201
    cid = created.json()["conversation_id"]

    renamed = client.patch(f"/api/conversations/{cid}", json={"title": "Renamed"}, headers=headers)
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "Renamed"

    fetched = client.get(f"/api/conversations/{cid}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["messages"] == []

    assert client.delete(f"/api/conversations/{cid}", headers=headers).status_code == 200
