from __future__ import annotations

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, utcnow
from app.models.enums import ShipmentEventType


class ShipmentEvent(UUIDMixin, Base):
    """Timeline events for a shipment (v2)."""

    __tablename__ = "shipment_events_v2"

    shipment_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shipments_v2.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    event_type: Mapped[ShipmentEventType] = mapped_column(
        Enum(ShipmentEventType, name="shipment_event_type_v2"),
        nullable=False,
        index=True,
    )

    description: Mapped[str] = mapped_column(Text, nullable=False)

    created_at_utc: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )

    shipment: Mapped["Shipment"] = relationship(back_populates="events")

