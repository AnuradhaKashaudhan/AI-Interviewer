from langgraph.graph import StateGraph, END
import logging

from .state import CareerIntelligenceState
from .nodes import (
    collect_candidate_data,
    analyze_existing_skills,
    identify_skill_gaps,
    build_rag_queries,
    retrieve_knowledge,
    generate_career_insights,
    generate_recommendations,
    validate_output,
    build_final_report
)
from .advanced_nodes import (
    analyze_resume,
    analyze_ats,
    analyze_coding,
    analyze_interview,
    identify_cross_feature_gaps,
    build_advanced_rag_queries,
    generate_career_strategy,
    generate_advanced_roadmap,
    validate_advanced_output,
    build_advanced_final_report
)

logger = logging.getLogger(__name__)

def should_retrieve_knowledge(state: CareerIntelligenceState) -> str:
    """
    Conditional edge: Basic plans might skip RAG retrieval to save costs,
    while Advanced (full_agentic_audit) always performs it.
    """
    tier = state.get("entitlement_tier", "basic")
    if tier == "basic":
        return "generate_career_insights"
    return "retrieve_knowledge"

def check_validation(state: CareerIntelligenceState) -> str:
    """
    Conditional edge: If validation fails, loop back to generation,
    up to a maximum retry limit.
    """
    errors = state.get("validation_errors", [])
    retry_count = state.get("retry_count", 0)
    
    if errors and retry_count < 2:
        logger.warning(f"Validation failed with errors: {errors}. Retrying generation...")
        return "generate_career_insights"
        
    if errors:
        logger.error(f"Validation failed but max retries reached. Proceeding with errors: {errors}")
        
    return "build_final_report"

def build_career_intelligence_graph():
    """Assembles the LangGraph orchestration layer."""
    builder = StateGraph(CareerIntelligenceState)

    # 1. Define Nodes
    builder.add_node("collect_candidate_data", collect_candidate_data)
    builder.add_node("analyze_existing_skills", analyze_existing_skills)
    builder.add_node("identify_skill_gaps", identify_skill_gaps)
    builder.add_node("build_rag_queries", build_rag_queries)
    builder.add_node("retrieve_knowledge", retrieve_knowledge)
    builder.add_node("generate_career_insights", generate_career_insights)
    builder.add_node("generate_recommendations", generate_recommendations)
    builder.add_node("validate_output", validate_output)
    builder.add_node("build_final_report", build_final_report)

    # 2. Define Edges
    builder.set_entry_point("collect_candidate_data")
    builder.add_edge("collect_candidate_data", "analyze_existing_skills")
    builder.add_edge("analyze_existing_skills", "identify_skill_gaps")
    builder.add_edge("identify_skill_gaps", "build_rag_queries")
    
    # Conditional routing based on entitlement tier
    builder.add_conditional_edges(
        "build_rag_queries",
        should_retrieve_knowledge,
        {
            "retrieve_knowledge": "retrieve_knowledge",
            "generate_career_insights": "generate_career_insights"
        }
    )
    
    builder.add_edge("retrieve_knowledge", "generate_career_insights")
    builder.add_edge("generate_career_insights", "generate_recommendations")
    builder.add_edge("generate_recommendations", "validate_output")
    
    # Conditional validation loop
    builder.add_conditional_edges(
        "validate_output",
        check_validation,
        {
            "generate_career_insights": "generate_career_insights",
            "build_final_report": "build_final_report"
        }
    )
    
    builder.add_edge("build_final_report", END)

    # 3. Compile the graph
    return builder.compile()

def build_advanced_career_intelligence_graph():
    """Assembles the Advanced Agentic LangGraph orchestration layer."""
    builder = StateGraph(CareerIntelligenceState)

    # 1. Define Nodes
    builder.add_node("collect_candidate_data", collect_candidate_data)
    builder.add_node("analyze_resume", analyze_resume)
    builder.add_node("analyze_ats", analyze_ats)
    builder.add_node("analyze_coding", analyze_coding)
    builder.add_node("analyze_interview", analyze_interview)
    builder.add_node("identify_cross_feature_gaps", identify_cross_feature_gaps)
    builder.add_node("build_advanced_rag_queries", build_advanced_rag_queries)
    builder.add_node("retrieve_knowledge", retrieve_knowledge) # Reused from basic
    builder.add_node("generate_career_strategy", generate_career_strategy)
    builder.add_node("generate_advanced_roadmap", generate_advanced_roadmap)
    builder.add_node("validate_advanced_output", validate_advanced_output)
    builder.add_node("build_advanced_final_report", build_advanced_final_report)

    # 2. Define Edges (Parallel Execution)
    builder.set_entry_point("collect_candidate_data")
    
    # Fan-out to parallel analysis nodes
    builder.add_edge("collect_candidate_data", "analyze_resume")
    builder.add_edge("collect_candidate_data", "analyze_ats")
    builder.add_edge("collect_candidate_data", "analyze_coding")
    builder.add_edge("collect_candidate_data", "analyze_interview")
    
    # Fan-in to cross feature gap identification
    builder.add_edge("analyze_resume", "identify_cross_feature_gaps")
    builder.add_edge("analyze_ats", "identify_cross_feature_gaps")
    builder.add_edge("analyze_coding", "identify_cross_feature_gaps")
    builder.add_edge("analyze_interview", "identify_cross_feature_gaps")
    
    builder.add_edge("identify_cross_feature_gaps", "build_advanced_rag_queries")
    builder.add_edge("build_advanced_rag_queries", "retrieve_knowledge")
    builder.add_edge("retrieve_knowledge", "generate_career_strategy")
    builder.add_edge("generate_career_strategy", "generate_advanced_roadmap")
    builder.add_edge("generate_advanced_roadmap", "validate_advanced_output")
    
    # Conditional validation loop for advanced
    def check_advanced_validation(state: CareerIntelligenceState) -> str:
        errors = state.get("validation_errors", [])
        retry_count = state.get("retry_count", 0)
        if errors and retry_count < 2:
            return "generate_career_strategy"
        return "build_advanced_final_report"

    builder.add_conditional_edges(
        "validate_advanced_output",
        check_advanced_validation,
        {
            "generate_career_strategy": "generate_career_strategy",
            "build_advanced_final_report": "build_advanced_final_report"
        }
    )
    
    builder.add_edge("build_advanced_final_report", END)

    # 3. Compile the graph
    return builder.compile()

# Singleton graph instances
career_intelligence_graph = build_career_intelligence_graph()
advanced_career_intelligence_graph = build_advanced_career_intelligence_graph()

