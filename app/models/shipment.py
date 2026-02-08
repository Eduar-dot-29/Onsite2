from __future__ import annotations

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, utcnow
from app.models.enums import CheckinType, ShipmentStatus


class Shipment(UUIDMixin, Base):
    """
    Shipment model for On-site-On-Transit (v2).

    Times are stored in UTC and `timezone` stores the IANA tz name for display.
    """

    __tablename__ = "shipments_v2"

    reference: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    origin: Mapped[str] = mapped_column(String(300), nullable=False)
    destination: Mapped[str] = mapped_column(String(300), nullable=False)

    status: Mapped[ShipmentStatus] = mapped_column(
        Enum(ShipmentStatus, name="shipment_status_v2"),
        nullable=False,
        default=ShipmentStatus.PENDING,
        index=True,
    )

    departure_at_utc: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    eta_at_utc: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False)

    checkin_type: Mapped[CheckinType] = mapped_column(
        Enum(CheckinType, name="checkin_type_v2"),
        nullable=False,
        default=CheckinType.INTERVAL,
    )
    interval_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    driver_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts_v2.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at_utc: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    driver: Mapped["Contact | None"] = relationship(back_populates="shipments")

    milestones: Mapped[list["Milestone"]] = relationship(
        back_populates="shipment",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    events: Mapped[list["ShipmentEvent"]] = relationship(
        back_populates="shipment",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

