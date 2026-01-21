from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.enums import MessageAction, MessageType


class LocationPayload(BaseModel):
    lat: float
    lon: float
    accuracy_m: float | None = None


class NormalizedMessage(BaseModel):
    type: MessageType
    action: MessageAction | None = None
    external_user_id: str
    message_id: str | None = None
    text: str | None = None
    location: LocationPayload | None = None
    shipment_id: UUID | None = None
    checkin_id: UUID | None = None
    timestamp: datetime
    # User info (for registration)
    user_first_name: str | None = None
    user_last_name: str | None = None
    username: str | None = None
    # Contact info (when user shares phone)
    shared_phone: str | None = None
