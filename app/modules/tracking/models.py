from __future__ import annotations

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, UUIDMixin, utcnow
from app.core.enums import CheckinStatus, EventType, IncidentState, IncidentType


class ShipmentEvent(UUIDMixin, Base):
    __tablename__ = "shipment_events"

    tenant_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    shipment_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False
    )
    event_type: Mapped[EventType] = mapped_column(
        Enum(EventType, name="event_type"), nullable=False
    )
    payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class TrackingRule(UUIDMixin, Base):
    __tablename__ = "tracking_rules"

    tenant_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    checkin_every_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    max_silence_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    delay_escalation_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    notify_customer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notify_customer_delay_threshold_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class TrackingCheckin(UUIDMixin, Base):
    __tablename__ = "tracking_checkins"

    tenant_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    shipment_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False
    )
    due_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    answered_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[CheckinStatus] = mapped_column(
        Enum(CheckinStatus, name="checkin_status"),
        default=CheckinStatus.PENDING,
        nullable=False,
    )
    last_outbound_message_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class ShipmentLocation(UUIDMixin, Base):
    __tablename__ = "shipment_locations"

    tenant_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    shipment_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class ShipmentIncidentState(UUIDMixin, Base):
    __tablename__ = "shipment_incident_states"

    tenant_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    shipment_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False
    )
    contact_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    incident_type: Mapped[IncidentType] = mapped_column(
        Enum(IncidentType, name="incident_type"), nullable=False
    )
    state: Mapped[IncidentState] = mapped_column(
        Enum(IncidentState, name="incident_state"), nullable=False
    )
    delay_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
