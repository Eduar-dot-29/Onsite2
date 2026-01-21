from __future__ import annotations

import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_session, utcnow
from app.core.deps import get_current_user, require_role
from app.core.enums import CheckinStatus, ContactChannel, EventType, UserRole
from app.modules.auth.models import User
from app.modules.messaging.service import get_provider
from app.modules.shipments import models as shipment_models
from app.modules.tracking import models, schemas, service


router = APIRouter(prefix="/tracking", tags=["tracking"])


@router.post("/rules", response_model=schemas.TrackingRuleOut)
def create_tracking_rule(
    data: schemas.TrackingRuleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    rule = models.TrackingRule(
        tenant_id=current_user.tenant_id,
        customer_name=data.customer_name,
        checkin_every_minutes=data.checkin_every_minutes,
        max_silence_minutes=data.max_silence_minutes,
        delay_escalation_minutes=data.delay_escalation_minutes,
        notify_customer=data.notify_customer,
        notify_customer_delay_threshold_minutes=data.notify_customer_delay_threshold_minutes,
    )
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.get("/rules", response_model=list[schemas.TrackingRuleOut])
def list_tracking_rules(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return (
        session.query(models.TrackingRule)
        .filter(models.TrackingRule.tenant_id == current_user.tenant_id)
        .order_by(models.TrackingRule.created_at.desc())
        .all()
    )


@router.get("/shipments/{shipment_id}/events", response_model=list[schemas.ShipmentEventOut])
def list_shipment_events(
    shipment_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    shipment = (
        session.query(shipment_models.Shipment)
        .filter(
            shipment_models.Shipment.id == shipment_id,
            shipment_models.Shipment.tenant_id == current_user.tenant_id,
        )
        .one_or_none()
    )
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    return (
        session.query(models.ShipmentEvent)
        .filter(
            models.ShipmentEvent.shipment_id == shipment_id,
            models.ShipmentEvent.tenant_id == current_user.tenant_id,
        )
        .order_by(models.ShipmentEvent.created_at.asc())
        .all()
    )


@router.get("/shipments/{shipment_id}/checkins", response_model=list[schemas.TrackingCheckinOut])
def list_shipment_checkins(
    shipment_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    shipment = (
        session.query(shipment_models.Shipment)
        .filter(
            shipment_models.Shipment.id == shipment_id,
            shipment_models.Shipment.tenant_id == current_user.tenant_id,
        )
        .one_or_none()
    )
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    return (
        session.query(models.TrackingCheckin)
        .filter(
            models.TrackingCheckin.shipment_id == shipment_id,
            models.TrackingCheckin.tenant_id == current_user.tenant_id,
        )
        .order_by(models.TrackingCheckin.due_at.asc())
        .all()
    )


@router.post("/shipments/{shipment_id}/send-checkin", response_model=schemas.TrackingCheckinOut)
async def send_manual_checkin(
    shipment_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Send a manual check-in message to the assigned driver via Telegram."""
    shipment = (
        session.query(shipment_models.Shipment)
        .filter(
            shipment_models.Shipment.id == shipment_id,
            shipment_models.Shipment.tenant_id == current_user.tenant_id,
        )
        .one_or_none()
    )
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    if not shipment.assigned_contact_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No driver assigned to this shipment")

    contact = (
        session.query(shipment_models.Contact)
        .filter(
            shipment_models.Contact.id == shipment.assigned_contact_id,
            shipment_models.Contact.tenant_id == current_user.tenant_id,
        )
        .one_or_none()
    )
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    if contact.channel != ContactChannel.TELEGRAM or not contact.telegram_chat_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact does not have Telegram configured")

    # Create checkin record
    checkin = models.TrackingCheckin(
        tenant_id=current_user.tenant_id,
        shipment_id=shipment_id,
        due_at=utcnow(),
        status=CheckinStatus.PENDING,
    )
    session.add(checkin)
    session.flush()

    # Send via Telegram
    provider = get_provider(ContactChannel.TELEGRAM)
    message_id = await provider.send_checkin(contact, shipment, checkin.id)

    if message_id:
        checkin.status = CheckinStatus.SENT
        checkin.sent_at = utcnow()
        checkin.last_outbound_message_id = message_id
        session.add(checkin)
        
        service.record_event(
            session,
            tenant_id=current_user.tenant_id,
            shipment_id=shipment_id,
            event_type=EventType.CHECKIN_SENT,
            payload={"checkin_id": str(checkin.id), "message_id": message_id, "manual": True},
        )
    
    session.commit()
    session.refresh(checkin)
    return checkin
