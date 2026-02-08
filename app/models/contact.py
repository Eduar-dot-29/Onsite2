from __future__ import annotations

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, utcnow
from app.models.enums import ContactLinkStatus


class Contact(UUIDMixin, Base):
    """
    Driver/contact entity.

    - `phone_e164`: canonical phone number (+34..., +52..., etc.)
    - `telegram_chat_id`: Telegram chat identifier when linked
    - `link_status`: whether the contact is linked to a channel identity
    """

    __tablename__ = "contacts_v2"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone_e164: Mapped[str | None] = mapped_column(String(32), nullable=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    link_status: Mapped[ContactLinkStatus] = mapped_column(
        Enum(ContactLinkStatus, name="contact_link_status_v2"),
        nullable=False,
        default=ContactLinkStatus.UNLINKED,
    )

    created_at_utc: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    shipments: Mapped[list["Shipment"]] = relationship(
        back_populates="driver"
    )

