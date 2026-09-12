from langgraph.graph import StateGraph, START, END
from system_design.state import SystemDesignState
from system_design.nodes import (
    load_scenario,
    extract_components,
    evaluate_architecture,
    evaluate_data_design,
    evaluate_scalability,
    evaluate_reliability,
    synthesize_feedback
)

def build_system_design_graph():
    builder = StateGraph(SystemDesignState)
    
    builder.add_node("load_scenario", load_scenario)
    builder.add_node("extract_components", extract_components)
    builder.add_node("evaluate_architecture", evaluate_architecture)
    builder.add_node("evaluate_data_design", evaluate_data_design)
    builder.add_node("evaluate_scalability", evaluate_scalability)
    builder.add_node("evaluate_reliability", evaluate_reliability)
    builder.add_node("synthesize_feedback", synthesize_feedback)
    
    # Workflow
    builder.add_edge(START, "load_scenario")
    builder.add_edge("load_scenario", "extract_components")
    
    # Fan out to parallel evaluations
    builder.add_edge("extract_components", "evaluate_architecture")
    builder.add_edge("extract_components", "evaluate_data_design")
    builder.add_edge("extract_components", "evaluate_scalability")
    builder.add_edge("extract_components", "evaluate_reliability")
    
    # Fan in to synthesis
    builder.add_edge("evaluate_architecture", "synthesize_feedback")
    builder.add_edge("evaluate_data_design", "synthesize_feedback")
    builder.add_edge("evaluate_scalability", "synthesize_feedback")
    builder.add_edge("evaluate_reliability", "synthesize_feedback")
    
    builder.add_edge("synthesize_feedback", END)
    
    return builder.compile()

system_design_graph = build_system_design_graph()
