from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.core.enums import UserRole


class TenantCreate(BaseModel):
    name: str


class TenantOut(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole


class UserOut(BaseModel):
    id: UUID
    tenant_id: UUID
    email: EmailStr
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_id: UUID


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class BootstrapRequest(BaseModel):
    tenant_name: str
    admin_email: EmailStr
    admin_password: str
