"""Members management endpoints (admin-only)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.auth import User
from app.repositories.auth import AuthRepository
from app.schemas.auth import MemberResponse, RoleUpdateRequest, TenantCodeResponse
from app.schemas.common import ResponseEnvelope

router = APIRouter()


@router.get("/", response_model=ResponseEnvelope[list[MemberResponse]])
async def list_members(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all members in the current tenant."""
    repo = AuthRepository(db)
    users = await repo.list_tenant_users(user.tenant_id)
    members = [
        MemberResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            created_at=str(u.created_at) if u.created_at else None,
        )
        for u in users
    ]
    return ResponseEnvelope(data=members)


@router.patch("/{user_id}/role", response_model=ResponseEnvelope[MemberResponse])
async def update_member_role(
    user_id: str,
    request: RoleUpdateRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Change a member's role (admin-only)."""
    repo = AuthRepository(db)
    target_user = await repo.get_user_by_id(user_id)

    if not target_user or target_user.tenant_id != admin.tenant_id:
        raise NotFoundError(message="Member not found in your tenant")

    if target_user.id == admin.id:
        raise BadRequestError("Cannot change your own role")

    target_user = await repo.update_user_role(target_user, request.role)
    return ResponseEnvelope(
        data=MemberResponse(
            id=target_user.id,
            email=target_user.email,
            full_name=target_user.full_name,
            role=target_user.role,
            created_at=str(target_user.created_at) if target_user.created_at else None,
        )
    )


@router.delete("/{user_id}", status_code=204)
async def remove_member(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the tenant (admin-only)."""
    repo = AuthRepository(db)
    target_user = await repo.get_user_by_id(user_id)

    if not target_user or target_user.tenant_id != admin.tenant_id:
        raise NotFoundError(message="Member not found in your tenant")

    if target_user.id == admin.id:
        raise BadRequestError("Cannot remove yourself")

    await repo.delete_user(target_user)
    from fastapi import Response

    return Response(status_code=204)


@router.post("/regenerate-code", response_model=ResponseEnvelope[TenantCodeResponse])
async def regenerate_tenant_code(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate the tenant invite code (admin-only)."""
    repo = AuthRepository(db)
    tenant = await repo.get_tenant_by_id(admin.tenant_id)
    if not tenant:
        raise NotFoundError(message="Tenant not found")

    tenant = await repo.regenerate_tenant_code(tenant)
    return ResponseEnvelope(data=TenantCodeResponse(code=tenant.code, tenant_name=tenant.name))
