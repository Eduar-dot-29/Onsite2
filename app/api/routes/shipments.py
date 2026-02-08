from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.schemas.shipment import ShipmentCreate, ShipmentDetailRead, ShipmentRead
from app.api.services.shipments import create_shipment, get_shipment_detail, list_shipments
from app.core.db import get_session
from app.models.enums import ShipmentStatus


router = APIRouter(prefix="/shipments", tags=["shipments"])


@router.post("", response_model=ShipmentRead, status_code=status.HTTP_201_CREATED)
def post_shipment(data: ShipmentCreate, session: Session = Depends(get_session)):
    try:
        return create_shipment(session, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("", response_model=list[ShipmentRead])
def get_shipments(
    status_filter: ShipmentStatus | None = Query(None, alias="status"),
    session: Session = Depends(get_session),
):
    return list_shipments(session, status=status_filter)


@router.get("/{shipment_id}", response_model=ShipmentDetailRead)
def get_shipment(shipment_id: str, session: Session = Depends(get_session)):
    try:
        from uuid import UUID

        shipment_uuid = UUID(shipment_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid shipment id")

    shipment = get_shipment_detail(session, shipment_uuid)
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return shipment

