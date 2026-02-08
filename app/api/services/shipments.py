from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.schemas.shipment import ShipmentCreate
from app.models.enums import CheckinType, ShipmentEventType, ShipmentStatus
from app.models.milestone import Milestone
from app.models.shipment import Shipment
from app.models.shipment_event import ShipmentEvent


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

