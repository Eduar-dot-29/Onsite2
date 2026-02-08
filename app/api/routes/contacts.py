from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas.contact import ContactCreate, ContactRead
from app.api.services.contacts import create_contact, list_contacts
from app.core.db import get_session


router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.post("", response_model=ContactRead)
def post_contact(data: ContactCreate, session: Session = Depends(get_session)):
    return create_contact(session, data)


@router.get("", response_model=list[ContactRead])
def get_contacts(session: Session = Depends(get_session)):
    return list_contacts(session)

