from __future__ import annotations

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, utcnow


class Milestone(UUIDMixin, Base):
    """Geofencing milestone for a shipment."""

    __tablename__ = "milestones_v2"

    shipment_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shipments_v2.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    radius_km: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at_utc: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    shipment: Mapped["Shipment"] = relationship(back_populates="milestones")

