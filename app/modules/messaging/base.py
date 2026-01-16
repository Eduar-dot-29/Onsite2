from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.core.enums import ContactChannel
from app.modules.messaging.schemas import NormalizedMessage


class MessagingProvider(ABC):
    channel: ContactChannel

    @abstractmethod
    async def send_checkin(self, contact, shipment, checkin_id) -> str | None:
        raise NotImplementedError

    @abstractmethod
    async def send_incident_delay_options(self, contact, shipment) -> str | None:
        raise NotImplementedError

    @abstractmethod
    async def send_request_location(self, contact, shipment) -> str | None:
        raise NotImplementedError

    @abstractmethod
    async def send_text(self, contact, text: str) -> str | None:
        raise NotImplementedError

    @abstractmethod
    def parse_incoming(self, payload: dict[str, Any]) -> NormalizedMessage | None:
        raise NotImplementedError
