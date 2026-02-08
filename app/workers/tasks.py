"""
Celery tasks for v2 (desde-cero) automation.

Tasks:
- process_due_checkins: every minute, send Telegram check-in for IN_TRANSIT shipments
- mark_silence_and_escalate: mark shipment as SILENCE if no response after tolerance
- recalculate_route_and_eta: update ETA using Haversine stub + average speed

Locks:
Uses Redis SET NX EX to avoid double-processing per shipment.
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.db import SessionLocal
from app.core.config import get_settings
from app.models.contact import Contact
from app.models.enums import ShipmentEventType, ShipmentStatus
from app.models.milestone import Milestone
from app.models.shipment import Shipment
from app.models.shipment_event import ShipmentEvent
from app.modules.telegram.provider import TelegramProvider
from app.workers.celery_app import celery_app
from app.workers.redis_lock import acquire_lock, release_lock


logger = logging.getLogger(__name__)

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_admin_chat_ids() -> list[str]:
    settings = get_settings()
    raw = settings.telegram_admin_chat_ids
    if not raw:
        return []
    return [s.strip() for s in raw.split(",") if s.strip()]


@dataclass(frozen=True)
class _V2CheckinContext:
    checkin_event_id: UUID
    shipment_id: UUID


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in kilometers."""
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


@celery_app.task(name="app.workers.tasks.process_due_checkins")
def process_due_checkins():
    """
    Every minute:
    - Find shipments IN_TRANSIT
    - If interval_minutes passed since last CHECK_IN event, send Telegram check-in
    """
    session: Session = SessionLocal()
    try:
        settings = get_settings()
        provider = TelegramProvider()
        current_time = now_utc()

        # Correlated subquery: last check-in event time for each shipment
        last_checkin_ts = (
            select(func.max(ShipmentEvent.created_at_utc))
            .where(
                ShipmentEvent.shipment_id == Shipment.id,
                ShipmentEvent.event_type == ShipmentEventType.CHECK_IN,
            )
            .correlate(Shipment)
            .scalar_subquery()
        )

        stmt = (
            select(Shipment, last_checkin_ts.label("last_checkin_at"))
            .where(Shipment.status == ShipmentStatus.IN_TRANSIT)
        )

        for shipment, last_checkin_at in session.execute(stmt).all():
            if shipment.interval_minutes is None or shipment.interval_minutes <= 0:
                continue
            if shipment.driver_id is None:
                continue

            # Determine due reference: last check-in, or departure time if no check-in yet
            ref_time = last_checkin_at or shipment.departure_at_utc
            if ref_time is None:
                ref_time = shipment.created_at_utc

            if (current_time - ref_time) < timedelta(minutes=shipment.interval_minutes):
                continue

            lock = acquire_lock(
                key=f"lock:v2:process_due_checkins:{shipment.id}",
                ttl_seconds=55,
            )
            if not lock:
                continue

            try:
                _send_checkin_for_shipment(session, provider, shipment)
                session.commit()
            except Exception as e:
                session.rollback()
                logger.error(
                    "v2.checkin.send_error",
                    extra={"shipment_id": str(shipment.id), "error": str(e)},
                )
            finally:
                release_lock(lock)

    except Exception as e:
        logger.error("v2.process_due_checkins.error", extra={"error": str(e)})
    finally:
        session.close()


def _send_checkin_for_shipment(session: Session, provider: TelegramProvider, shipment: Shipment) -> None:
    contact = session.execute(select(Contact).where(Contact.id == shipment.driver_id)).scalars().first()
    if not contact or not contact.telegram_chat_id:
        raise ValueError("Driver contact missing or not linked to Telegram")

    # Create event first to use its UUID as check-in context
    checkin_event = ShipmentEvent(
        shipment_id=shipment.id,
        event_type=ShipmentEventType.CHECK_IN,
        description="CHECK_IN_SENT",
    )
    session.add(checkin_event)
    session.flush()

    # Send Telegram check-in with buttons (one-shot handled in webhook by removing keyboard)
    # We reuse the existing provider contract: contact needs telegram_chat_id, shipment needs
    # customer_name/origin_text/destination_text fields. Create a lightweight adapter.
    class _ContactAdapter:
        telegram_chat_id = contact.telegram_chat_id

    class _ShipmentAdapter:
        customer_name = shipment.reference
        origin_text = shipment.origin
        destination_text = shipment.destination

    # Run async send in a sync context (telegram.Bot methods are async here)
    import asyncio

    message_id = asyncio.run(provider.send_checkin(_ContactAdapter(), _ShipmentAdapter(), checkin_event.id))
    if not message_id:
        raise RuntimeError("Telegram send_checkin returned no message id")


@celery_app.task(name="app.workers.tasks.mark_silence_and_escalate")
def mark_silence_and_escalate():
    """
    If a check-in was sent and there's no response after tolerance, set shipment to SILENCE,
    create SYSTEM event and alert admins via Telegram.
    """
    session: Session = SessionLocal()
    try:
        settings = get_settings()
        tolerance = timedelta(minutes=settings.silence_tolerance_minutes or 30)
        current_time = now_utc()
        admin_chat_ids = parse_admin_chat_ids()
        provider = TelegramProvider()

        # For each IN_TRANSIT shipment, find last CHECK_IN event timestamp
        last_checkin_ts = (
            select(func.max(ShipmentEvent.created_at_utc))
            .where(
                ShipmentEvent.shipment_id == Shipment.id,
                ShipmentEvent.event_type == ShipmentEventType.CHECK_IN,
            )
            .correlate(Shipment)
            .scalar_subquery()
        )

        stmt = (
            select(Shipment, last_checkin_ts.label("last_checkin_at"))
            .where(Shipment.status == ShipmentStatus.IN_TRANSIT)
        )

        for shipment, last_checkin_at in session.execute(stmt).all():
            if last_checkin_at is None:
                continue
            if (current_time - last_checkin_at) < tolerance:
                continue

            lock = acquire_lock(
                key=f"lock:v2:mark_silence:{shipment.id}",
                ttl_seconds=55,
            )
            if not lock:
                continue

            try:
                # Re-check inside lock
                last_ts = session.execute(
                    select(func.max(ShipmentEvent.created_at_utc)).where(
                        ShipmentEvent.shipment_id == shipment.id,
                        ShipmentEvent.event_type == ShipmentEventType.CHECK_IN,
                    )
                ).scalar_one_or_none()
                if last_ts is None or (current_time - last_ts) < tolerance:
                    continue

                shipment.status = ShipmentStatus.SILENCE
                session.add(shipment)
                session.add(
                    ShipmentEvent(
                        shipment_id=shipment.id,
                        event_type=ShipmentEventType.SYSTEM,
                        description=f"SILENCE_ESCALATED: no response after {settings.silence_tolerance_minutes} minutes",
                    )
                )
                session.commit()

                # Alert admins (best-effort)
                if admin_chat_ids:
                    import asyncio

                    async def _notify():
                        for chat_id in admin_chat_ids:
                            await provider.send_text(
                                type("C", (), {"telegram_chat_id": chat_id})(),
                                f"⚠️ SILENCE: Shipment {shipment.reference} ({shipment.id}) no respondió en {settings.silence_tolerance_minutes} min.",
                            )

                    asyncio.run(_notify())
            finally:
                release_lock(lock)

    except Exception as e:
        logger.error("v2.mark_silence_and_escalate.error", extra={"error": str(e)})
    finally:
        session.close()

@celery_app.task(name="app.workers.tasks.recalculate_route_and_eta")
def recalculate_route_and_eta(
    lat: float,
    lon: float,
    shipment_id: str,
):
    """
    Recalculate ETA for a shipment based on remaining distance (Haversine stub).

    Uses the next incomplete milestone as target; if none, uses the last milestone.
    """
    session: Session = SessionLocal()
    try:
        settings = get_settings()
        try:
            shipment_uuid = UUID(shipment_id)
        except Exception:
            logger.error("v2.recalculate.invalid_shipment_id", extra={"shipment_id": shipment_id})
            return

        lock = acquire_lock(key=f"lock:v2:recalculate_eta:{shipment_uuid}", ttl_seconds=55)
        if not lock:
            return

        try:
            shipment = session.execute(
                select(Shipment)
                .where(Shipment.id == shipment_uuid)
                .options(selectinload(Shipment.milestones))
            ).scalars().first()
            if not shipment:
                return

            # Determine target coordinate from milestones
            milestones = list(shipment.milestones or [])
            target = None
            for m in sorted(milestones, key=lambda x: x.created_at_utc):
                if not m.is_completed:
                    target = m
                    break
            if target is None and milestones:
                target = sorted(milestones, key=lambda x: x.created_at_utc)[-1]
            if target is None:
                return

            distance_km = _haversine_km(lat, lon, target.latitude, target.longitude)
            speed = float(settings.average_speed_kmh or 80)
            hours = distance_km / speed if speed > 0 else 0.0
            new_eta = now_utc() + timedelta(seconds=int(hours * 3600))

            shipment.eta_at_utc = new_eta
            session.add(shipment)
            session.add(
                ShipmentEvent(
                    shipment_id=shipment.id,
                    event_type=ShipmentEventType.SYSTEM,
                    description=f"ETA_UPDATED: distance_km={distance_km:.2f} speed_kmh={speed:.0f}",
                )
            )
            session.commit()
        finally:
            release_lock(lock)
    finally:
        session.close()
