from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator

from app.core.timezone import DEFAULT_TIMEZONE, calculate_eta_utc, is_valid_timezone, to_utc
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
    # API can accept either explicit UTC datetimes, or departure_at_local + duration.
    # Backend always stores UTC.
    departure_at_utc: datetime | None = None
    eta_at_utc: datetime | None = None
    departure_at_local: str | None = None
    estimated_duration_minutes: int | None = None
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
    def normalize_datetimes(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        return _ensure_utc(v)

    @model_validator(mode="after")
    def validate_and_fill_times(self):
        # Fill missing departure/eta from local+duration or utc+duration.
        departure_utc = self.departure_at_utc
        eta_utc = self.eta_at_utc

        if departure_utc is None and self.departure_at_local:
            departure_utc = to_utc(self.departure_at_local, self.timezone)
        if departure_utc is not None and departure_utc.tzinfo is None:
            departure_utc = _ensure_utc(departure_utc)

        if eta_utc is None and departure_utc is not None and self.estimated_duration_minutes is not None:
            if self.estimated_duration_minutes <= 0:
                raise ValueError("estimated_duration_minutes must be positive")
            eta_utc = calculate_eta_utc(departure_utc, self.estimated_duration_minutes)
        if eta_utc is not None and eta_utc.tzinfo is None:
            eta_utc = _ensure_utc(eta_utc)

        if departure_utc is None or eta_utc is None:
            raise ValueError(
                "Provide either (departure_at_utc and eta_at_utc) or (departure_at_local and estimated_duration_minutes) "
                "or (departure_at_utc and estimated_duration_minutes)"
            )

        if eta_utc <= departure_utc:
            raise ValueError("eta_at_utc must be after departure_at_utc")

        # assign computed values back
        self.departure_at_utc = departure_utc
        self.eta_at_utc = eta_utc

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
    departure_at_local: str | None = None
    estimated_duration_minutes: int | None = None
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

    @model_validator(mode="after")
    def fill_eta_from_duration(self):
        # If update provides local departure, compute utc.
        if self.departure_at_utc is None and self.departure_at_local and self.timezone:
            self.departure_at_utc = to_utc(self.departure_at_local, self.timezone)
        # If we have departure and duration, compute ETA (unless explicit ETA provided)
        if self.eta_at_utc is None and self.departure_at_utc is not None and self.estimated_duration_minutes is not None:
            if self.estimated_duration_minutes <= 0:
                raise ValueError("estimated_duration_minutes must be positive")
            self.eta_at_utc = calculate_eta_utc(self.departure_at_utc, self.estimated_duration_minutes)
        return self


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

