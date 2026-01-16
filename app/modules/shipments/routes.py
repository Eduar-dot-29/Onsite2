from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.core.deps import get_current_user
from app.modules.shipments import models, schemas, service
from app.modules.auth.models import User


router = APIRouter(prefix="/shipments", tags=["shipments"])


@router.post("", response_model=schemas.ShipmentOut)
def create_shipment(
    data: schemas.ShipmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    shipment = service.create_shipment(session, current_user.tenant_id, data)
    session.commit()
    session.refresh(shipment)
    return shipment


@router.get("", response_model=list[schemas.ShipmentOut])
def list_shipments(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return (
        session.query(models.Shipment)
        .filter(models.Shipment.tenant_id == current_user.tenant_id)
        .order_by(models.Shipment.created_at.desc())
        .all()
    )


@router.get("/{shipment_id}", response_model=schemas.ShipmentOut)
def get_shipment(
    shipment_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    shipment = (
        session.query(models.Shipment)
        .filter(
            models.Shipment.id == shipment_id,
            models.Shipment.tenant_id == current_user.tenant_id,
        )
        .one_or_none()
    )
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return shipment


@router.post("/{shipment_id}/assign", response_model=schemas.ShipmentOut)
def assign_contact(
    shipment_id: UUID,
    data: schemas.ShipmentAssign,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    shipment = (
        session.query(models.Shipment)
        .filter(
            models.Shipment.id == shipment_id,
            models.Shipment.tenant_id == current_user.tenant_id,
        )
        .one_or_none()
    )
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    contact = (
        session.query(models.Contact)
        .filter(
            models.Contact.id == data.contact_id,
            models.Contact.tenant_id == current_user.tenant_id,
        )
        .one_or_none()
    )
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    shipment = service.assign_contact(session, current_user.tenant_id, shipment, contact.id)
    session.commit()
    session.refresh(shipment)
    return shipment


