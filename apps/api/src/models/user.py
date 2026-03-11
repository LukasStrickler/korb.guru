"""
User model for authentication and profile data.

This is an example model demonstrating SQLAlchemy 2.0 style with:
- Mapped[] type annotations
- mapped_column() for column definitions
- Inheritance from Base and TimestampMixin
"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class User(Base, TimestampMixin):
    """
    User account model.

    Attributes:
        id: Primary key (auto-increment integer)
        email: Unique email address, required, indexed for fast lookups
        name: Optional display name
        created_at: Timestamp when user was created (from TimestampMixin)
        updated_at: Timestamp when user was last updated (from TimestampMixin)
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
