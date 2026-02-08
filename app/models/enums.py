from __future__ import annotations

from enum import Enum


class ShipmentStatus(str, Enum):
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    DELAYED = "DELAYED"
    SILENCE = "SILENCE"
    DELIVERED = "DELIVERED"


class CheckinType(str, Enum):
    INTERVAL = "INTERVAL"
    MILESTONE = "MILESTONE"


class ShipmentEventType(str, Enum):
    CHECK_IN = "CHECK_IN"
    INCIDENT = "INCIDENT"
    SYSTEM = "SYSTEM"


class ContactLinkStatus(str, Enum):
    UNLINKED = "UNLINKED"
    LINKED = "LINKED"

