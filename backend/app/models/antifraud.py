from sqlalchemy import Column, String, DateTime, Integer
from datetime import datetime
from ..database import Base


class AntifraudRule(Base):
    __tablename__ = "antifraud_rules"

    id = Column(String, primary_key=True)
    priority = Column(Integer, default=1)
    pending_type = Column(String, nullable=True)
    bank_id = Column(String, nullable=True)
    group_id = Column(String, nullable=True)
    convenio_id = Column(String, nullable=True)
    product_id = Column(String, nullable=True)
    action = Column(String, default="sinalizar")
    status = Column(String, default="ativo")
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)


class AntifraudAnalysis(Base):
    __tablename__ = "antifraud_analyses"

    id = Column(String, primary_key=True)
    proposal_id = Column(String, nullable=False)
    rule_id = Column(String, nullable=True)
    analyst_id = Column(String, nullable=True)
    status = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    schedule_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
