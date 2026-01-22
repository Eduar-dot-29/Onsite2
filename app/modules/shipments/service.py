from __future__ import annotations

import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.enums import CheckinStatus, EventType, ShipmentStatus
from app.core.db import utcnow
from app.core.timezone import (
    to_utc,
    calculate_eta_utc,
    generate_checkin_schedule,
    now_utc,
)
from app.modules.shipments import models, schemas
from app.modules.tracking import models as tracking_models
from app.modules.tracking.service import record_event


logger = logging.getLogger(__name__)


def create_shipment(
    session: Session, tenant_id: UUID, data: schemas.ShipmentCreate
) -> models.Shipment:
    """
    Create a shipment with automatic check-in scheduling.
    
    1. Converts local departure time to UTC
    2. Calculates ETA in UTC
    3. Creates the shipment
    4. Automatically generates scheduled check-ins
    """
    # Convert local time to UTC
    departure_utc = to_utc(data.departure_at_local, data.timezone)
    eta_utc = calculate_eta_utc(departure_utc, data.estimated_duration_minutes)
    
    # Create shipment
    shipment = models.Shipment(
        tenant_id=tenant_id,
        customer_name=data.customer_name,
        origin_text=data.origin_text,
        destination_text=data.destination_text,
        destination_lat=data.destination_lat,
        destination_lon=data.destination_lon,
        departure_at_utc=departure_utc,
        eta_at_utc=eta_utc,
        timezone=data.timezone,
        estimated_duration_minutes=data.estimated_duration_minutes,
        checkin_plan_mode=data.checkin_plan_mode,
        checkin_interval_minutes=data.checkin_interval_minutes,
        checkin_count=data.checkin_count,
        status=ShipmentStatus.CREATED,
        assigned_contact_id=data.assigned_contact_id,
        # Legacy fields
        planned_departure_at=departure_utc,
        eta_hours=data.estimated_duration_minutes // 60,
        estimated_arrival_at=eta_utc,
    )
    
    # If driver assigned at creation, set status to ASSIGNED
    if data.assigned_contact_id:
        shipment.status = ShipmentStatus.ASSIGNED
    
    session.add(shipment)
    session.flush()
    
    # Record creation event
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=shipment.id,
        event_type=EventType.SHIPMENT_CREATED,
        payload={
            "departure_at_utc": departure_utc.isoformat(),
            "eta_at_utc": eta_utc.isoformat(),
            "timezone": data.timezone,
            "estimated_duration_minutes": data.estimated_duration_minutes,
            "checkin_plan_mode": data.checkin_plan_mode.value,
        },
    )
    
    # Auto-generate scheduled check-ins
    schedule = _generate_and_save_checkins(session, shipment)
    
    logger.info(
        "shipment.created",
        extra={
            "shipment_id": str(shipment.id),
            "departure_utc": departure_utc.isoformat(),
            "eta_utc": eta_utc.isoformat(),
            "checkins_scheduled": len(schedule),
        }
    )
    
    return shipment


def _generate_and_save_checkins(
    session: Session, shipment: models.Shipment
) -> list[tracking_models.TrackingCheckin]:
    """
    Generate and save scheduled check-ins for a shipment.
    
    Check-ins are only scheduled if the shipment has an assigned driver.
    """
    checkins: list[tracking_models.TrackingCheckin] = []
    
    # Generate schedule times
    try:
        schedule_times = generate_checkin_schedule(
            departure_utc=shipment.departure_at_utc,
            eta_utc=shipment.eta_at_utc,
            mode=shipment.checkin_plan_mode.value,
            interval_minutes=shipment.checkin_interval_minutes,
            checkin_count=shipment.checkin_count,
            skip_first=True,  # Don't send check-in at exact departure
        )
    except ValueError as e:
        logger.warning(
            "shipment.checkin_schedule_error",
            extra={"shipment_id": str(shipment.id), "error": str(e)}
        )
        return checkins
    
    # Create check-in records
    for scheduled_time in schedule_times:
        checkin = tracking_models.TrackingCheckin(
            tenant_id=shipment.tenant_id,
            shipment_id=shipment.id,
            scheduled_for_utc=scheduled_time,
            status=CheckinStatus.PENDING,
            attempts=0,
            # Legacy fields
            due_at=scheduled_time,
            scheduled_at=scheduled_time,
        )
        session.add(checkin)
        checkins.append(checkin)
    
    if checkins:
        record_event(
            session,
            tenant_id=shipment.tenant_id,
            shipment_id=shipment.id,
            event_type=EventType.CHECKIN_SCHEDULED,
            payload={
                "checkin_count": len(checkins),
                "first_checkin_utc": schedule_times[0].isoformat() if schedule_times else None,
                "last_checkin_utc": schedule_times[-1].isoformat() if schedule_times else None,
            },
        )
    
    return checkins


def assign_contact(
    session: Session, tenant_id: UUID, shipment: models.Shipment, contact_id: UUID
) -> models.Shipment:
    """
    Assign a driver to a shipment.
    
    If check-ins haven't been scheduled yet, they will be generated now.
    """
    shipment.assigned_contact_id = contact_id
    shipment.status = ShipmentStatus.ASSIGNED
    session.add(shipment)
    
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=shipment.id,
        event_type=EventType.DRIVER_ASSIGNED,
        payload={
            "contact_id": str(contact_id),
            "assigned_at": now_utc().isoformat(),
        },
    )
    
    # Check if check-ins already exist
    existing_checkins = (
        session.query(tracking_models.TrackingCheckin)
        .filter(
            tracking_models.TrackingCheckin.shipment_id == shipment.id,
            tracking_models.TrackingCheckin.tenant_id == tenant_id,
        )
        .count()
    )
    
    # If no check-ins exist, generate them
    if existing_checkins == 0:
        _generate_and_save_checkins(session, shipment)
    
    return shipment


def update_shipment(
    session: Session,
    shipment: models.Shipment,
    data: schemas.ShipmentUpdate,
) -> models.Shipment:
    """
    Update a shipment, recalculating times and check-ins if needed.
    """
    reschedule_checkins = False
    
    # Update basic fields
    if data.customer_name is not None:
        shipment.customer_name = data.customer_name
    if data.origin_text is not None:
        shipment.origin_text = data.origin_text
    if data.destination_text is not None:
        shipment.destination_text = data.destination_text
    if data.destination_lat is not None:
        shipment.destination_lat = data.destination_lat
    if data.destination_lon is not None:
        shipment.destination_lon = data.destination_lon
    if data.status is not None:
        shipment.status = data.status
    if data.assigned_contact_id is not None:
        shipment.assigned_contact_id = data.assigned_contact_id
    
    # Update time-related fields
    if data.departure_at_local is not None or data.estimated_duration_minutes is not None:
        tz = data.timezone or shipment.timezone
        
        if data.departure_at_local is not None:
            shipment.departure_at_utc = to_utc(data.departure_at_local, tz)
            shipment.planned_departure_at = shipment.departure_at_utc
        
        if data.timezone is not None:
            shipment.timezone = data.timezone
        
        if data.estimated_duration_minutes is not None:
            shipment.estimated_duration_minutes = data.estimated_duration_minutes
            shipment.eta_hours = data.estimated_duration_minutes // 60
        
        # Recalculate ETA
        shipment.eta_at_utc = calculate_eta_utc(
            shipment.departure_at_utc,
            shipment.estimated_duration_minutes
        )
        shipment.estimated_arrival_at = shipment.eta_at_utc
        reschedule_checkins = True
    
    # Update check-in plan
    if data.checkin_plan_mode is not None:
        shipment.checkin_plan_mode = data.checkin_plan_mode
        reschedule_checkins = True
    if data.checkin_interval_minutes is not None:
        shipment.checkin_interval_minutes = data.checkin_interval_minutes
        reschedule_checkins = True
    if data.checkin_count is not None:
        shipment.checkin_count = data.checkin_count
        reschedule_checkins = True
    
    session.add(shipment)
    
    # Reschedule check-ins if needed
    if reschedule_checkins:
        _cancel_pending_checkins(session, shipment)
        _generate_and_save_checkins(session, shipment)
    
    return shipment


def _cancel_pending_checkins(session: Session, shipment: models.Shipment) -> int:
    """Cancel all pending check-ins for a shipment."""
    count = (
        session.query(tracking_models.TrackingCheckin)
        .filter(
            tracking_models.TrackingCheckin.shipment_id == shipment.id,
            tracking_models.TrackingCheckin.tenant_id == shipment.tenant_id,
            tracking_models.TrackingCheckin.status == CheckinStatus.PENDING,
        )
        .update({"status": CheckinStatus.CANCELLED})
    )
    return count


def mark_delivered(
    session: Session, tenant_id: UUID, shipment: models.Shipment
) -> models.Shipment:
    """Mark a shipment as delivered and cancel pending check-ins."""
    shipment.status = ShipmentStatus.DELIVERED
    shipment.delivered_at_utc = now_utc()
    session.add(shipment)
    
    # Cancel pending check-ins
    cancelled = _cancel_pending_checkins(session, shipment)
    
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=shipment.id,
        event_type=EventType.SHIPMENT_CREATED,  # TODO: Add SHIPMENT_DELIVERED event type
        payload={
            "delivered_at_utc": shipment.delivered_at_utc.isoformat(),
            "checkins_cancelled": cancelled,
        },
    )
    
    return shipment


def get_scheduled_checkins(
    session: Session, tenant_id: UUID, shipment_id: UUID
) -> list[tracking_models.TrackingCheckin]:
    """Get all scheduled check-ins for a shipment."""
    return (
        session.query(tracking_models.TrackingCheckin)
        .filter(
            tracking_models.TrackingCheckin.shipment_id == shipment_id,
            tracking_models.TrackingCheckin.tenant_id == tenant_id,
        )
        .order_by(tracking_models.TrackingCheckin.scheduled_for_utc)
        .all()
    )
