import json
import logging
from typing import Dict, Any, List
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI

from .state import CareerIntelligenceState
from .schemas import CrossFeatureGap, CareerStrategy, Roadmap, FinalReport
from .prompts import (
    ADVANCED_RESUME_PROMPT,
    ADVANCED_ATS_PROMPT,
    ADVANCED_CODING_PROMPT,
    ADVANCED_INTERVIEW_PROMPT,
    ADVANCED_CROSS_FEATURE_GAP_PROMPT,
    ADVANCED_CAREER_STRATEGY_PROMPT,
    ADVANCED_ROADMAP_PROMPT
)
from .retriever import CareerIntelligenceRetriever

logger = logging.getLogger(__name__)

# Utility LLMs
def get_fast_llm():
    return ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0.1)

def get_smart_llm():
    return ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0.2)

# ---------------------------------------------------------------------------
# Parallel Data Analysis Nodes
# ---------------------------------------------------------------------------

def analyze_resume(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Advanced Node] analyze_resume")
    if "resume" not in state.get("available_data_sources", []):
        return {"resume_analysis": {"status": "unavailable"}}
        
    llm = get_fast_llm()
    chain = ADVANCED_RESUME_PROMPT | llm
    
    try:
        result = chain.invoke({
            "target_role": state.get("target_role"),
            "resume_data": json.dumps(state.get("resume_data", {}))
        })
        return {"resume_analysis": {"analysis": result.content}}
    except Exception as e:
        logger.error(f"Error in analyze_resume: {e}")
        return {"resume_analysis": {"error": str(e)}}

def analyze_ats(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Advanced Node] analyze_ats")
    # ATS data might not be distinctly in available_data_sources if we grouped it, 
    # but we can check if it exists in state or if resume exists.
    # For now, let's assume if resume exists, ATS analysis can run on it or ats_data if passed.
    ats_data = state.get("ats_data", {})
    if not ats_data:
        # Fallback if no specific ATS payload
        return {"ats_analysis": {"status": "unavailable"}}
        
    llm = get_fast_llm()
    chain = ADVANCED_ATS_PROMPT | llm
    
    try:
        result = chain.invoke({
            "target_role": state.get("target_role"),
            "ats_data": json.dumps(ats_data)
        })
        return {"ats_analysis": {"analysis": result.content}}
    except Exception as e:
        logger.error(f"Error in analyze_ats: {e}")
        return {"ats_analysis": {"error": str(e)}}

def analyze_coding(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Advanced Node] analyze_coding")
    if "coding_profile" not in state.get("available_data_sources", []):
        return {"coding_analysis": {"status": "unavailable", "message": "Coding Profile data unavailable."}}
        
    llm = get_fast_llm()
    chain = ADVANCED_CODING_PROMPT | llm
    
    try:
        result = chain.invoke({
            "target_role": state.get("target_role"),
            "coding_data": json.dumps(state.get("coding_data", {}))
        })
        return {"coding_analysis": {"analysis": result.content}}
    except Exception as e:
        logger.error(f"Error in analyze_coding: {e}")
        return {"coding_analysis": {"error": str(e)}}

def analyze_interview(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Advanced Node] analyze_interview")
    if "interview" not in state.get("available_data_sources", []):
        return {"interview_analysis": {"status": "unavailable", "message": "Complete a mock interview to unlock interview-based career intelligence."}}
        
    llm = get_fast_llm()
    chain = ADVANCED_INTERVIEW_PROMPT | llm
    
    try:
        result = chain.invoke({
            "target_role": state.get("target_role"),
            "interview_data": json.dumps(state.get("interview_data", []))
        })
        return {"interview_analysis": {"analysis": result.content}}
    except Exception as e:
        logger.error(f"Error in analyze_interview: {e}")
        return {"interview_analysis": {"error": str(e)}}

# ---------------------------------------------------------------------------
# Cross-Feature and Strategy Nodes
# ---------------------------------------------------------------------------

class CrossFeatureGapOutput(BaseModel):
    cross_feature_gaps: List[CrossFeatureGap]

def identify_cross_feature_gaps(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Advanced Node] identify_cross_feature_gaps")
    llm = get_smart_llm().with_structured_output(CrossFeatureGapOutput)
    
    chain = ADVANCED_CROSS_FEATURE_GAP_PROMPT | llm
    try:
        result = chain.invoke({
            "target_role": state.get("target_role"),
            "resume_analysis": json.dumps(state.get("resume_analysis", {})),
            "ats_analysis": json.dumps(state.get("ats_analysis", {})),
            "coding_analysis": json.dumps(state.get("coding_analysis", {})),
            "interview_analysis": json.dumps(state.get("interview_analysis", {}))
        })
        return {"cross_feature_gaps": result.cross_feature_gaps}
    except Exception as e:
        logger.error(f"Error in identify_cross_feature_gaps: {e}")
        return {"cross_feature_gaps": []}

def build_advanced_rag_queries(state: CareerIntelligenceState) -> Dict[str, Any]:
    """Generates queries based on cross-feature gaps."""
    logger.info("[Advanced Node] build_advanced_rag_queries")
    gaps = state.get("cross_feature_gaps", [])
    target_role = state.get("target_role", "Software Engineer")
    
    queries = []
    for gap in gaps:
        if gap.priority in ["Critical", "High"]:
            queries.append(f"{target_role} {gap.skill} core concepts and best practices")
            
    # Limit queries to save retrieval time
    return {"rag_queries": queries[:3]}

def generate_career_strategy(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Advanced Node] generate_career_strategy")
    llm = get_smart_llm().with_structured_output(CareerStrategy)
    
    evidence_text = "\n\n".join([d.page_content for d in state.get("retrieved_evidence", [])])
    if not evidence_text:
        evidence_text = "No evidence retrieved."
        
    gaps_str = json.dumps([g.dict() for g in state.get("cross_feature_gaps", [])])
    
    chain = ADVANCED_CAREER_STRATEGY_PROMPT | llm
    try:
        strategy = chain.invoke({
            "target_role": state.get("target_role"),
            "gaps": gaps_str,
            "evidence": evidence_text
        })
        return {"career_strategy": strategy}
    except Exception as e:
        logger.error(f"Error in generate_career_strategy: {e}")
        return {"career_strategy": None}

def generate_advanced_roadmap(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Advanced Node] generate_advanced_roadmap")
    llm = get_smart_llm().with_structured_output(Roadmap)
    
    evidence_text = "\n\n".join([d.page_content for d in state.get("retrieved_evidence", [])])
    if not evidence_text:
        evidence_text = "No evidence retrieved."
        
    strategy_str = json.dumps(state.get("career_strategy", {}).dict() if state.get("career_strategy") else {})
    gaps_str = json.dumps([g.dict() for g in state.get("cross_feature_gaps", [])])
    
    chain = ADVANCED_ROADMAP_PROMPT | llm
    try:
        roadmap = chain.invoke({
            "target_role": state.get("target_role"),
            "strategy": strategy_str + "\n" + gaps_str,
            "evidence": evidence_text
        })
        return {"roadmap": roadmap}
    except Exception as e:
        logger.error(f"Error in generate_advanced_roadmap: {e}")
        return {"roadmap": None}

def validate_advanced_output(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Advanced Node] validate_advanced_output")
    errors = []
    
    strategy = state.get("career_strategy")
    roadmap = state.get("roadmap")
    
    if not strategy:
        errors.append("Career Strategy generation failed.")
    if not roadmap:
        errors.append("Advanced Roadmap generation failed.")
                
    retry_count = state.get("retry_count", 0) + 1
    
    return {
        "validation_errors": errors,
        "retry_count": retry_count
    }

def build_advanced_final_report(state: CareerIntelligenceState) -> Dict[str, Any]:
    logger.info("[Advanced Node] build_advanced_final_report")
    
    # Calculate confidence based on available data
    sources = state.get("available_data_sources", [])
    confidence = 0.5
    if "resume" in sources: confidence += 0.15
    if "coding_profile" in sources: confidence += 0.15
    if "interview" in sources: confidence += 0.20
    
    if not state.get("knowledge_grounding_available"):
        confidence -= 0.1
    if state.get("validation_errors"):
        confidence -= 0.1
        
    confidence = max(0.1, min(1.0, confidence))
    
    # We map strategy to the insights format to satisfy the shared FinalReport schema
    strategy = state.get("career_strategy")
    
    report = FinalReport(
        candidate_id=state["candidate_id"],
        target_role=state["target_role"],
        available_data_sources=state.get("available_data_sources", []),
        insights={
            "readiness": strategy.role_readiness if strategy else "Unknown",
            "target_role": state["target_role"],
            "strengths": strategy.top_strengths if strategy else [],
            "skill_gaps": strategy.highest_impact_gaps if strategy else [],
            "ats_improvements": [], # Re-using standard insights model
            "role_priorities": [],
            "observations": strategy.recommended_focus if strategy else "Analysis failed."
        },
        recommendations=[], # We could map cross_feature_gaps to recommendations if we wanted
        roadmap=state.get("roadmap") or Roadmap(immediate=[], short_term=[], long_term=[]),
        cross_feature_gaps=state.get("cross_feature_gaps", []),
        career_strategy=state.get("career_strategy"),
        confidence=confidence,
        knowledge_grounding_available=state.get("knowledge_grounding_available", False)
    )
    
    return {"final_report": report, "confidence": confidence}
