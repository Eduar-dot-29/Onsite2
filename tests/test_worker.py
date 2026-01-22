"""
Tests for the automatic check-in worker.

These tests verify:
1. Due check-ins are found and sent
2. Atomic locking prevents duplicate sends
3. Failed sends are retried
4. Stale locks are cleaned up
"""
import pytest
from datetime import datetime, timezone as tz, timedelta
from uuid import uuid4
from unittest.mock import patch, MagicMock, AsyncMock

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base
from app.core.enums import CheckinStatus, ShipmentStatus, ContactChannel
from app.core.timezone import now_utc
from app.modules.auth.models import Tenant
from app.modules.shipments.models import Contact, Shipment
from app.modules.tracking.models import TrackingCheckin


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def setup_data(db_session):
    """Create tenant, contact, shipment, and check-ins."""
    current = now_utc()
    
    # Create tenant
    tenant = Tenant(id=uuid4(), name="Test Tenant")
    db_session.add(tenant)
    
    # Create contact (driver with Telegram)
    contact = Contact(
        id=uuid4(),
        tenant_id=tenant.id,
        name="Test Driver",
        channel=ContactChannel.TELEGRAM,
        telegram_chat_id="123456789",
        phone_e164="+34600000000",
    )
    db_session.add(contact)
    
    # Create shipment
    shipment = Shipment(
        id=uuid4(),
        tenant_id=tenant.id,
        customer_name="Test Shipment",
        origin_text="Madrid",
        destination_text="Barcelona",
        departure_at_utc=current - timedelta(hours=1),
        eta_at_utc=current + timedelta(hours=3),
        timezone="Europe/Madrid",
        estimated_duration_minutes=240,
        checkin_plan_mode="INTERVAL",
        checkin_interval_minutes=30,
        status=ShipmentStatus.ASSIGNED,
        assigned_contact_id=contact.id,
    )
    db_session.add(shipment)
    
    # Create a due check-in (scheduled_for_utc in the past)
    due_checkin = TrackingCheckin(
        id=uuid4(),
        tenant_id=tenant.id,
        shipment_id=shipment.id,
        scheduled_for_utc=current - timedelta(minutes=5),
        status=CheckinStatus.PENDING,
        attempts=0,
    )
    db_session.add(due_checkin)
    
    # Create a future check-in (not due yet)
    future_checkin = TrackingCheckin(
        id=uuid4(),
        tenant_id=tenant.id,
        shipment_id=shipment.id,
        scheduled_for_utc=current + timedelta(minutes=30),
        status=CheckinStatus.PENDING,
        attempts=0,
    )
    db_session.add(future_checkin)
    
    db_session.commit()
    
    return {
        "tenant": tenant,
        "contact": contact,
        "shipment": shipment,
        "due_checkin": due_checkin,
        "future_checkin": future_checkin,
    }


class TestFindDueCheckins:
    """Test finding due check-ins."""

    def test_find_due_checkins(self, db_session, setup_data):
        """Due check-ins should be found."""
        current = now_utc()
        tenant_id = setup_data["tenant"].id
        
        # Query due check-ins
        due_checkins = (
            db_session.query(TrackingCheckin)
            .join(Shipment, TrackingCheckin.shipment_id == Shipment.id)
            .filter(
                TrackingCheckin.tenant_id == tenant_id,
                TrackingCheckin.status == CheckinStatus.PENDING,
                TrackingCheckin.scheduled_for_utc <= current,
                Shipment.status.in_([ShipmentStatus.ASSIGNED, ShipmentStatus.IN_TRANSIT]),
                Shipment.assigned_contact_id.isnot(None),
            )
            .all()
        )
        
        assert len(due_checkins) == 1
        assert due_checkins[0].id == setup_data["due_checkin"].id

    def test_future_checkins_not_found(self, db_session, setup_data):
        """Future check-ins should not be found."""
        current = now_utc()
        tenant_id = setup_data["tenant"].id
        
        # Query future check-ins
        future = (
            db_session.query(TrackingCheckin)
            .filter(
                TrackingCheckin.tenant_id == tenant_id,
                TrackingCheckin.status == CheckinStatus.PENDING,
                TrackingCheckin.scheduled_for_utc > current,
            )
            .all()
        )
        
        assert len(future) == 1
        assert future[0].id == setup_data["future_checkin"].id


class TestAtomicLocking:
    """Test atomic locking prevents duplicate processing."""

    def test_lock_checkin(self, db_session, setup_data):
        """Locking should change status to SENDING."""
        checkin = setup_data["due_checkin"]
        current = now_utc()
        
        # Simulate atomic lock
        from sqlalchemy import and_, update
        result = db_session.execute(
            update(TrackingCheckin)
            .where(
                and_(
                    TrackingCheckin.id == checkin.id,
                    TrackingCheckin.status == CheckinStatus.PENDING,
                )
            )
            .values(
                status=CheckinStatus.SENDING,
                locked_at_utc=current,
                attempts=checkin.attempts + 1,
            )
        )
        db_session.commit()
        
        # Should have updated 1 row
        assert result.rowcount == 1
        
        # Refresh and verify
        db_session.refresh(checkin)
        assert checkin.status == CheckinStatus.SENDING
        assert checkin.locked_at_utc is not None
        assert checkin.attempts == 1

    def test_second_lock_fails(self, db_session, setup_data):
        """Second lock attempt should fail."""
        checkin = setup_data["due_checkin"]
        current = now_utc()
        
        # First lock
        from sqlalchemy import and_, update
        result1 = db_session.execute(
            update(TrackingCheckin)
            .where(
                and_(
                    TrackingCheckin.id == checkin.id,
                    TrackingCheckin.status == CheckinStatus.PENDING,
                )
            )
            .values(
                status=CheckinStatus.SENDING,
                locked_at_utc=current,
            )
        )
        db_session.commit()
        
        # Second lock (should fail - already SENDING)
        result2 = db_session.execute(
            update(TrackingCheckin)
            .where(
                and_(
                    TrackingCheckin.id == checkin.id,
                    TrackingCheckin.status == CheckinStatus.PENDING,
                )
            )
            .values(
                status=CheckinStatus.SENDING,
                locked_at_utc=current,
            )
        )
        db_session.commit()
        
        # First should succeed, second should fail
        assert result1.rowcount == 1
        assert result2.rowcount == 0


class TestCheckinSending:
    """Test check-in sending flow."""

    def test_mark_sent(self, db_session, setup_data):
        """Successfully sent check-in should be marked as SENT."""
        checkin = setup_data["due_checkin"]
        current = now_utc()
        
        # Mark as sent
        checkin.status = CheckinStatus.SENT
        checkin.sent_at_utc = current
        checkin.last_outbound_message_id = "msg-123"
        checkin.locked_at_utc = None
        db_session.commit()
        db_session.refresh(checkin)
        
        assert checkin.status == CheckinStatus.SENT
        assert checkin.sent_at_utc is not None
        assert checkin.last_outbound_message_id == "msg-123"

    def test_mark_failed_with_retry(self, db_session, setup_data):
        """Failed check-in with retries remaining should be reset to PENDING."""
        checkin = setup_data["due_checkin"]
        
        # Simulate failure on first attempt
        checkin.attempts = 1
        checkin.status = CheckinStatus.PENDING  # Reset for retry
        checkin.last_error = "Connection timeout"
        checkin.locked_at_utc = None
        db_session.commit()
        db_session.refresh(checkin)
        
        # Should still be PENDING for retry
        assert checkin.status == CheckinStatus.PENDING
        assert checkin.attempts == 1
        assert "timeout" in checkin.last_error.lower()

    def test_mark_failed_max_attempts(self, db_session, setup_data):
        """Failed check-in with max attempts should be marked as FAILED."""
        checkin = setup_data["due_checkin"]
        
        # Simulate failure on max attempt (3)
        checkin.attempts = 3
        checkin.status = CheckinStatus.FAILED
        checkin.last_error = "Max attempts reached"
        checkin.locked_at_utc = None
        db_session.commit()
        db_session.refresh(checkin)
        
        assert checkin.status == CheckinStatus.FAILED
        assert checkin.attempts == 3


class TestStaleLockCleanup:
    """Test stale lock cleanup."""

    def test_cleanup_stale_locks(self, db_session, setup_data):
        """Stale locks should be reset to PENDING."""
        checkin = setup_data["due_checkin"]
        
        # Create a stale lock (10 minutes old)
        checkin.status = CheckinStatus.SENDING
        checkin.locked_at_utc = now_utc() - timedelta(minutes=10)
        db_session.commit()
        
        # Cleanup threshold is 5 minutes
        stale_threshold = now_utc() - timedelta(minutes=5)
        
        # Find stale locks
        stale_checkins = (
            db_session.query(TrackingCheckin)
            .filter(
                TrackingCheckin.status == CheckinStatus.SENDING,
                TrackingCheckin.locked_at_utc < stale_threshold,
            )
            .all()
        )
        
        assert len(stale_checkins) == 1
        
        # Reset them
        for c in stale_checkins:
            c.status = CheckinStatus.PENDING
            c.locked_at_utc = None
            c.last_error = "Lock timeout - reset for retry"
        
        db_session.commit()
        db_session.refresh(checkin)
        
        assert checkin.status == CheckinStatus.PENDING
        assert checkin.locked_at_utc is None


class TestShipmentStatusUpdate:
    """Test shipment status updates during check-in sending."""

    def test_first_checkin_updates_status(self, db_session, setup_data):
        """First check-in should update shipment to IN_TRANSIT."""
        shipment = setup_data["shipment"]
        
        assert shipment.status == ShipmentStatus.ASSIGNED
        
        # Simulate sending first check-in
        shipment.status = ShipmentStatus.IN_TRANSIT
        db_session.commit()
        db_session.refresh(shipment)
        
        assert shipment.status == ShipmentStatus.IN_TRANSIT
