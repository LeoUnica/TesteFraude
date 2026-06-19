from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey
from datetime import datetime
from ..database import Base


class PipelineConfig(Base):
    __tablename__ = "pipeline_configs"

    id = Column(String, primary_key=True)
    bank_id = Column(String, ForeignKey("banks.id"), unique=True, nullable=False)
    days_import = Column(Integer, default=0)
    days_analysis = Column(Integer, default=0)
    days_checklist = Column(Integer, default=0)
    days_approval = Column(Integer, default=0)
    days_rejection = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
