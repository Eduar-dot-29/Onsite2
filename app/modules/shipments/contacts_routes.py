from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.core.deps import get_current_user
from app.modules.auth.models import User
from app.modules.shipments import models, schemas


router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.post("", response_model=schemas.ContactOut)
def create_contact(
    data: schemas.ContactCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    contact = models.Contact(
        tenant_id=current_user.tenant_id,
        name=data.name,
        channel=data.channel,
        telegram_chat_id=data.telegram_chat_id,
        phone_e164=data.phone_e164,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.get("", response_model=list[schemas.ContactOut])
def list_contacts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return (
        session.query(models.Contact)
        .filter(models.Contact.tenant_id == current_user.tenant_id)
        .order_by(models.Contact.created_at.desc())
        .all()
    )
