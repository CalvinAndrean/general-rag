from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Folder(Base, UUIDMixin, TimestampMixin):
    """ORM model representing a folder directory in general_rag.folders."""

    __tablename__ = "folders"
    __table_args__ = {"schema": "general_rag"}

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("general_rag.folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("general_rag.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
