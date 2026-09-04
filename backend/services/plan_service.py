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
            "3 mock interview sessions",
            "Basic ATS resume check",
            "Standard feedback report",
            "Community support"
        ],
        "entitlements": {
            "unlimited_interviews": False,
            "max_interviews": 3,
            "advanced_ats": False,
            "career_intelligence": False,
            "custom_prep_packs": False
        }
    },
    "pro": {
        "id": "pro",
        "name": "Technical Interview Pack",
        "badge": "Popular",
        "price_inr": 19,
        "amount_paise": 1900,  # ₹19 = 1900 paise
        "currency": "INR",
        "billing_cycle": "One-time / Lifetime Access",
        "description": "For consistent preparation with stronger feedback loops and adaptive follow-ups.",
        "features": [
            "Unlimited mock interview sessions",
            "Adaptive follow-up questions",
            "Detailed AI feedback & breakdown",
            "Advanced ATS Fix-It analysis",
            "Saved session history & exports",
            "Priority AI speech evaluation"
        ],
        "entitlements": {
            "unlimited_interviews": True,
            "max_interviews": -1,
            "advanced_ats": True,
            "career_intelligence": True,
            "custom_prep_packs": False
        }
    },
    "advanced": {
        "id": "advanced",
        "name": "AI Engineer Advanced Preparation",
        "badge": "Pro Agentic",
        "price_inr": 99,
        "amount_paise": 9900,  # ₹99 = 9900 paise
        "currency": "INR",
        "billing_cycle": "One-time / Lifetime Access",
        "description": "For candidates targeting senior AI, System Design, and Lead Software Engineering roles.",
        "features": [
            "All Pro Technical Interview Pack benefits",
            "AI Career Intelligence Agent readiness audit",
            "Personalized explainable gap recommendations",
            "System Design & LLM Architecture drills",
            "Audit Trail explainability logs",
            "1-on-1 AI Agentic mock coaching"
        ],
        "entitlements": {
            "unlimited_interviews": True,
            "max_interviews": -1,
            "advanced_ats": True,
            "career_intelligence": True,
            "custom_prep_packs": True
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

