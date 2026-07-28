"""Pydantic schemas for tenant settings endpoints."""

from pydantic import BaseModel, ConfigDict, Field


class TenantSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    llm_model: str
    embedding_model: str
    temperature: float
    max_tokens: int
    system_prompt: str | None = None
    top_k: int


class TenantSettingsUpdate(BaseModel):
    llm_model: str | None = None
    embedding_model: str | None = None
    temperature: float | None = Field(None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(None, ge=256, le=8192)
    system_prompt: str | None = None
    top_k: int | None = Field(None, ge=1, le=20)


class OpenRouterModel(BaseModel):
    id: str
    name: str
    context_length: int | None = None
    pricing_prompt: str | None = None
    pricing_completion: str | None = None
