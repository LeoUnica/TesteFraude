from sqlalchemy import Column, String, DateTime, Float, Integer, Text, ForeignKey
from datetime import datetime
from ..database import Base


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(String, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    cpf = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    broker_id = Column(String, ForeignKey("brokers.id"), nullable=True)
    convenio_id = Column(String, ForeignKey("convenios.id"), nullable=True)
    bank_id = Column(String, ForeignKey("banks.id"), nullable=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    product_fgts = Column(String, nullable=True)
    value = Column(Float, default=0.0)
    installments = Column(Integer, default=0)
    status = Column(String, default="Pendente")
    antifraud_status = Column(String, default="Nao Analisado")
    pipeline_status = Column(String, nullable=True)
    pipeline_phase = Column(String, nullable=True)
    import_date = Column(DateTime, nullable=True)
    endorsement_date = Column(DateTime, nullable=True)
    proposal_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    documents = Column(Text, default="[]")
    history = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)
    imported_by = Column(String, nullable=True)
