import logging
import json
from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from system_design.state import SystemDesignState
from system_design.schemas import SystemDesignScenario, DimensionEvaluation, ExtractedCandidateResponse, FinalSystemDesignFeedback
from system_design.topics import SYSTEM_DESIGN_TOPICS
from system_design.prompts import EXTRACT_COMPONENTS_PROMPT, GENERATE_FEEDBACK_PROMPT
from rag.rag_service import get_rag_service
from rag.scoring import RAGMLScorer

logger = logging.getLogger("system_design_nodes")
llm_mini = ChatGoogleGenerativeAI(model="gemini-3.6-flash")
llm_pro = ChatGoogleGenerativeAI(model="gemini-3.6-flash")

def load_scenario(state: SystemDesignState) -> Dict[str, Any]:
    """Loads the drill scenario based on the topic string."""
    logger.info("[Node] load_scenario")
    topic_key = state.get("topic", "url_shortener")
    
    if topic_key not in SYSTEM_DESIGN_TOPICS:
        topic_key = "url_shortener"
        
    topic_data = SYSTEM_DESIGN_TOPICS[topic_key]
    
    scenario = SystemDesignScenario(
        topic=topic_key,
        difficulty=topic_data["difficulty"],
        problem_statement=topic_data["problem_statement"],
        functional_requirements=topic_data["functional_requirements"],
        non_functional_requirements=topic_data["non_functional_requirements"],
        expected_concepts=topic_data["expected_concepts"],
        evaluation_criteria=topic_data["evaluation_criteria"]
    )
    
    return {"scenario": scenario}

def extract_components(state: SystemDesignState) -> Dict[str, Any]:
    """Extracts specific architectural dimensions from the candidate's raw response."""
    logger.info("[Node] extract_components")
    
    scenario = state["scenario"]
    
    chain = EXTRACT_COMPONENTS_PROMPT | llm_mini.with_structured_output(ExtractedCandidateResponse)
    
    try:
        extracted = chain.invoke({
            "problem_statement": scenario.problem_statement,
            "requirements": "\\n".join(scenario.functional_requirements + scenario.non_functional_requirements),
            "candidate_response": state["candidate_response"]
        })
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        extracted = ExtractedCandidateResponse(architecture_components=state["candidate_response"])
        
    return {
        "extracted_architecture": extracted.architecture_components,
        "extracted_data_design": extracted.data_design_components,
        "extracted_scalability": extracted.scalability_components,
        "extracted_reliability": extracted.reliability_components,
        "extracted_tradeoffs": extracted.tradeoffs_components
    }

def _evaluate_dimension(
    dimension_name: str,
    candidate_answer: str,
    query_prefix: str,
    scenario: SystemDesignScenario
) -> DimensionEvaluation:
    """Helper to run RAG ML evaluation on a single extracted dimension."""
    rag = get_rag_service()
    scorer = RAGMLScorer()
    
    # 1. Dynamic Search Query
    query = f"System Design {scenario.topic} {query_prefix} {', '.join(scenario.expected_concepts[:3])}"
    
    # 2. Retrieve Evidence
    retrievals = rag.retrieve_context(query=query, domain="system_design", top_k=3)
    evidence_texts = [r.content for r in retrievals]
    evidence_refs = [{"content": r.content[:200], "score": getattr(r, "rerank_score", 0.0)} for r in retrievals]
    
    # 3. Simple ML Scoring (Reuse existing backend/rag/scoring.py)
    # We pass empty lists for concepts/errors to let the ML scorer compute pure text alignment if needed,
    # or we can do a quick LLM pass for concept detection first.
    # For now, let's just use the RAG ML Scorer's similarity metrics as the dimension score!
    
    # Compute technical accuracy based on embeddings
    sbert_sim = scorer.compute_sentence_aggregate_similarity(candidate_answer, evidence_texts)
    ev_cov = scorer.compute_evidence_coverage(candidate_answer, evidence_texts)
    qa_rel = scorer.compute_qa_relevance(query, candidate_answer)
    
    # Build score 0-100
    raw_score = (sbert_sim * 40.0) + (ev_cov * 30.0) + (qa_rel * 30.0)
    score = int(max(0.0, min(100.0, raw_score)))
    
    # Check coverage of expected concepts
    covered = []
    missing = []
    candidate_lower = candidate_answer.lower()
    for concept in scenario.expected_concepts:
        if concept.lower() in candidate_lower:
            covered.append(concept)
        else:
            missing.append(concept)
            
    return DimensionEvaluation(
        dimension_name=dimension_name,
        score=score,
        missing_concepts=missing,
        evidence_references=evidence_refs
    )

def evaluate_architecture(state: SystemDesignState) -> Dict[str, Any]:
    logger.info("[Node] evaluate_architecture")
    eval_result = _evaluate_dimension(
        "Architecture",
        state.get("extracted_architecture", ""),
        "high level architecture components",
        state["scenario"]
    )
    return {"architecture_eval": eval_result}

def evaluate_data_design(state: SystemDesignState) -> Dict[str, Any]:
    logger.info("[Node] evaluate_data_design")
    eval_result = _evaluate_dimension(
        "Data Design",
        state.get("extracted_data_design", ""),
        "database schema indexing data storage",
        state["scenario"]
    )
    return {"data_design_eval": eval_result}

def evaluate_scalability(state: SystemDesignState) -> Dict[str, Any]:
    logger.info("[Node] evaluate_scalability")
    eval_result = _evaluate_dimension(
        "Scalability",
        state.get("extracted_scalability", ""),
        "load balancing caching distributed scaling horizontal",
        state["scenario"]
    )
    return {"scalability_eval": eval_result}

def evaluate_reliability(state: SystemDesignState) -> Dict[str, Any]:
    logger.info("[Node] evaluate_reliability")
    eval_result = _evaluate_dimension(
        "Reliability",
        state.get("extracted_reliability", ""),
        "fault tolerance replication availability consistency",
        state["scenario"]
    )
    return {"reliability_eval": eval_result}

def synthesize_feedback(state: SystemDesignState) -> Dict[str, Any]:
    """Generates the final comprehensive feedback report by synthesizing all parallel evaluations."""
    logger.info("[Node] synthesize_feedback")
    
    evals = [
        state["architecture_eval"],
        state["data_design_eval"],
        state["scalability_eval"],
        state["reliability_eval"]
    ]
    
    # Calculate overall score
    total_score = sum([e.score for e in evals])
    overall = int(total_score / len(evals)) if evals else 0
    
    dim_scores = {e.dimension_name: e.score for e in evals}
    
    chain = GENERATE_FEEDBACK_PROMPT | llm_pro.with_structured_output(FinalSystemDesignFeedback)
    
    evals_json_str = "\\n".join([e.model_dump_json() for e in evals])
    
    try:
        feedback = chain.invoke({
            "problem_statement": state["scenario"].problem_statement,
            "dimension_evaluations": evals_json_str
        })
        # Override scores with our deterministic ML calculations
        feedback.overall_score = overall
        feedback.dimension_scores = dim_scores
        
    except Exception as e:
        logger.error(f"Feedback synthesis failed: {e}")
        feedback = FinalSystemDesignFeedback(
            overall_score=overall,
            dimension_scores=dim_scores,
            what_you_did_well=[],
            missing_concepts=[],
            technical_issues=["Evaluation engine encountered an error parsing response."],
            improvement_suggestions=[],
            recommended_next_topic="url_shortener",
            evaluation_confidence=0.5
        )
        
    return {"final_feedback": feedback}
