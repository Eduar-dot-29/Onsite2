from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.models.enums import ContactLinkStatus
from app.api.utils.phone import normalize_phone_e164


class ContactBase(BaseModel):
    name: str
    phone_e164: str | None = None
    telegram_chat_id: str | None = None

    @field_validator("phone_e164")
    @classmethod
    def validate_phone_e164(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = normalize_phone_e164(v)
        if v is None:
            return None
        # Lightweight E.164 check (full validation can be added later)
        if not v.startswith("+") or len(v) < 8 or len(v) > 32:
            raise ValueError("phone_e164 must be in E.164 format, e.g. +34612345678")
        return v


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: str | None = None
    phone_e164: str | None = None
    telegram_chat_id: str | None = None

    @field_validator("phone_e164")
    @classmethod
    def validate_phone_e164(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = normalize_phone_e164(v)
        if v is None:
            return None
        if not v.startswith("+") or len(v) < 8 or len(v) > 32:
            raise ValueError("phone_e164 must be in E.164 format, e.g. +34612345678")
        return v


class ContactRead(ContactBase):
    id: UUID
    link_status: ContactLinkStatus
    created_at_utc: datetime

    model_config = {"from_attributes": True}

