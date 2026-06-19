from sqlalchemy import Column, String, DateTime, ForeignKey
from datetime import datetime
from ..database import Base


class Broker(Base):
    __tablename__ = "brokers"

    id = Column(String, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    cpf_cnpj = Column(String, unique=True, nullable=False)
    type = Column(String, default="Externo")
    status = Column(String, default="ativo")
    group_id = Column(String, ForeignKey("broker_groups.id"), nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)
