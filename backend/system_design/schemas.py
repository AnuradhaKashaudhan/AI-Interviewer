from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class SystemDesignScenario(BaseModel):
    topic: str
    difficulty: str
    problem_statement: str
    functional_requirements: List[str]
    non_functional_requirements: List[str]
    expected_concepts: List[str]
    evaluation_criteria: List[str]

class DimensionEvaluation(BaseModel):
    dimension_name: str
    score: int
    strengths: List[str] = []
    weaknesses: List[str] = []
    technical_errors: List[str] = []
    missing_concepts: List[str] = []
    evidence_references: List[Dict[str, Any]] = []

class FinalSystemDesignFeedback(BaseModel):
    overall_score: int
    dimension_scores: Dict[str, int]
    what_you_did_well: List[str]
    missing_concepts: List[str]
    technical_issues: List[str]
    improvement_suggestions: List[str]
    recommended_next_topic: str
    evaluation_confidence: float

class ExtractedCandidateResponse(BaseModel):
    architecture_components: str = ""
    data_design_components: str = ""
    scalability_components: str = ""
    reliability_components: str = ""
    tradeoffs_components: str = ""
