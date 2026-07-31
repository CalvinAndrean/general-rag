from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class QueryLog(Base, UUIDMixin):
    """ORM model for logging each RAG query for usage/cost tracking."""

    __tablename__ = "query_logs"
    __table_args__ = {"schema": "general_rag"}

    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("general_rag.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("general_rag.users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estimated_cost: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=0, nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top_k: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    log_type: Mapped[str] = mapped_column(
        String(20), default="query", server_default="query", nullable=False, index=True
    )
    intent: Mapped[str] = mapped_column(
        String(50),
        default="knowledge_query",
        server_default="knowledge_query",
        nullable=False,
        index=True,
    )
    sources_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Use created_at from a simple column since we don't need updated_at
    from datetime import datetime

    from sqlalchemy import DateTime, func

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
