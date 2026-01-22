from __future__ import annotations

from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"


class ContactChannel(str, Enum):
    TELEGRAM = "TELEGRAM"
    WHATSAPP = "WHATSAPP"


class ShipmentStatus(str, Enum):
    CREATED = "CREATED"
    ASSIGNED = "ASSIGNED"
    IN_TRANSIT = "IN_TRANSIT"
    INCIDENT = "INCIDENT"
    DELAYED = "DELAYED"
    DELIVERED = "DELIVERED"


class CheckinStatus(str, Enum):
    PENDING = "PENDING"
    SENDING = "SENDING"  # Lock state to prevent duplicates
    SENT = "SENT"
    ANSWERED = "ANSWERED"
    MISSED = "MISSED"
    ESCALATED = "ESCALATED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class CheckinPlanMode(str, Enum):
    INTERVAL = "INTERVAL"  # Fixed interval between check-ins
    MILESTONE = "MILESTONE"  # Evenly distributed check-ins


class EventType(str, Enum):
    SHIPMENT_CREATED = "SHIPMENT_CREATED"
    DRIVER_ASSIGNED = "DRIVER_ASSIGNED"
    CHECKIN_SCHEDULED = "CHECKIN_SCHEDULED"
    CHECKIN_SENT = "CHECKIN_SENT"
    CHECKIN_OK = "CHECKIN_OK"
    INCIDENT_BREAKDOWN = "INCIDENT_BREAKDOWN"
    INCIDENT_TRAFFIC = "INCIDENT_TRAFFIC"
    DELAY_REPORTED = "DELAY_REPORTED"
    LOCATION_RECEIVED = "LOCATION_RECEIVED"
    ROUTE_RECALCULATED = "ROUTE_RECALCULATED"
    ETA_UPDATED = "ETA_UPDATED"
    NO_RESPONSE = "NO_RESPONSE"
    ESCALATED = "ESCALATED"


class IncidentType(str, Enum):
    BREAKDOWN = "BREAKDOWN"
    TRAFFIC = "TRAFFIC"


class IncidentState(str, Enum):
    WAITING_DELAY = "WAITING_DELAY"
    WAITING_LOCATION = "WAITING_LOCATION"


class MessageType(str, Enum):
    BUTTON_CLICK = "BUTTON_CLICK"
    LOCATION = "LOCATION"
    TEXT = "TEXT"
    COMMAND = "COMMAND"


class MessageAction(str, Enum):
    OK = "OK"
    BREAKDOWN = "BREAKDOWN"
    TRAFFIC = "TRAFFIC"
    DELAY_30 = "DELAY_30"
    DELAY_60 = "DELAY_60"
    DELAY_120 = "DELAY_120"
    DELAY_180 = "DELAY_180"
    START = "START"
