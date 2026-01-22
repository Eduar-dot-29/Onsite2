# On-site-On-Transit
SaaS de automatización de seguimiento de envíos con check-ins automáticos.

## Stack
- FastAPI + SQLAlchemy 2.0 + Alembic
- PostgreSQL
- Celery + Redis (workers automáticos)
- Telegram Bot API via `python-telegram-bot`
- Next.js (frontend)
- pytz (timezone handling)

## Características principales
- **Check-ins 100% automáticos**: Sin intervención humana
- **Manejo correcto de zonas horarias**: Almacenamiento en UTC, display en local
- **Botones one-shot**: Los botones de Telegram desaparecen después de usar
- **Soft delete**: Envíos eliminados se conservan para auditoría
- **Filtros por estado**: En tránsito, retrasados, entregados

## Configuración local

### Backend
1) Crear entorno virtual e instalar dependencias:
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# o: .venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

2) Copiar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus valores
```

3) Ejecutar migraciones:
```bash
alembic upgrade head
```

4) Iniciar API:
```bash
uvicorn app.main:app --reload
```

5) **Iniciar workers (IMPORTANTE para check-ins automáticos)**:
```bash
# En una terminal: worker de tareas
celery -A app.workers.celery_app.celery_app worker --loglevel=info

# En otra terminal: scheduler periódico
celery -A app.workers.celery_app.celery_app beat --loglevel=info
```

### Frontend
```bash
npm install
npm run dev
```

## Workers automáticos

El sistema incluye tareas Celery que se ejecutan periódicamente:

| Tarea | Intervalo | Descripción |
|-------|-----------|-------------|
| `process_due_checkins` | 1 minuto | Envía check-ins pendientes cuando `scheduled_for_utc <= now` |
| `cleanup_stale_locks` | 2 minutos | Resetea check-ins bloqueados por más de 5 minutos |
| `mark_silence_and_escalate` | 5 minutos | Detecta conductores sin respuesta y escala |

### Cómo funciona el envío automático

1. Al crear un envío, se generan check-ins programados según el plan elegido:
   - **INTERVAL**: Check-in cada X minutos
   - **MILESTONE**: N check-ins distribuidos uniformemente

2. El worker ejecuta cada minuto:
   - Busca check-ins con `scheduled_for_utc <= now_utc` y estado `PENDING`
   - Aplica lock atómico (`PENDING -> SENDING`) para evitar duplicados
   - Envía mensaje de Telegram con botones one-shot
   - Marca como `SENT` o `FAILED`

3. Reintentos automáticos: máximo 3 intentos por check-in.

## Zonas horarias (anti-bugs)

**Reglas obligatorias implementadas:**

| Regla | Descripción |
|-------|-------------|
| A: Almacenar en UTC | BD guarda `departure_at_utc`, `eta_at_utc`, `scheduled_for_utc` |
| B: Guardar timezone | Campo `timezone` (IANA: `Europe/Madrid`, `America/Mexico_City`) |
| C: UI en local | Frontend envía `departure_at_local` + `timezone`, backend convierte |
| D: `now` en UTC | Worker usa `now_utc()` para comparaciones |

### Ejemplo de flujo

```
Usuario en España (Madrid):
1. Elige salida: 02/10/2026 09:00 local
2. Frontend envía: { departure_at_local: "2026-10-02T09:00:00", timezone: "Europe/Madrid" }
3. Backend convierte: departure_at_utc = 2026-10-02T07:00:00Z (CEST = UTC+2)
4. ETA 3h: eta_at_utc = 2026-10-02T10:00:00Z
5. Frontend muestra: "ETA: 12:00" (convierte UTC a local)
```

## Variables de entorno

Ver `.env.example` para el listado completo:

```env
DATABASE_URL=postgresql://user:pass@host/db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
```

## Configurar Telegram

1) Crear bot con BotFather y obtener `TELEGRAM_BOT_TOKEN`

2) Registrar webhook:
```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=https://tu-dominio.com/telegram/webhook/${TENANT_ID}"
```

3) Los conductores solo necesitan enviar `/start` al bot para registrarse

## API Endpoints principales

### Envíos
- `POST /shipments` - Crear envío (auto-genera check-ins)
- `GET /shipments?status=IN_TRANSIT` - Listar con filtro
- `PATCH /shipments/{id}` - Actualizar (re-programa check-ins si cambia hora)
- `DELETE /shipments/{id}` - Soft delete
- `POST /shipments/{id}/assign` - Asignar conductor
- `POST /shipments/{id}/deliver` - Marcar entregado
- `GET /shipments/{id}/checkins` - Ver check-ins programados

### Ejemplo: crear envío
```json
POST /shipments
{
  "customer_name": "Empresa ABC",
  "origin_text": "Madrid",
  "destination_text": "Barcelona",
  "departure_at_local": "2026-10-02T09:00:00",
  "timezone": "Europe/Madrid",
  "estimated_duration_minutes": 180,
  "checkin_plan_mode": "INTERVAL",
  "checkin_interval_minutes": 30
}
```

## Tests

```bash
# Instalar pytest
pip install pytest

# Ejecutar tests
pytest tests/

# Tests específicos
pytest tests/test_timezone.py -v
pytest tests/test_worker.py -v
```

## Estructura de archivos clave

```
app/
├── core/
│   ├── timezone.py      # Utilidades de conversión UTC/local
│   └── enums.py         # CheckinStatus, CheckinPlanMode
├── modules/
│   ├── shipments/
│   │   ├── models.py    # Shipment con departure_at_utc, timezone
│   │   ├── service.py   # create_shipment genera check-ins auto
│   │   └── routes.py    # Endpoints REST
│   └── tracking/
│       └── models.py    # TrackingCheckin con scheduled_for_utc
└── workers/
    ├── celery_app.py    # Configuración Celery beat
    └── tasks.py         # process_due_checkins, cleanup_stale_locks
```

## Flujo MVP completo

1. Bootstrap: `POST /auth/bootstrap` para crear tenant + admin
2. Login: `POST /auth/dev-login` con email
3. Crear conductor: `POST /contacts`
4. El conductor envía `/start` al bot de Telegram
5. Crear envío con plan de check-ins
6. Asignar conductor al envío
7. Los check-ins se envían **automáticamente** según el horario
8. El conductor responde con botones one-shot
9. Ver timeline en dashboard

## Proveedor de routing

El MVP usa `StubRoutingProvider` (Haversine + velocidad media) para calcular ETA.
La interfaz permite reemplazarlo por Google/HERE/OSRM sin reescribir la lógica.
