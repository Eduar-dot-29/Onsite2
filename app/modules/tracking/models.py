from __future__ import annotations

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
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
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="Default")
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    
    # Check-in interval configuration
    interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    
    # Escalation settings
    max_no_response: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    max_silence_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    delay_escalation_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    
    # Customer notification settings
    notify_customer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notify_customer_delay_threshold_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    
    # Legacy fields for backward compatibility
    checkin_every_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)


class TrackingCheckin(UUIDMixin, Base):
    """
    Scheduled check-in for automatic sending.
    
    Status flow:
    PENDING -> SENDING -> SENT -> ANSWERED/MISSED/ESCALATED
                      -> FAILED (can retry)
    PENDING -> CANCELLED (if shipment cancelled/delivered)
    """
    __tablename__ = "tracking_checkins"

    tenant_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    shipment_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False
    )
    rule_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tracking_rules.id"), nullable=True
    )
    
    # Scheduled time in UTC (THE key field for worker)
    scheduled_for_utc: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    
    # Status with atomic lock support
    status: Mapped[CheckinStatus] = mapped_column(
        Enum(CheckinStatus, name="checkin_status"),
        default=CheckinStatus.PENDING,
        nullable=False,
    )
    
    # Lock timestamp to prevent duplicate processing
    locked_at_utc: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    # Sending tracking
    sent_at_utc: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    answered_at_utc: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    # Retry handling
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Message tracking
    last_outbound_message_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    
    # Legacy fields for backward compatibility
    due_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    answered_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)


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
    checkin_id: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
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
