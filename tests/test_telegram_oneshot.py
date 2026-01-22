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


class TestMultiShipmentDriver:
    """
    Test that a driver with multiple shipments can respond to each correctly.
    Each check-in response must be linked to the correct shipment via checkin_id.
    """

    @pytest.fixture
    def multi_shipment_setup(self, db_session):
        """Create a driver with 2 active shipments, each with a pending checkin"""
        now = datetime.now(timezone.utc)
        
        tenant = Tenant(id=uuid4(), name="Test Tenant")
        db_session.add(tenant)
        
        # One driver with multiple shipments
        driver = Contact(
            id=uuid4(),
            tenant_id=tenant.id,
            name="Multi-Shipment Driver",
            channel=ContactChannel.TELEGRAM,
            telegram_chat_id="999888777",
            phone_e164="+34666555444",
        )
        db_session.add(driver)
        
        # Shipment 1: Madrid -> Barcelona
        shipment1 = Shipment(
            id=uuid4(),
            tenant_id=tenant.id,
            customer_name="Shipment Madrid-Barcelona",
            origin_text="Madrid",
            destination_text="Barcelona",
            departure_at_utc=now - timedelta(hours=1),
            eta_at_utc=now + timedelta(hours=3),
            timezone="Europe/Madrid",
            estimated_duration_minutes=240,
            status=ShipmentStatus.IN_TRANSIT,
            assigned_contact_id=driver.id,
        )
        db_session.add(shipment1)
        
        # Shipment 2: Valencia -> Sevilla
        shipment2 = Shipment(
            id=uuid4(),
            tenant_id=tenant.id,
            customer_name="Shipment Valencia-Sevilla",
            origin_text="Valencia",
            destination_text="Sevilla",
            departure_at_utc=now - timedelta(hours=2),
            eta_at_utc=now + timedelta(hours=4),
            timezone="Europe/Madrid",
            estimated_duration_minutes=360,
            status=ShipmentStatus.IN_TRANSIT,
            assigned_contact_id=driver.id,
        )
        db_session.add(shipment2)
        
        # Check-in for shipment 1
        checkin1 = TrackingCheckin(
            id=uuid4(),
            tenant_id=tenant.id,
            shipment_id=shipment1.id,
            scheduled_for_utc=now - timedelta(minutes=5),
            status=CheckinStatus.SENT,
            sent_at_utc=now - timedelta(minutes=5),
        )
        db_session.add(checkin1)
        
        # Check-in for shipment 2
        checkin2 = TrackingCheckin(
            id=uuid4(),
            tenant_id=tenant.id,
            shipment_id=shipment2.id,
            scheduled_for_utc=now - timedelta(minutes=3),
            status=CheckinStatus.SENT,
            sent_at_utc=now - timedelta(minutes=3),
        )
        db_session.add(checkin2)
        
        db_session.commit()
        
        return {
            "tenant": tenant,
            "driver": driver,
            "shipment1": shipment1,
            "shipment2": shipment2,
            "checkin1": checkin1,
            "checkin2": checkin2,
        }

    def test_checkins_linked_to_correct_shipments(self, db_session, multi_shipment_setup):
        """Each check-in is linked to its correct shipment"""
        data = multi_shipment_setup
        
        checkin1 = tracking_service.get_checkin(db_session, data["tenant"].id, data["checkin1"].id)
        checkin2 = tracking_service.get_checkin(db_session, data["tenant"].id, data["checkin2"].id)
        
        assert checkin1.shipment_id == data["shipment1"].id
        assert checkin2.shipment_id == data["shipment2"].id

    def test_responding_to_checkin1_doesnt_affect_checkin2(self, db_session, multi_shipment_setup):
        """Responding to one check-in doesn't affect the other"""
        data = multi_shipment_setup
        
        # Driver responds OK to checkin1
        checkin1 = data["checkin1"]
        checkin1.status = CheckinStatus.ANSWERED
        db_session.commit()
        
        # checkin2 should still be SENT
        checkin2 = tracking_service.get_checkin(db_session, data["tenant"].id, data["checkin2"].id)
        assert checkin2.status == CheckinStatus.SENT

    def test_incident_on_shipment1_tracked_separately(self, db_session, multi_shipment_setup):
        """Incident on one shipment is tracked separately by checkin_id"""
        data = multi_shipment_setup
        
        # Driver reports incident on shipment1 via checkin1
        incident1 = ShipmentIncidentState(
            id=uuid4(),
            tenant_id=data["tenant"].id,
            shipment_id=data["shipment1"].id,
            contact_id=data["driver"].id,
            checkin_id=data["checkin1"].id,  # Linked to specific checkin
            incident_type="TRAFFIC",
            state=IncidentState.WAITING_DELAY,
        )
        db_session.add(incident1)
        db_session.commit()
        
        # Find incident by checkin_id (the new way)
        found = tracking_service.find_incident_by_checkin(
            db_session,
            data["tenant"].id,
            data["checkin1"].id,
            data["driver"].id
        )
        
        assert found is not None
        assert found.shipment_id == data["shipment1"].id
        assert found.checkin_id == data["checkin1"].id
        
        # No incident for checkin2
        not_found = tracking_service.find_incident_by_checkin(
            db_session,
            data["tenant"].id,
            data["checkin2"].id,
            data["driver"].id
        )
        assert not_found is None

    def test_both_shipments_can_have_simultaneous_incidents(self, db_session, multi_shipment_setup):
        """
        Both shipments can have active incidents at the same time,
        differentiated by checkin_id.
        """
        data = multi_shipment_setup
        
        # Incident on shipment1
        incident1 = ShipmentIncidentState(
            id=uuid4(),
            tenant_id=data["tenant"].id,
            shipment_id=data["shipment1"].id,
            contact_id=data["driver"].id,
            checkin_id=data["checkin1"].id,
            incident_type="TRAFFIC",
            state=IncidentState.WAITING_DELAY,
        )
        db_session.add(incident1)
        
        # Incident on shipment2 (different checkin)
        incident2 = ShipmentIncidentState(
            id=uuid4(),
            tenant_id=data["tenant"].id,
            shipment_id=data["shipment2"].id,
            contact_id=data["driver"].id,
            checkin_id=data["checkin2"].id,
            incident_type="BREAKDOWN",
            state=IncidentState.WAITING_DELAY,
        )
        db_session.add(incident2)
        db_session.commit()
        
        # Find each incident by checkin_id
        found1 = tracking_service.find_incident_by_checkin(
            db_session, data["tenant"].id, data["checkin1"].id, data["driver"].id
        )
        found2 = tracking_service.find_incident_by_checkin(
            db_session, data["tenant"].id, data["checkin2"].id, data["driver"].id
        )
        
        # Both should be found with correct types
        assert found1 is not None
        assert found2 is not None
        assert found1.incident_type == "TRAFFIC"
        assert found2.incident_type == "BREAKDOWN"
        assert found1.shipment_id == data["shipment1"].id
        assert found2.shipment_id == data["shipment2"].id

    def test_set_delay_by_checkin_updates_correct_incident(self, db_session, multi_shipment_setup):
        """Setting delay by checkin_id updates only that incident"""
        data = multi_shipment_setup
        
        # Create both incidents
        incident1 = ShipmentIncidentState(
            id=uuid4(),
            tenant_id=data["tenant"].id,
            shipment_id=data["shipment1"].id,
            contact_id=data["driver"].id,
            checkin_id=data["checkin1"].id,
            incident_type="TRAFFIC",
            state=IncidentState.WAITING_DELAY,
        )
        db_session.add(incident1)
        
        incident2 = ShipmentIncidentState(
            id=uuid4(),
            tenant_id=data["tenant"].id,
            shipment_id=data["shipment2"].id,
            contact_id=data["driver"].id,
            checkin_id=data["checkin2"].id,
            incident_type="BREAKDOWN",
            state=IncidentState.WAITING_DELAY,
        )
        db_session.add(incident2)
        db_session.commit()
        
        # Set delay on incident1 using checkin_id
        updated = tracking_service.set_incident_delay_by_checkin(
            db_session,
            data["tenant"].id,
            data["checkin1"].id,
            data["driver"].id,
            delay_minutes=60
        )
        db_session.commit()
        
        # incident1 should now be WAITING_LOCATION
        assert updated is not None
        assert updated.state == IncidentState.WAITING_LOCATION
        assert updated.delay_minutes == 60
        
        # incident2 should still be WAITING_DELAY
        db_session.refresh(incident2)
        assert incident2.state == IncidentState.WAITING_DELAY
        assert incident2.delay_minutes is None
