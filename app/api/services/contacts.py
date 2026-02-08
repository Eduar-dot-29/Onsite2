from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas.contact import ContactCreate
from app.models.contact import Contact
from app.models.enums import ContactLinkStatus


def create_contact(session: Session, data: ContactCreate) -> Contact:
    link_status = (
        ContactLinkStatus.LINKED if data.telegram_chat_id else ContactLinkStatus.UNLINKED
    )
    contact = Contact(
        name=data.name,
        phone_e164=data.phone_e164,
        telegram_chat_id=data.telegram_chat_id,
        link_status=link_status,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


def list_contacts(session: Session) -> list[Contact]:
    stmt = select(Contact).order_by(Contact.created_at_utc.desc())
    return list(session.execute(stmt).scalars().all())

