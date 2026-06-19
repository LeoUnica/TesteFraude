import json
from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.user import User
from ...core.security import verify_password, get_password_hash, create_access_token
from ...core.audit import audit_log
from ...api.deps import get_current_user
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def user_to_dict(user: User) -> dict:
    try:
        perms = json.loads(user.permissions or "{}")
    except Exception:
        perms = {}
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "status": user.status,
        "permissions": perms,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


@router.post("/login")
async def login(
    request: Request,
    body: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.username == body.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    if user.status != "ativo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo ou bloqueado",
        )

    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Conta bloqueada até {user.locked_until.isoformat()}",
        )

    if not verify_password(body.password, user.password):
        user.login_attempts = (user.login_attempts or 0) + 1
        if user.login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    user.login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token(data={"sub": user.id})

    ip = request.client.host if request.client else None
    audit_log(db, user.id, user.name, "LOGIN", "auth", ip=ip)

    logger.info("user_login", user_id=user.id, username=user.username)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_to_dict(user),
    }


@router.post("/logout")
async def logout(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    ip = request.client.host if request.client else None
    audit_log(db, current_user.id, current_user.name, "LOGOUT", "auth", ip=ip)
    return {"message": "Logout realizado com sucesso"}


@router.get("/me")
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return user_to_dict(current_user)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not verify_password(body.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta",
        )

    current_user.password = get_password_hash(body.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()

    audit_log(db, current_user.id, current_user.name, "CHANGE_PASSWORD", "auth")

    return {"message": "Senha alterada com sucesso"}
