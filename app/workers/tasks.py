from __future__ import annotations

import asyncio
import logging
from datetime import timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.db import SessionLocal, utcnow
from app.core.enums import ContactChannel, EventType, ShipmentStatus
from app.modules.auth.models import Tenant
from app.modules.messaging.service import get_provider
from app.modules.shipments import models as shipment_models
from app.modules.tracking import models as tracking_models
from app.modules.tracking import service as tracking_service
from app.workers.celery_app import celery_app


logger = logging.getLogger(__name__)


def _run_async(coro):
    return asyncio.run(coro)


@celery_app.task(name="app.workers.tasks.send_due_checkins")
def send_due_checkins():
    session: Session = SessionLocal()
    try:
        tenants = session.query(Tenant).all()
        now = utcnow()
        for tenant in tenants:
            checkins = tracking_service.get_due_checkins(session, tenant.id, now)
            for checkin in checkins:
                shipment = (
                    session.query(shipment_models.Shipment)
                    .filter(
                        shipment_models.Shipment.id == checkin.shipment_id,
                        shipment_models.Shipment.tenant_id == tenant.id,
                    )
                    .one_or_none()
                )
                if not shipment or not shipment.assigned_contact_id:
                    continue
                contact = (
                    session.query(shipment_models.Contact)
                    .filter(
                        shipment_models.Contact.id == shipment.assigned_contact_id,
                        shipment_models.Contact.tenant_id == tenant.id,
                    )
                    .one_or_none()
                )
                if not contact:
                    continue
                if contact.channel == ContactChannel.TELEGRAM and not contact.telegram_chat_id:
                    continue
                if contact.channel != ContactChannel.TELEGRAM and not contact.phone_e164:
                    continue
                provider = get_provider(contact.channel)
                message_id = _run_async(provider.send_checkin(contact, shipment, checkin.id))
                if message_id:
                    tracking_service.mark_checkin_sent(session, tenant.id, checkin, message_id)
            session.commit()
    finally:
        session.close()


@celery_app.task(name="app.workers.tasks.mark_silence_and_escalate")
def mark_silence_and_escalate():
    session: Session = SessionLocal()
    try:
        tenants = session.query(Tenant).all()
        now = utcnow()
        for tenant in tenants:
            rules = tracking_service.resolve_tracking_rules(session, tenant.id, None)
            candidates = tracking_service.get_silence_candidates(
                session, tenant.id, rules.max_silence_minutes, now
            )
            for checkin in candidates:
                tracking_service.mark_checkin_missed(session, tenant.id, checkin)
                checkin.status = tracking_models.CheckinStatus.ESCALATED
                session.add(checkin)
                tracking_service.record_event(
                    session,
                    tenant_id=tenant.id,
                    shipment_id=checkin.shipment_id,
                    event_type=EventType.ESCALATED,
                    payload={"reason": "no_response", "checkin_id": str(checkin.id)},
                )
                shipment = (
                    session.query(shipment_models.Shipment)
                    .filter(
                        shipment_models.Shipment.id == checkin.shipment_id,
                        shipment_models.Shipment.tenant_id == tenant.id,
                    )
                    .one_or_none()
                )
                if shipment and shipment.assigned_contact_id:
                    contact = (
                        session.query(shipment_models.Contact)
                        .filter(
                            shipment_models.Contact.id == shipment.assigned_contact_id,
                            shipment_models.Contact.tenant_id == tenant.id,
                        )
                        .one_or_none()
                    )
                    if contact:
                        if contact.channel == ContactChannel.TELEGRAM and not contact.telegram_chat_id:
                            continue
                        if contact.channel != ContactChannel.TELEGRAM and not contact.phone_e164:
                            continue
                        provider = get_provider(contact.channel)
                        _run_async(
                            provider.send_text(
                                contact,
                                "Recordatorio: necesitamos tu respuesta del último check-in.",
                            )
                        )
            session.commit()
    finally:
        session.close()


@celery_app.task(name="app.workers.tasks.recalculate_route_and_eta")
def recalculate_route_and_eta(
    tenant_id: str,
    shipment_id: str,
    delay_minutes: int,
    lat: float,
    lon: float,
    contact_id: str,
):
    session: Session = SessionLocal()
    try:
        tenant_uuid = UUID(tenant_id)
        shipment_uuid = UUID(shipment_id)
        contact_uuid = UUID(contact_id)
        shipment = tracking_service.recalculate_route_and_eta(
            session,
            tenant_id=tenant_uuid,
            shipment_id=shipment_uuid,
            delay_minutes=delay_minutes,
            lat=lat,
            lon=lon,
        )
        if shipment:
            shipment.status = ShipmentStatus.IN_TRANSIT
            session.add(shipment)

        if shipment:
            rules = tracking_service.resolve_tracking_rules(
                session, tenant_uuid, shipment.customer_name
            )
            if delay_minutes >= rules.delay_escalation_minutes:
                tracking_service.record_event(
                    session,
                    tenant_id=tenant_uuid,
                    shipment_id=shipment_uuid,
                    event_type=EventType.ESCALATED,
                    payload={"reason": "delay_threshold", "delay_minutes": delay_minutes},
                )

        incident_state = (
            session.query(tracking_models.ShipmentIncidentState)
            .filter(
                tracking_models.ShipmentIncidentState.tenant_id == tenant_uuid,
                tracking_models.ShipmentIncidentState.shipment_id == shipment_uuid,
                tracking_models.ShipmentIncidentState.contact_id == contact_uuid,
            )
            .one_or_none()
        )
        if incident_state:
            session.delete(incident_state)

        session.commit()

        if shipment:
            contact = (
                session.query(shipment_models.Contact)
                .filter(
                    shipment_models.Contact.id == contact_uuid,
                    shipment_models.Contact.tenant_id == tenant_uuid,
                )
                .one_or_none()
            )
            if contact:
                provider = get_provider(contact.channel)
                eta_text = shipment.estimated_arrival_at.astimezone(timezone.utc).strftime(
                    "%H:%M UTC"
                )
                _run_async(
                    provider.send_text(
                        contact, f"Recibido. ETA actualizada: {eta_text}. Gracias."
                    )
                )
    finally:
        session.close()
