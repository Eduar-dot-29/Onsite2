from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.core.enums import CheckinPlanMode, ContactChannel, ShipmentStatus
from app.core.timezone import DEFAULT_TIMEZONE, is_valid_timezone


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
    """
    Create a new shipment with automatic check-in scheduling.
    
    Times are provided in local timezone and converted to UTC by backend.
    """
    customer_name: str
    origin_text: str
    destination_text: str
    destination_lat: float | None = None
    destination_lon: float | None = None
    
    # Local datetime string (ISO format) - will be converted to UTC
    departure_at_local: str
    
    # IANA timezone (e.g., "Europe/Madrid")
    timezone: str = DEFAULT_TIMEZONE
    
    # Duration in minutes
    estimated_duration_minutes: int
    
    # Check-in plan configuration
    checkin_plan_mode: CheckinPlanMode = CheckinPlanMode.INTERVAL
    checkin_interval_minutes: int | None = 30  # Required for INTERVAL mode
    checkin_count: int | None = None  # Required for MILESTONE mode
    
    # Optional: assign driver at creation
    assigned_contact_id: UUID | None = None
    
    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        if not is_valid_timezone(v):
            raise ValueError(f"Invalid timezone: {v}")
        return v
    
    @field_validator("estimated_duration_minutes")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Duration must be positive")
        return v


class ShipmentAssign(BaseModel):
    contact_id: UUID


class ShipmentUpdate(BaseModel):
    """Schema for updating a shipment. All fields are optional."""
    customer_name: str | None = None
    origin_text: str | None = None
    destination_text: str | None = None
    destination_lat: float | None = None
    destination_lon: float | None = None
    
    # For updating times (local + timezone)
    departure_at_local: str | None = None
    timezone: str | None = None
    estimated_duration_minutes: int | None = None
    
    # Check-in plan updates
    checkin_plan_mode: CheckinPlanMode | None = None
    checkin_interval_minutes: int | None = None
    checkin_count: int | None = None
    
    status: ShipmentStatus | None = None
    assigned_contact_id: UUID | None = None
    
    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is not None and not is_valid_timezone(v):
            raise ValueError(f"Invalid timezone: {v}")
        return v


class ShipmentOut(BaseModel):
    """
    Shipment output with times in UTC.
    Frontend should convert to local using the timezone field.
    """
    id: UUID
    tenant_id: UUID
    customer_name: str
    origin_text: str
    destination_text: str
    destination_lat: float | None
    destination_lon: float | None
    
    # UTC times
    departure_at_utc: datetime
    eta_at_utc: datetime
    
    # Timezone for frontend display
    timezone: str
    
    # Duration
    estimated_duration_minutes: int
    
    # Check-in configuration
    checkin_plan_mode: CheckinPlanMode
    checkin_interval_minutes: int | None
    checkin_count: int | None
    
    status: ShipmentStatus
    assigned_contact_id: UUID | None
    delivered_at_utc: datetime | None = None
    created_at: datetime
    deleted_at: datetime | None = None
    
    # Legacy fields for backward compatibility
    planned_departure_at: datetime | None = None
    eta_hours: int | None = None
    estimated_arrival_at: datetime | None = None

    model_config = {"from_attributes": True}


class ScheduledCheckinOut(BaseModel):
    """Output for scheduled check-in."""
    id: UUID
    shipment_id: UUID
    scheduled_for_utc: datetime
    status: str
    sent_at_utc: datetime | None = None
    answered_at_utc: datetime | None = None
    attempts: int
    last_error: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
