from sqlalchemy.orm import Session
import models
from logging_config import logger

def log_action(db: Session, action: str, user_id: int, family_id: str, ip_address: str, details: str = None):
    """
    Inserts a record into the audit_logs database table.
    """
    try:
        log_entry = models.AuditLog(
            action=action,
            user_id=user_id,
            family_id=family_id,
            ip_address=ip_address,
            details=details
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Warning: Failed to write audit log entry: {str(e)}")
