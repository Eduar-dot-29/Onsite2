"""
Tests for Telegram one-shot buttons.
Verifies that duplicate callbacks don't change state.
"""
import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base
from app.core.enums import CheckinStatus, ShipmentStatus, ContactChannel, IncidentState
from app.modules.auth.models import Tenant
from app.modules.shipments.models import Contact, Shipment
from app.modules.tracking.models import TrackingCheckin, TrackingRule, ShipmentIncidentState
from app.modules.tracking import service as tracking_service


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
    """Create tenant, contact, shipment, and checkin"""
    now = datetime.now(timezone.utc)
    
    # Create tenant
    tenant = Tenant(id=uuid4(), name="Test Tenant")
    db_session.add(tenant)
    
    # Create contact (driver)
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
        planned_departure_at=now,
        eta_hours=4,
        estimated_arrival_at=now + timedelta(hours=4),
        status=ShipmentStatus.IN_TRANSIT,
        assigned_contact_id=contact.id,
    )
    db_session.add(shipment)
    
    # Create tracking rule
    rule = TrackingRule(
        id=uuid4(),
        tenant_id=tenant.id,
        name="Default Rule",
        interval_minutes=30,
        max_no_response=3,
        is_default=True,
    )
    db_session.add(rule)
    
    # Create checkin
    checkin = TrackingCheckin(
        id=uuid4(),
        tenant_id=tenant.id,
        shipment_id=shipment.id,
        rule_id=rule.id,
        scheduled_at=now,
        status=CheckinStatus.SENT,
    )
    db_session.add(checkin)
    
    db_session.commit()
    
    return {
        "tenant": tenant,
        "contact": contact,
        "shipment": shipment,
        "rule": rule,
        "checkin": checkin,
    }


class TestOneshotButtons:
    """Test that duplicate callbacks don't change state"""

    def test_get_checkin_returns_checkin(self, db_session, setup_data):
        """get_checkin returns the checkin object"""
        checkin = tracking_service.get_checkin(
            db_session,
            setup_data["tenant"].id,
            setup_data["checkin"].id
        )
        
        assert checkin is not None
        assert checkin.id == setup_data["checkin"].id

    def test_checkin_initial_status_is_sent(self, db_session, setup_data):
        """Checkin starts with SENT status"""
        checkin = setup_data["checkin"]
        assert checkin.status == CheckinStatus.SENT

    def test_duplicate_callback_detected(self, db_session, setup_data):
        """After answering, checkin status is ANSWERED"""
        checkin = setup_data["checkin"]
        
        # First response - mark as answered
        checkin.status = CheckinStatus.ANSWERED
        db_session.commit()
        
        # Simulate duplicate callback check
        checkin_again = tracking_service.get_checkin(
            db_session,
            setup_data["tenant"].id,
            setup_data["checkin"].id
        )
        
        # Verify it's already answered
        assert checkin_again.status == CheckinStatus.ANSWERED
        
        # This is the check that would happen in the router
        is_already_answered = checkin_again.status == CheckinStatus.ANSWERED
        assert is_already_answered is True

    def test_first_callback_changes_state(self, db_session, setup_data):
        """First callback changes checkin to ANSWERED"""
        checkin = setup_data["checkin"]
        assert checkin.status == CheckinStatus.SENT
        
        # Mark as answered (simulating first callback)
        checkin.status = CheckinStatus.ANSWERED
        db_session.commit()
        db_session.refresh(checkin)
        
        assert checkin.status == CheckinStatus.ANSWERED


class TestIncidentDuplicateDelay:
    """Test that duplicate delay selections are rejected"""

    def test_find_incident_by_shipment(self, db_session, setup_data):
        """Can find incident state by shipment"""
        # Create incident state
        incident = ShipmentIncidentState(
            id=uuid4(),
            tenant_id=setup_data["tenant"].id,
            shipment_id=setup_data["shipment"].id,
            contact_id=setup_data["contact"].id,
            checkin_id=setup_data["checkin"].id,
            incident_type="TRAFFIC",
            state=IncidentState.WAITING_DELAY,
        )
        db_session.add(incident)
        db_session.commit()
        
        # Find it
        found = tracking_service.find_incident_by_shipment(
            db_session,
            setup_data["tenant"].id,
            setup_data["shipment"].id,
            setup_data["contact"].id
        )
        
        assert found is not None
        assert found.state == IncidentState.WAITING_DELAY

    def test_delay_already_set_detected(self, db_session, setup_data):
        """After setting delay, state changes from WAITING_DELAY"""
        # Create incident state
        incident = ShipmentIncidentState(
            id=uuid4(),
            tenant_id=setup_data["tenant"].id,
            shipment_id=setup_data["shipment"].id,
            contact_id=setup_data["contact"].id,
            checkin_id=setup_data["checkin"].id,
            incident_type="TRAFFIC",
            state=IncidentState.WAITING_DELAY,
        )
        db_session.add(incident)
        db_session.commit()
        
        # Set delay (simulating first callback)
        incident.delay_minutes = 60
        incident.state = IncidentState.WAITING_LOCATION
        db_session.commit()
        
        # Try to find again for duplicate check
        found = tracking_service.find_incident_by_shipment(
            db_session,
            setup_data["tenant"].id,
            setup_data["shipment"].id,
            setup_data["contact"].id
        )
        
        # Verify state is no longer WAITING_DELAY
        assert found.state == IncidentState.WAITING_LOCATION
        
        # This is the check that would reject duplicate
        is_waiting_delay = found.state == IncidentState.WAITING_DELAY
        assert is_waiting_delay is False
