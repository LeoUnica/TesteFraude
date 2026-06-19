import uuid
import json
from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.convenio import Convenio
from ...core.audit import audit_log
from ...api.deps import get_current_user
from ...models.user import User

router = APIRouter(prefix="/convenios", tags=["convenios"])


class ConvenioCreate(BaseModel):
    code: str
    name: str
    status: str = "ativo"
    description: Optional[str] = None


class ConvenioUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


def convenio_to_dict(c: Convenio) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "name": c.name,
        "status": c.status,
        "description": c.description,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        "created_by": c.created_by,
    }


@router.get("/")
async def list_convenios(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status_filter: Optional[str] = Query(None, alias="status"),
):
    query = db.query(Convenio)
    if status_filter:
        query = query.filter(Convenio.status == status_filter)
    convenios = query.order_by(Convenio.name).all()
    return [convenio_to_dict(c) for c in convenios]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_convenio(
    body: ConvenioCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    existing = db.query(Convenio).filter(Convenio.code == body.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Código já cadastrado")

    convenio = Convenio(
        id=str(uuid.uuid4()),
        code=body.code,
        name=body.name,
        status=body.status,
        description=body.description,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(convenio)
    db.commit()
    db.refresh(convenio)

    audit_log(
        db, current_user.id, current_user.name,
        "CREATE_CONVENIO", "convenios", entity_id=convenio.id, entity_type="Convenio",
        new_value=json.dumps({"name": convenio.name, "code": convenio.code}),
    )

    return convenio_to_dict(convenio)


@router.put("/{convenio_id}")
async def update_convenio(
    convenio_id: str,
    body: ConvenioUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    convenio = db.query(Convenio).filter(Convenio.id == convenio_id).first()
    if not convenio:
        raise HTTPException(status_code=404, detail="Convênio não encontrado")

    old_data = convenio_to_dict(convenio)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(convenio, field, value)
    convenio.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(convenio)

    audit_log(
        db, current_user.id, current_user.name,
        "UPDATE_CONVENIO", "convenios", entity_id=convenio.id, entity_type="Convenio",
        old_value=json.dumps(old_data), new_value=json.dumps(convenio_to_dict(convenio)),
    )

    return convenio_to_dict(convenio)


@router.delete("/{convenio_id}")
async def delete_convenio(
    convenio_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    convenio = db.query(Convenio).filter(Convenio.id == convenio_id).first()
    if not convenio:
        raise HTTPException(status_code=404, detail="Convênio não encontrado")

    db.delete(convenio)
    db.commit()

    audit_log(
        db, current_user.id, current_user.name,
        "DELETE_CONVENIO", "convenios", entity_id=convenio_id, entity_type="Convenio",
    )

    return {"message": "Convênio excluído com sucesso"}


@router.patch("/{convenio_id}/toggle-status")
async def toggle_convenio_status(
    convenio_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    convenio = db.query(Convenio).filter(Convenio.id == convenio_id).first()
    if not convenio:
        raise HTTPException(status_code=404, detail="Convênio não encontrado")

    convenio.status = "inativo" if convenio.status == "ativo" else "ativo"
    convenio.updated_at = datetime.utcnow()
    db.commit()

    audit_log(
        db, current_user.id, current_user.name,
        "TOGGLE_CONVENIO_STATUS", "convenios", entity_id=convenio.id, entity_type="Convenio",
        new_value=json.dumps({"status": convenio.status}),
    )

    return convenio_to_dict(convenio)
