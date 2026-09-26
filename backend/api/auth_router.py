"""
Local authentication endpoints.

Access is granted by an administrator, not claimed by self-registration. The
only exception is the very first account on a fresh deployment, which becomes
the administrator so the system can be set up at all.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from backend.storage.users import AuthError, get_user_store

logger = logging.getLogger("kavach.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str = Field(..., description="Username, email or employee ID")
    password: str


class CreateUserRequest(BaseModel):
    # Two characters is enough: initials are a normal username in a small team.
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=120)
    email: Optional[str] = None
    employee_id: Optional[str] = None
    role: str = Field("user", pattern="^(admin|user)$")


def _token_from_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip()


def current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI dependency: resolves the caller, or rejects with 401."""
    user = get_user_store().resolve_session(_token_from_header(authorization))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Resolves the caller if signed in, without requiring it."""
    return get_user_store().resolve_session(_token_from_header(authorization))


def require_admin(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required for this action.",
        )
    return user


@router.get("/status")
def auth_status() -> Dict[str, Any]:
    """
    Reports whether the deployment still needs its first administrator.

    The sign-in screen uses this to show a one-time setup form instead of a
    login form on a fresh install.
    """
    store = get_user_store()
    return {"needs_bootstrap": store.needs_bootstrap(), "user_count": store.count_users()}


@router.post("/bootstrap", status_code=status.HTTP_201_CREATED)
def bootstrap_admin(req: CreateUserRequest) -> Dict[str, Any]:
    """Creates the first administrator. Refused once any account exists."""
    store = get_user_store()
    if not store.needs_bootstrap():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Setup has already been completed. Ask an administrator for an account.",
        )
    try:
        user = store.create_user(
            username=req.username,
            password=req.password,
            full_name=req.full_name,
            email=req.email,
            employee_id=req.employee_id,
            role="admin",
        )
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    logger.info(f"Bootstrapped administrator account '{user['username']}'.")
    return user


@router.post("/login")
def login(req: LoginRequest) -> Dict[str, Any]:
    try:
        return get_user_store().authenticate(req.username, req.password)
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e


@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)) -> Dict[str, str]:
    token = _token_from_header(authorization)
    if token:
        get_user_store().revoke_session(token)
    return {"status": "SIGNED_OUT"}


@router.get("/me")
def me(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    return user


@router.get("/users")
def list_users(_: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    users = get_user_store().list_users()
    return {"count": len(users), "users": users}


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    req: CreateUserRequest, admin: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Creates an account. Administrators only."""
    try:
        user = get_user_store().create_user(
            username=req.username,
            password=req.password,
            full_name=req.full_name,
            email=req.email,
            employee_id=req.employee_id,
            role=req.role,
            created_by=admin["id"],
        )
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    logger.info(f"Account '{user['username']}' created by '{admin['username']}'.")
    return user


@router.delete("/users/{user_id}")
def delete_user(user_id: str, admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, str]:
    if user_id == admin["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete the account you are signed in with.",
        )
    if not get_user_store().delete_user(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return {"status": "DELETED", "user_id": user_id}
