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
        Obtain a Bearer token from StormFin via POST /token.
        Raises httpx.HTTPError on network or HTTP failures.
        """
        url = f"{_BASE_URL}/token"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                url,
                data={"username": username, "password": password},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            data = response.json()
            token: str = data["access_token"]
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
        self, username: str, password: str, cpf: str, banco_id: str
    ) -> dict:
        try:
            data = await self._get(
                username, password, "/simulacoes/fgts",
                params={"cpf": cpf, "banco_id": banco_id},
            )
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_simular_fgts_failed", error=str(exc))
            return {"ok": False, "error": str(exc)}

    async def simular_clt(
        self, username: str, password: str, cpf: str, banco_id: str, **kwargs
    ) -> dict:
        try:
            params = {"cpf": cpf, "banco_id": banco_id, **kwargs}
            data = await self._get(username, password, "/simulacoes/clt", params=params)
            return {"ok": True, "data": data}
        except Exception as exc:
            logger.warning("stormfin_simular_clt_failed", error=str(exc))
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
