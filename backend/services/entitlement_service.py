from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from models import User, Subscription, InterviewSession
from services.plan_service import resolve_plan, PLANS_CATALOG
from services.audit_service import log_audit_event


def get_user_active_subscription(db: Session, user_id: str) -> Subscription:
    """
    Returns active subscription for user or creates a default free subscription.
    """
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not sub:
        # Default to free plan subscription
        sub = Subscription(user_id=user_id, plan_id="free", status="active")
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def grant_user_subscription(db: Session, user_id: str, plan_id: str, reason: str = "Payment Verified") -> Subscription:
    """
    Grants subscription entitlement idempotently. Updates existing active subscription or creates new one.
    """
    plan = resolve_plan(plan_id)
    if not plan:
        raise ValueError(f"Invalid plan_id: {plan_id}")

    # Mark existing active subscriptions as upgraded/cancelled
    active_subs = db.query(Subscription).filter(Subscription.user_id == user_id, Subscription.status == "active").all()
    for existing in active_subs:
        if existing.plan_id == plan["id"]:
            # User already has this plan active
            log_audit_event(
                db,
                action="ENTITLEMENT_REVERIFIED",
                category="ENTITLEMENT",
                user_id=user_id,
                reason=f"Subscription for plan '{plan['id']}' already active.",
                metadata={"plan_id": plan["id"], "subscription_id": existing.id}
            )
            return existing
        existing.status = "upgraded"

    # Create new active subscription
    new_sub = Subscription(
        user_id=user_id,
        plan_id=plan["id"],
        status="active"
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    log_audit_event(
        db,
        action="ENTITLEMENT_GRANTED",
        category="ENTITLEMENT",
        user_id=user_id,
        reason=reason,
        metadata={"plan_id": plan["id"], "plan_name": plan["name"], "subscription_id": new_sub.id}
    )
    return new_sub


def get_user_entitlements(db: Session, user_id: Optional[str]) -> Dict[str, Any]:
    """
    Evaluates server-side capabilities and entitlements for a candidate.
    """
    if not user_id:
        free_plan = PLANS_CATALOG["free"]
        return {
            "plan_id": "free",
            "plan_name": "Free Plan",
            "status": "guest",
            "unlimited_interviews": False,
            "advanced_ats": False,
            "career_intelligence": False,
            "custom_prep_packs": False,
            "session_count": 0,
            "sessions_remaining": 3
        }

    sub = get_user_active_subscription(db, user_id)
    plan_info = resolve_plan(sub.plan_id) or PLANS_CATALOG["free"]
    entitlements = plan_info.get("entitlements", {})

    # Calculate sessions conducted
    session_count = db.query(InterviewSession).filter(InterviewSession.user_id == user_id).count()
    max_interviews = entitlements.get("max_interviews", 3)
    remaining = -1 if max_interviews == -1 else max(0, max_interviews - session_count)

    return {
        "plan_id": plan_info["id"],
        "plan_name": plan_info["name"],
        "status": sub.status,
        "unlimited_interviews": entitlements.get("unlimited_interviews", False),
        "advanced_ats": entitlements.get("advanced_ats", False),
        "career_intelligence": entitlements.get("career_intelligence", False),
        "custom_prep_packs": entitlements.get("custom_prep_packs", False),
        "session_count": session_count,
        "sessions_remaining": remaining
    }
