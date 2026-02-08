"""
SQLAlchemy models for the "desde cero" backend variation.

Note: These models intentionally live under `app/models/` to match the new
architecture plan. They use a dedicated declarative base to avoid metadata
collisions with the existing module-based models during the migration.
"""

from .base import Base, UUIDMixin
from .enums import CheckinType, ShipmentEventType, ShipmentStatus, ContactLinkStatus
from .contact import Contact
from .shipment import Shipment
from .milestone import Milestone
from .shipment_event import ShipmentEvent

__all__ = [
    "Base",
    "UUIDMixin",
    "CheckinType",
    "ShipmentEventType",
    "ShipmentStatus",
    "ContactLinkStatus",
    "Contact",
    "Shipment",
    "Milestone",
    "ShipmentEvent",
]

