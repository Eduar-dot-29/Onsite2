from __future__ import annotations

from fastapi import APIRouter

from app.api.routes.contacts import router as contacts_router
from app.api.routes.shipments import router as shipments_router

api_router = APIRouter()
api_router.include_router(contacts_router)
api_router.include_router(shipments_router)

