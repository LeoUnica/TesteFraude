import uuid
import json
from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.bank import Bank
from ...core.audit import audit_log
from ...api.deps import get_current_user
from ...models.user import User

router = APIRouter(prefix="/banks", tags=["banks"])


class BankCreate(BaseModel):
    code: str
    name: str
    status: str = "ativo"
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    has_import_phase: bool = True
    has_analysis_phase: bool = True
    has_checklist_phase: bool = True
    has_approval_phase: bool = True
    has_rejection_phase: bool = True
    import_user: Optional[str] = None
    approval_user: Optional[str] = None


class BankUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    has_import_phase: Optional[bool] = None
    has_analysis_phase: Optional[bool] = None
    has_checklist_phase: Optional[bool] = None
    has_approval_phase: Optional[bool] = None
    has_rejection_phase: Optional[bool] = None
    import_user: Optional[str] = None
    approval_user: Optional[str] = None


def bank_to_dict(b: Bank) -> dict:
    return {
        "id": b.id,
        "code": b.code,
        "name": b.name,
        "status": b.status,
        "api_url": b.api_url,
        "api_key": b.api_key,
        "username": b.username,
        "has_import_phase": b.has_import_phase,
        "has_analysis_phase": b.has_analysis_phase,
        "has_checklist_phase": b.has_checklist_phase,
        "has_approval_phase": b.has_approval_phase,
        "has_rejection_phase": b.has_rejection_phase,
        "import_user": b.import_user,
        "approval_user": b.approval_user,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
        "created_by": b.created_by,
    }


@router.get("/")
async def list_banks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status_filter: Optional[str] = Query(None, alias="status"),
):
    query = db.query(Bank)
    if status_filter:
        query = query.filter(Bank.status == status_filter)
    banks = query.order_by(Bank.name).all()
    return [bank_to_dict(b) for b in banks]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_bank(
    body: BankCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    existing = db.query(Bank).filter(Bank.code == body.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Código já cadastrado")

    bank = Bank(
        id=str(uuid.uuid4()),
        code=body.code,
        name=body.name,
        status=body.status,
        api_url=body.api_url,
        api_key=body.api_key,
        username=body.username,
        password=body.password,
        has_import_phase=body.has_import_phase,
        has_analysis_phase=body.has_analysis_phase,
        has_checklist_phase=body.has_checklist_phase,
        has_approval_phase=body.has_approval_phase,
        has_rejection_phase=body.has_rejection_phase,
        import_user=body.import_user,
        approval_user=body.approval_user,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(bank)
    db.commit()
    db.refresh(bank)

    audit_log(
        db, current_user.id, current_user.name,
        "CREATE_BANK", "banks", entity_id=bank.id, entity_type="Bank",
        new_value=json.dumps({"name": bank.name, "code": bank.code}),
    )

    return bank_to_dict(bank)


@router.put("/{bank_id}")
async def update_bank(
    bank_id: str,
    body: BankUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Banco não encontrado")

    old_data = bank_to_dict(bank)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(bank, field, value)
    bank.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(bank)

    audit_log(
        db, current_user.id, current_user.name,
        "UPDATE_BANK", "banks", entity_id=bank.id, entity_type="Bank",
        old_value=json.dumps(old_data), new_value=json.dumps(bank_to_dict(bank)),
    )

    return bank_to_dict(bank)


@router.patch("/{bank_id}/toggle-status")
async def toggle_bank_status(
    bank_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Banco não encontrado")

    bank.status = "inativo" if bank.status == "ativo" else "ativo"
    bank.updated_at = datetime.utcnow()
    db.commit()

    audit_log(
        db, current_user.id, current_user.name,
        "TOGGLE_BANK_STATUS", "banks", entity_id=bank.id, entity_type="Bank",
        new_value=json.dumps({"status": bank.status}),
    )

    return bank_to_dict(bank)
