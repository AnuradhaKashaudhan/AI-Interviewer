from typing import TypedDict, Optional, List, Dict, Any
from system_design.schemas import SystemDesignScenario, DimensionEvaluation, FinalSystemDesignFeedback

class SystemDesignState(TypedDict, total=False):
    # Inputs
    session_id: str
    candidate_id: str
    topic: str
    difficulty: str
    candidate_response: str
    
    # Context
    candidate_profile_stats: Dict[str, Any]
    
    # Generated / Intermediate
    scenario: Optional[SystemDesignScenario]
    extracted_architecture: str
    extracted_data_design: str
    extracted_scalability: str
    extracted_reliability: str
    extracted_tradeoffs: str
    
    # Outputs of parallel evaluations
    architecture_eval: Optional[DimensionEvaluation]
    data_design_eval: Optional[DimensionEvaluation]
    scalability_eval: Optional[DimensionEvaluation]
    reliability_eval: Optional[DimensionEvaluation]
    tradeoffs_eval: Optional[DimensionEvaluation]
    
    # Final Result
    final_feedback: Optional[FinalSystemDesignFeedback]
    recommended_next_topic: Optional[str]
    validation_errors: List[str]
