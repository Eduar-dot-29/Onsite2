from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import configure_logging
from app.api.router import api_router


configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="On-site On-Transit")


@app.on_event("startup")
def create_tables():
    """Create v2 tables on startup (checkfirst)."""
    try:
        from app.core.db import engine
        from app.models.base import Base as V2Base

        # Ensure models are imported so metadata is populated
        from app import models as v2_models  # noqa: F401

        logger.info("Creating v2 database tables (checkfirst=True)...")
        V2Base.metadata.create_all(bind=engine)
        logger.info("v2 database tables ready")
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

app.include_router(api_router)


@app.get("/")
def root():
    return {"name": "On-site On-Transit API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}
