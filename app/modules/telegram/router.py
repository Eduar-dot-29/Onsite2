from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.core.enums import ContactChannel, EventType, IncidentType, MessageAction, MessageType
from app.modules.auth.models import Tenant
from app.modules.messaging.service import get_provider
from app.modules.shipments import models as shipment_models
from app.modules.tracking import service as tracking_service
from app.workers.tasks import recalculate_route_and_eta


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook/{tenant_id}")
async def telegram_webhook(
    tenant_id: UUID, request: Request, session: Session = Depends(get_session)
):
    try:
        payload = await request.json()
        logger.info("telegram.webhook.received", extra={"tenant_id": str(tenant_id), "payload_keys": list(payload.keys())})
        
        provider = get_provider(ContactChannel.TELEGRAM)
        message = provider.parse_incoming(payload)
        if not message:
            logger.info("telegram.webhook.no_message_parsed")
            return {"ok": True}

        logger.info("telegram.webhook.message_parsed", extra={"type": message.type, "action": str(message.action)})

        # Handle /start command - ask for phone number to link
        if message.type == MessageType.COMMAND and message.action == MessageAction.START:
            # Verify tenant exists
            tenant = session.query(Tenant).filter(Tenant.id == tenant_id).one_or_none()
            if not tenant:
                logger.warning("telegram.start.tenant_not_found", extra={"tenant_id": str(tenant_id)})
                return {"ok": True}

            # Check if already linked
            existing_contact = tracking_service.find_contact_by_channel(
                session, tenant_id=tenant_id, channel=ContactChannel.TELEGRAM, external_id=message.external_user_id
            )
            
            if existing_contact:
                # Already linked
                driver_name = message.user_first_name or existing_contact.name
                await provider.send_already_linked_message(message.external_user_id, driver_name)
            else:
                # Ask for phone number
                user_name = message.user_first_name or "conductor"
                await provider.send_request_phone(message.external_user_id, user_name)

            return {"ok": True}

        # Handle contact shared (phone number)
        if message.type == MessageType.CONTACT and message.shared_phone:
            # Verify tenant exists
            tenant = session.query(Tenant).filter(Tenant.id == tenant_id).one_or_none()
            if not tenant:
                return {"ok": True}

            # Find contact by phone
            contact = tracking_service.find_contact_by_phone(session, tenant_id, message.shared_phone)
            
            if contact:
                # Link the chat_id to the contact
                tracking_service.link_telegram_chat_to_contact(session, contact, message.external_user_id)
                session.commit()
                
                logger.info(
                    "telegram.driver.linked",
                    extra={
                        "contact_id": str(contact.id),
                        "telegram_chat_id": message.external_user_id,
                        "phone": message.shared_phone,
                        "name": contact.name,
                    }
                )
                await provider.send_welcome_message(message.external_user_id, contact.name)
            else:
                # Phone not registered
                logger.info(
                    "telegram.driver.phone_not_found",
                    extra={
                        "telegram_chat_id": message.external_user_id,
                        "phone": message.shared_phone,
                    }
                )
                await provider.send_not_registered_message(message.external_user_id)

            return {"ok": True}

        # For other message types, find contact by telegram chat_id
        contact = tracking_service.find_contact_by_channel(
            session, tenant_id=tenant_id, channel=ContactChannel.TELEGRAM, external_id=message.external_user_id
        )
        if not contact:
            logger.info("telegram.contact.not_found", extra={"external_user_id": message.external_user_id})
            return {"ok": True}

        if message.type == MessageType.BUTTON_CLICK:
            if message.action == MessageAction.OK and message.checkin_id:
                tracking_service.mark_checkin_answered(
                    session, tenant_id=tenant_id, checkin_id=message.checkin_id, event_type=EventType.CHECKIN_OK
                )
                session.commit()
                return {"ok": True}

            if message.action in (MessageAction.BREAKDOWN, MessageAction.TRAFFIC) and message.checkin_id:
                incident_type = (
                    IncidentType.BREAKDOWN
                    if message.action == MessageAction.BREAKDOWN
                    else IncidentType.TRAFFIC
                )
                state = tracking_service.start_incident(
                    session,
                    tenant_id=tenant_id,
                    checkin_id=message.checkin_id,
                    incident_type=incident_type,
                    contact_id=contact.id,
                )
                session.commit()
                if state:
                    shipment = (
                        session.query(shipment_models.Shipment)
                        .filter(
                            shipment_models.Shipment.id == state.shipment_id,
                            shipment_models.Shipment.tenant_id == tenant_id,
                        )
                        .one_or_none()
                    )
                    if shipment:
                        await provider.send_incident_delay_options(contact, shipment)
                return {"ok": True}

            if message.action in (
                MessageAction.DELAY_30,
                MessageAction.DELAY_60,
                MessageAction.DELAY_120,
                MessageAction.DELAY_180,
            ) and message.shipment_id:
                delay_minutes = _delay_action_to_minutes(message.action)
                state = tracking_service.set_incident_delay(
                    session,
                    tenant_id=tenant_id,
                    shipment_id=message.shipment_id,
                    contact_id=contact.id,
                    delay_minutes=delay_minutes,
                )
                session.commit()
                if state:
                    shipment = (
                        session.query(shipment_models.Shipment)
                        .filter(
                            shipment_models.Shipment.id == state.shipment_id,
                            shipment_models.Shipment.tenant_id == tenant_id,
                        )
                        .one_or_none()
                    )
                    if shipment:
                        await provider.send_request_location(contact, shipment)
                return {"ok": True}

        if message.type == MessageType.LOCATION and message.location:
            incident_state = tracking_service.find_incident_waiting_location(
                session, tenant_id=tenant_id, contact_id=contact.id
            )
            if not incident_state or incident_state.delay_minutes is None:
                return {"ok": True}

            tracking_service.record_location(
                session,
                tenant_id=tenant_id,
                shipment_id=incident_state.shipment_id,
                lat=message.location.lat,
                lon=message.location.lon,
                accuracy_m=message.location.accuracy_m,
                source="TELEGRAM",
            )
            session.commit()
            shipment = (
                session.query(shipment_models.Shipment)
                .filter(
                    shipment_models.Shipment.id == incident_state.shipment_id,
                    shipment_models.Shipment.tenant_id == tenant_id,
                )
                .one_or_none()
            )
            if shipment:
                await provider.send_text(contact, "Ubicación recibida ✅. Recalculando ETA…")
                recalculate_route_and_eta.delay(
                    tenant_id=str(tenant_id),
                    shipment_id=str(incident_state.shipment_id),
                    delay_minutes=incident_state.delay_minutes,
                    lat=message.location.lat,
                    lon=message.location.lon,
                    contact_id=str(contact.id),
                )
            return {"ok": True}

        return {"ok": True}

    except Exception as e:
        logger.error("telegram.webhook.error", extra={"error": str(e), "tenant_id": str(tenant_id)})
        # Return ok to Telegram so it doesn't retry, but log the error
        return {"ok": True, "error_logged": True}


def _delay_action_to_minutes(action: MessageAction) -> int:
    if action == MessageAction.DELAY_30:
        return 30
    if action == MessageAction.DELAY_60:
        return 60
    if action == MessageAction.DELAY_120:
        return 120
    return 180
