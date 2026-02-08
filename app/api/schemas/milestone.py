from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class MilestoneBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    radius_km: float = 1.0
    is_completed: bool = False

    @field_validator("radius_km")
    @classmethod
    def validate_radius(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("radius_km must be positive")
        return v


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None
    is_completed: bool | None = None

    @field_validator("radius_km")
    @classmethod
    def validate_radius(cls, v: float | None) -> float | None:
        if v is None:
            return v
        if v <= 0:
            raise ValueError("radius_km must be positive")
        return v


class MilestoneRead(MilestoneBase):
    id: UUID
    shipment_id: UUID
    created_at_utc: datetime

    model_config = {"from_attributes": True}

