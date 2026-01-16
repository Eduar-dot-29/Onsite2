# On-site-On-Transit
SaaS de automatización de seguimiento de envíos.

## Stack
- FastAPI + SQLAlchemy 2.0 + Alembic
- PostgreSQL
- Celery + Redis
- Telegram Bot API via `python-telegram-bot`

## Configuración local
1) Crear entorno virtual e instalar dependencias:
- `python -m venv .venv`
- `source .venv/bin/activate`
- `pip install -r requirements.txt`

2) Copiar variables de entorno:
- `cp .env.example .env`

3) Ejecutar migraciones:
- `alembic upgrade head`

4) Iniciar API:
- `uvicorn app.main:app --reload`

5) Iniciar workers:
- `celery -A app.workers.celery_app.celery_app worker --loglevel=info`
- `celery -A app.workers.celery_app.celery_app beat --loglevel=info`

## Variables de entorno
Ver `.env.example` para el listado completo. Las más relevantes:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`

## Configurar Telegram
1) Crear bot con BotFather y obtener `TELEGRAM_BOT_TOKEN`.
2) Registrar webhook apuntando a:
`{TELEGRAM_WEBHOOK_URL}/telegram/webhook/{TENANT_ID}`

Ejemplo para registrar webhook (ajusta valores):
- `curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" -d "url=${TELEGRAM_WEBHOOK_URL}/telegram/webhook/${TENANT_ID}"`

## Flujo MVP (resumen)
1) Bootstrap inicial:
- `POST /auth/bootstrap` para crear tenant + admin.
2) Crear contacto (con `telegram_chat_id`).
3) Crear reglas de tracking.
4) Crear envío.
5) Asignar contacto al envío.
6) Esperar check-ins automáticos y responder por Telegram.

## Proveedor de routing
El MVP usa `StubRoutingProvider` (Haversine + velocidad media) para calcular ETA. 
La interfaz permite reemplazarlo por Google/HERE/OSRM sin reescribir la lógica.
