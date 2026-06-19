from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from datetime import datetime
from ..database import Base


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String, primary_key=True)
    bank_id = Column(String, ForeignKey("banks.id"), nullable=True)
    type = Column(String, nullable=True)
    api_url = Column(String, nullable=True)
    api_key = Column(String, nullable=True)
    username = Column(String, nullable=True)
    password = Column(String, nullable=True)
    status = Column(String, default="inativo")
    last_sync = Column(DateTime, nullable=True)
    config = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
