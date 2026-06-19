from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.proposal import Proposal
from ...models.broker import Broker
from ...models.antifraud import AntifraudRule
from ...api.deps import get_current_user
from ...models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
async def get_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    total_proposals = db.query(func.count(Proposal.id)).scalar() or 0
    approved_auto = (
        db.query(func.count(Proposal.id))
        .filter(Proposal.antifraud_status == "Aprovada no Banco")
        .scalar() or 0
    )
    rejected = (
        db.query(func.count(Proposal.id))
        .filter(Proposal.antifraud_status == "Reprovar no Banco")
        .scalar() or 0
    )
    fraud_suspect = (
        db.query(func.count(Proposal.id))
        .filter(Proposal.antifraud_status == "Suspeita de Antifraude")
        .scalar() or 0
    )
    in_analysis = (
        db.query(func.count(Proposal.id))
        .filter(Proposal.antifraud_status == "Em Analise")
        .scalar() or 0
    )
    endorsed = (
        db.query(func.count(Proposal.id))
        .filter(Proposal.endorsement_date.isnot(None))
        .scalar() or 0
    )
    not_mapped = (
        db.query(func.count(Proposal.id))
        .filter(Proposal.antifraud_status == "Nao Mapeada")
        .scalar() or 0
    )
    scheduled = (
        db.query(func.count(Proposal.id))
        .filter(Proposal.antifraud_status == "Agendar para acompanhamento")
        .scalar() or 0
    )
    total_brokers = (
        db.query(func.count(Broker.id))
        .filter(Broker.status == "ativo")
        .scalar() or 0
    )
    total_rules = (
        db.query(func.count(AntifraudRule.id))
        .filter(AntifraudRule.status == "ativo")
        .scalar() or 0
    )

    # Charts
    twelve_months_ago = datetime.utcnow() - timedelta(days=365)

    # By month (last 12 months)
    by_month_rows = (
        db.query(
            extract("year", Proposal.created_at).label("year"),
            extract("month", Proposal.created_at).label("month"),
            func.count(Proposal.id).label("count"),
        )
        .filter(Proposal.created_at >= twelve_months_ago)
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )
    by_month = [
        {"year": int(r.year), "month": int(r.month), "count": r.count}
        for r in by_month_rows
    ]

    # By status
    by_status_rows = (
        db.query(Proposal.status, func.count(Proposal.id).label("count"))
        .group_by(Proposal.status)
        .all()
    )
    by_status = [{"status": r.status, "count": r.count} for r in by_status_rows]

    # By antifraud status
    by_antifraud_rows = (
        db.query(Proposal.antifraud_status, func.count(Proposal.id).label("count"))
        .group_by(Proposal.antifraud_status)
        .all()
    )
    by_antifraud = [{"status": r.antifraud_status, "count": r.count} for r in by_antifraud_rows]

    # By bank (top 10)
    by_bank_rows = (
        db.query(Proposal.bank_id, func.count(Proposal.id).label("count"))
        .filter(Proposal.bank_id.isnot(None))
        .group_by(Proposal.bank_id)
        .order_by(func.count(Proposal.id).desc())
        .limit(10)
        .all()
    )
    by_bank = [{"bank_id": r.bank_id, "count": r.count} for r in by_bank_rows]

    # By convenio (top 10)
    by_convenio_rows = (
        db.query(Proposal.convenio_id, func.count(Proposal.id).label("count"))
        .filter(Proposal.convenio_id.isnot(None))
        .group_by(Proposal.convenio_id)
        .order_by(func.count(Proposal.id).desc())
        .limit(10)
        .all()
    )
    by_convenio = [{"convenio_id": r.convenio_id, "count": r.count} for r in by_convenio_rows]

    # By broker (top 10)
    by_broker_rows = (
        db.query(Proposal.broker_id, func.count(Proposal.id).label("count"))
        .filter(Proposal.broker_id.isnot(None))
        .group_by(Proposal.broker_id)
        .order_by(func.count(Proposal.id).desc())
        .limit(10)
        .all()
    )
    by_broker = [{"broker_id": r.broker_id, "count": r.count} for r in by_broker_rows]

    return {
        "totalProposals": total_proposals,
        "approvedAuto": approved_auto,
        "rejected": rejected,
        "fraudSuspect": fraud_suspect,
        "inAnalysis": in_analysis,
        "endorsed": endorsed,
        "notMapped": not_mapped,
        "scheduled": scheduled,
        "totalBrokers": total_brokers,
        "totalRules": total_rules,
        "charts": {
            "byMonth": by_month,
            "byStatus": by_status,
            "byAntifraud": by_antifraud,
            "byBank": by_bank,
            "byConvenio": by_convenio,
            "byBroker": by_broker,
        },
    }
