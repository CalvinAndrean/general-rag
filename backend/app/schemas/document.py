from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentBase(BaseModel):
    name: str
    file_type: str
    s3_key: str
    s3_url: str | None = None
    file_size: int
    status: str
    error_message: str | None = None
    is_active: bool = True
    version: str = "v1.0"
    folder_id: str | None = None
    folder_path: str = "/"


class DocumentResponse(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class ActiveToggleRequest(BaseModel):
    is_active: bool


class FolderCreateRequest(BaseModel):
    name: str
    parent_id: str | None = None


class FolderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    parent_id: str | None = None
    tenant_id: str
