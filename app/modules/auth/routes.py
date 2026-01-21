from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.core.deps import get_current_user, require_role
from app.core.enums import UserRole
from app.core.security import create_access_token
from app.modules.auth import schemas, service
from app.modules.auth.models import Tenant, User


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/bootstrap", response_model=schemas.TenantOut)
def bootstrap(data: schemas.BootstrapRequest, session: Session = Depends(get_session)):
    existing = session.query(User).count()
    if existing > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already initialized")

    tenant = service.create_tenant(session, data.tenant_name)
    service.create_user(
        session,
        tenant_id=tenant.id,
        email=data.admin_email,
        password=data.admin_password,
        role=UserRole.ADMIN,
    )
    session.commit()
    session.refresh(tenant)
    return tenant


@router.post("/tenants", response_model=schemas.TenantOut)
def create_tenant(
    data: schemas.TenantCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    tenant = service.create_tenant(session, data.name)
    session.commit()
    session.refresh(tenant)
    return tenant


@router.post("/users", response_model=schemas.UserOut)
def create_user(
    data: schemas.UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    user = service.create_user(
        session,
        tenant_id=current_user.tenant_id,
        email=data.email,
        password=data.password,
        role=data.role,
    )
    session.commit()
    session.refresh(user)
    return user


@router.post("/token", response_model=schemas.TokenResponse)
def token(data: schemas.TokenRequest, session: Session = Depends(get_session)):
    user = service.authenticate_user(session, data.tenant_id, data.email, data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(
        {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role.value}
    )
    return schemas.TokenResponse(access_token=token)


@router.post("/dev-login", response_model=schemas.TokenResponse)
def dev_login(data: schemas.DevLoginRequest, session: Session = Depends(get_session)):
    """
    Simplified login for development/testing.
    Only requires email - creates user automatically if doesn't exist.
    """
    user = service.find_or_create_dev_user(session, data.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create user")

    session.commit()
    token = create_access_token(
        {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role.value}
    )
    return schemas.TokenResponse(access_token=token)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/tenant-info")
def tenant_info(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Get current user's tenant information including the tenant_id needed for Telegram webhook."""
    tenant = session.query(Tenant).filter(Tenant.id == current_user.tenant_id).one_or_none()
    return {
        "tenant_id": str(current_user.tenant_id),
        "tenant_name": tenant.name if tenant else None,
        "webhook_url": f"https://on-site-on-transit.onrender.com/telegram/webhook/{current_user.tenant_id}",
        "instructions": "Configura el webhook de Telegram ejecutando: curl 'https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=<webhook_url>'"
    }
