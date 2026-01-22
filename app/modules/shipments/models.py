from __future__ import annotations

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, UUIDMixin, utcnow
from app.core.enums import ContactChannel, ShipmentStatus


class Contact(UUIDMixin, Base):
    __tablename__ = "contacts"

    tenant_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    channel: Mapped[ContactChannel] = mapped_column(
        Enum(ContactChannel, name="contact_channel"), nullable=False
    )
    telegram_chat_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    phone_e164: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class Shipment(UUIDMixin, Base):
    __tablename__ = "shipments"

    tenant_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    origin_text: Mapped[str] = mapped_column(String(300), nullable=False)
    destination_text: Mapped[str] = mapped_column(String(300), nullable=False)
    destination_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    destination_lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    planned_departure_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    eta_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_arrival_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[ShipmentStatus] = mapped_column(
        Enum(ShipmentStatus, name="shipment_status"),
        default=ShipmentStatus.CREATED,
        nullable=False,
    )
    assigned_contact_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=True
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    # Soft delete
    deleted_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    assigned_contact = relationship("Contact")
