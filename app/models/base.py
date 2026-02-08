from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, mapped_column


def utcnow() -> datetime:
    """UTC-aware 'now' for created_at_utc fields."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Dedicated base for the new `app/models` package."""


class UUIDMixin:
    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)

