from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime
from ..database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True)
    user_name = Column(String, nullable=True)
    action = Column(String, nullable=False)
    module = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    entity_type = Column(String, nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
