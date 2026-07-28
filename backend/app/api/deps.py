"""FastAPI dependencies for authentication and authorization."""

import logging

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AppException
from app.core.security import verify_token
from app.models.auth import User

logger = logging.getLogger(__name__)


async def get_current_user(
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate JWT from Authorization header, return the authenticated User."""
    if not authorization or not authorization.startswith("Bearer "):
        raise AppException(message="Not authenticated", code="UNAUTHORIZED", status_code=401)

    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)

    if not payload or payload.get("type") != "access":
        raise AppException(message="Invalid or expired token", code="UNAUTHORIZED", status_code=401)

    user_id = payload.get("sub")
    if not user_id:
        raise AppException(message="Invalid token payload", code="UNAUTHORIZED", status_code=401)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise AppException(message="User not found", code="UNAUTHORIZED", status_code=401)

    return user


async def get_current_tenant_id(user: User = Depends(get_current_user)) -> str:
    """Extract tenant_id from the authenticated user."""
    return user.tenant_id


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure the authenticated user has admin role."""
    if user.role != "admin":
        raise AppException(message="Admin access required", code="FORBIDDEN", status_code=403)
    return user
