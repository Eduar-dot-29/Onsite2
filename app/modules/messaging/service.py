from __future__ import annotations

from app.core.enums import ContactChannel
from app.modules.messaging.base import MessagingProvider
from app.modules.telegram.provider import TelegramProvider


_providers: dict[ContactChannel, MessagingProvider] = {
    ContactChannel.TELEGRAM: TelegramProvider(),
}


def get_provider(channel: ContactChannel) -> MessagingProvider:
    provider = _providers.get(channel)
    if not provider:
        raise ValueError(f"Unsupported channel {channel}")
    return provider
