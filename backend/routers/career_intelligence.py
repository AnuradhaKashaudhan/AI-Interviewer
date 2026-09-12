from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging

from database import get_db
from models import User, CareerIntelligenceReport
from auth import get_current_user
from services.entitlement_service import get_user_entitlements
from career_intelligence.service import generate_career_intelligence_report

router = APIRouter(prefix="/api/career-intelligence", tags=["Career Intelligence"])
logger = logging.getLogger(__name__)

class CareerIntelligenceRequest(BaseModel):
    target_role: str

@router.get("/latest")
def get_latest_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the most recent Career Intelligence report for the authenticated user.
    """
    report = db.query(CareerIntelligenceReport).filter(
        CareerIntelligenceReport.user_id == current_user.id
    ).order_by(CareerIntelligenceReport.created_at.desc()).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="No career intelligence report found.")
        
    return report.report_data

@router.post("/generate")
def generate_report_endpoint(
    request: CareerIntelligenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes the Career Intelligence LangGraph workflow.
    Checks authentication and subscription entitlements before processing.
    """
    # 1. Check Entitlements
    entitlements = get_user_entitlements(db, current_user.id)
    tier = entitlements.get("ai_career_intelligence")
    
    if not tier:
        raise HTTPException(
            status_code=403, 
            detail={"detail": "AI Career Intelligence is not available on your current plan.", "code": "UPGRADE_REQUIRED"}
        )
        
    if tier not in ["basic", "full_agentic_audit"]:
        # Fallback to basic if string is malformed but truthy
        tier = "basic"

    # 2. Execute Graph
    try:
        result = generate_career_intelligence_report(
            candidate_id=current_user.id,
            target_role=request.target_role,
            entitlement_tier=tier
        )
        
        # Save to database
        db_report = CareerIntelligenceReport(
            user_id=current_user.id,
            target_role=request.target_role,
            report_data=result,
            data_sources_used=result.get("available_data_sources", []),
            confidence_score=result.get("confidence", 0.0)
        )
        db.add(db_report)
        db.commit()
        
        return result
    except ValueError as e:
        logger.error(f"Validation Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Internal Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI Career Intelligence report.")
