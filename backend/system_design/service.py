import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from models import SystemDesignSession, SystemDesignAttempt
from system_design.topics import SYSTEM_DESIGN_TOPICS
from system_design.graph import system_design_graph

def start_system_design_session(db: Session, user_id: str, topic_key: str) -> SystemDesignSession:
    """Creates a new System Design Session in the database."""
    if topic_key not in SYSTEM_DESIGN_TOPICS:
        topic_key = "url_shortener"
        
    topic_data = SYSTEM_DESIGN_TOPICS[topic_key]
    
    session = SystemDesignSession(
        user_id=user_id,
        topic=topic_key,
        difficulty=topic_data["difficulty"],
        scenario=topic_data["problem_statement"],
        requirements=topic_data["functional_requirements"] + topic_data["non_functional_requirements"],
        status="in_progress"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    db.refresh(session)
    return session

def get_system_design_session(db: Session, session_id: str, user_id: str) -> Dict[str, Any]:
    session = db.query(SystemDesignSession).filter(
        SystemDesignSession.id == session_id,
        SystemDesignSession.user_id == user_id
    ).first()
    if not session:
        raise ValueError("Session not found")
        
    return {
        "id": session.id,
        "topic": session.topic,
        "difficulty": session.difficulty,
        "scenario": session.scenario,
        "requirements": session.requirements,
        "status": session.status,
        "overall_score": session.overall_score
    }


def evaluate_system_design_attempt(db: Session, session_id: str, candidate_response: str) -> Dict[str, Any]:
    """Runs the LangGraph orchestration and saves the attempt to the database."""
    session = db.query(SystemDesignSession).filter(SystemDesignSession.id == session_id).first()
    if not session:
        raise ValueError("Session not found")
        
    # Initialize State
    initial_state = {
        "session_id": session_id,
        "topic": session.topic,
        "candidate_response": candidate_response
    }
    
    # Run LangGraph
    final_state = system_design_graph.invoke(initial_state)
    
    feedback = final_state.get("final_feedback")
    if not feedback:
        raise RuntimeError("Feedback generation failed")
        
    # Update Session
    session.overall_score = feedback.overall_score
    session.status = "completed"
    
    # Save Attempt
    attempt = SystemDesignAttempt(
        session_id=session.id,
        candidate_response=candidate_response,
        dimension_scores=feedback.dimension_scores,
        feedback=feedback.model_dump(),
        covered_concepts=[], # In a real prod environment we'd extract these from the DimensionEvaluation models
        missing_concepts=feedback.missing_concepts,
        technical_errors=feedback.technical_issues,
        evidence_references=[]
    )
    
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    db.refresh(session)
    
    return {
        "session": {
            "id": session.id,
            "topic": session.topic,
            "overall_score": session.overall_score
        },
        "feedback": feedback.model_dump()
    }

def get_user_progress(db: Session, user_id: str) -> Dict[str, Any]:
    """Aggregates system design progress for the dashboard."""
    sessions = db.query(SystemDesignSession).filter(
        SystemDesignSession.user_id == user_id,
        SystemDesignSession.status == "completed"
    ).all()
    
    completed = len(sessions)
    if completed == 0:
        return {
            "completed": 0,
            "average_score": 0,
            "history": []
        }
        
    avg_score = sum([s.overall_score for s in sessions if s.overall_score]) / completed
    
    history = []
    for s in sessions:
        history.append({
            "id": s.id,
            "topic": s.topic,
            "difficulty": s.difficulty,
            "score": s.overall_score,
            "date": s.created_at.isoformat()
        })
        
    return {
        "completed": completed,
        "average_score": round(avg_score, 1),
        "history": sorted(history, key=lambda x: x["date"], reverse=True)
    }
