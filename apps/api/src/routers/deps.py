"""
Shared dependencies and utilities for all route handlers.

Provides:
  - get_current_user: JWT auth dependency
  - get_db: async DB session dependency (re-exported from database module)
  - Common async DB helpers replacing the sync/async shim pattern
"""
import logging
import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.config import settings
from apps.api.src.database import get_db, set_tenant_context_async
from apps.api.src.models import ResumeTemplate, User

logger = logging.getLogger("cis-api")
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    JWT authentication dependency.
    In non-production environments falls back to a developer user when no
    Authorization header is present. Enforces RLS by setting the tenant context.
    """
    if not credentials:
        if settings.ENV != "production":
            return await _resolve_dev_user(db)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing.",
        )

    try:
        payload = jwt.decode(
            credentials.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        email: str | None = payload.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing 'email' claim.",
            )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc

    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    await set_tenant_context_async(db, str(user.id))
    return user


async def _resolve_dev_user(db: AsyncSession) -> User:
    """Creates or retrieves the developer bypass user (non-production only)."""
    dev_email = "developer@career-intelligence.studio"
    result = await db.execute(select(User).filter(User.email == dev_email))
    user = result.scalars().first()
    if not user:
        user = User(
            id=uuid.uuid4(),
            email=dev_email,
            hashed_password="pbkdf2:sha256:dev-only-not-a-real-hash",
            first_name="Lead",
            last_name="Architect",
            role="admin",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Create a default resume template for this user
        template = ResumeTemplate(
            id=uuid.uuid4(),
            user_id=user.id,
            name="Professional Default Template",
            file_path=settings.RESUME_TEMPLATE_PATH,
            is_active=True,
        )
        db.add(template)
        await db.commit()

    await set_tenant_context_async(db, str(user.id))
    return user
