"""Repository for TenantSettings CRUD operations."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant_settings import TenantSettings


class TenantSettingsRepository:
    """Handles per-tenant settings database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_tenant(self, tenant_id: str) -> TenantSettings | None:
        result = await self.db.execute(
            select(TenantSettings).where(TenantSettings.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create_default(self, tenant_id: str) -> TenantSettings:
        """Create default settings for a new tenant."""
        from decimal import Decimal

        settings_obj = TenantSettings(
            tenant_id=tenant_id,
            llm_model="nvidia/llama-nemotron-embed-vl-1b-v2:free",
            temperature=Decimal("0.70"),
            max_tokens=80000,
            system_prompt=None,
            top_k=4,
        )
        self.db.add(settings_obj)
        await self.db.flush()
        return settings_obj

    async def update(self, settings_obj: TenantSettings, updates: dict) -> TenantSettings:
        for key, value in updates.items():
            if value is not None and hasattr(settings_obj, key):
                setattr(settings_obj, key, value)
        await self.db.flush()
        return settings_obj
