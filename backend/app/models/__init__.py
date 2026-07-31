"""ORM model registry — all models imported here for Alembic & SQLAlchemy discovery."""

from app.models.auth import Tenant, User
from app.models.base import Base
from app.models.document import Document, DocumentChunk
from app.models.evaluation import Evaluation
from app.models.folder import Folder
from app.models.item import Item
from app.models.query_log import QueryLog
from app.models.system_prompt import SystemPrompt
from app.models.tenant_settings import TenantSettings

__all__ = [
    "Base",
    "Document",
    "DocumentChunk",
    "Evaluation",
    "Folder",
    "Item",
    "QueryLog",
    "SystemPrompt",
    "Tenant",
    "TenantSettings",
    "User",
]
