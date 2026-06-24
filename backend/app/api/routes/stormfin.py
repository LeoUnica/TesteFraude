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

class SimularFGTSBody(BaseModel):
    cpf: str
    banco: Optional[str] = None
    banco_id: Optional[str] = None
    ler_cache: bool = True
    provedor: Optional[str] = None


class SimularCLTBody(BaseModel):
    cpf: str
    banco: Optional[str] = None
    banco_id: Optional[str] = None
    tipo_simulacao: Optional[str] = None
    valor_solicitado: Optional[float] = None
    valor: Optional[float] = None
    matricula: Optional[str] = None


@router.post("/simular/fgts")
async def simular_fgts(
    body: SimularFGTSBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Executa uma simulação FGTS no StormFin (GET /simulacoes/fgts)."""
    username, password = await get_storm_creds(db)
    banco_id = body.banco_id or body.banco or ""
    result = await stormfin.simular_fgts(
        username, password,
        cpf=body.cpf,
        banco_id=banco_id,
        ler_cache=body.ler_cache,
        provedor=body.provedor,
    )
    return result


@router.post("/simular/clt")
async def simular_clt(
    body: SimularCLTBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Executa uma simulação CLT no StormFin (GET /simulacoes/clt)."""
    username, password = await get_storm_creds(db)
    banco_id = body.banco_id or body.banco or ""
    result = await stormfin.simular_clt(
        username, password,
        cpf=body.cpf,
        banco_id=banco_id,
        tipo_simulacao=body.tipo_simulacao,
        valor_solicitado=body.valor_solicitado or body.valor,
        matricula=body.matricula,
    )
    return result


# ---------------------------------------------------------------------------
# Endpoints — Digitação (criação de propostas no StormFin)
# ---------------------------------------------------------------------------

@router.post("/digitacoes/fgts")
async def digitacao_fgts(
    body: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Cria uma proposta FGTS no StormFin (POST /digitacoes/fgts)."""
    username, password = await get_storm_creds(db)
    return await stormfin.digitacao_fgts(username, password, dados=body)


@router.post("/digitacoes/clt")
async def digitacao_clt(
    body: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Cria uma proposta CLT no StormFin (POST /digitacoes/clt)."""
    username, password = await get_storm_creds(db)
    return await stormfin.digitacao_clt(username, password, dados=body)


@router.get("/bancos/{banco_id}/campos-obrigatorios/fgts")
async def campos_obrigatorios_fgts(
    banco_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna os campos obrigatórios para digitação FGTS de um banco."""
    username, password = await get_storm_creds(db)
    return await stormfin.campos_obrigatorios_fgts(username, password, banco_id=banco_id)


@router.get("/bancos/{banco_id}/campos-obrigatorios/clt")
async def campos_obrigatorios_clt(
    banco_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna os campos obrigatórios para digitação CLT de um banco."""
    username, password = await get_storm_creds(db)
    return await stormfin.campos_obrigatorios_clt(username, password, banco_id=banco_id)


@router.post("/formalizacoes/fgts/link")
async def link_formalizacao_fgts(
    body: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Gera link de formalização FGTS no StormFin."""
    username, password = await get_storm_creds(db)
    return await stormfin.link_formalizacao_fgts(username, password, dados=body)


# ---------------------------------------------------------------------------
# Endpoints — Banco / Órgãos / Tabelas / Prazos
# ---------------------------------------------------------------------------

@router.get("/bancos/{banco_id}/orgaos")
async def banco_orgaos(
    banco_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Lista órgãos conveniados de um banco no StormFin."""
    username, password = await get_storm_creds(db)
    return await stormfin.get_banco_orgaos(username, password, banco_id=banco_id)


@router.get("/banco-orgaos/{banco_orgao_id}/tabelas")
async def tabelas_banco_orgao(
    banco_orgao_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Lista tabelas disponíveis para um banco/órgão no StormFin."""
    username, password = await get_storm_creds(db)
    return await stormfin.get_tabelas(username, password, banco_orgao_id=banco_orgao_id)


@router.get("/tabelas/{tabela_id}/prazos")
async def prazos_tabela(
    tabela_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Lista prazos disponíveis para uma tabela no StormFin."""
    username, password = await get_storm_creds(db)
    return await stormfin.get_prazos(username, password, tabela_id=tabela_id)


@router.get("/paises")
async def listar_paises(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    username, password = await get_storm_creds(db)
    return await stormfin.get_paises(username, password)


@router.get("/nacionalidades")
async def listar_nacionalidades(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    username, password = await get_storm_creds(db)
    return await stormfin.get_nacionalidades(username, password)


@router.get("/tipos-origem-cliente")
async def tipos_origem_cliente(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    username, password = await get_storm_creds(db)
    return await stormfin.get_tipos_origem_cliente(username, password)


@router.get("/beneficios-especie")
async def beneficios_especie(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    username, password = await get_storm_creds(db)
    return await stormfin.get_beneficios_especie(username, password)


@router.get("/beneficios/situacoes-bloqueio")
async def beneficios_situacoes_bloqueio(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    username, password = await get_storm_creds(db)
    return await stormfin.get_beneficios_situacoes_bloqueio(username, password)


@router.get("/permissoes")
async def listar_permissoes(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    username, password = await get_storm_creds(db)
    return await stormfin.get_permissoes(username, password)


# ---------------------------------------------------------------------------
# Endpoints — Contratos (criação / clonagem)
# ---------------------------------------------------------------------------

@router.post("/contratos")
async def criar_contrato(
    body: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Cria um novo contrato no StormFin (POST /contratos)."""
    username, password = await get_storm_creds(db)
    return await stormfin.criar_contrato(username, password, dados=body)


@router.post("/contratos/{ff}/clone")
async def clonar_contrato(
    ff: str,
    body: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Clona um contrato existente no StormFin."""
    username, password = await get_storm_creds(db)
    return await stormfin.clonar_contrato(username, password, ff=ff, dados=body)


@router.get("/contratos/{ff}/portados")
async def contratos_portados(
    ff: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retorna contratos portados de um contrato no StormFin."""
    username, password = await get_storm_creds(db)
    return await stormfin.get_contratos_portados(username, password, ff=ff)


@router.get("/relatorios/contratos")
async def relatorio_contratos(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    data: str = Query(...),
    status: Optional[str] = Query(None),
):
    """Relatório de contratos digitados/pagos no StormFin."""
    username, password = await get_storm_creds(db)
    return await stormfin.relatorio_contratos(username, password, data_str=data, status=status)


# ---------------------------------------------------------------------------
# Endpoints — Colaboradores
# ---------------------------------------------------------------------------

@router.post("/colaboradores/contra-senha")
async def contra_senha_colaborador(
    body: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Consulta contra-senha de um colaborador no StormFin."""
    username, password = await get_storm_creds(db)
    return await stormfin.contra_senha_colaborador(username, password, dados=body)


# ---------------------------------------------------------------------------
# Endpoints — Mecanismos de terceiros
# ---------------------------------------------------------------------------

@router.post("/mecanismos-terceiros/consulta")
async def consulta_mecanismos_terceiros(
    body: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Consulta dados via mecanismos de terceiros no StormFin."""
    username, password = await get_storm_creds(db)
    return await stormfin.consulta_mecanismos_terceiros(username, password, dados=body)


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


# ---------------------------------------------------------------------------
# Endpoints — Sincronização (dispara tasks Celery em background)
# ---------------------------------------------------------------------------

@router.post("/sync/contratos")
async def sync_contratos(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    pagina: int = Query(default=1, ge=1),
):
    """
    Dispara sincronização de contratos do StormFin → banco local (via Celery).
    Se Celery não estiver rodando, executa sincronamente.
    """
    await get_storm_creds(db)  # valida credenciais antes de enfileirar
    try:
        from ...workers.tasks import sync_stormfin_contratos
        task = sync_stormfin_contratos.delay(pagina=pagina)
        return {"ok": True, "task_id": task.id, "message": "Sincronização enfileirada"}
    except Exception:
        # Celery offline — executa direto
        from ...workers.tasks import sync_stormfin_contratos
        result = sync_stormfin_contratos(pagina=pagina)
        return {"ok": True, "message": "Sincronização executada diretamente", **result}


@router.post("/sync/colaboradores")
async def sync_colaboradores(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Dispara sincronização de colaboradores do StormFin → banco local (via Celery).
    Se Celery não estiver rodando, executa sincronamente.
    """
    await get_storm_creds(db)
    try:
        from ...workers.tasks import sync_stormfin_colaboradores
        task = sync_stormfin_colaboradores.delay()
        return {"ok": True, "task_id": task.id, "message": "Sincronização enfileirada"}
    except Exception:
        from ...workers.tasks import sync_stormfin_colaboradores
        result = sync_stormfin_colaboradores()
        return {"ok": True, "message": "Sincronização executada diretamente", **result}


@router.post("/sync/antifraude/{proposal_id}")
async def sync_antifraude_check(
    proposal_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Dispara verificação de antifraude para uma proposta específica."""
    try:
        from ...workers.tasks import process_antifraud_check
        task = process_antifraud_check.delay(proposal_id=proposal_id, analyst_id=current_user.id)
        return {"ok": True, "task_id": task.id, "message": "Verificação de antifraude enfileirada"}
    except Exception:
        from ...workers.tasks import process_antifraud_check
        result = process_antifraud_check(proposal_id=proposal_id, analyst_id=current_user.id)
        return {"ok": True, "message": "Verificação executada diretamente", **result}
