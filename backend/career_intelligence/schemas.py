from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class Gap(BaseModel):
    skill: str
    current_level: str  # Strong, Developing, Weak, Unknown
    importance: str     # High, Medium, Low
    gap: str            # High, Medium, Low

class RecommendationAction(BaseModel):
    priority: int
    skill: str
    reason: str
    action: str

class Roadmap(BaseModel):
    immediate: List[str]
    short_term: List[str]
    long_term: List[str]
    ninety_day: Optional[List[str]] = None

class CrossFeatureGap(BaseModel):
    skill: str
    description: str
    sources_compared: List[str]
    priority: str # Critical, High, Medium, Low
    
class CareerStrategy(BaseModel):
    top_strengths: List[str]
    biggest_risks: List[str]
    highest_impact_gaps: List[str]
    role_readiness: str
    recommended_focus: str

class CareerInsights(BaseModel):
    readiness: str # "Strong", "Developing", "Needs Improvement"
    target_role: str
    strengths: List[str]
    skill_gaps: List[str]
    ats_improvements: List[str]
    role_priorities: List[str]
    observations: str

class FinalReport(BaseModel):
    candidate_id: str
    target_role: str
    available_data_sources: List[str]
    insights: CareerInsights
    recommendations: List[RecommendationAction]
    roadmap: Roadmap
    cross_feature_gaps: Optional[List[CrossFeatureGap]] = None
    career_strategy: Optional[CareerStrategy] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    knowledge_grounding_available: bool = True
