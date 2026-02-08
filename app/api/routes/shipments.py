from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.schemas.shipment import ShipmentCreate, ShipmentDetailRead, ShipmentEventRead, ShipmentRead, ShipmentUpdate
from app.api.services.shipments import (
    create_shipment,
    delete_shipment,
    get_shipment_detail,
    list_shipments,
    send_manual_checkin,
    update_shipment,
)
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


@router.patch("/{shipment_id}", response_model=ShipmentRead)
def patch_shipment(shipment_id: str, data: ShipmentUpdate, session: Session = Depends(get_session)):
    try:
        from uuid import UUID

        shipment_uuid = UUID(shipment_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid shipment id")

    updated = update_shipment(session, shipment_uuid, data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return updated


@router.post("/{shipment_id}/send-checkin", response_model=ShipmentEventRead)
def post_send_checkin(shipment_id: str, session: Session = Depends(get_session)):
    try:
        from uuid import UUID

        shipment_uuid = UUID(shipment_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid shipment id")

    evt = send_manual_checkin(session, shipment_uuid)
    if not evt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not send check-in (missing shipment/driver telegram link)",
        )
    return evt


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shipment_route(shipment_id: str, session: Session = Depends(get_session)):
    try:
        from uuid import UUID

        shipment_uuid = UUID(shipment_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid shipment id")

    ok = delete_shipment(session, shipment_uuid)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return None

