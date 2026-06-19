import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from ..models.audit import AuditLog
import structlog

logger = structlog.get_logger()


def audit_log(
    db: Session,
    user_id: Optional[str],
    user_name: Optional[str],
    action: str,
    module: str,
    entity_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    ip: Optional[str] = None,
) -> AuditLog:
    log_entry = AuditLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        user_name=user_name,
        action=action,
        module=module,
        entity_id=entity_id,
        entity_type=entity_type,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip,
        created_at=datetime.utcnow(),
    )
    db.add(log_entry)
    try:
        db.commit()
        db.refresh(log_entry)
    except Exception as e:
        db.rollback()
        logger.error("audit_log_error", error=str(e))
    return log_entry
