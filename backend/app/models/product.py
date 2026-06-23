from sqlalchemy import Column, String, DateTime
from datetime import datetime
from ..database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="ativo")
    bank_id = Column(String, nullable=True)
    convenio_id = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)
