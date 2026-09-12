from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any

from database import get_db
from models import User
from auth import get_current_user
from services.entitlement_service import get_user_entitlements
from system_design.service import (
    start_system_design_session,
    evaluate_system_design_attempt,
    get_user_progress
)

router = APIRouter(prefix="/system-design", tags=["system_design"])

def require_advanced_tier(user_id: str, db: Session):
    entitlement = get_user_entitlements(db, user_id)
    # Advanced feature check
    if entitlement.get("plan_id") != "advanced":
        raise HTTPException(
            status_code=403, 
            detail="System Design Drills require the Advanced plan."
        )

class StartDrillRequest(BaseModel):
    topic: str

class EvaluateDrillRequest(BaseModel):
    session_id: str
    candidate_response: str

@router.post("/start")
def api_start_drill(
    req: StartDrillRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_advanced_tier(current_user.id, db)
    
    session = start_system_design_session(db, current_user.id, req.topic)
    return {
        "session_id": session.id,
        "topic": session.topic,
        "scenario": session.scenario,
        "requirements": session.requirements
    }

@router.post("/evaluate")
def api_evaluate_drill(
    req: EvaluateDrillRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_advanced_tier(current_user.id, db)
    
    try:
        result = evaluate_system_design_attempt(db, req.session_id, req.candidate_response)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@router.get("/progress")
def api_get_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Free/Pro users can view the dashboard (it will be empty but show the locked UI on frontend)
    # So we don't strictly require advanced tier to just fetch the empty state.
    # But if they try to start, it blocks.
    return get_user_progress(db, current_user.id)

@router.get("/session/{session_id}")
def api_get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_advanced_tier(current_user.id, db)
    try:
        from system_design.service import get_system_design_session
        return get_system_design_session(db, session_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
