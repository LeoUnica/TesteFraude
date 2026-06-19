import json
import uuid
from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.user import User
from ...core.security import get_password_hash
from ...core.audit import audit_log
from ...api.deps import get_current_user, require_permission
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    name: str
    email: str
    username: str
    password: str
    role: str = "Operador"
    permissions: dict = {}


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[dict] = None
    status: Optional[str] = None


class ResetPasswordRequest(BaseModel):
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
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "created_by": user.created_by,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "login_attempts": user.login_attempts,
        "locked_until": user.locked_until.isoformat() if user.locked_until else None,
    }


@router.get("/")
async def list_users(
    current_user: Annotated[User, Depends(require_permission("usuarios"))],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
):
    query = db.query(User)
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%"))
            | (User.email.ilike(f"%{search}%"))
            | (User.username.ilike(f"%{search}%"))
        )
    if role:
        query = query.filter(User.role == role)
    if status_filter:
        query = query.filter(User.status == status_filter)

    total = query.count()
    users = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "data": [user_to_dict(u) for u in users],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    current_user: Annotated[User, Depends(require_permission("usuarios"))],
    db: Annotated[Session, Depends(get_db)],
):
    existing = db.query(User).filter(
        (User.email == body.email) | (User.username == body.username)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ou username já cadastrado",
        )

    new_user = User(
        id=str(uuid.uuid4()),
        name=body.name,
        email=body.email,
        username=body.username,
        password=get_password_hash(body.password),
        role=body.role,
        permissions=json.dumps(body.permissions),
        status="ativo",
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    audit_log(
        db, current_user.id, current_user.name,
        "CREATE_USER", "users", entity_id=new_user.id, entity_type="User",
        new_value=json.dumps({"username": new_user.username, "role": new_user.role}),
    )

    return user_to_dict(new_user)


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdate,
    current_user: Annotated[User, Depends(require_permission("usuarios"))],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    old_data = user_to_dict(user)

    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        existing = db.query(User).filter(User.email == body.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        user.email = body.email
    if body.username is not None:
        existing = db.query(User).filter(User.username == body.username, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username já cadastrado")
        user.username = body.username
    if body.role is not None:
        user.role = body.role
    if body.permissions is not None:
        user.permissions = json.dumps(body.permissions)
    if body.status is not None:
        user.status = body.status
    user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    audit_log(
        db, current_user.id, current_user.name,
        "UPDATE_USER", "users", entity_id=user.id, entity_type="User",
        old_value=json.dumps(old_data), new_value=json.dumps(user_to_dict(user)),
    )

    return user_to_dict(user)


@router.patch("/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str,
    current_user: Annotated[User, Depends(require_permission("usuarios"))],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível alterar o próprio status")

    user.status = "inativo" if user.status == "ativo" else "ativo"
    user.updated_at = datetime.utcnow()
    db.commit()

    audit_log(
        db, current_user.id, current_user.name,
        "TOGGLE_USER_STATUS", "users", entity_id=user.id, entity_type="User",
        new_value=json.dumps({"status": user.status}),
    )

    return user_to_dict(user)


@router.patch("/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    body: ResetPasswordRequest,
    current_user: Annotated[User, Depends(require_permission("usuarios"))],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.password = get_password_hash(body.new_password)
    user.login_attempts = 0
    user.locked_until = None
    user.updated_at = datetime.utcnow()
    db.commit()

    audit_log(
        db, current_user.id, current_user.name,
        "RESET_PASSWORD", "users", entity_id=user.id, entity_type="User",
    )

    return {"message": "Senha redefinida com sucesso"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: Annotated[User, Depends(require_permission("usuarios"))],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível excluir a si mesmo")

    user.status = "inativo"
    user.updated_at = datetime.utcnow()
    db.commit()

    audit_log(
        db, current_user.id, current_user.name,
        "DELETE_USER", "users", entity_id=user.id, entity_type="User",
    )

    return {"message": "Usuário desativado com sucesso"}
