import uuid
import json
import os
from datetime import datetime
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .database import engine, SessionLocal
from .models import (
    User, AuditLog, Convenio, Bank, Product,
    BrokerGroup, Broker, Proposal, AntifraudRule,
    AntifraudAnalysis, Integration, PipelineConfig
)
from .database import Base
from .core.security import get_password_hash

from .api.routes import (
    auth, users, brokers, broker_groups, proposals,
    convenios, banks, products, antifraud, dashboard,
    reports, integrations, stormfin
)

logger = structlog.get_logger()

FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"


def seed_database():
    db = SessionLocal()
    try:
        # Seed admin user
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            all_permissions = {
                "usuarios": True,
                "correspondentes": True,
                "propostas": True,
                "convenios": True,
                "bancos": True,
                "produtos": True,
                "antifraude": True,
                "relatorios": True,
                "integracoes": True,
                "dashboard": True,
                "auditoria": True,
            }
            admin_user = User(
                id=str(uuid.uuid4()),
                name="Administrador",
                email="admin@unicapromotora.com",
                username="admin",
                password=get_password_hash("Admin@123"),
                role="Administrador Master",
                status="ativo",
                permissions=json.dumps(all_permissions),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(admin_user)
            logger.info("seed_admin_user_created")

        # Seed convenios
        convenios_data = [
            {"code": "INSS", "name": "INSS - Instituto Nacional do Seguro Social"},
            {"code": "SIAPE", "name": "SIAPE - Sistema Integrado de Administração de Pessoal"},
            {"code": "PREF", "name": "PREF - Prefeituras Municipais"},
            {"code": "GOV", "name": "GOV - Governo Estadual"},
            {"code": "FGTS", "name": "FGTS - Fundo de Garantia do Tempo de Serviço"},
        ]
        for conv_data in convenios_data:
            existing = db.query(Convenio).filter(Convenio.code == conv_data["code"]).first()
            if not existing:
                convenio = Convenio(
                    id=str(uuid.uuid4()),
                    code=conv_data["code"],
                    name=conv_data["name"],
                    status="ativo",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(convenio)

        # Seed banks
        banks_data = [
            {"code": "BMG", "name": "Banco BMG"},
            {"code": "PAN", "name": "Banco PAN"},
            {"code": "SAFRA", "name": "Banco Safra"},
            {"code": "ITAU", "name": "Banco Itaú"},
            {"code": "BRADESCO", "name": "Banco Bradesco"},
        ]
        for bank_data in banks_data:
            existing = db.query(Bank).filter(Bank.code == bank_data["code"]).first()
            if not existing:
                bank = Bank(
                    id=str(uuid.uuid4()),
                    code=bank_data["code"],
                    name=bank_data["name"],
                    status="ativo",
                    has_import_phase=True,
                    has_analysis_phase=True,
                    has_checklist_phase=True,
                    has_approval_phase=True,
                    has_rejection_phase=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(bank)

        db.commit()
        logger.info("seed_database_complete")
    except Exception as e:
        db.rollback()
        logger.error("seed_database_error", error=str(e))
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("startup_creating_tables")
    Base.metadata.create_all(bind=engine)
    logger.info("startup_tables_created")
    seed_database()
    logger.info("startup_complete")
    yield
    # Shutdown
    logger.info("shutdown")


app = FastAPI(
    title="Unica Promotora API",
    description="Sistema de Gestão de Promotora de Crédito",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4500", "http://127.0.0.1:4500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(brokers.router, prefix="/api")
app.include_router(broker_groups.router, prefix="/api")
app.include_router(proposals.router, prefix="/api")
app.include_router(convenios.router, prefix="/api")
app.include_router(banks.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(antifraud.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")
app.include_router(stormfin.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Unica Promotora API", "version": "2.0.0"}


# Serve frontend static files if dist exists
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(
                str(index_file),
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )
        return JSONResponse(status_code=404, content={"detail": "Frontend not built"})
else:
    @app.get("/")
    async def root():
        return {
            "message": "Unica Promotora API",
            "version": "2.0.0",
            "docs": "/docs",
            "frontend": "Frontend dist not found - run 'npm run build' in frontend/",
        }
