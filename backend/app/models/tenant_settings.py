from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class TenantSettings(Base, UUIDMixin, TimestampMixin):
    """ORM model for per-tenant model/prompt configuration."""

    __tablename__ = "tenant_settings"
    __table_args__ = {"schema": "general_rag"}

    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("general_rag.tenants.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    llm_model: Mapped[str] = mapped_column(
        String(100), default="anthropic/claude-3.5-sonnet", nullable=False
    )
    embedding_model: Mapped[str] = mapped_column(
        String(100), default="openai/text-embedding-3-small", nullable=False
    )
    temperature: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=0.70, nullable=False)
    max_tokens: Mapped[int] = mapped_column(Integer, default=2048, nullable=False)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    top_k: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
