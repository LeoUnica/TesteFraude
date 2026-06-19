import uuid
import json
import random
from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.integration import Integration
from ...models.pipeline import PipelineConfig
from ...models.bank import Bank
from ...core.audit import audit_log
from ...api.deps import get_current_user
from ...models.user import User

router = APIRouter(prefix="/integrations", tags=["integrations"])


class IntegrationCreate(BaseModel):
    bank_id: Optional[str] = None
    type: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    status: str = "inativo"
    config: dict = {}


class IntegrationUpdate(BaseModel):
    bank_id: Optional[str] = None
    type: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    status: Optional[str] = None
    config: Optional[dict] = None


class PipelineConfigCreate(BaseModel):
    bank_id: str
    days_import: int = 0
    days_analysis: int = 0
    days_checklist: int = 0
    days_approval: int = 0
    days_rejection: int = 0
    active: bool = True


def integration_to_dict(i: Integration, bank_name: Optional[str] = None) -> dict:
    try:
        config = json.loads(i.config or "{}")
    except Exception:
        config = {}
    return {
        "id": i.id,
        "bank_id": i.bank_id,
        "bank_name": bank_name,
        "type": i.type,
        "api_url": i.api_url,
        "api_key": i.api_key,
        "username": i.username,
        "status": i.status,
        "last_sync": i.last_sync.isoformat() if i.last_sync else None,
        "config": config,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
    }


def pipeline_to_dict(p: PipelineConfig) -> dict:
    return {
        "id": p.id,
        "bank_id": p.bank_id,
        "days_import": p.days_import,
        "days_analysis": p.days_analysis,
        "days_checklist": p.days_checklist,
        "days_approval": p.days_approval,
        "days_rejection": p.days_rejection,
        "active": p.active,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("/")
async def list_integrations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integrations = db.query(Integration).all()
    result = []
    for i in integrations:
        bank = db.query(Bank).filter(Bank.id == i.bank_id).first()
        bank_name = bank.name if bank else None
        result.append(integration_to_dict(i, bank_name))
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_integration(
    body: IntegrationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = Integration(
        id=str(uuid.uuid4()),
        bank_id=body.bank_id,
        type=body.type,
        api_url=body.api_url,
        api_key=body.api_key,
        username=body.username,
        password=body.password,
        status=body.status,
        config=json.dumps(body.config),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)

    audit_log(
        db, current_user.id, current_user.name,
        "CREATE_INTEGRATION", "integrations",
        entity_id=integration.id, entity_type="Integration",
    )

    bank = db.query(Bank).filter(Bank.id == integration.bank_id).first()
    return integration_to_dict(integration, bank.name if bank else None)


@router.put("/{integration_id}")
async def update_integration(
    integration_id: str,
    body: IntegrationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.query(Integration).filter(Integration.id == integration_id).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integração não encontrada")

    update_data = body.model_dump(exclude_unset=True)
    if "config" in update_data:
        update_data["config"] = json.dumps(update_data["config"])

    for field, value in update_data.items():
        setattr(integration, field, value)
    integration.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(integration)

    bank = db.query(Bank).filter(Bank.id == integration.bank_id).first()
    return integration_to_dict(integration, bank.name if bank else None)


@router.patch("/{integration_id}/test")
async def test_integration(
    integration_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.query(Integration).filter(Integration.id == integration_id).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integração não encontrada")

    # Simulate connection test
    success = random.random() > 0.2  # 80% success rate for simulation

    if success:
        integration.last_sync = datetime.utcnow()
        integration.status = "ativo"
        db.commit()
        return {"success": True, "message": "Conexão estabelecida com sucesso"}
    else:
        return {"success": False, "message": "Falha ao conectar: tempo de conexão esgotado"}


@router.get("/pipeline-configs")
async def list_pipeline_configs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    configs = db.query(PipelineConfig).all()
    return [pipeline_to_dict(c) for c in configs]


@router.post("/pipeline-configs", status_code=status.HTTP_201_CREATED)
async def upsert_pipeline_config(
    body: PipelineConfigCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    existing = db.query(PipelineConfig).filter(PipelineConfig.bank_id == body.bank_id).first()
    if existing:
        existing.days_import = body.days_import
        existing.days_analysis = body.days_analysis
        existing.days_checklist = body.days_checklist
        existing.days_approval = body.days_approval
        existing.days_rejection = body.days_rejection
        existing.active = body.active
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return pipeline_to_dict(existing)

    config = PipelineConfig(
        id=str(uuid.uuid4()),
        bank_id=body.bank_id,
        days_import=body.days_import,
        days_analysis=body.days_analysis,
        days_checklist=body.days_checklist,
        days_approval=body.days_approval,
        days_rejection=body.days_rejection,
        active=body.active,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    return pipeline_to_dict(config)
