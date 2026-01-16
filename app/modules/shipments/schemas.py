from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.enums import ContactChannel, ShipmentStatus


class ContactCreate(BaseModel):
    name: str
    channel: ContactChannel
    telegram_chat_id: str | None = None
    phone_e164: str | None = None


class ContactOut(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    channel: ContactChannel
    telegram_chat_id: str | None
    phone_e164: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ShipmentCreate(BaseModel):
    customer_name: str
    origin_text: str
    destination_text: str
    destination_lat: float | None = None
    destination_lon: float | None = None
    planned_departure_at: datetime
    eta_hours: int


class ShipmentAssign(BaseModel):
    contact_id: UUID


class ShipmentOut(BaseModel):
    id: UUID
    tenant_id: UUID
    customer_name: str
    origin_text: str
    destination_text: str
    destination_lat: float | None
    destination_lon: float | None
    planned_departure_at: datetime
    eta_hours: int
    estimated_arrival_at: datetime
    status: ShipmentStatus
    assigned_contact_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
