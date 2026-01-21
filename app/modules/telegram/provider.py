from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from telegram import Bot

from app.core.config import get_settings
from app.core.enums import ContactChannel, MessageAction, MessageType
from app.modules.messaging.base import MessagingProvider
from app.modules.messaging.schemas import LocationPayload, NormalizedMessage


class TelegramProvider(MessagingProvider):
    def __init__(self) -> None:
        self.channel = ContactChannel.TELEGRAM
        self._bot = None
        self._init_bot()

    def _init_bot(self) -> None:
        settings = get_settings()
        if settings.telegram_bot_token:
            self._bot = Bot(settings.telegram_bot_token)

    async def send_checkin(self, contact, shipment, checkin_id) -> str | None:
        if not self._bot or not contact.telegram_chat_id:
            return None
        text = f"Envío {shipment.id}: {shipment.origin_text} → {shipment.destination_text}. ¿Estado actual?"
        keyboard = InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton("✅ Todo OK", callback_data=f"CHECKIN_OK:{checkin_id}"),
                    InlineKeyboardButton("⚠️ Avería", callback_data=f"INCIDENT_BREAKDOWN:{checkin_id}"),
                    InlineKeyboardButton("🚦 Tráfico", callback_data=f"INCIDENT_TRAFFIC:{checkin_id}"),
                ]
            ]
        )
        message = await self._bot.send_message(chat_id=contact.telegram_chat_id, text=text, reply_markup=keyboard)
        return str(message.message_id)

    async def send_incident_delay_options(self, contact, shipment) -> str | None:
        if not self._bot or not contact.telegram_chat_id:
            return None
        text = "Recibido. Indica retraso estimado:"
        keyboard = InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton("<1h", callback_data=f"DELAY_30:{shipment.id}"),
                    InlineKeyboardButton("+1h", callback_data=f"DELAY_60:{shipment.id}"),
                    InlineKeyboardButton("+2h", callback_data=f"DELAY_120:{shipment.id}"),
                    InlineKeyboardButton("+3h o más", callback_data=f"DELAY_180:{shipment.id}"),
                ]
            ]
        )
        message = await self._bot.send_message(chat_id=contact.telegram_chat_id, text=text, reply_markup=keyboard)
        return str(message.message_id)

    async def send_request_location(self, contact, shipment) -> str | None:
        if not self._bot or not contact.telegram_chat_id:
            return None
        text = "Ahora envía tu ubicación actual para recalcular la ETA (📍Enviar ubicación)."
        keyboard = ReplyKeyboardMarkup(
            [[KeyboardButton("📍Enviar ubicación", request_location=True)]],
            resize_keyboard=True,
            one_time_keyboard=True,
        )
        message = await self._bot.send_message(chat_id=contact.telegram_chat_id, text=text, reply_markup=keyboard)
        return str(message.message_id)

    async def send_text(self, contact, text: str) -> str | None:
        if not self._bot or not contact.telegram_chat_id:
            return None
        message = await self._bot.send_message(chat_id=contact.telegram_chat_id, text=text)
        return str(message.message_id)

    async def send_welcome_message(self, chat_id: str, driver_name: str) -> str | None:
        """Send a welcome message when a driver is successfully linked."""
        if not self._bot:
            return None
        text = (
            f"¡Hola {driver_name}! 👋\n\n"
            "Te has vinculado correctamente como conductor.\n\n"
            "A partir de ahora recibirás mensajes automáticos de seguimiento "
            "cuando te asignen un envío.\n\n"
            "No tienes que hacer nada más. ¡Buen viaje! 🚚"
        )
        message = await self._bot.send_message(chat_id=chat_id, text=text)
        return str(message.message_id)

    async def send_request_phone(self, chat_id: str, user_name: str) -> str | None:
        """Ask the user to share their phone number to link their account."""
        if not self._bot:
            return None
        text = (
            f"¡Hola {user_name}! 👋\n\n"
            "Para vincularte como conductor, necesito verificar tu número de teléfono.\n\n"
            "Pulsa el botón de abajo para compartir tu número:"
        )
        keyboard = ReplyKeyboardMarkup(
            [[KeyboardButton("📱 Compartir mi teléfono", request_contact=True)]],
            resize_keyboard=True,
            one_time_keyboard=True,
        )
        message = await self._bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)
        return str(message.message_id)

    async def send_not_registered_message(self, chat_id: str) -> str | None:
        """Tell the user their phone is not registered in the system."""
        if not self._bot:
            return None
        text = (
            "❌ Tu número de teléfono no está registrado en el sistema.\n\n"
            "Contacta con tu empresa para que te den de alta como conductor."
        )
        message = await self._bot.send_message(chat_id=chat_id, text=text)
        return str(message.message_id)

    async def send_already_linked_message(self, chat_id: str, driver_name: str) -> str | None:
        """Tell the user they are already linked."""
        if not self._bot:
            return None
        text = (
            f"¡Hola {driver_name}! 👋\n\n"
            "Ya estás vinculado como conductor.\n"
            "Recibirás mensajes de seguimiento cuando te asignen un envío."
        )
        message = await self._bot.send_message(chat_id=chat_id, text=text)
        return str(message.message_id)

    def parse_incoming(self, payload: dict) -> NormalizedMessage | None:
        if "callback_query" in payload:
            callback = payload["callback_query"]
            data = callback.get("data")
            message = callback.get("message", {})
            chat_id = message.get("chat", {}).get("id")
            timestamp = datetime.fromtimestamp(callback.get("date", 0), tz=timezone.utc)
            if not data or chat_id is None:
                return None
            action, shipment_id, checkin_id = _parse_callback(data)
            if not action:
                return None
            return NormalizedMessage(
                type=MessageType.BUTTON_CLICK,
                action=action,
                external_user_id=str(chat_id),
                message_id=str(message.get("message_id")) if message.get("message_id") else None,
                shipment_id=shipment_id,
                checkin_id=checkin_id,
                timestamp=timestamp,
            )

        if "message" in payload:
            message = payload["message"]
            chat_id = message.get("chat", {}).get("id")
            timestamp = datetime.fromtimestamp(message.get("date", 0), tz=timezone.utc)
            if chat_id is None:
                return None

            # Extract user info from payload
            from_user = message.get("from", {})
            user_first_name = from_user.get("first_name")
            user_last_name = from_user.get("last_name")
            username = from_user.get("username")

            # Check if user shared their contact (phone number)
            if "contact" in message:
                contact = message["contact"]
                phone_number = contact.get("phone_number")
                # Normalize phone: ensure it starts with +
                if phone_number and not phone_number.startswith("+"):
                    phone_number = "+" + phone_number
                return NormalizedMessage(
                    type=MessageType.CONTACT,
                    external_user_id=str(chat_id),
                    message_id=str(message.get("message_id")) if message.get("message_id") else None,
                    timestamp=timestamp,
                    user_first_name=user_first_name,
                    user_last_name=user_last_name,
                    username=username,
                    shared_phone=phone_number,
                )

            if "location" in message:
                location = message["location"]
                return NormalizedMessage(
                    type=MessageType.LOCATION,
                    external_user_id=str(chat_id),
                    message_id=str(message.get("message_id")) if message.get("message_id") else None,
                    location=LocationPayload(
                        lat=location["latitude"],
                        lon=location["longitude"],
                        accuracy_m=location.get("horizontal_accuracy"),
                    ),
                    timestamp=timestamp,
                    user_first_name=user_first_name,
                    user_last_name=user_last_name,
                    username=username,
                )

            if "text" in message:
                text = message.get("text", "")
                # Check if it's the /start command
                if text.strip().lower() == "/start" or text.strip().lower().startswith("/start "):
                    return NormalizedMessage(
                        type=MessageType.COMMAND,
                        action=MessageAction.START,
                        external_user_id=str(chat_id),
                        message_id=str(message.get("message_id")) if message.get("message_id") else None,
                        text=text,
                        timestamp=timestamp,
                        user_first_name=user_first_name,
                        user_last_name=user_last_name,
                        username=username,
                    )
                return NormalizedMessage(
                    type=MessageType.TEXT,
                    external_user_id=str(chat_id),
                    message_id=str(message.get("message_id")) if message.get("message_id") else None,
                    text=text,
                    timestamp=timestamp,
                    user_first_name=user_first_name,
                    user_last_name=user_last_name,
                    username=username,
                )
        return None


def _parse_callback(data: str):
    if data.startswith("CHECKIN_OK:"):
        return MessageAction.OK, None, _safe_uuid(data.split(":", 1)[1])
    if data.startswith("INCIDENT_BREAKDOWN:"):
        return MessageAction.BREAKDOWN, None, _safe_uuid(data.split(":", 1)[1])
    if data.startswith("INCIDENT_TRAFFIC:"):
        return MessageAction.TRAFFIC, None, _safe_uuid(data.split(":", 1)[1])
    if data.startswith("DELAY_30:"):
        return MessageAction.DELAY_30, _safe_uuid(data.split(":", 1)[1]), None
    if data.startswith("DELAY_60:"):
        return MessageAction.DELAY_60, _safe_uuid(data.split(":", 1)[1]), None
    if data.startswith("DELAY_120:"):
        return MessageAction.DELAY_120, _safe_uuid(data.split(":", 1)[1]), None
    if data.startswith("DELAY_180:"):
        return MessageAction.DELAY_180, _safe_uuid(data.split(":", 1)[1]), None
    return None, None, None


def _safe_uuid(value: str):
    try:
        return UUID(value)
    except ValueError:
        return None
