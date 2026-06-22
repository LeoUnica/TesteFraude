import uuid
import json
from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.antifraud import AntifraudRule, AntifraudAnalysis
from ...models.proposal import Proposal
from ...models.bank import Bank
from ...core.audit import audit_log
from ...api.deps import get_current_user
from ...models.user import User

router = APIRouter(prefix="/antifraud", tags=["antifraud"])

ANTIFRAUD_QUEUE_STATUSES = [
    "Nao Analisado",
    "Suspeita de Antifraude",
    "Em Analise",
]


class RuleCreate(BaseModel):
    priority: int = 1
    pending_type: Optional[str] = None
    bank_id: Optional[str] = None
    group_id: Optional[str] = None
    convenio_id: Optional[str] = None
    product_id: Optional[str] = None
    action: str = "sinalizar"
    status: str = "ativo"
    description: Optional[str] = None


class RuleUpdate(BaseModel):
    priority: Optional[int] = None
    pending_type: Optional[str] = None
    bank_id: Optional[str] = None
    group_id: Optional[str] = None
    convenio_id: Optional[str] = None
    product_id: Optional[str] = None
    action: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class AnalysisCreate(BaseModel):
    proposal_id: str
    rule_id: Optional[str] = None
    analyst_id: Optional[str] = None
    status: str
    notes: Optional[str] = None
    schedule_date: Optional[datetime] = None


def rule_to_dict(r: AntifraudRule) -> dict:
    return {
        "id": r.id,
        "priority": r.priority,
        "pending_type": r.pending_type,
        "bank_id": r.bank_id,
        "group_id": r.group_id,
        "convenio_id": r.convenio_id,
        "product_id": r.product_id,
        "action": r.action,
        "status": r.status,
        "description": r.description,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "created_by": r.created_by,
    }


def analysis_to_dict(a: AntifraudAnalysis) -> dict:
    return {
        "id": a.id,
        "proposal_id": a.proposal_id,
        "rule_id": a.rule_id,
        "analyst_id": a.analyst_id,
        "status": a.status,
        "notes": a.notes,
        "schedule_date": a.schedule_date.isoformat() if a.schedule_date else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


# Rules endpoints
@router.get("/rules")
async def list_rules(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rules = db.query(AntifraudRule).order_by(AntifraudRule.priority).all()
    return [rule_to_dict(r) for r in rules]


@router.post("/rules", status_code=status.HTTP_201_CREATED)
async def create_rule(
    body: RuleCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rule = AntifraudRule(
        id=str(uuid.uuid4()),
        priority=body.priority,
        pending_type=body.pending_type,
        bank_id=body.bank_id,
        group_id=body.group_id,
        convenio_id=body.convenio_id,
        product_id=body.product_id,
        action=body.action,
        status=body.status,
        description=body.description,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    audit_log(
        db, current_user.id, current_user.name,
        "CREATE_ANTIFRAUD_RULE", "antifraud", entity_id=rule.id, entity_type="AntifraudRule",
    )

    return rule_to_dict(rule)


@router.put("/rules/{rule_id}")
async def update_rule(
    rule_id: str,
    body: RuleUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rule = db.query(AntifraudRule).filter(AntifraudRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")

    old_data = rule_to_dict(rule)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    rule.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(rule)

    audit_log(
        db, current_user.id, current_user.name,
        "UPDATE_ANTIFRAUD_RULE", "antifraud", entity_id=rule.id, entity_type="AntifraudRule",
        old_value=json.dumps(old_data), new_value=json.dumps(rule_to_dict(rule)),
    )

    return rule_to_dict(rule)


@router.patch("/rules/{rule_id}/toggle")
async def toggle_rule_status(
    rule_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rule = db.query(AntifraudRule).filter(AntifraudRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")

    rule.status = "inativo" if rule.status == "ativo" else "ativo"
    rule.updated_at = datetime.utcnow()
    db.commit()

    return rule_to_dict(rule)


@router.post("/rules/{rule_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_rule(
    rule_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rule = db.query(AntifraudRule).filter(AntifraudRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")

    max_priority = db.query(AntifraudRule).count()
    new_rule = AntifraudRule(
        id=str(uuid.uuid4()),
        priority=max_priority + 1,
        pending_type=rule.pending_type,
        bank_id=rule.bank_id,
        group_id=rule.group_id,
        convenio_id=rule.convenio_id,
        product_id=rule.product_id,
        action=rule.action,
        status="inativo",
        description=f"Cópia de: {rule.description or ''}",
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    audit_log(
        db, current_user.id, current_user.name,
        "DUPLICATE_ANTIFRAUD_RULE", "antifraud", entity_id=new_rule.id, entity_type="AntifraudRule",
    )

    return rule_to_dict(new_rule)


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rule = db.query(AntifraudRule).filter(AntifraudRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")

    db.delete(rule)
    db.commit()

    audit_log(
        db, current_user.id, current_user.name,
        "DELETE_ANTIFRAUD_RULE", "antifraud", entity_id=rule_id, entity_type="AntifraudRule",
    )

    return {"message": "Regra excluída com sucesso"}


def _build_proposal_dict(p: Proposal, banks: dict, last_analyses: dict) -> dict:
    last_a = last_analyses.get(p.id)
    return {
        "id": p.id,
        "code": p.code,
        "cpf": p.cpf,
        "client_name": p.client_name,
        "bank_id": p.bank_id,
        "bank_name": banks.get(p.bank_id, "") if p.bank_id else "",
        "broker_id": p.broker_id,
        "convenio_id": p.convenio_id,
        "value": p.value,
        "status": p.status,
        "antifraud_status": p.antifraud_status,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "last_notes": last_a.notes if last_a else "",
    }


def _bulk_lookups(proposals: list, db: Session) -> tuple[dict, dict]:
    bank_ids = {p.bank_id for p in proposals if p.bank_id}
    banks = {b.id: b.name for b in db.query(Bank).filter(Bank.id.in_(bank_ids)).all()} if bank_ids else {}

    proposal_ids = [p.id for p in proposals]
    last_analyses: dict = {}
    if proposal_ids:
        rows = (
            db.query(AntifraudAnalysis)
            .filter(AntifraudAnalysis.proposal_id.in_(proposal_ids))
            .order_by(AntifraudAnalysis.created_at.desc())
            .all()
        )
        for a in rows:
            if a.proposal_id not in last_analyses:
                last_analyses[a.proposal_id] = a
    return banks, last_analyses


# Queue and analyses endpoints
@router.get("/queue")
async def get_antifraud_queue(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = db.query(Proposal).filter(Proposal.antifraud_status.in_(ANTIFRAUD_QUEUE_STATUSES))
    total = query.count()
    proposals = (
        query.order_by(Proposal.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    banks, last_analyses = _bulk_lookups(proposals, db)
    return {
        "data": [_build_proposal_dict(p, banks, last_analyses) for p in proposals],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/proposals")
async def list_proposals_by_antifraud_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    antifraud_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(200, ge=1, le=1000),
):
    query = db.query(Proposal)
    if antifraud_status:
        query = query.filter(Proposal.antifraud_status == antifraud_status)
    total = query.count()
    proposals = (
        query.order_by(Proposal.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    banks, last_analyses = _bulk_lookups(proposals, db)
    return {
        "data": [_build_proposal_dict(p, banks, last_analyses) for p in proposals],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/analyses")
async def list_analyses(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = db.query(AntifraudAnalysis).order_by(AntifraudAnalysis.created_at.desc())
    total = query.count()
    analyses = query.offset((page - 1) * per_page).limit(per_page).all()

    results = []
    for a in analyses:
        d = analysis_to_dict(a)
        proposal = db.query(Proposal).filter(Proposal.id == a.proposal_id).first()
        if proposal:
            d["proposal_code"] = proposal.code
            d["client_name"] = proposal.client_name
            d["cpf"] = proposal.cpf
        results.append(d)

    return {
        "data": results,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.post("/analyses", status_code=status.HTTP_201_CREATED)
async def create_analysis(
    body: AnalysisCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    proposal = db.query(Proposal).filter(Proposal.id == body.proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")

    analysis = AntifraudAnalysis(
        id=str(uuid.uuid4()),
        proposal_id=body.proposal_id,
        rule_id=body.rule_id,
        analyst_id=body.analyst_id or current_user.id,
        status=body.status,
        notes=body.notes,
        schedule_date=body.schedule_date,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(analysis)

    proposal.antifraud_status = body.status
    proposal.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(analysis)

    audit_log(
        db, current_user.id, current_user.name,
        "CREATE_ANTIFRAUD_ANALYSIS", "antifraud",
        entity_id=analysis.id, entity_type="AntifraudAnalysis",
        new_value=json.dumps({"proposal_id": body.proposal_id, "status": body.status}),
    )

    return analysis_to_dict(analysis)
