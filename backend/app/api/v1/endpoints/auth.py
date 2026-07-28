"""Authentication endpoints: register, login, refresh, me, join."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import AppException, BadRequestError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.models.auth import User
from app.repositories.auth import AuthRepository
from app.repositories.tenant_settings import TenantSettingsRepository
from app.schemas.auth import (
    JoinTenantRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.common import ResponseEnvelope

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=ResponseEnvelope[TokenResponse])
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and create a new tenant (organization)."""
    repo = AuthRepository(db)

    # Check if email already exists
    existing = await repo.get_user_by_email(request.email)
    if existing:
        raise BadRequestError("An account with this email already exists")

    # Create tenant
    tenant = await repo.create_tenant(request.tenant_name)

    # Create admin user (first user in tenant is always admin)
    pwd_hash = hash_password(request.password)
    user = await repo.create_user(
        email=request.email,
        password_hash=pwd_hash,
        full_name=request.full_name,
        tenant_id=tenant.id,
        role="admin",
    )

    # Create default tenant settings
    settings_repo = TenantSettingsRepository(db)
    await settings_repo.create_default(tenant.id)

    # Generate tokens
    access_token = create_access_token(user.id, tenant.id, user.role)
    refresh_token = create_refresh_token(user.id)

    return ResponseEnvelope(
        data=TokenResponse(access_token=access_token, refresh_token=refresh_token)
    )


@router.post("/login", response_model=ResponseEnvelope[TokenResponse])
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password."""
    repo = AuthRepository(db)
    user = await repo.get_user_by_email(request.email)

    if not user or not verify_password(request.password, user.password_hash):
        raise AppException(
            message="Invalid email or password", code="UNAUTHORIZED", status_code=401
        )

    access_token = create_access_token(user.id, user.tenant_id, user.role)
    refresh_token = create_refresh_token(user.id)

    return ResponseEnvelope(
        data=TokenResponse(access_token=access_token, refresh_token=refresh_token)
    )


@router.post("/refresh", response_model=ResponseEnvelope[TokenResponse])
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh an expired access token using a valid refresh token."""
    payload = verify_token(request.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise AppException(message="Invalid refresh token", code="UNAUTHORIZED", status_code=401)

    user_id = payload.get("sub")
    repo = AuthRepository(db)
    user = await repo.get_user_by_id(user_id)

    if not user:
        raise AppException(message="User not found", code="UNAUTHORIZED", status_code=401)

    access_token = create_access_token(user.id, user.tenant_id, user.role)
    new_refresh_token = create_refresh_token(user.id)

    return ResponseEnvelope(
        data=TokenResponse(access_token=access_token, refresh_token=new_refresh_token)
    )


@router.get("/me", response_model=ResponseEnvelope[UserResponse])
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user profile."""
    repo = AuthRepository(db)
    tenant = await repo.get_tenant_by_id(user.tenant_id)
    tenant_name = tenant.name if tenant else None

    return ResponseEnvelope(
        data=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            tenant_id=user.tenant_id,
            tenant_name=tenant_name,
        )
    )


@router.post("/join", response_model=ResponseEnvelope[TokenResponse])
async def join_tenant(request: JoinTenantRequest, db: AsyncSession = Depends(get_db)):
    """Join an existing tenant using an invite code."""
    repo = AuthRepository(db)

    # Verify tenant code
    tenant = await repo.get_tenant_by_code(request.tenant_code)
    if not tenant:
        raise BadRequestError("Invalid tenant invite code")

    # Check if email already exists
    existing = await repo.get_user_by_email(request.email)
    if existing:
        raise BadRequestError("An account with this email already exists")

    # Create member user
    pwd_hash = hash_password(request.password)
    user = await repo.create_user(
        email=request.email,
        password_hash=pwd_hash,
        full_name=request.full_name,
        tenant_id=tenant.id,
        role="member",
    )

    access_token = create_access_token(user.id, tenant.id, user.role)
    refresh_token = create_refresh_token(user.id)

    return ResponseEnvelope(
        data=TokenResponse(access_token=access_token, refresh_token=refresh_token)
    )
