from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.modules.auth.models import Tenant, User


def create_tenant(session: Session, name: str) -> Tenant:
    tenant = Tenant(name=name)
    session.add(tenant)
    session.flush()
    return tenant


def create_user(
    session: Session, tenant_id, email: str, password: str, role
) -> User:
    user = User(
        tenant_id=tenant_id,
        email=email,
        hashed_password=get_password_hash(password),
        role=role,
    )
    session.add(user)
    session.flush()
    return user


def authenticate_user(session: Session, tenant_id, email: str, password: str) -> User | None:
    user = (
        session.query(User)
        .filter(User.tenant_id == tenant_id, User.email == email)
        .one_or_none()
    )
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user
