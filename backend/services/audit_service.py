import json
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from models import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    category: str,
    user_id: Optional[str] = None,
    reason: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """
    Creates a persistent audit log entry for security, explainability, and traceability.
    Categories: AI, PAYMENT, AUTH, ENTITLEMENT
    """
    try:
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            category=category,
            reason=reason,
            metadata_json=metadata or {}
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to log audit event ({action}): {e}")
        return None


def get_user_audit_logs(db: Session, user_id: str, limit: int = 50) -> list[Dict[str, Any]]:
    logs = (
        db.query(AuditLog)
        .filter((AuditLog.user_id == user_id) | (AuditLog.user_id.is_(None)))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "category": log.category,
            "reason": log.reason,
            "metadata": log.metadata_json or {},
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]
