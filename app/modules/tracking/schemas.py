from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.enums import CheckinStatus, EventType


class TrackingRuleCreate(BaseModel):
    customer_name: str | None = None
    checkin_every_minutes: int
    max_silence_minutes: int
    delay_escalation_minutes: int
    notify_customer: bool = False
    notify_customer_delay_threshold_minutes: int = 0


class TrackingRuleOut(BaseModel):
    id: UUID
    tenant_id: UUID
    customer_name: str | None
    checkin_every_minutes: int
    max_silence_minutes: int
    delay_escalation_minutes: int
    notify_customer: bool
    notify_customer_delay_threshold_minutes: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ShipmentEventOut(BaseModel):
    id: UUID
    tenant_id: UUID
    shipment_id: UUID
    event_type: EventType
    payload_json: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class TrackingCheckinOut(BaseModel):
    id: UUID
    tenant_id: UUID
    shipment_id: UUID
    due_at: datetime
    sent_at: datetime | None
    answered_at: datetime | None
    status: CheckinStatus
    last_outbound_message_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
