import time
import logging
from typing import Dict, Any, Optional

from .state import CareerIntelligenceState
from .graph import career_intelligence_graph, advanced_career_intelligence_graph

logger = logging.getLogger(__name__)

def generate_career_intelligence_report(
    candidate_id: int, 
    target_role: str,
    entitlement_tier: str = "basic"
) -> Dict[str, Any]:
    """
    Executes the Career Intelligence LangGraph workflow.
    Measures execution times for each node.
    """
    initial_state = CareerIntelligenceState(
        candidate_id=candidate_id,
        target_role=target_role,
        entitlement_tier=entitlement_tier,
        resume_data=None,
        ats_data=None,
        coding_data=None,
        interview_data=None,
        skill_profile=None,
        available_data_sources=[],
        skills={},
        identified_strengths=[],
        identified_gaps=[],
        rag_queries=[],
        retrieved_evidence=[],
        knowledge_grounding_available=False,
        career_insights=None,
        recommendations=None,
        validation_errors=[],
        retry_count=0,
        confidence=0.0,
        final_report=None
    )

    logger.info(f"Starting Career Intelligence for candidate {candidate_id}, role: {target_role}, tier: {entitlement_tier}")
    
    start_time = time.time()
    
    # Run the graph
    try:
        # Route to the correct graph based on tier
        if entitlement_tier == "advanced":
            logger.info("Executing Advanced Agentic Graph")
            final_state = advanced_career_intelligence_graph.invoke(initial_state)
        else:
            logger.info("Executing Basic Graph")
            final_state = career_intelligence_graph.invoke(initial_state)
    except Exception as e:
        logger.error(f"Career Intelligence Graph Execution Failed: {e}")
        raise RuntimeError(f"Career Intelligence Graph Execution Failed: {str(e)}")
        
    total_time = time.time() - start_time
    logger.info(f"Career Intelligence Graph completed in {total_time:.2f}s")
    
    report = final_state.get("final_report")
    if not report:
        raise ValueError("Graph completed but no final report was generated.")
        
    return {
        "report": report.model_dump() if hasattr(report, "model_dump") else report.dict(),
        "metadata": {
            "execution_time_seconds": round(total_time, 2),
            "retries": final_state.get("retry_count", 0),
            "tier": entitlement_tier
        }
    }
