"""
FastAPI router for local conversation history.

All data stays in a SQLite file under backend/storage/. Nothing leaves the host.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.api.auth_router import current_user
from backend.storage.conversations import get_conversation_store

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field(None, description="Optional title; defaults to 'New conversation'")


class RenameConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


@router.get("", status_code=status.HTTP_200_OK)
def list_conversations(
    limit: int = 50, user: Dict[str, Any] = Depends(current_user)
) -> Dict[str, Any]:
    """Lists the signed-in user's own conversations, most recently updated first."""
    store = get_conversation_store()
    conversations = store.list_conversations(limit=limit, user_id=user["id"])
    return {"count": len(conversations), "conversations": conversations}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_conversation(
    req: CreateConversationRequest, user: Dict[str, Any] = Depends(current_user)
) -> Dict[str, Any]:
    store = get_conversation_store()
    conversation_id = store.create_conversation(req.title, user_id=user["id"])
    return {
        "conversation_id": conversation_id,
        **(store.get_conversation(conversation_id, user_id=user["id"]) or {}),
    }


@router.get("/{conversation_id}", status_code=status.HTTP_200_OK)
def get_conversation(
    conversation_id: str, user: Dict[str, Any] = Depends(current_user)
) -> Dict[str, Any]:
    """Returns one of the caller's conversations with its messages, oldest first."""
    store = get_conversation_store()
    conversation = store.get_conversation(conversation_id, user_id=user["id"])
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return {**conversation, "messages": store.get_messages(conversation_id)}


@router.patch("/{conversation_id}", status_code=status.HTTP_200_OK)
def rename_conversation(
    conversation_id: str,
    req: RenameConversationRequest,
    user: Dict[str, Any] = Depends(current_user),
) -> Dict[str, Any]:
    store = get_conversation_store()
    if not store.rename_conversation(conversation_id, req.title, user_id=user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return store.get_conversation(conversation_id, user_id=user["id"]) or {}


@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
def delete_conversation(
    conversation_id: str, user: Dict[str, Any] = Depends(current_user)
) -> Dict[str, Any]:
    store = get_conversation_store()
    if not store.delete_conversation(conversation_id, user_id=user["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return {"status": "DELETED", "conversation_id": conversation_id}
