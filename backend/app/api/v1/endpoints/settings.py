"""Tenant settings endpoints: get/update model config, list OpenRouter models."""

import logging

import httpx
from async_lru import alru_cache
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.config import settings as app_settings
from app.core.database import get_db
from app.models.auth import User
from app.repositories.tenant_settings import TenantSettingsRepository
from app.schemas.common import ResponseEnvelope
from app.schemas.settings import OpenRouterModel, TenantSettingsResponse, TenantSettingsUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=ResponseEnvelope[TenantSettingsResponse])
async def get_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current tenant's model/prompt settings."""
    repo = TenantSettingsRepository(db)
    settings_obj = await repo.get_by_tenant(user.tenant_id)

    if not settings_obj:
        settings_obj = await repo.create_default(user.tenant_id)

    return ResponseEnvelope(
        data=TenantSettingsResponse(
            llm_model=settings_obj.llm_model,
            embedding_model=settings_obj.embedding_model,
            temperature=float(settings_obj.temperature),
            max_tokens=settings_obj.max_tokens,
            system_prompt=settings_obj.system_prompt,
            top_k=settings_obj.top_k,
        )
    )


@router.put("/", response_model=ResponseEnvelope[TenantSettingsResponse])
async def update_settings(
    request: TenantSettingsUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update tenant settings (admin-only)."""
    repo = TenantSettingsRepository(db)
    settings_obj = await repo.get_by_tenant(admin.tenant_id)

    if not settings_obj:
        settings_obj = await repo.create_default(admin.tenant_id)

    updates = request.model_dump(exclude_none=True)
    settings_obj = await repo.update(settings_obj, updates)

    return ResponseEnvelope(
        data=TenantSettingsResponse(
            llm_model=settings_obj.llm_model,
            embedding_model=settings_obj.embedding_model,
            temperature=float(settings_obj.temperature),
            max_tokens=settings_obj.max_tokens,
            system_prompt=settings_obj.system_prompt,
            top_k=settings_obj.top_k,
        )
    )


@alru_cache(maxsize=1, ttl=300.0)
async def _fetch_openrouter_models_cached() -> list[OpenRouterModel]:
    """Internal function to fetch and cache OpenRouter models."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {app_settings.OPENROUTER_API_KEY}"},
        )
        resp.raise_for_status()
        data = resp.json()

    models = []
    for m in data.get("data", []):
        pricing = m.get("pricing", {})
        top_provider = m.get("top_provider") or {}
        max_out = top_provider.get("max_completion_tokens") or m.get("max_completion_tokens")

        models.append(
            OpenRouterModel(
                id=m.get("id", ""),
                name=m.get("name", m.get("id", "")),
                context_length=m.get("context_length"),
                max_output_tokens=max_out,
                pricing_prompt=pricing.get("prompt"),
                pricing_completion=pricing.get("completion"),
            )
        )
    return models


@router.get("/models", response_model=ResponseEnvelope[list[OpenRouterModel]])
async def list_openrouter_models(user: User = Depends(get_current_user)):
    """Fetch available models from the OpenRouter API."""
    try:
        models = await _fetch_openrouter_models_cached()
        return ResponseEnvelope(data=models)
    except Exception as e:
        logger.warning(f"Failed to fetch OpenRouter models: {e}")
        return ResponseEnvelope(data=[])
