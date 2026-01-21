from __future__ import annotations

import logging

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
def create_tables():
    """Create database tables on startup if they don't exist."""
    try:
        from sqlalchemy import inspect
        from app.core.db import engine, Base
        # Import all models to register them with Base
        from app.modules.auth import models as auth_models
        from app.modules.shipments import models as shipment_models
        from app.modules.tracking import models as tracking_models
        
        logger.info("Checking database tables...")
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if "users" not in existing_tables:
            logger.info("Creating database tables...")
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")
        else:
            logger.info("Database tables already exist")
    except Exception as e:
        logger.error(f"Database setup error: {e}")

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
