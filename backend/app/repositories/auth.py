"""Repository for User and Tenant CRUD operations."""

import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import Tenant, User


class AuthRepository:
    """Handles user and tenant database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Tenant operations ──

    async def create_tenant(self, name: str) -> Tenant:
        """Create a new tenant with a random invite code."""
        tenant = Tenant(name=name, code=secrets.token_urlsafe(8)[:12].upper())
        self.db.add(tenant)
        await self.db.flush()
        return tenant

    async def get_tenant_by_code(self, code: str) -> Tenant | None:
        result = await self.db.execute(select(Tenant).where(Tenant.code == code))
        return result.scalar_one_or_none()

    async def get_tenant_by_id(self, tenant_id: str) -> Tenant | None:
        result = await self.db.execute(select(Tenant).where(Tenant.id == tenant_id))
        return result.scalar_one_or_none()

    async def regenerate_tenant_code(self, tenant: Tenant) -> Tenant:
        """Generate a new invite code for the tenant."""
        tenant.code = secrets.token_urlsafe(8)[:12].upper()
        await self.db.flush()
        return tenant

    # ── User operations ──

    async def create_user(
        self, email: str, password_hash: str, full_name: str, tenant_id: str, role: str = "member"
    ) -> User:
        user = User(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            tenant_id=tenant_id,
            role=role,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def list_tenant_users(self, tenant_id: str) -> list[User]:
        result = await self.db.execute(
            select(User).where(User.tenant_id == tenant_id).order_by(User.created_at)
        )
        return list(result.scalars().all())

    async def update_user_role(self, user: User, role: str) -> User:
        user.role = role
        await self.db.flush()
        return user

    async def delete_user(self, user: User) -> None:
        await self.db.delete(user)
        await self.db.flush()
