"""
Celery tasks for automatic check-in sending and monitoring.

Key features:
- Atomic locking to prevent duplicate sends
- All times in UTC
- Retry logic for failures
- Proper error handling
"""
from __future__ import annotations

import asyncio
import logging
from datetime import timedelta
from uuid import UUID

from sqlalchemy import and_, update
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.enums import CheckinStatus, ContactChannel, EventType, ShipmentStatus
from app.core.timezone import now_utc
from app.modules.auth.models import Tenant
from app.modules.messaging.service import get_provider
from app.modules.shipments import models as shipment_models
from app.modules.tracking import models as tracking_models
from app.modules.tracking import service as tracking_service
from app.workers.celery_app import celery_app


logger = logging.getLogger(__name__)

# Configuration
MAX_SEND_ATTEMPTS = 3
LOCK_TIMEOUT_MINUTES = 5


def _run_async(coro):
    """Run an async coroutine in a sync context."""
    return asyncio.run(coro)


@celery_app.task(name="app.workers.tasks.process_due_checkins")
def process_due_checkins():
    """
    Main worker task: process all due check-ins.
    
    Runs every minute (configured in Celery beat).
    Uses atomic locking to prevent duplicate processing.
    """
    session: Session = SessionLocal()
    try:
        current_time = now_utc()
        
        # Process for all tenants
        tenants = session.query(Tenant).all()
        
        for tenant in tenants:
            _process_tenant_checkins(session, tenant.id, current_time)
        
        session.commit()
        
    except Exception as e:
        logger.error("process_due_checkins.error", extra={"error": str(e)})
        session.rollback()
    finally:
        session.close()


def _process_tenant_checkins(session: Session, tenant_id: UUID, current_time):
    """Process due check-ins for a specific tenant."""
    
    # Find check-ins that are:
    # 1. PENDING status
    # 2. scheduled_for_utc <= now
    # 3. Shipment is ASSIGNED or IN_TRANSIT
    # 4. Shipment has an assigned contact
    due_checkins = (
        session.query(tracking_models.TrackingCheckin)
        .join(
            shipment_models.Shipment,
            tracking_models.TrackingCheckin.shipment_id == shipment_models.Shipment.id
        )
        .filter(
            tracking_models.TrackingCheckin.tenant_id == tenant_id,
            tracking_models.TrackingCheckin.status == CheckinStatus.PENDING,
            tracking_models.TrackingCheckin.scheduled_for_utc <= current_time,
            shipment_models.Shipment.status.in_([
                ShipmentStatus.ASSIGNED,
                ShipmentStatus.IN_TRANSIT,
            ]),
            shipment_models.Shipment.assigned_contact_id.isnot(None),
            shipment_models.Shipment.deleted_at.is_(None),
        )
        .all()
    )
    
    for checkin in due_checkins:
        _process_single_checkin(session, checkin, tenant_id, current_time)


def _process_single_checkin(
    session: Session,
    checkin: tracking_models.TrackingCheckin,
    tenant_id: UUID,
    current_time,
):
    """
    Process a single check-in with atomic locking.
    
    Flow:
    1. Atomic lock: PENDING -> SENDING
    2. Send message via Telegram
    3. Mark as SENT or FAILED
    """
    # Atomic lock: only update if still PENDING
    result = session.execute(
        update(tracking_models.TrackingCheckin)
        .where(
            and_(
                tracking_models.TrackingCheckin.id == checkin.id,
                tracking_models.TrackingCheckin.status == CheckinStatus.PENDING,
            )
        )
        .values(
            status=CheckinStatus.SENDING,
            locked_at_utc=current_time,
            attempts=checkin.attempts + 1,
        )
    )
    
    # If no rows updated, another worker got it first
    if result.rowcount == 0:
        logger.debug(
            "checkin.already_locked",
            extra={"checkin_id": str(checkin.id)}
        )
        return
    
    session.commit()
    
    # Refresh to get updated values
    session.refresh(checkin)
    
    # Get shipment and contact
    shipment = (
        session.query(shipment_models.Shipment)
        .filter(shipment_models.Shipment.id == checkin.shipment_id)
        .one_or_none()
    )
    
    if not shipment or not shipment.assigned_contact_id:
        _mark_checkin_failed(session, checkin, "No shipment or contact")
        return
    
    contact = (
        session.query(shipment_models.Contact)
        .filter(shipment_models.Contact.id == shipment.assigned_contact_id)
        .one_or_none()
    )
    
    if not contact:
        _mark_checkin_failed(session, checkin, "Contact not found")
        return
    
    # Validate contact has necessary channel info
    if contact.channel == ContactChannel.TELEGRAM and not contact.telegram_chat_id:
        _mark_checkin_failed(session, checkin, "Contact has no Telegram chat ID")
        return
    
    if contact.channel != ContactChannel.TELEGRAM and not contact.phone_e164:
        _mark_checkin_failed(session, checkin, "Contact has no phone number")
        return
    
    # Send the check-in message
    try:
        provider = get_provider(contact.channel)
        message_id = _run_async(provider.send_checkin(contact, shipment, checkin.id))
        
        if message_id:
            _mark_checkin_sent(session, checkin, message_id, tenant_id)
            
            # Update shipment status to IN_TRANSIT if first check-in sent
            if shipment.status == ShipmentStatus.ASSIGNED:
                shipment.status = ShipmentStatus.IN_TRANSIT
                session.add(shipment)
        else:
            _mark_checkin_failed(session, checkin, "No message ID returned")
            
    except Exception as e:
        logger.error(
            "checkin.send_error",
            extra={
                "checkin_id": str(checkin.id),
                "error": str(e),
                "attempt": checkin.attempts,
            }
        )
        _mark_checkin_failed(session, checkin, str(e))
    
    session.commit()


def _mark_checkin_sent(
    session: Session,
    checkin: tracking_models.TrackingCheckin,
    message_id: str,
    tenant_id: UUID,
):
    """Mark a check-in as successfully sent."""
    current_time = now_utc()
    
    checkin.status = CheckinStatus.SENT
    checkin.sent_at_utc = current_time
    checkin.sent_at = current_time  # Legacy field
    checkin.last_outbound_message_id = message_id
    checkin.locked_at_utc = None
    checkin.last_error = None
    session.add(checkin)
    
    # Record event
    tracking_service.record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=checkin.shipment_id,
        event_type=EventType.CHECKIN_SENT,
        payload={
            "checkin_id": str(checkin.id),
            "message_id": message_id,
            "sent_at_utc": current_time.isoformat(),
        },
    )
    
    logger.info(
        "checkin.sent",
        extra={
            "checkin_id": str(checkin.id),
            "message_id": message_id,
        }
    )


def _mark_checkin_failed(
    session: Session,
    checkin: tracking_models.TrackingCheckin,
    error: str,
):
    """Mark a check-in as failed, with retry logic."""
    checkin.last_error = error
    checkin.locked_at_utc = None
    
    if checkin.attempts >= MAX_SEND_ATTEMPTS:
        checkin.status = CheckinStatus.FAILED
        logger.warning(
            "checkin.max_attempts_reached",
            extra={
                "checkin_id": str(checkin.id),
                "attempts": checkin.attempts,
                "error": error,
            }
        )
    else:
        # Reset to PENDING for retry
        checkin.status = CheckinStatus.PENDING
        logger.info(
            "checkin.will_retry",
            extra={
                "checkin_id": str(checkin.id),
                "attempt": checkin.attempts,
                "error": error,
            }
        )
    
    session.add(checkin)


@celery_app.task(name="app.workers.tasks.cleanup_stale_locks")
def cleanup_stale_locks():
    """
    Clean up check-ins stuck in SENDING state.
    
    This can happen if a worker crashes mid-processing.
    """
    session: Session = SessionLocal()
    try:
        current_time = now_utc()
        stale_threshold = current_time - timedelta(minutes=LOCK_TIMEOUT_MINUTES)
        
        # Find stale locks
        stale_checkins = (
            session.query(tracking_models.TrackingCheckin)
            .filter(
                tracking_models.TrackingCheckin.status == CheckinStatus.SENDING,
                tracking_models.TrackingCheckin.locked_at_utc < stale_threshold,
            )
            .all()
        )
        
        for checkin in stale_checkins:
            checkin.status = CheckinStatus.PENDING
            checkin.locked_at_utc = None
            checkin.last_error = "Lock timeout - reset for retry"
            session.add(checkin)
            
            logger.warning(
                "checkin.stale_lock_reset",
                extra={"checkin_id": str(checkin.id)}
            )
        
        session.commit()
        
    except Exception as e:
        logger.error("cleanup_stale_locks.error", extra={"error": str(e)})
        session.rollback()
    finally:
        session.close()


@celery_app.task(name="app.workers.tasks.mark_silence_and_escalate")
def mark_silence_and_escalate():
    """
    Mark check-ins as missed and escalate if no response.
    
    This task runs periodically to detect non-responsive drivers.
    """
    session: Session = SessionLocal()
    try:
        tenants = session.query(Tenant).all()
        current_time = now_utc()
        
        for tenant in tenants:
            _check_silence_for_tenant(session, tenant.id, current_time)
        
        session.commit()
        
    except Exception as e:
        logger.error("mark_silence_and_escalate.error", extra={"error": str(e)})
        session.rollback()
    finally:
        session.close()


def _check_silence_for_tenant(session: Session, tenant_id: UUID, current_time):
    """Check for silence (no response) for a tenant's check-ins."""
    
    # Get default rule for silence threshold
    rule = (
        session.query(tracking_models.TrackingRule)
        .filter(
            tracking_models.TrackingRule.tenant_id == tenant_id,
            tracking_models.TrackingRule.is_default == True,
        )
        .first()
    )
    
    if not rule:
        # Use default values if no rule exists
        max_silence_minutes = 60
    else:
        max_silence_minutes = rule.max_silence_minutes
    
    silence_threshold = current_time - timedelta(minutes=max_silence_minutes)
    
    # Find sent check-ins that haven't been answered within threshold
    silent_checkins = (
        session.query(tracking_models.TrackingCheckin)
        .filter(
            tracking_models.TrackingCheckin.tenant_id == tenant_id,
            tracking_models.TrackingCheckin.status == CheckinStatus.SENT,
            tracking_models.TrackingCheckin.sent_at_utc < silence_threshold,
            tracking_models.TrackingCheckin.answered_at_utc.is_(None),
        )
        .all()
    )
    
    for checkin in silent_checkins:
        checkin.status = CheckinStatus.MISSED
        session.add(checkin)
        
        # Record escalation event
        tracking_service.record_event(
            session,
            tenant_id=tenant_id,
            shipment_id=checkin.shipment_id,
            event_type=EventType.NO_RESPONSE,
            payload={
                "checkin_id": str(checkin.id),
                "silence_minutes": max_silence_minutes,
            },
        )
        
        logger.warning(
            "checkin.no_response",
            extra={
                "checkin_id": str(checkin.id),
                "silence_minutes": max_silence_minutes,
            }
        )


@celery_app.task(name="app.workers.tasks.recalculate_route_and_eta")
def recalculate_route_and_eta(
    tenant_id: str,
    shipment_id: str,
    delay_minutes: int,
    lat: float,
    lon: float,
    contact_id: str,
):
    """Recalculate ETA based on current location and delay."""
    session: Session = SessionLocal()
    try:
        tenant_uuid = UUID(tenant_id)
        shipment_uuid = UUID(shipment_id)
        contact_uuid = UUID(contact_id)
        
        shipment = tracking_service.recalculate_route_and_eta(
            session,
            tenant_id=tenant_uuid,
            shipment_id=shipment_uuid,
            delay_minutes=delay_minutes,
            lat=lat,
            lon=lon,
        )
        
        if shipment:
            shipment.status = ShipmentStatus.IN_TRANSIT
            session.add(shipment)

        # Clean up incident state
        incident_state = (
            session.query(tracking_models.ShipmentIncidentState)
            .filter(
                tracking_models.ShipmentIncidentState.tenant_id == tenant_uuid,
                tracking_models.ShipmentIncidentState.shipment_id == shipment_uuid,
                tracking_models.ShipmentIncidentState.contact_id == contact_uuid,
            )
            .one_or_none()
        )
        if incident_state:
            session.delete(incident_state)

        session.commit()

        # Send confirmation to driver
        if shipment:
            contact = (
                session.query(shipment_models.Contact)
                .filter(
                    shipment_models.Contact.id == contact_uuid,
                    shipment_models.Contact.tenant_id == tenant_uuid,
                )
                .one_or_none()
            )
            if contact:
                provider = get_provider(contact.channel)
                # Format ETA in shipment's timezone
                from app.core.timezone import format_local_time
                eta_text = format_local_time(
                    shipment.eta_at_utc,
                    shipment.timezone,
                    "%H:%M"
                )
                _run_async(
                    provider.send_text(
                        contact,
                        f"Recibido. ETA actualizada: {eta_text} ({shipment.timezone}). Gracias."
                    )
                )
    finally:
        session.close()


# Legacy task name for backward compatibility
@celery_app.task(name="app.workers.tasks.send_due_checkins")
def send_due_checkins():
    """Legacy task - redirects to new process_due_checkins."""
    return process_due_checkins()
