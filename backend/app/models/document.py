from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin, UUIDMixin


class Document(Base, UUIDMixin, TimestampMixin):
    """ORM model representing an ingested document in general_rag.documents."""

    __tablename__ = "documents"
    __table_args__ = {"schema": "general_rag"}

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    s3_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_size: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="processing", nullable=False, index=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    tenant_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("general_rag.tenants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(20), default="v1.0", nullable=False)
    folder_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("general_rag.folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    folder_path: Mapped[str] = mapped_column(String(512), default="/", nullable=False)

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(Base, UUIDMixin, TimestampMixin):
    """ORM model representing a text chunk & embedding vector in general_rag.document_chunks."""

    __tablename__ = "document_chunks"
    __table_args__ = {"schema": "general_rag"}

    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("general_rag.documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSON().with_variant(JSONB, "postgresql"), default=dict, nullable=False
    )
    embedding: Mapped[list[float] | None] = mapped_column(Vector, nullable=True)

    document: Mapped["Document"] = relationship("Document", back_populates="chunks")
