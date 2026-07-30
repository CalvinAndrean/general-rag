from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.models.base import Base, UUIDMixin


class Evaluation(Base, UUIDMixin):
    """ORM model for Ragas-style evaluation results."""

    __tablename__ = "evaluations"
    __table_args__ = {"schema": "general_rag"}

    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("general_rag.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    query_log_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("general_rag.query_logs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(30), default="COMPLETED", server_default="COMPLETED", nullable=False, index=True
    )
    faithfulness: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    answer_relevancy: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    context_precision: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    context_recall: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    overall_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    evaluation_metadata: Mapped[dict[str, Any]] = mapped_column(
        "evaluation_metadata",
        JSON().with_variant(JSONB, "postgresql"),
        default=dict,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
