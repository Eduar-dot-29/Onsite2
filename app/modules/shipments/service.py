from __future__ import annotations

from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.enums import EventType, ShipmentStatus
from app.core.db import utcnow
from app.modules.shipments import models, schemas
from app.modules.tracking.service import record_event, schedule_checkins
from app.modules.tracking.service import resolve_tracking_rules


def create_shipment(
    session: Session, tenant_id, data: schemas.ShipmentCreate
) -> models.Shipment:
    estimated_arrival = data.planned_departure_at + timedelta(hours=data.eta_hours)
    shipment = models.Shipment(
        tenant_id=tenant_id,
        customer_name=data.customer_name,
        origin_text=data.origin_text,
        destination_text=data.destination_text,
        destination_lat=data.destination_lat,
        destination_lon=data.destination_lon,
        planned_departure_at=data.planned_departure_at,
        eta_hours=data.eta_hours,
        estimated_arrival_at=estimated_arrival,
        status=ShipmentStatus.CREATED,
    )
    session.add(shipment)
    session.flush()
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=shipment.id,
        event_type=EventType.SHIPMENT_CREATED,
        payload={
            "planned_departure_at": data.planned_departure_at.isoformat(),
            "eta_hours": data.eta_hours,
            "estimated_arrival_at": estimated_arrival.isoformat(),
        },
    )
    return shipment


def assign_contact(
    session: Session, tenant_id, shipment: models.Shipment, contact_id
) -> models.Shipment:
    shipment.assigned_contact_id = contact_id
    shipment.status = ShipmentStatus.ASSIGNED
    session.add(shipment)
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=shipment.id,
        event_type=EventType.DRIVER_ASSIGNED,
        payload={"contact_id": str(contact_id), "assigned_at": utcnow().isoformat()},
    )

    rules = resolve_tracking_rules(session, tenant_id, shipment.customer_name)
    schedule_checkins(session, shipment, rules)
    return shipment
