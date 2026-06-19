from sqlalchemy import Column, String, DateTime, Boolean
from datetime import datetime
from ..database import Base


class Bank(Base):
    __tablename__ = "banks"

    id = Column(String, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="ativo")
    api_url = Column(String, nullable=True)
    api_key = Column(String, nullable=True)
    username = Column(String, nullable=True)
    password = Column(String, nullable=True)
    has_import_phase = Column(Boolean, default=True)
    has_analysis_phase = Column(Boolean, default=True)
    has_checklist_phase = Column(Boolean, default=True)
    has_approval_phase = Column(Boolean, default=True)
    has_rejection_phase = Column(Boolean, default=True)
    import_user = Column(String, nullable=True)
    approval_user = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)
