from typing import TypedDict, List, Dict, Any, Optional
from .schemas import Gap, RecommendationAction, CareerInsights, FinalReport, Roadmap, CrossFeatureGap, CareerStrategy
from langchain_core.documents import Document

class CareerIntelligenceState(TypedDict):
    """
    LangGraph state for the Career Intelligence orchestration.
    """
    # Inputs & Identity
    candidate_id: int
    target_role: str
    entitlement_tier: str  # "basic" or "full_agentic_audit"
    
    # Raw Candidate Data
    resume_data: Optional[Dict[str, Any]]
    ats_data: Optional[Dict[str, Any]]
    coding_data: Optional[Dict[str, Any]]
    interview_data: Optional[List[Dict[str, Any]]]
    skill_profile: Optional[Dict[str, Any]]
    
    # Availability Tracking
    available_data_sources: List[str]
    
    # Analysis State
    skills: Dict[str, str]  # skill -> level (Strong, Developing, Weak, Unknown)
    identified_strengths: List[str]
    identified_gaps: List[Gap]
    ats_improvements: List[str]
    
    # Advanced Analysis State
    resume_analysis: Optional[Dict[str, Any]]
    ats_analysis: Optional[Dict[str, Any]]
    coding_analysis: Optional[Dict[str, Any]]
    interview_analysis: Optional[Dict[str, Any]]
    cross_feature_gaps: Optional[List[CrossFeatureGap]]
    career_strategy: Optional[CareerStrategy]
    
    # RAG Integration
    rag_queries: List[str]
    retrieved_evidence: List[Document]
    knowledge_grounding_available: bool
    
    # Generation State
    career_insights: Optional[CareerInsights]
    recommendations: Optional[List[RecommendationAction]]
    roadmap: Optional[Roadmap]
    
    # Validation & Final Output
    validation_errors: List[str]
    retry_count: int
    confidence: float
    final_report: Optional[FinalReport]
