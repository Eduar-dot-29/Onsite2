from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.schemas.shipment import ShipmentCreate
from app.api.schemas.shipment import ShipmentUpdate
from app.models.enums import CheckinType, ShipmentEventType, ShipmentStatus
from app.models.milestone import Milestone
from app.models.shipment import Shipment
from app.models.shipment_event import ShipmentEvent
from app.modules.telegram.provider import TelegramProvider
from app.core.timezone import calculate_eta_utc, to_utc


def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def create_shipment(session: Session, data: ShipmentCreate) -> Shipment:
    if data.checkin_type == CheckinType.INTERVAL:
        if data.interval_minutes is None or data.interval_minutes <= 0:
            raise ValueError("interval_minutes is required for INTERVAL checkin_type")

    shipment = Shipment(
        reference=data.reference,
        origin=data.origin,
        destination=data.destination,
        status=ShipmentStatus.PENDING,
        departure_at_utc=ensure_utc(data.departure_at_utc),
        eta_at_utc=ensure_utc(data.eta_at_utc),
        timezone=data.timezone,
        checkin_type=data.checkin_type,
        interval_minutes=data.interval_minutes,
        driver_id=data.driver_id,
    )
    session.add(shipment)
    session.flush()

    # Optional milestones on create
    if data.milestones:
        for m in data.milestones:
            session.add(
                Milestone(
                    shipment_id=shipment.id,
                    name=m.name,
                    latitude=m.latitude,
                    longitude=m.longitude,
                    radius_km=m.radius_km,
                    is_completed=m.is_completed,
                )
            )

    # Create initial timeline event
    session.add(
        ShipmentEvent(
            shipment_id=shipment.id,
            event_type=ShipmentEventType.SYSTEM,
            description="Shipment created",
        )
    )

    session.commit()
    session.refresh(shipment)
    return shipment


def list_shipments(session: Session, status: ShipmentStatus | None = None) -> list[Shipment]:
    stmt = select(Shipment).order_by(Shipment.created_at_utc.desc())
    if status is not None:
        stmt = stmt.where(Shipment.status == status)
    return list(session.execute(stmt).scalars().all())


def get_shipment_detail(session: Session, shipment_id: UUID) -> Shipment | None:
    stmt = (
        select(Shipment)
        .where(Shipment.id == shipment_id)
        .options(selectinload(Shipment.milestones), selectinload(Shipment.events))
    )
    return session.execute(stmt).scalars().first()


def update_shipment(session: Session, shipment_id: UUID, data: ShipmentUpdate) -> Shipment | None:
    shipment = session.execute(select(Shipment).where(Shipment.id == shipment_id)).scalars().first()
    if not shipment:
        return None

    if data.reference is not None:
        shipment.reference = data.reference
    if data.origin is not None:
        shipment.origin = data.origin
    if data.destination is not None:
        shipment.destination = data.destination

    # timezone update first (used for local conversion)
    if data.timezone is not None:
        shipment.timezone = data.timezone

    # departure/eta updates
    if data.departure_at_local is not None:
        shipment.departure_at_utc = to_utc(data.departure_at_local, shipment.timezone)
    elif data.departure_at_utc is not None:
        shipment.departure_at_utc = ensure_utc(data.departure_at_utc)

    if data.eta_at_utc is not None:
        shipment.eta_at_utc = ensure_utc(data.eta_at_utc)
    elif data.estimated_duration_minutes is not None:
        shipment.eta_at_utc = calculate_eta_utc(shipment.departure_at_utc, data.estimated_duration_minutes)

    if data.checkin_type is not None:
        shipment.checkin_type = data.checkin_type
    if data.interval_minutes is not None:
        shipment.interval_minutes = data.interval_minutes

    if data.driver_id is not None:
        shipment.driver_id = data.driver_id
        # When driver is assigned for the first time, consider it in transit
        if shipment.status == ShipmentStatus.PENDING:
            shipment.status = ShipmentStatus.IN_TRANSIT
            session.add(
                ShipmentEvent(
                    shipment_id=shipment.id,
                    event_type=ShipmentEventType.SYSTEM,
                    description="Driver assigned",
                )
            )

    if data.status is not None:
        shipment.status = data.status

    session.add(shipment)
    session.commit()
    session.refresh(shipment)
    return shipment


def send_manual_checkin(session: Session, shipment_id: UUID) -> ShipmentEvent | None:
    """
    Create a CHECK_IN event and send a Telegram check-in message to the assigned driver.
    Uses ShipmentEvent.id as the checkin_id context for callback buttons.
    """
    shipment = session.execute(select(Shipment).where(Shipment.id == shipment_id)).scalars().first()
    if not shipment or not shipment.driver_id:
        return None

    from app.models.contact import Contact

    contact = session.execute(select(Contact).where(Contact.id == shipment.driver_id)).scalars().first()
    if not contact or not contact.telegram_chat_id:
        return None

    evt = ShipmentEvent(
        shipment_id=shipment.id,
        event_type=ShipmentEventType.CHECK_IN,
        description="CHECK_IN_SENT (manual)",
    )
    session.add(evt)
    session.flush()

    provider = TelegramProvider()

    class _C:
        telegram_chat_id = contact.telegram_chat_id

    class _S:
        customer_name = shipment.reference
        origin_text = shipment.origin
        destination_text = shipment.destination

    import asyncio

    message_id = asyncio.run(provider.send_checkin(_C(), _S(), evt.id))
    if not message_id:
        session.rollback()
        return None

    session.commit()
    session.refresh(evt)
    return evt


def delete_shipment(session: Session, shipment_id: UUID) -> bool:
    shipment = session.execute(select(Shipment).where(Shipment.id == shipment_id)).scalars().first()
    if not shipment:
        return False
    session.delete(shipment)
    session.commit()
    return True

