from __future__ import annotations

from datetime import datetime, timezone
from typing import Generator
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, mapped_column, sessionmaker

from app.core.config import get_settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class UUIDMixin:
    id = mapped_column(UUID(as_uuid=True), default=uuid4, primary_key=True)


settings = get_settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session() -> Generator:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
