from typing import Dict, Any, Optional

PLANS_CATALOG: Dict[str, Dict[str, Any]] = {
    "free": {
        "id": "free",
        "name": "Free Plan",
        "badge": "Starter",
        "price_inr": 0,
        "amount_paise": 0,
        "currency": "INR",
        "billing_cycle": "Forever Free",
        "description": "For quick practice and first-time users.",
        "features": [
            "1 mock interview session",
            "2 ATS resume checks",
            "Standard feedback report",
            "Community support"
        ],
        "entitlements": {
            "mock_interviews": 1,
            "ats_checks": 2,
            "ai_career_intelligence": False,
            "system_design": False,
            "audit_logs": False
        }
    },
    "pro": {
        "id": "pro",
        "name": "Pro Plan",
        "badge": "Most Popular",
        "price_inr": 199,
        "amount_paise": 19900,  # ₹199 = 19900 paise
        "currency": "INR",
        "billing_cycle": "Monthly",
        "description": "For consistent preparation with stronger feedback loops and adaptive follow-ups.",
        "features": [
            "5 mock interview sessions",
            "10 ATS resume checks",
            "Basic AI Career Intelligence",
            "Basic Audit Trail Logs",
            "Detailed AI feedback & breakdown",
            "Priority AI speech evaluation"
        ],
        "entitlements": {
            "mock_interviews": 5,
            "ats_checks": 10,
            "ai_career_intelligence": "basic",
            "system_design": False,
            "audit_logs": "basic"
        }
    },
    "advanced": {
        "id": "advanced",
        "name": "Advanced Plan",
        "badge": "Pro Agentic",
        "price_inr": 499,
        "amount_paise": 49900,  # ₹499 = 49900 paise
        "currency": "INR",
        "billing_cycle": "Monthly",
        "description": "For candidates targeting senior AI, System Design, and Lead Software Engineering roles.",
        "features": [
            "Unlimited mock interview sessions",
            "Unlimited ATS resume checks",
            "Full Agentic AI Career Audit",
            "Unlimited System Design Drills",
            "Full Explainability (Audit Logs)",
            "All Premium Features"
        ],
        "entitlements": {
            "mock_interviews": -1,
            "ats_checks": -1,
            "ai_career_intelligence": "full_agentic_audit",
            "system_design": "unlimited",
            "audit_logs": "full_explainability"
        }
    }
}


def get_all_plans() -> list[Dict[str, Any]]:
    return list(PLANS_CATALOG.values())


def resolve_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    if not plan_id:
        return None
    normalized_id = plan_id.lower().strip()
    if normalized_id == "team":
        normalized_id = "advanced"
    return PLANS_CATALOG.get(normalized_id)

