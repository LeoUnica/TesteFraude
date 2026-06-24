"""
StormFin API integration service.

StormFin uses OAuth2PasswordBearer: POST /token with form-encoded credentials,
receiving a Bearer token valid for ~60 minutes. We cache per (username, password)
pair and renew 5 minutes early (55-minute effective TTL).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import httpx
import structlog

from ..config import settings

logger = structlog.get_logger()

_BASE_URL = settings.STORMFIN_BASE_URL  # https://openapi.stormfin.com.br/v2
_TOKEN_TTL_SECONDS = 55 * 60  # 55 minutes


class StormFinService:
    """
    Stateful service that handles token caching per credential pair.

    Token state is stored on the instance, so the module-level singleton
    `stormfin` keeps state across requests within the same worker process
    without using module-level mutable globals.
    """

    def __init__(self) -> None:
        # Cache key: (username, password) -> (token, expires_at)
        self._token_cache: dict[tuple[str, str], tuple[str, datetime]] = {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _get_token(self, username: str, password: str) -> str:
        """
        Obtain a Bearer token from StormFin via POST /token (OAuth2 password grant).
        Raises httpx.HTTPError on network or HTTP failures.
        """
        url = f"{_BASE_URL}/token"
        payload: dict[str, str] = {
            "grant_type": "password",
            "username": username,
            "password": password,
        }
        if settings.STORMFIN_CLIENT_ID:
            payload["client_id"] = settings.STORMFIN_CLIENT_ID
        if settings.STORMFIN_CLIENT_SECRET:
            payload["client_secret"] = settings.STORMFIN_CLIENT_SECRET

        logger.info("stormfin_token_request", url=url, username=username,
                    client_id=settings.STORMFIN_CLIENT_ID or "(not set)")
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                url,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if not response.is_success:
                logger.error(
                    "stormfin_token_failed",
                    status=response.status_code,
                    body=response.text[:500],
                    username=username,
                )
            response.raise_for_status()
            data = response.json()
            token: str = data.get("access_token") or data.get("token") or ""
            if not token:
                raise ValueError(f"Token não encontrado na resposta: {data}")
            logger.info("stormfin_token_obtained", username=username)
            return token

    async def _get_headers(self, username: str, password: str) -> dict[str, str]:
        """
        Return auth headers with a valid Bearer token, renewing if needed.
        """
        key = (username, password)
        cached = self._token_cache.get(key)
        now = datetime.utcnow()

        if cached is None or now >= cached[1]:
            token = await self._get_token(username, password)
            expires_at = now + timedelta(seconds=_TOKEN_TTL_SECONDS)
            self._token_cache[key] = (token, expires_at)
        else:
            token = cached[0]

        return {"Authorization": f"Bearer {token}"}

    async def _get(
        self,
        username: str,
        password: str,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> Any:
        headers = await self._get_headers(username, password)
        url = f"{_BASE_URL}{path}"
        logger.info("stormfin_get", path=path, params=params)
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()

    async def _post(
        self,
        username: str,
        password: str,
        path: str,
        body: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> Any:
        headers = await self._get_headers(username, password)
        url = f"{_BASE_URL}{path}"
        logger.info("stormfin_post", path=path)
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                url, headers=headers, json=body or {}, params=params
            )
            response.raise_for_status()
            return response.json()

    # ------------------------------------------------------------------
    # Authentication / connection test
    # ------------------------------------------------------------------

    async def test_connection(self, username: str, password: str) -> dict:
        """
        Test StormFin connectivity by hitting GET /rate-limits.
        Returns {"ok": True, "data": ...} or {"ok": False, "error": ...}.
        """
        try:
            data = await self._get(username, password, "/rate-limits")
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_test_connection_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Colaboradores (= corretores no StormFin)
    # ------------------------------------------------------------------

    async def get_colaboradores(
        self,
        username: str,
        password: str,
        pagina: int = 1,
        filtros: dict | None = None,
    ) -> dict:
        try:
            params = {"pagina": pagina, **(filtros or {})}
            data = await self._get(username, password, "/colaboradores", params=params)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_get_colaboradores_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def get_colaborador(
        self, username: str, password: str, id: str
    ) -> dict:
        try:
            data = await self._get(username, password, f"/colaboradores/{id}")
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_get_colaborador_failed", id=id, error=str(exc))
            return {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Contratos (= propostas no StormFin)
    # ------------------------------------------------------------------

    async def get_contratos(
        self,
        username: str,
        password: str,
        pagina: int = 1,
        filtros: dict | None = None,
    ) -> dict:
        try:
            params = {"pagina": pagina, **(filtros or {})}
            data = await self._get(username, password, "/contratos", params=params)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_get_contratos_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def criar_contrato_simplificado(
        self, username: str, password: str, dados: dict
    ) -> dict:
        try:
            data = await self._post(username, password, "/contratos/simplificado", body=dados)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_criar_contrato_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def acompanhar_contrato(
        self, username: str, password: str, ff: str
    ) -> dict:
        try:
            data = await self._get(username, password, f"/contratos/{ff}/acompanhamento")
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_acompanhar_contrato_failed", ff=ff, error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def get_historico_contrato(
        self, username: str, password: str, ff: str
    ) -> dict:
        try:
            data = await self._get(username, password, f"/contratos/{ff}/historico")
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_historico_contrato_failed", ff=ff, error=str(exc))
            return {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Antifraude
    # ------------------------------------------------------------------

    async def listar_antifraude(
        self,
        username: str,
        password: str,
        filtros: dict | None = None,
    ) -> dict:
        try:
            data = await self._get(
                username, password, "/antifraude/listar_contratos", params=filtros or {}
            )
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_listar_antifraude_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def aprovar_antifraude(
        self, username: str, password: str, contrato_id: str
    ) -> dict:
        try:
            data = await self._post(username, password, f"/antifraude/{contrato_id}/aprovar")
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_aprovar_antifraude_failed", contrato_id=contrato_id, error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def recusar_antifraude(
        self, username: str, password: str, contrato_id: str, motivo: str
    ) -> dict:
        try:
            data = await self._post(
                username, password, f"/antifraude/{contrato_id}/recusar",
                body={"motivo": motivo},
            )
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_recusar_antifraude_failed", contrato_id=contrato_id, error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def pendenciar_antifraude(
        self, username: str, password: str, contrato_id: str, tipo: str
    ) -> dict:
        try:
            data = await self._post(
                username, password, f"/antifraude/{contrato_id}/pendenciar",
                body={"tipo": tipo},
            )
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_pendenciar_antifraude_failed", contrato_id=contrato_id, error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def reanalisar_antifraude(
        self, username: str, password: str, contrato_id: str
    ) -> dict:
        try:
            data = await self._post(username, password, f"/antifraude/{contrato_id}/reanalisar")
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_reanalisar_antifraude_failed", contrato_id=contrato_id, error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def get_tipos_recusa(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/antifraude/tipos_recusas")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_tipos_recusa_failed", error=str(exc))
            return []

    async def get_tipos_pendencia(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/antifraude/tipos_pendencias")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_tipos_pendencia_failed", error=str(exc))
            return []

    # ------------------------------------------------------------------
    # Clientes
    # ------------------------------------------------------------------

    async def buscar_cliente_cpf(
        self, username: str, password: str, cpf: str
    ) -> dict:
        try:
            data = await self._get(
                username, password, "/clientes/resumo", params={"cpf": cpf}
            )
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_buscar_cliente_cpf_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def buscar_cliente_telefone(
        self, username: str, password: str, telefone: str
    ) -> dict:
        try:
            data = await self._get(
                username, password, "/clientes/resumo/telefone", params={"telefone": telefone}
            )
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_buscar_cliente_telefone_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Dados de referência
    # ------------------------------------------------------------------

    async def get_bancos(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/bancos")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_get_bancos_failed", error=str(exc))
            return []

    async def get_orgaos(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/orgaos")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_get_orgaos_failed", error=str(exc))
            return []

    async def get_status_contratos(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/contratos/tipos_status")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_get_status_contratos_failed", error=str(exc))
            return []

    # ------------------------------------------------------------------
    # Simulações
    # ------------------------------------------------------------------

    async def simular_fgts(
        self,
        username: str,
        password: str,
        cpf: str,
        banco_id: str,
        ler_cache: bool = True,
        provedor: str | None = None,
    ) -> dict:
        try:
            params: dict[str, Any] = {"cpf": cpf, "banco_id": banco_id, "ler_cache": ler_cache}
            if provedor:
                params["provedor"] = provedor
            data = await self._get(username, password, "/simulacoes/fgts", params=params)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_simular_fgts_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def simular_clt(
        self,
        username: str,
        password: str,
        cpf: str,
        banco_id: str,
        tipo_simulacao: str | None = None,
        valor_solicitado: float | None = None,
        matricula: str | None = None,
        **kwargs,
    ) -> dict:
        try:
            params: dict[str, Any] = {"cpf": cpf, "banco_id": banco_id}
            if tipo_simulacao:
                params["tipo_simulacao"] = tipo_simulacao
            if valor_solicitado is not None:
                params["valor_solicitado"] = valor_solicitado
            if matricula:
                params["matricula"] = matricula
            params.update(kwargs)
            data = await self._get(username, password, "/simulacoes/clt", params=params)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_simular_clt_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Digitação (criação de propostas no StormFin)
    # ------------------------------------------------------------------

    async def digitacao_fgts(self, username: str, password: str, dados: dict) -> dict:
        try:
            data = await self._post(username, password, "/digitacoes/fgts", body=dados)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_digitacao_fgts_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def digitacao_clt(self, username: str, password: str, dados: dict) -> dict:
        try:
            data = await self._post(username, password, "/digitacoes/clt", body=dados)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_digitacao_clt_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def campos_obrigatorios_fgts(self, username: str, password: str, banco_id: str) -> dict:
        try:
            data = await self._get(username, password, f"/bancos/{banco_id}/campos_obrigatorios/fgts")
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_campos_fgts_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def campos_obrigatorios_clt(self, username: str, password: str, banco_id: str) -> dict:
        try:
            data = await self._get(username, password, f"/bancos/{banco_id}/campos_obrigatorios/clt")
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_campos_clt_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def link_formalizacao_fgts(self, username: str, password: str, dados: dict) -> dict:
        try:
            data = await self._post(username, password, "/formalizacoes/fgts/link", body=dados)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_link_formalizacao_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Banco / Órgãos / Tabelas / Prazos (dados de referência)
    # ------------------------------------------------------------------

    async def get_banco_orgaos(self, username: str, password: str, banco_id: str) -> list:
        try:
            data = await self._get(username, password, f"/bancos/{banco_id}/banco_orgaos")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_get_banco_orgaos_failed", error=str(exc))
            return []

    async def get_tabelas(self, username: str, password: str, banco_orgao_id: str) -> list:
        try:
            data = await self._get(username, password, f"/banco_orgaos/{banco_orgao_id}/tabelas")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_get_tabelas_failed", error=str(exc))
            return []

    async def get_prazos(self, username: str, password: str, tabela_id: str) -> list:
        try:
            data = await self._get(username, password, f"/tabelas/{tabela_id}/prazos")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_get_prazos_failed", error=str(exc))
            return []

    async def get_paises(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/paises")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_get_paises_failed", error=str(exc))
            return []

    async def get_nacionalidades(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/nacionalidades")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_get_nacionalidades_failed", error=str(exc))
            return []

    async def get_tipos_origem_cliente(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/tipos_origem_cliente")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_tipos_origem_failed", error=str(exc))
            return []

    async def get_beneficios_especie(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/beneficios_especie")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_beneficios_especie_failed", error=str(exc))
            return []

    async def get_permissoes(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/permissoes")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_permissoes_failed", error=str(exc))
            return []

    async def get_beneficios_situacoes_bloqueio(self, username: str, password: str) -> list:
        try:
            data = await self._get(username, password, "/beneficios/situacoes_bloqueio")
            return data if isinstance(data, list) else data.get("data", data)
        except Exception as exc:
            logger.warning("stormfin_beneficios_bloqueio_failed", error=str(exc))
            return []

    # ------------------------------------------------------------------
    # Contratos — criação e edição
    # ------------------------------------------------------------------

    async def criar_contrato(self, username: str, password: str, dados: dict) -> dict:
        try:
            data = await self._post(username, password, "/contratos", body=dados)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_criar_contrato_full_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def clonar_contrato(
        self, username: str, password: str, ff: str, dados: dict | None = None
    ) -> dict:
        try:
            data = await self._post(username, password, f"/contratos/{ff}/clone", body=dados or {})
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_clonar_contrato_failed", ff=ff, error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def get_contratos_portados(self, username: str, password: str, ff: str) -> dict:
        try:
            data = await self._get(username, password, f"/contratos/{ff}/portados")
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_contratos_portados_failed", ff=ff, error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def relatorio_contratos(
        self, username: str, password: str, data_str: str, status: str | None = None
    ) -> dict:
        try:
            params: dict[str, Any] = {"data": data_str}
            if status:
                params["status"] = status
            result = await self._get(username, password, "/relatorios/contratos_digitados_pagos", params=params)
            return {"ok": True, "data": result}
        except Exception as exc:
            logger.warning("stormfin_relatorio_contratos_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Colaboradores
    # ------------------------------------------------------------------

    async def contra_senha_colaborador(
        self, username: str, password: str, dados: dict
    ) -> dict:
        try:
            data = await self._post(username, password, "/colaboradores/contra_senha", body=dados)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_contra_senha_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Mecanismos de terceiros (consulta externa)
    # ------------------------------------------------------------------

    async def consulta_mecanismos_terceiros(
        self, username: str, password: str, dados: dict
    ) -> dict:
        try:
            data = await self._post(username, password, "/mecanismos_terceiros/consulta", body=dados)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_mecanismos_terceiros_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Esteira (workflow)
    # ------------------------------------------------------------------

    async def get_esteira(
        self,
        username: str,
        password: str,
        status_id: str,
        esteira: str,
        periodo: str,
    ) -> dict:
        try:
            params = {
                "status_id": status_id,
                "esteira": esteira,
                "periodo_criacao": periodo,
            }
            data = await self._get(username, password, "/esteira", params=params)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_get_esteira_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def mover_esteira(
        self,
        username: str,
        password: str,
        ct_id: str,
        status_id: str,
        **kwargs,
    ) -> dict:
        try:
            body = {"ct_id": ct_id, "status_id": status_id, **kwargs}
            data = await self._post(username, password, "/esteira/movimentacoes", body=body)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_mover_esteira_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}


# Module-level singleton — use this everywhere
stormfin = StormFinService()
