from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.core.enums import MessageAction, MessageType
from app.models.contact import Contact
from app.models.enums import ContactLinkStatus, ShipmentEventType, ShipmentStatus
from app.models.shipment import Shipment
from app.models.shipment_event import ShipmentEvent
from app.modules.telegram.provider import TelegramProvider
from app.workers.tasks import recalculate_route_and_eta


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook")
async def telegram_webhook(request: Request, session: Session = Depends(get_session)):
    """
    Telegram webhook endpoint (v2).

    Supports:
    - /start + phone linking
    - callback buttons: OK / TRAFFIC / BREAKDOWN (one-shot)
    - location messages -> record LOCATION event + recalculate ETA
    """
    provider = TelegramProvider()
    try:
        payload = await request.json()
    except Exception:
        return {"ok": True}

    message = provider.parse_incoming(payload)
    if not message:
        return {"ok": True}

    chat_id = message.external_user_id
    driver_name = message.user_first_name or "Conductor"

    # 1) /start -> request phone for linking
    if message.type == MessageType.COMMAND and message.action == MessageAction.START:
        await provider.send_request_phone(chat_id, driver_name)
        return {"ok": True}

    # 2) Shared phone -> link contact
    if message.type == MessageType.CONTACT and message.shared_phone:
        contact = session.execute(
            select(Contact).where(Contact.phone_e164 == message.shared_phone)
        ).scalars().first()

        if not contact:
            await provider.send_phone_not_found_message(chat_id)
            return {"ok": True}

        contact.telegram_chat_id = chat_id
        contact.link_status = ContactLinkStatus.LINKED
        session.add(contact)
        session.commit()
        await provider.send_phone_linked_message(chat_id, contact.name)
        return {"ok": True}

    # Helper: remove inline keyboard (one-shot)
    async def _oneshot(new_text: str | None = None):
        if message.message_id:
            await provider.remove_inline_keyboard(chat_id, message.message_id, new_text=new_text)

    # 3) Callback queries (buttons)
    if message.type == MessageType.BUTTON_CLICK and message.checkin_id:
        # Always answer callback to stop Telegram "loading"
        if message.callback_query_id:
            await provider.answer_callback(message.callback_query_id)

        # Resolve shipment via the check-in event id (we used ShipmentEvent.id as checkin_id)
        checkin_evt = session.execute(
            select(ShipmentEvent).where(ShipmentEvent.id == message.checkin_id)
        ).scalars().first()

        if not checkin_evt:
            await _oneshot("✅ Respuesta registrada")
            return {"ok": True}

        shipment = session.execute(
            select(Shipment).where(Shipment.id == checkin_evt.shipment_id)
        ).scalars().first()

        if not shipment:
            await _oneshot("✅ Respuesta registrada")
            return {"ok": True}

        if message.action == MessageAction.OK:
            session.add(
                ShipmentEvent(
                    shipment_id=shipment.id,
                    event_type=ShipmentEventType.CHECK_IN,
                    description="Conductor reporta estado normal",
                )
            )
            # Keep shipment IN_TRANSIT unless delivered
            if shipment.status != ShipmentStatus.DELIVERED:
                shipment.status = ShipmentStatus.IN_TRANSIT
                session.add(shipment)
            session.commit()
            await _oneshot("✅ Estado registrado: Todo OK")
            return {"ok": True}

        if message.action in (MessageAction.TRAFFIC, MessageAction.BREAKDOWN):
            incident_text = "Tráfico" if message.action == MessageAction.TRAFFIC else "Avería"
            shipment.status = ShipmentStatus.DELAYED
            session.add(shipment)
            session.add(
                ShipmentEvent(
                    shipment_id=shipment.id,
                    event_type=ShipmentEventType.INCIDENT,
                    description=f"Conductor reporta incidencia: {incident_text}",
                )
            )
            session.commit()

            await _oneshot(f"⚠️ Incidencia registrada: {incident_text}")

            # Ask for location (best-effort)
            contact = None
            if shipment.driver_id:
                contact = session.execute(
                    select(Contact).where(Contact.id == shipment.driver_id)
                ).scalars().first()
            if contact and contact.telegram_chat_id:
                class _C:
                    telegram_chat_id = contact.telegram_chat_id

                class _S:
                    customer_name = shipment.reference
                    origin_text = shipment.origin
                    destination_text = shipment.destination

                await provider.send_request_location(_C(), _S(), checkin_evt.id)
            return {"ok": True}

        # Unknown action -> still one-shot
        await _oneshot()
        return {"ok": True}

    # 4) Location -> attach to active shipment + recalc ETA
    if message.type == MessageType.LOCATION and message.location:
        # Find contact by telegram_chat_id
        contact = session.execute(
            select(Contact).where(Contact.telegram_chat_id == chat_id)
        ).scalars().first()
        if not contact:
            return {"ok": True}

        shipment = session.execute(
            select(Shipment)
            .where(
                Shipment.driver_id == contact.id,
                Shipment.status.in_(
                    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELAYED, ShipmentStatus.SILENCE]
                ),
            )
            .order_by(Shipment.created_at_utc.desc())
        ).scalars().first()

        if not shipment:
            return {"ok": True}

        session.add(
            ShipmentEvent(
                shipment_id=shipment.id,
                event_type=ShipmentEventType.LOCATION,
                description=f"lat={message.location.lat}, lon={message.location.lon}, acc_m={message.location.accuracy_m}",
            )
        )
        session.commit()

        await provider.send_text(type("C", (), {"telegram_chat_id": chat_id})(), "Ubicación recibida ✅. Recalculando ETA…")
        recalculate_route_and_eta.delay(
            lat=message.location.lat,
            lon=message.location.lon,
            shipment_id=str(shipment.id),
        )
        return {"ok": True}

    return {"ok": True}

