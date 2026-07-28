"""Pydantic schemas for authentication endpoints."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)
    tenant_name: str = Field(
        ..., min_length=1, max_length=255, description="Organization name (creates new tenant)"
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class JoinTenantRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)
    tenant_code: str = Field(..., min_length=1, max_length=20, description="Tenant invite code")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    tenant_id: str
    tenant_name: str | None = None


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    created_at: str | None = None


class RoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern=r"^(admin|member)$")


class TenantCodeResponse(BaseModel):
    code: str
    tenant_name: str
