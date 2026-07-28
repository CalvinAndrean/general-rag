from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Tenant(Base, UUIDMixin, TimestampMixin):
    """ORM model representing an organization/tenant in general_rag.tenants."""

    __tablename__ = "tenants"
    __table_args__ = {"schema": "general_rag"}

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    users: Mapped[list["User"]] = relationship(
        "User", back_populates="tenant", cascade="all, delete-orphan"
    )


class User(Base, UUIDMixin, TimestampMixin):
    """ORM model representing a user account in general_rag.users."""

    __tablename__ = "users"
    __table_args__ = {"schema": "general_rag"}

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="member", nullable=False)
    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("general_rag.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
