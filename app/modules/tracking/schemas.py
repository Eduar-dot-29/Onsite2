from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.enums import CheckinStatus, EventType


class TrackingRuleCreate(BaseModel):
    name: str = "Default"
    customer_name: str | None = None
    interval_minutes: int = 30
    max_no_response: int = 3
    max_silence_minutes: int = 60
    delay_escalation_minutes: int = 30
    notify_customer: bool = False
    notify_customer_delay_threshold_minutes: int = 0
    is_default: bool = False


class TrackingRuleOut(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    customer_name: str | None
    interval_minutes: int
    max_no_response: int
    max_silence_minutes: int
    delay_escalation_minutes: int
    notify_customer: bool
    notify_customer_delay_threshold_minutes: int
    is_default: bool
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
    """Output for scheduled check-in with UTC times."""
    id: UUID
    tenant_id: UUID
    shipment_id: UUID
    scheduled_for_utc: datetime
    status: CheckinStatus
    locked_at_utc: datetime | None = None
    sent_at_utc: datetime | None = None
    answered_at_utc: datetime | None = None
    attempts: int
    last_error: str | None = None
    last_outbound_message_id: str | None = None
    created_at: datetime
    
    # Legacy fields for backward compatibility
    due_at: datetime | None = None
    sent_at: datetime | None = None
    answered_at: datetime | None = None

    model_config = {"from_attributes": True}
