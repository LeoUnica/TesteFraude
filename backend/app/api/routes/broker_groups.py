import uuid
import json
from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.broker_group import BrokerGroup
from ...models.broker import Broker
from ...core.audit import audit_log
from ...api.deps import get_current_user
from ...models.user import User
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/broker-groups", tags=["broker-groups"])


class BrokerGroupCreate(BaseModel):
    code: str
    name: str
    status: str = "ativo"
    description: Optional[str] = None


class BrokerGroupUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


def group_to_dict(g: BrokerGroup, broker_count: int = 0) -> dict:
    return {
        "id": g.id,
        "code": g.code,
        "name": g.name,
        "status": g.status,
        "description": g.description,
        "broker_count": broker_count,
        "created_at": g.created_at.isoformat() if g.created_at else None,
        "updated_at": g.updated_at.isoformat() if g.updated_at else None,
        "created_by": g.created_by,
    }


@router.get("/")
async def list_broker_groups(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    groups = db.query(BrokerGroup).order_by(BrokerGroup.name).all()
    result = []
    for g in groups:
        count = db.query(Broker).filter(Broker.group_id == g.id).count()
        result.append(group_to_dict(g, count))
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_broker_group(
    body: BrokerGroupCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    existing = db.query(BrokerGroup).filter(BrokerGroup.code == body.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Código já cadastrado")

    group = BrokerGroup(
        id=str(uuid.uuid4()),
        code=body.code,
        name=body.name,
        status=body.status,
        description=body.description,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    audit_log(
        db, current_user.id, current_user.name,
        "CREATE_BROKER_GROUP", "broker_groups", entity_id=group.id, entity_type="BrokerGroup",
        new_value=json.dumps({"name": group.name, "code": group.code}),
    )

    return group_to_dict(group)


@router.put("/{group_id}")
async def update_broker_group(
    group_id: str,
    body: BrokerGroupUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    group = db.query(BrokerGroup).filter(BrokerGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    old_data = group_to_dict(group)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    group.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(group)

    audit_log(
        db, current_user.id, current_user.name,
        "UPDATE_BROKER_GROUP", "broker_groups", entity_id=group.id, entity_type="BrokerGroup",
        old_value=json.dumps(old_data), new_value=json.dumps(group_to_dict(group)),
    )

    count = db.query(Broker).filter(Broker.group_id == group.id).count()
    return group_to_dict(group, count)


@router.delete("/{group_id}")
async def delete_broker_group(
    group_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    group = db.query(BrokerGroup).filter(BrokerGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    broker_count = db.query(Broker).filter(Broker.group_id == group_id).count()
    if broker_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Grupo possui {broker_count} correspondente(s) vinculado(s)",
        )

    db.delete(group)
    db.commit()

    audit_log(
        db, current_user.id, current_user.name,
        "DELETE_BROKER_GROUP", "broker_groups", entity_id=group_id, entity_type="BrokerGroup",
    )

    return {"message": "Grupo excluído com sucesso"}
