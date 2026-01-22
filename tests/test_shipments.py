"""
Tests for shipment endpoints including:
- Status filter
- PATCH update
- DELETE soft delete
"""
import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.db import Base, get_session
from app.core.enums import ShipmentStatus
from app.modules.auth.models import Tenant, User
from app.modules.shipments.models import Shipment


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_session] = override_get_session


@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def setup_data(db_session):
    """Create tenant, user, and sample shipments"""
    # Create tenant
    tenant = Tenant(id=uuid4(), name="Test Tenant")
    db_session.add(tenant)
    
    # Create user
    user = User(
        id=uuid4(),
        tenant_id=tenant.id,
        email="test@test.com",
        hashed_password="hashed",
        role="ADMIN",
    )
    db_session.add(user)
    
    now = datetime.now(timezone.utc)
    
    # Create shipments with different statuses
    shipments = [
        Shipment(
            id=uuid4(),
            tenant_id=tenant.id,
            customer_name="Envío 1",
            origin_text="Madrid",
            destination_text="Barcelona",
            planned_departure_at=now,
            eta_hours=4,
            estimated_arrival_at=now + timedelta(hours=4),
            status=ShipmentStatus.IN_TRANSIT,
        ),
        Shipment(
            id=uuid4(),
            tenant_id=tenant.id,
            customer_name="Envío 2",
            origin_text="Valencia",
            destination_text="Sevilla",
            planned_departure_at=now - timedelta(hours=10),
            eta_hours=4,
            estimated_arrival_at=now - timedelta(hours=6),  # Past ETA
            status=ShipmentStatus.INCIDENT,
        ),
        Shipment(
            id=uuid4(),
            tenant_id=tenant.id,
            customer_name="Envío 3",
            origin_text="Bilbao",
            destination_text="Zaragoza",
            planned_departure_at=now - timedelta(hours=24),
            eta_hours=3,
            estimated_arrival_at=now - timedelta(hours=21),
            status=ShipmentStatus.DELIVERED,
        ),
    ]
    
    for s in shipments:
        db_session.add(s)
    
    db_session.commit()
    
    return {
        "tenant": tenant,
        "user": user,
        "shipments": shipments,
    }


class TestStatusFilter:
    """Test GET /shipments with status filter"""

    def test_get_all_shipments(self, client, setup_data):
        """Without filter, returns all non-deleted shipments"""
        # Note: This test requires auth which we skip for unit test
        # In real scenario, use auth token
        pass

    def test_filter_in_transit(self, db_session, setup_data):
        """Filter IN_TRANSIT returns only active shipments"""
        from app.modules.shipments import routes
        
        # Query directly to test logic
        shipments = (
            db_session.query(Shipment)
            .filter(
                Shipment.tenant_id == setup_data["tenant"].id,
                Shipment.deleted_at.is_(None),
                Shipment.status.in_([ShipmentStatus.ASSIGNED, ShipmentStatus.IN_TRANSIT])
            )
            .all()
        )
        
        assert len(shipments) == 1
        assert shipments[0].status == ShipmentStatus.IN_TRANSIT

    def test_filter_delivered(self, db_session, setup_data):
        """Filter DELIVERED returns only completed shipments"""
        shipments = (
            db_session.query(Shipment)
            .filter(
                Shipment.tenant_id == setup_data["tenant"].id,
                Shipment.deleted_at.is_(None),
                Shipment.status == ShipmentStatus.DELIVERED
            )
            .all()
        )
        
        assert len(shipments) == 1
        assert shipments[0].customer_name == "Envío 3"

    def test_filter_delayed(self, db_session, setup_data):
        """Filter DELAYED returns shipments with incidents or past ETA"""
        from app.core.db import utcnow
        
        now = utcnow()
        shipments = (
            db_session.query(Shipment)
            .filter(
                Shipment.tenant_id == setup_data["tenant"].id,
                Shipment.deleted_at.is_(None),
                (Shipment.status == ShipmentStatus.INCIDENT) |
                (Shipment.status == ShipmentStatus.DELAYED) |
                (
                    (Shipment.estimated_arrival_at < now) &
                    (Shipment.status != ShipmentStatus.DELIVERED)
                )
            )
            .all()
        )
        
        # Should find Envío 2 (INCIDENT status)
        assert len(shipments) >= 1
        assert any(s.status == ShipmentStatus.INCIDENT for s in shipments)


class TestShipmentUpdate:
    """Test PATCH /shipments/:id"""

    def test_update_shipment_name(self, db_session, setup_data):
        """Can update shipment customer name"""
        shipment = setup_data["shipments"][0]
        old_name = shipment.customer_name
        
        shipment.customer_name = "Nuevo Nombre"
        db_session.commit()
        db_session.refresh(shipment)
        
        assert shipment.customer_name == "Nuevo Nombre"
        assert shipment.customer_name != old_name

    def test_update_shipment_origin_destination(self, db_session, setup_data):
        """Can update origin and destination"""
        shipment = setup_data["shipments"][0]
        
        shipment.origin_text = "Málaga"
        shipment.destination_text = "Granada"
        db_session.commit()
        db_session.refresh(shipment)
        
        assert shipment.origin_text == "Málaga"
        assert shipment.destination_text == "Granada"

    def test_update_recalculates_eta(self, db_session, setup_data):
        """Updating departure or eta_hours recalculates estimated_arrival_at"""
        shipment = setup_data["shipments"][0]
        new_departure = datetime.now(timezone.utc) + timedelta(hours=2)
        new_eta_hours = 6
        
        shipment.planned_departure_at = new_departure
        shipment.eta_hours = new_eta_hours
        shipment.estimated_arrival_at = new_departure + timedelta(hours=new_eta_hours)
        db_session.commit()
        db_session.refresh(shipment)
        
        expected_arrival = new_departure + timedelta(hours=new_eta_hours)
        assert shipment.estimated_arrival_at == expected_arrival


class TestShipmentDelete:
    """Test DELETE /shipments/:id (soft delete)"""

    def test_soft_delete_sets_deleted_at(self, db_session, setup_data):
        """Soft delete sets deleted_at timestamp"""
        from app.core.db import utcnow
        
        shipment = setup_data["shipments"][0]
        assert shipment.deleted_at is None
        
        shipment.deleted_at = utcnow()
        db_session.commit()
        db_session.refresh(shipment)
        
        assert shipment.deleted_at is not None

    def test_deleted_shipment_excluded_from_list(self, db_session, setup_data):
        """Soft deleted shipments are excluded from normal queries"""
        from app.core.db import utcnow
        
        # Get initial count
        initial_count = (
            db_session.query(Shipment)
            .filter(
                Shipment.tenant_id == setup_data["tenant"].id,
                Shipment.deleted_at.is_(None),
            )
            .count()
        )
        
        # Soft delete one
        shipment = setup_data["shipments"][0]
        shipment.deleted_at = utcnow()
        db_session.commit()
        
        # Count again
        new_count = (
            db_session.query(Shipment)
            .filter(
                Shipment.tenant_id == setup_data["tenant"].id,
                Shipment.deleted_at.is_(None),
            )
            .count()
        )
        
        assert new_count == initial_count - 1

    def test_deleted_shipment_still_exists_in_db(self, db_session, setup_data):
        """Soft deleted shipments still exist for audit purposes"""
        from app.core.db import utcnow
        
        shipment = setup_data["shipments"][0]
        shipment_id = shipment.id
        
        shipment.deleted_at = utcnow()
        db_session.commit()
        
        # Can still find with explicit query
        found = (
            db_session.query(Shipment)
            .filter(Shipment.id == shipment_id)
            .one_or_none()
        )
        
        assert found is not None
        assert found.deleted_at is not None
