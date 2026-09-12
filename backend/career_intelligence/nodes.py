import json
import logging
from typing import Dict, Any, List
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.documents import Document

from database import SessionLocal
from models import User, AuditLog, InterviewSession, CodingProfile
from .state import CareerIntelligenceState
from .schemas import Gap, CareerInsights, RecommendationAction, FinalReport, Roadmap
from .prompts import SKILL_GAP_PROMPT, CAREER_INSIGHTS_PROMPT, RECOMMENDATIONS_PROMPT
from .retriever import CareerIntelligenceRetriever

logger = logging.getLogger(__name__)

# Utility: Default LLM
def get_llm():
    # Use the project's standard LLM
    return ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0.2)

# ---------------------------------------------------------------------------
# Node 1: Collect Candidate Data
# ---------------------------------------------------------------------------
def collect_candidate_data(state: CareerIntelligenceState) -> Dict[str, Any]:
    """Retrieves available candidate information from existing services."""
    logger.info("[Node] collect_candidate_data")
    candidate_id = state["candidate_id"]
    
    available_data_sources = []
    resume_data = None
    coding_data = None
    interview_data = []
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == candidate_id).first()
        
        # Check sessions for resume
        session_with_resume = db.query(InterviewSession).filter(
            InterviewSession.user_id == candidate_id, 
            InterviewSession.resume_text.isnot(None)
        ).order_by(InterviewSession.created_at.desc()).first()
        
        if session_with_resume and session_with_resume.resume_text:
            resume_data = {"resume_text": session_with_resume.resume_text}
            available_data_sources.append("resume")
            
        # Check Coding Profiles
        coding_profiles = db.query(CodingProfile).filter(CodingProfile.user_id == candidate_id).all()
        if coding_profiles:
            coding_data = [{"platform": cp.platform, "score": cp.profile_score} for cp in coding_profiles]
            available_data_sources.append("coding_profile")
            
        # Check Interview Sessions
        interviews = db.query(InterviewSession).filter(InterviewSession.user_id == candidate_id).all()
        if interviews:
            for iv in interviews:
                if iv.evaluation:
                    try:
                        eval_data = json.loads(iv.evaluation)
                        interview_data.append(eval_data)
                    except:
                        pass
            if interview_data:
                available_data_sources.append("interview")
                
    finally:
        db.close()
        
    return {
        "resume_data": resume_data,
        "coding_data": coding_data,
        "interview_data": interview_data,
        "available_data_sources": available_data_sources
    }

# ---------------------------------------------------------------------------
# Node 2: Analyze Skills
# ---------------------------------------------------------------------------
def analyze_existing_skills(state: CareerIntelligenceState) -> Dict[str, Any]:
    """Classifies candidate skills based on available data."""
    logger.info("[Node] analyze_existing_skills")
    
    # In a real heavy implementation, this might call another LLM or parse ATS data.
    # We will build a simple extraction based on interview evaluation scores if available.
    skills = {}
    strengths = []
    
    interviews = state.get("interview_data", [])
    if interviews:
        # Average out technical scores if any exist in the evaluation
        for iv in interviews:
            score = iv.get("overall_score", 0)
            if score >= 80:
                strengths.append("Strong technical interview performance")
                
    if not strengths and "resume" in state.get("available_data_sources", []):
        strengths.append("Resume provided (Awaiting technical validation)")
        
    return {
        "skills": skills,
        "identified_strengths": list(set(strengths))
    }

# ---------------------------------------------------------------------------
# Node 3: Identify Skill Gaps
# ---------------------------------------------------------------------------
class GapsOutput(BaseModel):
    gaps: List[Gap]

def identify_skill_gaps(state: CareerIntelligenceState) -> Dict[str, Any]:
    """Compares candidate skills against target role requirements."""
    logger.info("[Node] identify_skill_gaps")
    
    llm = get_llm().with_structured_output(GapsOutput)
    prompt = SKILL_GAP_PROMPT
    
    # Format current skills for the prompt
    current_skills_str = json.dumps(state.get("skills", {}))
    if not state.get("skills"):
        current_skills_str = "No verified technical skill data available. Infer essential gaps for the role."
        
    try:
        chain = prompt | llm
        result = chain.invoke({
            "target_role": state["target_role"],
            "current_skills": current_skills_str
        })
        return {"identified_gaps": result.gaps}
    except Exception as e:
        logger.error(f"Error in identify_skill_gaps: {e}")
        return {"identified_gaps": []}

# ---------------------------------------------------------------------------
# Node 4: Build RAG Queries
# ---------------------------------------------------------------------------
def build_rag_queries(state: CareerIntelligenceState) -> Dict[str, Any]:
    """Generates targeted RAG queries based on gaps and role."""
    logger.info("[Node] build_rag_queries")
    gaps = state.get("identified_gaps", [])
    target_role = state.get("target_role", "Software Engineer")
    
    queries = []
    for gap in gaps:
        if gap.gap in ["High", "Medium"]:
            queries.append(f"{target_role} {gap.skill} core concepts and best practices")
            
    # Limit queries to save retrieval time
    return {"rag_queries": queries[:3]}

# ---------------------------------------------------------------------------
# Node 5: Retrieve Knowledge
# ---------------------------------------------------------------------------
def retrieve_knowledge(state: CareerIntelligenceState) -> Dict[str, Any]:
    """Uses LangChain BaseRetriever adapter to fetch evidence."""
    logger.info("[Node] retrieve_knowledge")
    queries = state.get("rag_queries", [])
    
    retriever = CareerIntelligenceRetriever()
    all_docs = []
    
    for q in queries:
        try:
            docs = retriever.invoke(q)
            all_docs.extend(docs)
        except Exception as e:
            logger.error(f"Retrieval failed for query '{q}': {e}")
            
    # Deduplicate by content
    unique_docs = {doc.page_content: doc for doc in all_docs}.values()
    final_docs = list(unique_docs)[:10]  # Keep top 10 unique chunks overall
    
    return {
        "retrieved_evidence": final_docs,
        "knowledge_grounding_available": len(final_docs) > 0
    }

# ---------------------------------------------------------------------------
# Node 6: Generate Career Insights
# ---------------------------------------------------------------------------
def generate_career_insights(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Node] generate_career_insights")
    llm = get_llm().with_structured_output(CareerInsights)
    
    evidence_text = "\n\n".join([d.page_content for d in state.get("retrieved_evidence", [])])
    if not evidence_text:
        evidence_text = "No evidence retrieved."
        
    gaps_str = "\n".join([f"- {g.skill} (Gap: {g.gap})" for g in state.get("identified_gaps", [])])
    strengths_str = "\n".join([f"- {s}" for s in state.get("identified_strengths", [])])
    
    chain = CAREER_INSIGHTS_PROMPT | llm
    try:
        insights = chain.invoke({
            "target_role": state.get("target_role"),
            "strengths": strengths_str or "None specified",
            "gaps": gaps_str or "None identified",
            "evidence": evidence_text
        })
        return {"career_insights": insights}
    except Exception as e:
        logger.error(f"Error in generate_career_insights: {e}")
        return {"career_insights": None}

# ---------------------------------------------------------------------------
# Node 7: Generate Recommendations
# ---------------------------------------------------------------------------
class RecommendationsOutput(BaseModel):
    recommendations: List[RecommendationAction]
    roadmap: Roadmap

def generate_recommendations(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Node] generate_recommendations")
    llm = get_llm().with_structured_output(RecommendationsOutput)
    
    evidence_text = "\n\n".join([d.page_content for d in state.get("retrieved_evidence", [])])
    if not evidence_text:
        evidence_text = "No evidence retrieved."
        
    gaps_str = "\n".join([f"- {g.skill} (Gap: {g.gap})" for g in state.get("identified_gaps", [])])
    
    chain = RECOMMENDATIONS_PROMPT | llm
    try:
        result = chain.invoke({
            "target_role": state.get("target_role"),
            "gaps": gaps_str or "None identified",
            "evidence": evidence_text
        })
        return {
            "recommendations": result.recommendations,
            "roadmap": result.roadmap
        }
    except Exception as e:
        logger.error(f"Error in generate_recommendations: {e}")
        return {"recommendations": [], "roadmap": None}

# ---------------------------------------------------------------------------
# Node 8: Validate Output
# ---------------------------------------------------------------------------
def validate_output(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Node] validate_output")
    errors = []
    
    insights = state.get("career_insights")
    recs = state.get("recommendations")
    
    if not insights:
        errors.append("Career Insights generation failed.")
    if not recs:
        errors.append("Recommendations generation failed.")
        
    if insights and recs:
        # Check if recommendations reference actual gaps
        gap_skills = [g.skill.lower() for g in state.get("identified_gaps", [])]
        for r in recs:
            if not any(g in r.skill.lower() for g in gap_skills) and gap_skills:
                # This is a soft error, but we log it as a validation error for retry
                errors.append(f"Recommendation for '{r.skill}' does not map to identified gaps.")
                
    retry_count = state.get("retry_count", 0) + 1
    
    return {
        "validation_errors": errors,
        "retry_count": retry_count
    }

# ---------------------------------------------------------------------------
# Node 9: Build Final Report
# ---------------------------------------------------------------------------
def build_final_report(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Node] build_final_report")
    
    # Calculate confidence
    confidence = 0.8
    if not state.get("knowledge_grounding_available"):
        confidence -= 0.3
    if not state.get("available_data_sources"):
        confidence -= 0.2
    if state.get("validation_errors"):
        confidence -= 0.1
        
    confidence = max(0.1, min(1.0, confidence))
    
    report = FinalReport(
        candidate_id=state["candidate_id"],
        target_role=state["target_role"],
        available_data_sources=state.get("available_data_sources", []),
        insights=state.get("career_insights"),
        recommendations=state.get("recommendations", []),
        roadmap=state.get("roadmap") or Roadmap(immediate=[], short_term=[], long_term=[]),
        confidence=confidence,
        knowledge_grounding_available=state.get("knowledge_grounding_available", False)
    )
    
    return {"final_report": report, "confidence": confidence}
