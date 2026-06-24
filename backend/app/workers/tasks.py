"""
Celery background tasks for async processing.

Tasks cover:
- StormFin data sync (contratos, colaboradores → local DB)
- Antifraud batch processing
- Large file imports
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime

import structlog

from .celery_app import celery_app
from ..config import settings
from ..database import SessionLocal
from ..services.stormfin import stormfin as storm_service

logger = structlog.get_logger()


def _run(coro):
    """Run an async coroutine from a sync Celery task."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


# ---------------------------------------------------------------------------
# StormFin sync tasks
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60, name="tasks.sync_stormfin_contratos")
def sync_stormfin_contratos(self, pagina: int = 1, filtros: dict | None = None):
    """
    Pull contracts from StormFin and upsert them into the local proposals table.
    """
    from ..models.proposal import Proposal

    username = settings.STORMFIN_USERNAME
    password = settings.STORMFIN_PASSWORD
    if not username or not password:
        logger.error("sync_stormfin_contratos_no_creds")
        return {"ok": False, "error": "Credenciais StormFin não configuradas"}

    try:
        result = _run(storm_service.get_contratos(username, password, pagina=pagina, filtros=filtros or {}))
        if not result.get("ok"):
            raise Exception(result.get("error", "Erro na API StormFin"))

        data = result["data"]
        items = data if isinstance(data, list) else data.get("items") or data.get("data") or []

        db = SessionLocal()
        synced = 0
        try:
            for item in items:
                ff = str(item.get("ff") or item.get("id") or "")
                if not ff:
                    continue
                # Upsert by code (ff)
                proposal = db.query(Proposal).filter(Proposal.code == ff).first()
                if not proposal:
                    proposal = Proposal(
                        id=str(uuid.uuid4()),
                        code=ff,
                        cpf=str(item.get("cpf") or ""),
                        client_name=str(item.get("cliente") or item.get("nome") or item.get("client_name") or ""),
                        value=float(item.get("valor") or item.get("value") or 0),
                        status=str(item.get("status") or "Digitado"),
                        antifraud_status=str(item.get("status_antifraude") or "Nao Analisado"),
                        documents=json.dumps([]),
                        history=json.dumps([]),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    db.add(proposal)
                else:
                    proposal.status = str(item.get("status") or proposal.status)
                    proposal.value = float(item.get("valor") or item.get("value") or proposal.value)
                    proposal.updated_at = datetime.utcnow()
                synced += 1

            db.commit()
            logger.info("sync_stormfin_contratos_done", synced=synced, pagina=pagina)
            return {"ok": True, "synced": synced, "pagina": pagina}
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    except Exception as exc:
        logger.error("sync_stormfin_contratos_failed", error=str(exc), pagina=pagina)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60, name="tasks.sync_stormfin_colaboradores")
def sync_stormfin_colaboradores(self, pagina: int = 1):
    """
    Pull collaborators from StormFin and upsert into the local brokers table.
    """
    from ..models.broker import Broker

    username = settings.STORMFIN_USERNAME
    password = settings.STORMFIN_PASSWORD
    if not username or not password:
        logger.error("sync_stormfin_colaboradores_no_creds")
        return {"ok": False, "error": "Credenciais StormFin não configuradas"}

    try:
        result = _run(storm_service.get_colaboradores(username, password, pagina=pagina))
        if not result.get("ok"):
            raise Exception(result.get("error", "Erro na API StormFin"))

        data = result["data"]
        items = data if isinstance(data, list) else data.get("items") or data.get("data") or []

        db = SessionLocal()
        synced = 0
        try:
            for item in items:
                storm_id = str(item.get("id") or "")
                username_col = str(item.get("usuario") or item.get("username") or storm_id)
                nome = str(item.get("nome") or item.get("name") or username_col)
                if not storm_id:
                    continue

                broker = db.query(Broker).filter(Broker.code == storm_id).first()
                if not broker:
                    existing_cpf = db.query(Broker).filter(Broker.cpf_cnpj == storm_id).first()
                    if not existing_cpf:
                        broker = Broker(
                            id=str(uuid.uuid4()),
                            code=storm_id,
                            name=nome,
                            cpf_cnpj=storm_id,
                            type=str(item.get("privilegio") or item.get("tipo") or "Externo"),
                            status="ativo" if str(item.get("status") or "").lower() in ("ativo", "1", "active") else "inativo",
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow(),
                        )
                        db.add(broker)
                        synced += 1
                else:
                    broker.name = nome
                    broker.status = "ativo" if str(item.get("status") or "").lower() in ("ativo", "1", "active") else "inativo"
                    broker.updated_at = datetime.utcnow()
                    synced += 1

            db.commit()
            logger.info("sync_stormfin_colaboradores_done", synced=synced)
            return {"ok": True, "synced": synced}
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    except Exception as exc:
        logger.error("sync_stormfin_colaboradores_failed", error=str(exc))
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Antifraud processing task
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=2, default_retry_delay=30, name="tasks.process_antifraud_check")
def process_antifraud_check(self, proposal_id: str, analyst_id: str | None = None):
    """
    Run antifraud checks on a proposal and update its antifraud_status.
    Checks: blacklist (CPF, phone, email), duplicate proposals.
    """
    from ..models.proposal import Proposal
    from ..models.blacklist import BlacklistEntry
    from ..models.antifraud import AntifraudAnalysis

    db = SessionLocal()
    try:
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            logger.error("process_antifraud_check_not_found", proposal_id=proposal_id)
            return {"ok": False, "error": "Proposta não encontrada"}

        flags = []

        # Check CPF against blacklist
        if proposal.cpf:
            cpf_clean = proposal.cpf.replace(".", "").replace("-", "").replace("/", "").strip()
            bl = db.query(BlacklistEntry).filter(
                BlacklistEntry.value == cpf_clean,
                BlacklistEntry.status == "ativo"
            ).first()
            if bl:
                flags.append(f"CPF {cpf_clean} na blacklist ({bl.reason or 'sem motivo'})")

        # Check duplicate proposals by CPF
        if proposal.cpf:
            duplicates = db.query(Proposal).filter(
                Proposal.cpf == proposal.cpf,
                Proposal.id != proposal.id,
                Proposal.status.in_(["Aprovada", "Averbada", "Pago"]),
            ).count()
            if duplicates > 0:
                flags.append(f"CPF com {duplicates} proposta(s) aprovada(s) anteriores")

        # Update antifraud_status
        if flags:
            proposal.antifraud_status = "Suspeita de Antifraude"
            notes = " | ".join(flags)
        else:
            proposal.antifraud_status = "Aprovada"
            notes = "Verificação automática concluída sem pendências"

        proposal.updated_at = datetime.utcnow()

        analysis = AntifraudAnalysis(
            id=str(uuid.uuid4()),
            proposal_id=proposal_id,
            analyst_id=analyst_id or "sistema",
            status=proposal.antifraud_status,
            notes=notes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(analysis)
        db.commit()

        logger.info("process_antifraud_check_done", proposal_id=proposal_id,
                    status=proposal.antifraud_status, flags=len(flags))
        return {"ok": True, "status": proposal.antifraud_status, "flags": flags}

    except Exception as exc:
        db.rollback()
        logger.error("process_antifraud_check_failed", proposal_id=proposal_id, error=str(exc))
        raise self.retry(exc=exc)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Bulk import task (async large file processing)
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=1, name="tasks.bulk_import_proposals")
def bulk_import_proposals(self, rows: list[dict], imported_by: str):
    """
    Process a list of proposal rows in the background.
    Called after the upload endpoint parses the file.
    """
    from ..models.proposal import Proposal

    db = SessionLocal()
    inserted = skipped = 0
    errors = []
    try:
        for i, row in enumerate(rows, start=2):
            code = row.get("codigo") or row.get("code") or row.get("proposta") or ""
            cpf = row.get("cpf") or row.get("documento") or ""
            client_name = row.get("nome") or row.get("cliente") or row.get("client_name") or ""

            if not code or not cpf or not client_name:
                errors.append(f"Linha {i}: campos obrigatórios ausentes")
                skipped += 1
                continue

            if db.query(Proposal).filter(Proposal.code == code).first():
                skipped += 1
                continue

            try:
                value = float(row.get("valor") or row.get("value") or 0)
            except (ValueError, TypeError):
                value = 0.0

            db.add(Proposal(
                id=str(uuid.uuid4()),
                code=code, cpf=cpf, client_name=client_name,
                value=value,
                status=row.get("status") or "Pendente",
                antifraud_status="Nao Analisado",
                import_date=datetime.utcnow(),
                documents=json.dumps([]), history=json.dumps([]),
                imported_by=imported_by, created_by=imported_by,
                created_at=datetime.utcnow(), updated_at=datetime.utcnow(),
            ))
            inserted += 1

            # Commit in batches of 100
            if inserted % 100 == 0:
                db.commit()

        db.commit()
        logger.info("bulk_import_proposals_done", inserted=inserted, skipped=skipped)
        return {"ok": True, "inserted": inserted, "skipped": skipped, "errors": errors}
    except Exception as exc:
        db.rollback()
        logger.error("bulk_import_proposals_failed", error=str(exc))
        return {"ok": False, "error": str(exc), "inserted": inserted, "skipped": skipped}
    finally:
        db.close()
