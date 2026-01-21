from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy.orm import Session

from app.core.db import utcnow
from app.core.enums import (
    CheckinStatus,
    ContactChannel,
    EventType,
    IncidentState,
    IncidentType,
    ShipmentStatus,
)
from app.modules.shipments import models as shipment_models
from app.modules.tracking import models
from app.modules.tracking.routing import RoutingProvider, StubRoutingProvider


@dataclass(frozen=True)
class RulesSnapshot:
    checkin_every_minutes: int
    max_silence_minutes: int
    delay_escalation_minutes: int
    notify_customer: bool
    notify_customer_delay_threshold_minutes: int


DEFAULT_RULES = RulesSnapshot(
    checkin_every_minutes=120,
    max_silence_minutes=60,
    delay_escalation_minutes=120,
    notify_customer=False,
    notify_customer_delay_threshold_minutes=180,
)


def record_event(
    session: Session,
    tenant_id,
    shipment_id,
    event_type: EventType,
    payload: dict,
) -> models.ShipmentEvent:
    event = models.ShipmentEvent(
        tenant_id=tenant_id,
        shipment_id=shipment_id,
        event_type=event_type,
        payload_json=payload or {},
    )
    session.add(event)
    return event


def resolve_tracking_rules(
    session: Session, tenant_id, customer_name: str | None
) -> RulesSnapshot:
    rule = None
    if customer_name:
        rule = (
            session.query(models.TrackingRule)
            .filter(
                models.TrackingRule.tenant_id == tenant_id,
                models.TrackingRule.customer_name == customer_name,
            )
            .one_or_none()
        )
    if not rule:
        rule = (
            session.query(models.TrackingRule)
            .filter(
                models.TrackingRule.tenant_id == tenant_id,
                models.TrackingRule.customer_name.is_(None),
            )
            .one_or_none()
        )
    if not rule:
        return DEFAULT_RULES
    return RulesSnapshot(
        checkin_every_minutes=rule.checkin_every_minutes,
        max_silence_minutes=rule.max_silence_minutes,
        delay_escalation_minutes=rule.delay_escalation_minutes,
        notify_customer=rule.notify_customer,
        notify_customer_delay_threshold_minutes=rule.notify_customer_delay_threshold_minutes,
    )


def schedule_checkins(
    session: Session, shipment: shipment_models.Shipment, rules: RulesSnapshot
) -> Iterable[models.TrackingCheckin]:
    start_at = max(shipment.planned_departure_at, utcnow())
    end_at = shipment.estimated_arrival_at
    if start_at > end_at:
        start_at = end_at

    checkins = []
    due_at = start_at
    while due_at <= end_at:
        checkins.append(
            models.TrackingCheckin(
                tenant_id=shipment.tenant_id,
                shipment_id=shipment.id,
                due_at=due_at,
                status=CheckinStatus.PENDING,
            )
        )
        due_at = due_at + timedelta(minutes=rules.checkin_every_minutes)

    if not checkins:
        checkins.append(
            models.TrackingCheckin(
                tenant_id=shipment.tenant_id,
                shipment_id=shipment.id,
                due_at=start_at,
                status=CheckinStatus.PENDING,
            )
        )

    session.add_all(checkins)
    record_event(
        session,
        tenant_id=shipment.tenant_id,
        shipment_id=shipment.id,
        event_type=EventType.CHECKIN_SCHEDULED,
        payload={"count": len(checkins), "first_due_at": checkins[0].due_at.isoformat()},
    )
    return checkins


def mark_checkin_answered(
    session: Session,
    tenant_id,
    checkin_id,
    event_type: EventType,
):
    checkin = (
        session.query(models.TrackingCheckin)
        .filter(
            models.TrackingCheckin.id == checkin_id,
            models.TrackingCheckin.tenant_id == tenant_id,
        )
        .one_or_none()
    )
    if not checkin:
        return None

    checkin.status = CheckinStatus.ANSWERED
    checkin.answered_at = utcnow()
    session.add(checkin)
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=checkin.shipment_id,
        event_type=event_type,
        payload={"checkin_id": str(checkin.id)},
    )
    return checkin


def start_incident(
    session: Session,
    tenant_id,
    checkin_id,
    incident_type: IncidentType,
    contact_id,
) -> models.ShipmentIncidentState | None:
    checkin = (
        session.query(models.TrackingCheckin)
        .filter(
            models.TrackingCheckin.id == checkin_id,
            models.TrackingCheckin.tenant_id == tenant_id,
        )
        .one_or_none()
    )
    if not checkin:
        return None

    checkin.status = CheckinStatus.ANSWERED
    checkin.answered_at = utcnow()
    session.add(checkin)

    shipment = (
        session.query(shipment_models.Shipment)
        .filter(
            shipment_models.Shipment.id == checkin.shipment_id,
            shipment_models.Shipment.tenant_id == tenant_id,
        )
        .one_or_none()
    )
    if shipment:
        shipment.status = ShipmentStatus.INCIDENT
        session.add(shipment)

    state = models.ShipmentIncidentState(
        tenant_id=tenant_id,
        shipment_id=checkin.shipment_id,
        contact_id=contact_id,
        incident_type=incident_type,
        state=IncidentState.WAITING_DELAY,
        updated_at=utcnow(),
    )
    session.add(state)

    event = (
        EventType.INCIDENT_BREAKDOWN
        if incident_type == IncidentType.BREAKDOWN
        else EventType.INCIDENT_TRAFFIC
    )
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=checkin.shipment_id,
        event_type=event,
        payload={"checkin_id": str(checkin.id)},
    )
    return state


def set_incident_delay(
    session: Session,
    tenant_id,
    shipment_id,
    contact_id,
    delay_minutes: int,
) -> models.ShipmentIncidentState | None:
    state = (
        session.query(models.ShipmentIncidentState)
        .filter(
            models.ShipmentIncidentState.tenant_id == tenant_id,
            models.ShipmentIncidentState.shipment_id == shipment_id,
            models.ShipmentIncidentState.contact_id == contact_id,
            models.ShipmentIncidentState.state == IncidentState.WAITING_DELAY,
        )
        .one_or_none()
    )
    if not state:
        return None

    state.delay_minutes = delay_minutes
    state.state = IncidentState.WAITING_LOCATION
    state.updated_at = utcnow()
    session.add(state)

    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=shipment_id,
        event_type=EventType.DELAY_REPORTED,
        payload={"delay_minutes": delay_minutes},
    )
    return state


def record_location(
    session: Session,
    tenant_id,
    shipment_id,
    lat: float,
    lon: float,
    accuracy_m: float | None,
    source: str,
) -> models.ShipmentLocation:
    location = models.ShipmentLocation(
        tenant_id=tenant_id,
        shipment_id=shipment_id,
        lat=lat,
        lon=lon,
        accuracy_m=accuracy_m,
        recorded_at=utcnow(),
        source=source,
    )
    session.add(location)
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=shipment_id,
        event_type=EventType.LOCATION_RECEIVED,
        payload={"lat": lat, "lon": lon, "accuracy_m": accuracy_m, "source": source},
    )
    return location


def recalculate_route_and_eta(
    session: Session,
    tenant_id,
    shipment_id,
    delay_minutes: int,
    lat: float,
    lon: float,
    provider: RoutingProvider | None = None,
) -> shipment_models.Shipment | None:
    shipment = (
        session.query(shipment_models.Shipment)
        .filter(
            shipment_models.Shipment.id == shipment_id,
            shipment_models.Shipment.tenant_id == tenant_id,
        )
        .one_or_none()
    )
    if not shipment or shipment.destination_lat is None or shipment.destination_lon is None:
        return None

    provider = provider or StubRoutingProvider()
    routing = provider.calculate(lat, lon, shipment.destination_lat, shipment.destination_lon)
    now = utcnow()
    new_eta = now + timedelta(minutes=routing.duration_minutes + delay_minutes)
    old_eta = shipment.estimated_arrival_at
    shipment.estimated_arrival_at = new_eta
    session.add(shipment)

    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=shipment_id,
        event_type=EventType.ROUTE_RECALCULATED,
        payload={
            "distance_km": routing.distance_km,
            "duration_minutes": routing.duration_minutes,
            "provider": routing.provider,
        },
    )
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=shipment_id,
        event_type=EventType.ETA_UPDATED,
        payload={"old_eta": old_eta.isoformat(), "new_eta": new_eta.isoformat()},
    )
    return shipment


def find_incident_waiting_location(
    session: Session, tenant_id, contact_id
) -> models.ShipmentIncidentState | None:
    return (
        session.query(models.ShipmentIncidentState)
        .filter(
            models.ShipmentIncidentState.tenant_id == tenant_id,
            models.ShipmentIncidentState.contact_id == contact_id,
            models.ShipmentIncidentState.state == IncidentState.WAITING_LOCATION,
        )
        .order_by(models.ShipmentIncidentState.updated_at.desc())
        .one_or_none()
    )


def find_contact_by_channel(session: Session, tenant_id, channel, external_id: str):
    query = session.query(shipment_models.Contact).filter(
        shipment_models.Contact.tenant_id == tenant_id,
        shipment_models.Contact.channel == channel,
    )
    if channel == ContactChannel.TELEGRAM:
        query = query.filter(shipment_models.Contact.telegram_chat_id == external_id)
    else:
        query = query.filter(shipment_models.Contact.phone_e164 == external_id)
    return query.one_or_none()


def find_or_create_telegram_contact(
    session: Session,
    tenant_id,
    telegram_chat_id: str,
    first_name: str | None = None,
    last_name: str | None = None,
    username: str | None = None,
) -> tuple[shipment_models.Contact, bool]:
    """
    Find an existing contact by telegram_chat_id or create a new one.
    
    Returns a tuple of (contact, is_new) where is_new is True if the contact was just created.
    """
    existing = find_contact_by_channel(
        session,
        tenant_id=tenant_id,
        channel=ContactChannel.TELEGRAM,
        external_id=telegram_chat_id,
    )
    if existing:
        return existing, False

    # Build the name from Telegram user info
    name_parts = []
    if first_name:
        name_parts.append(first_name)
    if last_name:
        name_parts.append(last_name)
    
    if name_parts:
        name = " ".join(name_parts)
    elif username:
        name = f"@{username}"
    else:
        name = f"Conductor Telegram {telegram_chat_id[-4:]}"

    contact = shipment_models.Contact(
        tenant_id=tenant_id,
        name=name,
        channel=ContactChannel.TELEGRAM,
        telegram_chat_id=telegram_chat_id,
    )
    session.add(contact)
    session.flush()
    return contact, True


def find_contact_by_phone(session: Session, tenant_id, phone: str):
    """
    Find a contact by phone number.
    Returns the most recently created contact if multiple exist with same phone.
    """
    # Normalize phone for comparison
    normalized = phone.strip()
    if not normalized.startswith("+"):
        normalized = "+" + normalized
    
    # Use first() to handle multiple contacts with same phone
    contact = (
        session.query(shipment_models.Contact)
        .filter(
            shipment_models.Contact.tenant_id == tenant_id,
            shipment_models.Contact.phone_e164 == normalized,
        )
        .order_by(shipment_models.Contact.created_at.desc())
        .first()
    )
    return contact


def link_telegram_chat_to_contact(
    session: Session,
    contact: shipment_models.Contact,
    telegram_chat_id: str,
) -> shipment_models.Contact:
    """Link a telegram chat_id to an existing contact."""
    contact.telegram_chat_id = telegram_chat_id
    session.add(contact)
    session.flush()
    return contact


def get_due_checkins(session: Session, tenant_id, now: datetime) -> list[models.TrackingCheckin]:
    return (
        session.query(models.TrackingCheckin)
        .filter(
            models.TrackingCheckin.tenant_id == tenant_id,
            models.TrackingCheckin.status == CheckinStatus.PENDING,
            models.TrackingCheckin.due_at <= now,
        )
        .order_by(models.TrackingCheckin.due_at.asc())
        .all()
    )


def mark_checkin_sent(
    session: Session, tenant_id, checkin: models.TrackingCheckin, message_id: str | None
) -> models.TrackingCheckin:
    checkin.status = CheckinStatus.SENT
    checkin.sent_at = utcnow()
    checkin.last_outbound_message_id = message_id
    session.add(checkin)
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=checkin.shipment_id,
        event_type=EventType.CHECKIN_SENT,
        payload={"checkin_id": str(checkin.id), "message_id": message_id},
    )
    return checkin


def get_silence_candidates(
    session: Session, tenant_id, max_silence_minutes: int, now: datetime
) -> list[models.TrackingCheckin]:
    threshold = now - timedelta(minutes=max_silence_minutes)
    return (
        session.query(models.TrackingCheckin)
        .filter(
            models.TrackingCheckin.tenant_id == tenant_id,
            models.TrackingCheckin.status == CheckinStatus.SENT,
            models.TrackingCheckin.sent_at <= threshold,
        )
        .all()
    )


def mark_checkin_missed(
    session: Session, tenant_id, checkin: models.TrackingCheckin
) -> models.TrackingCheckin:
    checkin.status = CheckinStatus.MISSED
    session.add(checkin)
    record_event(
        session,
        tenant_id=tenant_id,
        shipment_id=checkin.shipment_id,
        event_type=EventType.NO_RESPONSE,
        payload={"checkin_id": str(checkin.id)},
    )
    return checkin
