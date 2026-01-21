from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import configure_logging
from app.modules.auth.routes import router as auth_router
from app.modules.shipments.contacts_routes import router as contacts_router
from app.modules.shipments.routes import router as shipments_router
from app.modules.telegram.router import router as telegram_router
from app.modules.tracking.routes import router as tracking_router


configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="On-site On-Transit")


@app.on_event("startup")
def run_migrations():
    """Run database migrations on startup."""
    try:
        from alembic.config import Config
        from alembic import command
        
        logger.info("Running database migrations...")
        
        # Get the directory where alembic.ini is located
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        alembic_ini = os.path.join(base_dir, "alembic.ini")
        
        alembic_cfg = Config(alembic_ini)
        alembic_cfg.set_main_option("script_location", os.path.join(base_dir, "alembic"))
        
        command.upgrade(alembic_cfg, "head")
        logger.info("Migrations completed successfully")
    except Exception as e:
        logger.error(f"Migration error: {e}")

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(shipments_router)
app.include_router(contacts_router)
app.include_router(tracking_router)
app.include_router(telegram_router)


@app.get("/health")
def health():
    return {"status": "ok"}
