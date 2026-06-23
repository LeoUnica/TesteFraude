from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime
from ..database import Base


class BlacklistEntry(Base):
    __tablename__ = "blacklist_entries"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)  # cpf, cnpj, phone, email
    value = Column(String, nullable=False, unique=True)
    reason = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    status = Column(String, default="ativo")
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
