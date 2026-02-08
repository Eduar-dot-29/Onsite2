from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator

from app.core.timezone import DEFAULT_TIMEZONE, is_valid_timezone
from app.models.enums import CheckinType, ShipmentEventType, ShipmentStatus

from .milestone import MilestoneCreate, MilestoneRead


def _ensure_utc(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware and converted to UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class ShipmentBase(BaseModel):
    reference: str
    origin: str
    destination: str
    departure_at_utc: datetime
    eta_at_utc: datetime
    timezone: str = DEFAULT_TIMEZONE
    checkin_type: CheckinType = CheckinType.INTERVAL
    interval_minutes: int | None = None
    driver_id: UUID | None = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        if not is_valid_timezone(v):
            raise ValueError(f"Invalid timezone: {v}")
        return v

    @field_validator("departure_at_utc", "eta_at_utc")
    @classmethod
    def normalize_datetimes(cls, v: datetime) -> datetime:
        return _ensure_utc(v)

    @model_validator(mode="after")
    def validate_times(self):
        if self.eta_at_utc <= self.departure_at_utc:
            raise ValueError("eta_at_utc must be after departure_at_utc")
        if self.checkin_type == CheckinType.INTERVAL:
            if self.interval_minutes is None or self.interval_minutes <= 0:
                raise ValueError("interval_minutes is required and must be positive for INTERVAL checkin_type")
        return self


class ShipmentCreate(ShipmentBase):
    milestones: list[MilestoneCreate] | None = None


class ShipmentUpdate(BaseModel):
    reference: str | None = None
    origin: str | None = None
    destination: str | None = None
    status: ShipmentStatus | None = None
    departure_at_utc: datetime | None = None
    eta_at_utc: datetime | None = None
    timezone: str | None = None
    checkin_type: CheckinType | None = None
    interval_minutes: int | None = None
    driver_id: UUID | None = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not is_valid_timezone(v):
            raise ValueError(f"Invalid timezone: {v}")
        return v

    @field_validator("departure_at_utc", "eta_at_utc")
    @classmethod
    def normalize_datetimes(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        return _ensure_utc(v)


class ShipmentEventRead(BaseModel):
    id: UUID
    shipment_id: UUID
    event_type: ShipmentEventType
    description: str
    created_at_utc: datetime

    model_config = {"from_attributes": True}


class ShipmentRead(BaseModel):
    id: UUID
    reference: str
    origin: str
    destination: str
    status: ShipmentStatus
    departure_at_utc: datetime
    eta_at_utc: datetime
    timezone: str
    checkin_type: CheckinType
    interval_minutes: int | None
    driver_id: UUID | None
    created_at_utc: datetime

    model_config = {"from_attributes": True}


class ShipmentDetailRead(ShipmentRead):
    milestones: list[MilestoneRead] = []
    events: list[ShipmentEventRead] = []

