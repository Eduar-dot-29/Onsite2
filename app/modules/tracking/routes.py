from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.core.deps import get_current_user, require_role
from app.core.enums import UserRole
from app.modules.auth.models import User
from app.modules.shipments import models as shipment_models
from app.modules.tracking import models, schemas


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
