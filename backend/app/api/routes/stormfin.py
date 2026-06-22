"""
StormFin API router.

All endpoints require authentication via `get_current_user`.
Credentials for StormFin are fetched from the Integration table
(type='stormfin', status='ativo') with fallback to the .env settings.

NOTE: StormFin refers to "corretores" as "colaboradores".
      On the frontend these must be shown as "colaborador", not "parceiro".
"""
from __future__ import annotations

import json
from typing import Annotated, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...api.deps import get_current_user
from ...config import settings
from ...database import get_db
from ...models.integration import Integration
from ...models.user import User
from ...services.stormfin import stormfin

logger = structlog.get_logger()

router = APIRouter(prefix="/stormfin", tags=["stormfin"])


# ---------------------------------------------------------------------------
# Credential helper
# ---------------------------------------------------------------------------

async def get_storm_creds(db: Session) -> tuple[str, str]:
    """
    Retrieve StormFin credentials.

    Priority:
    1. Integration row with type='stormfin' and status='ativo' (config JSON field).
    2. STORMFIN_USERNAME / STORMFIN_PASSWORD from .env / settings.

    Raises HTTP 503 if no credentials are available.
    """
    integration = (
        db.query(Integration)
        .filter(Integration.type == "stormfin", Integration.status == "ativo")
        .first()
    )

    if integration:
        try:
            cfg = json.loads(integration.config or "{}")
            username: str = cfg.get("username") or ""
            password: str = cfg.get("password") or ""
            if username and password:
                return username, password
        except Exception:
            pass

    # Fallback to .env
    username = settings.STORMFIN_USERNAME
    password = settings.STORMFIN_PASSWORD

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Credenciais StormFin não configuradas. "
                "Configure uma Integração do tipo 'stormfin' com status 'ativo'."
            ),
        )

    return username, password


# ---------------------------------------------------------------------------
# Pydantic models for request bodies
# ---------------------------------------------------------------------------

class TestarConexaoBody(BaseModel):
    username: str
    password: str


class SalvarCredsBody(BaseModel):
    username: str
    password: Optional[str] = None


class RecusarBody(BaseModel):
    motivo_id: str


class PendenciarBody(BaseModel):
    tipo_id: str


# ---------------------------------------------------------------------------
# Endpoints — Conexão / status
# ---------------------------------------------------------------------------

@router.post("/salvar-credenciais")
async def salvar_credenciais(
    body: SalvarCredsBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Salva (upsert) credenciais StormFin na tabela Integration, preservando a senha atual se não for enviada."""
    import uuid
    from datetime import datetime
    existing = db.query(Integration).filter(Integration.type == "stormfin").first()
    if existing:
        try:
            cfg = json.loads(existing.config or "{}")
        except Exception:
            cfg = {}
        cfg["username"] = body.username
        if body.password:
            cfg["password"] = body.password
        existing.config = json.dumps(cfg)
        existing.status = "ativo"
        existing.updated_at = datetime.utcnow()
        db.commit()
        return {"id": existing.id, "message": "Credenciais atualizadas"}
    else:
        if not body.password:
            raise HTTPException(status_code=400, detail="Senha obrigatória no primeiro cadastro")
        cfg = {"username": body.username, "password": body.password}
        integ = Integration(
            id=str(uuid.uuid4()),
            type="stormfin",
            status="ativo",
            config=json.dumps(cfg),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(integ)
        db.commit()
        return {"id": integ.id, "message": "Credenciais salvas"}


@router.post("/testar-conexao")
async def testar_conexao(
    body: TestarConexaoBody,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Testa conectividade com a API StormFin usando as credenciais fornecidas
    diretamente no body (usado na tela de configuração de integração).
    """
    result = await stormfin.test_connection(body.username, body.password)
    return result


@router.get("/status")
async def status_conexao(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Testa conectividade com a API StormFin e retorna o usuário configurado.
    """
    try:
        username, password = await get_storm_creds(db)
    except HTTPException:
        return {"ok": False, "connected": False, "username": None, "error": "Credenciais não configuradas"}

    result = await stormfin.test_connection(username, password)
    result["connected"] = result.get("ok", False)
    result["username"] = username
    return result


# ---------------------------------------------------------------------------
# Endpoints — Colaboradores
# ---------------------------------------------------------------------------

@router.get("/colaboradores")
async def listar_colaboradores(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    pagina: int = Query(default=1, ge=1),
    usuario: Optional[str] = Query(default=None),
    status_col: Optional[str] = Query(default=None, alias="status"),
):
    """
    Lista colaboradores no StormFin (corretores cadastrados no CRM).
    No frontend estes devem ser exibidos como "colaborador".
    """
    username, password = await get_storm_creds(db)
    filtros: dict = {}
    if usuario:
        filtros["usuario"] = usuario
    if status_col:
        filtros["status"] = status_col
    result = await stormfin.get_colaboradores(username, password, pagina=pagina, filtros=filtros)
    return result


@router.get("/colaboradores/{id}")
async def detalhe_colaborador(
    id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna dados detalhados de um colaborador pelo ID StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.get_colaborador(username, password, id=id)
    return result


# ---------------------------------------------------------------------------
# Endpoints — Contratos
# ---------------------------------------------------------------------------

@router.get("/contratos")
async def listar_contratos(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    pagina: int = Query(default=1, ge=1),
    cpf: Optional[str] = Query(default=None),
    ff: Optional[str] = Query(default=None),
    status_id: Optional[str] = Query(default=None),
    data_inicio: Optional[str] = Query(default=None),
    data_fim: Optional[str] = Query(default=None),
):
    """Lista contratos no StormFin com filtros opcionais."""
    username, password = await get_storm_creds(db)
    filtros: dict = {}
    if cpf:
        filtros["cpf"] = cpf
    if ff:
        filtros["ff"] = ff
    if status_id:
        filtros["status_id"] = status_id
    if data_inicio:
        filtros["data_inicio"] = data_inicio
    if data_fim:
        filtros["data_fim"] = data_fim
    result = await stormfin.get_contratos(username, password, pagina=pagina, filtros=filtros)
    return result


@router.get("/contratos/{ff}/acompanhamento")
async def acompanhar_contrato(
    ff: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna o acompanhamento/tracking de um contrato pelo número FF."""
    username, password = await get_storm_creds(db)
    result = await stormfin.acompanhar_contrato(username, password, ff=ff)
    return result


@router.get("/contratos/{ff}/historico")
async def historico_contrato(
    ff: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna o histórico de movimentações de um contrato pelo número FF."""
    username, password = await get_storm_creds(db)
    result = await stormfin.get_historico_contrato(username, password, ff=ff)
    return result


# ---------------------------------------------------------------------------
# Endpoints — Antifraude Storm
# ---------------------------------------------------------------------------

@router.get("/antifraude")
async def listar_antifraude(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Lista contratos na fila de antifraude do StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.listar_antifraude(username, password)
    return result


@router.get("/antifraude/tipos-recusa")
async def tipos_recusa(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna os tipos de recusa disponíveis no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.get_tipos_recusa(username, password)
    return result


@router.get("/antifraude/tipos-pendencia")
async def tipos_pendencia(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna os tipos de pendência disponíveis no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.get_tipos_pendencia(username, password)
    return result


@router.post("/antifraude/{contrato_id}/aprovar")
async def aprovar_antifraude(
    contrato_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Aprova um contrato no módulo antifraude do StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.aprovar_antifraude(username, password, contrato_id=contrato_id)
    return result


@router.post("/antifraude/{contrato_id}/recusar")
async def recusar_antifraude(
    contrato_id: str,
    body: RecusarBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Recusa um contrato no módulo antifraude do StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.recusar_antifraude(
        username, password, contrato_id=contrato_id, motivo=body.motivo_id
    )
    return result


@router.post("/antifraude/{contrato_id}/pendenciar")
async def pendenciar_antifraude(
    contrato_id: str,
    body: PendenciarBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Pendencia um contrato no módulo antifraude do StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.pendenciar_antifraude(
        username, password, contrato_id=contrato_id, tipo=body.tipo_id
    )
    return result


@router.post("/antifraude/{contrato_id}/reanalisar")
async def reanalisar_antifraude(
    contrato_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Devolve um contrato para análise no módulo antifraude do StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.reanalisar_antifraude(username, password, contrato_id=contrato_id)
    return result


# ---------------------------------------------------------------------------
# Endpoints — Clientes
# ---------------------------------------------------------------------------

@router.get("/clientes/cpf/{cpf}")
async def buscar_cliente_cpf(
    cpf: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Busca um cliente por CPF no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.buscar_cliente_cpf(username, password, cpf=cpf)
    return result


@router.get("/clientes/telefone/{telefone}")
async def buscar_cliente_telefone(
    telefone: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Busca um cliente por telefone no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.buscar_cliente_telefone(username, password, telefone=telefone)
    return result


# ---------------------------------------------------------------------------
# Endpoints — Dados de referência
# ---------------------------------------------------------------------------

@router.get("/bancos")
async def listar_bancos(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Lista os bancos ativos cadastrados no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.get_bancos(username, password)
    return result


@router.get("/orgaos")
async def listar_orgaos(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Lista os convênios/órgãos cadastrados no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.get_orgaos(username, password)
    return result


@router.get("/status-contratos")
async def listar_status_contratos(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Lista os tipos de status de contratos disponíveis no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.get_status_contratos(username, password)
    return result


# ---------------------------------------------------------------------------
# Endpoints — Simulações
# ---------------------------------------------------------------------------

@router.get("/simular/fgts")
async def simular_fgts(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    cpf: str = Query(...),
    banco_id: str = Query(...),
):
    """Executa uma simulação FGTS no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.simular_fgts(username, password, cpf=cpf, banco_id=banco_id)
    return result


@router.get("/simular/clt")
async def simular_clt(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    cpf: str = Query(...),
    banco_id: str = Query(...),
):
    """Executa uma simulação CLT no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.simular_clt(username, password, cpf=cpf, banco_id=banco_id)
    return result


# ---------------------------------------------------------------------------
# Endpoints — Esteira
# ---------------------------------------------------------------------------

@router.get("/esteira")
async def listar_esteira(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status_id: str = Query(...),
    esteira: str = Query(...),
    periodo: str = Query(...),
):
    """Consulta a esteira (fila de trabalho) no StormFin."""
    username, password = await get_storm_creds(db)
    result = await stormfin.get_esteira(
        username, password,
        status_id=status_id,
        esteira=esteira,
        periodo=periodo,
    )
    return result
