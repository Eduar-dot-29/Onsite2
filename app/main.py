from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import configure_logging
from app.modules.auth.routes import router as auth_router
from app.modules.shipments.contacts_routes import router as contacts_router
from app.modules.shipments.routes import router as shipments_router
from app.modules.telegram.router import router as telegram_router
from app.modules.tracking.routes import router as tracking_router


configure_logging()

app = FastAPI(title="On-site On-Transit")

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
