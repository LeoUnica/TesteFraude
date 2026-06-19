from sqlalchemy import Column, String, DateTime
from datetime import datetime
from ..database import Base


class BrokerGroup(Base):
    __tablename__ = "broker_groups"

    id = Column(String, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="ativo")
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)
