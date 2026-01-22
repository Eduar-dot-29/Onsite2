from __future__ import annotations

from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_session, utcnow
from app.core.deps import get_current_user
from app.core.enums import ShipmentStatus
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
    status_filter: ShipmentStatus | None = Query(None, alias="status"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    List shipments with optional status filter.
    
    Status options:
    - IN_TRANSIT: Active shipments not yet delivered
    - DELAYED: Shipments with incidents or past ETA
    - DELIVERED: Completed shipments
    - (no filter): All non-deleted shipments
    """
    query = (
        session.query(models.Shipment)
        .filter(
            models.Shipment.tenant_id == current_user.tenant_id,
            models.Shipment.deleted_at.is_(None),  # Exclude soft-deleted
        )
    )
    
    if status_filter:
        if status_filter == ShipmentStatus.IN_TRANSIT:
            # Active shipments: ASSIGNED or IN_TRANSIT status
            query = query.filter(
                models.Shipment.status.in_([
                    ShipmentStatus.ASSIGNED,
                    ShipmentStatus.IN_TRANSIT,
                ])
            )
        elif status_filter == ShipmentStatus.DELAYED:
            # Delayed: INCIDENT status OR past ETA but not delivered
            now = utcnow()
            query = query.filter(
                (models.Shipment.status == ShipmentStatus.INCIDENT) |
                (models.Shipment.status == ShipmentStatus.DELAYED) |
                (
                    (models.Shipment.estimated_arrival_at < now) &
                    (models.Shipment.status != ShipmentStatus.DELIVERED)
                )
            )
        elif status_filter == ShipmentStatus.DELIVERED:
            query = query.filter(models.Shipment.status == ShipmentStatus.DELIVERED)
        else:
            query = query.filter(models.Shipment.status == status_filter)
    
    return query.order_by(models.Shipment.created_at.desc()).all()


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
            models.Shipment.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return shipment


@router.patch("/{shipment_id}", response_model=schemas.ShipmentOut)
def update_shipment(
    shipment_id: UUID,
    data: schemas.ShipmentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a shipment. Only provided fields will be updated."""
    shipment = (
        session.query(models.Shipment)
        .filter(
            models.Shipment.id == shipment_id,
            models.Shipment.tenant_id == current_user.tenant_id,
            models.Shipment.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if value is not None:
            setattr(shipment, field, value)
    
    # Recalculate estimated_arrival_at if departure or eta changed
    if data.planned_departure_at is not None or data.eta_hours is not None:
        shipment.estimated_arrival_at = shipment.planned_departure_at + timedelta(hours=shipment.eta_hours)

    session.add(shipment)
    session.commit()
    session.refresh(shipment)
    return shipment


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shipment(
    shipment_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Soft delete a shipment.
    Sets deleted_at timestamp instead of actually deleting.
    Related events and checkins are preserved for audit.
    """
    shipment = (
        session.query(models.Shipment)
        .filter(
            models.Shipment.id == shipment_id,
            models.Shipment.tenant_id == current_user.tenant_id,
            models.Shipment.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    shipment.deleted_at = utcnow()
    session.add(shipment)
    session.commit()
    return None


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
            models.Shipment.deleted_at.is_(None),
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


@router.post("/{shipment_id}/deliver", response_model=schemas.ShipmentOut)
def mark_delivered(
    shipment_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark a shipment as delivered."""
    shipment = (
        session.query(models.Shipment)
        .filter(
            models.Shipment.id == shipment_id,
            models.Shipment.tenant_id == current_user.tenant_id,
            models.Shipment.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    shipment.status = ShipmentStatus.DELIVERED
    session.add(shipment)
    session.commit()
    session.refresh(shipment)
    return shipment
