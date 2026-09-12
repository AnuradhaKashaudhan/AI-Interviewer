import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from main import app
from career_intelligence.graph import career_intelligence_graph, should_retrieve_knowledge, check_validation
from career_intelligence.state import CareerIntelligenceState
from career_intelligence.schemas import Gap, RecommendationAction, CareerInsights, FinalReport
from langchain_core.documents import Document

client = TestClient(app)

# ---------------------------------------------------------------------------
# Test Graph Initialization and State
# ---------------------------------------------------------------------------
def test_graph_initialization():
    assert career_intelligence_graph is not None

def test_state_creation():
    state: CareerIntelligenceState = {
        "candidate_id": 1,
        "target_role": "Backend Engineer",
        "entitlement_tier": "full_agentic_audit",
        "resume_data": None,
        "ats_data": None,
        "coding_data": None,
        "interview_data": None,
        "skill_profile": None,
        "available_data_sources": [],
        "skills": {},
        "identified_strengths": [],
        "identified_gaps": [],
        "rag_queries": [],
        "retrieved_evidence": [],
        "knowledge_grounding_available": False,
        "career_insights": None,
        "recommendations": None,
        "validation_errors": [],
        "retry_count": 0,
        "confidence": 0.0,
        "final_report": None
    }
    assert state["target_role"] == "Backend Engineer"

# ---------------------------------------------------------------------------
# Test Nodes (Mocked)
# ---------------------------------------------------------------------------
@patch('career_intelligence.nodes.SessionLocal')
def test_collect_candidate_data_missing(mock_session):
    # Setup mock DB returning None
    mock_db = MagicMock()
    mock_session.return_value = mock_db
    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_db.query.return_value.filter.return_value.all.return_value = []
    
    from career_intelligence.nodes import collect_candidate_data
    state = {"candidate_id": 1}
    result = collect_candidate_data(state)
    
    assert result["available_data_sources"] == []
    assert result["resume_data"] is None

@patch('career_intelligence.nodes.SKILL_GAP_PROMPT')
@patch('career_intelligence.nodes.get_llm')
def test_identify_skill_gaps(mock_get_llm, mock_prompt):
    from career_intelligence.nodes import identify_skill_gaps
    mock_chain = MagicMock()
    mock_prompt.__or__.return_value = mock_chain
    mock_chain.invoke.return_value = MagicMock(gaps=[Gap(skill="Python", current_level="Weak", importance="High", gap="High")])
    
    state = {"target_role": "Backend Engineer", "skills": {}}
    result = identify_skill_gaps(state)
    
    assert len(result["identified_gaps"]) == 1
    assert result["identified_gaps"][0].skill == "Python"

def test_build_rag_queries():
    from career_intelligence.nodes import build_rag_queries
    state = {
        "target_role": "Backend Engineer",
        "identified_gaps": [Gap(skill="SQL", current_level="Developing", importance="High", gap="High")]
    }
    result = build_rag_queries(state)
    assert len(result["rag_queries"]) == 1
    assert "Backend Engineer SQL" in result["rag_queries"][0]

def test_build_final_report():
    from career_intelligence.nodes import build_final_report
    from career_intelligence.schemas import CareerInsights, Gap
    state = {
        "candidate_id": "1",
        "target_role": "Backend Engineer",
        "identified_gaps": [Gap(skill="SQL", current_level="Developing", importance="High", gap="High")],
        "career_insights": CareerInsights(
            readiness="Developing",
            target_role="Backend Engineer",
            strengths=[],
            skill_gaps=[],
            ats_improvements=[],
            role_priorities=[],
            observations="Testing"
        )
    }
    result = build_final_report(state)
    assert result["final_report"].candidate_id == "1"

# ---------------------------------------------------------------------------
# Advanced Workflow Tests
# ---------------------------------------------------------------------------

def test_advanced_graph_initialization():
    from career_intelligence.graph import advanced_career_intelligence_graph
    assert advanced_career_intelligence_graph is not None

def test_analyze_resume_missing_data():
    from career_intelligence.advanced_nodes import analyze_resume
    state = {"available_data_sources": []}
    result = analyze_resume(state)
    assert result["resume_analysis"]["status"] == "unavailable"

def test_analyze_coding_missing_data():
    from career_intelligence.advanced_nodes import analyze_coding
    state = {"available_data_sources": ["resume"]}
    result = analyze_coding(state)
    assert result["coding_analysis"]["status"] == "unavailable"

def test_build_advanced_final_report():
    from career_intelligence.advanced_nodes import build_advanced_final_report
    from career_intelligence.schemas import CareerStrategy, Roadmap
    
    strategy = CareerStrategy(
        top_strengths=["Python"],
        biggest_risks=[],
        highest_impact_gaps=["System Design"],
        role_readiness="Developing",
        recommended_focus="Focus on architecture."
    )
    
    state = {
        "candidate_id": "1",
        "target_role": "Backend",
        "available_data_sources": ["resume", "interview"],
        "career_strategy": strategy,
        "roadmap": Roadmap(immediate=[], short_term=[], long_term=[], ninety_day=[]),
        "cross_feature_gaps": [],
        "knowledge_grounding_available": True
    }
    
    result = build_advanced_final_report(state)
    assert result["final_report"].insights.readiness == "Developing"
    assert result["final_report"].insights.observations == "Focus on architecture."
    assert "resume" in result["final_report"].available_data_sources

@patch('career_intelligence.nodes.CareerIntelligenceRetriever')
def test_retrieve_knowledge_low_quality(mock_retriever_cls):
    from career_intelligence.nodes import retrieve_knowledge
    mock_retriever = MagicMock()
    mock_retriever_cls.return_value = mock_retriever
    
    # Simulate retriever finding nothing or low quality (so it returns empty list)
    mock_retriever.invoke.return_value = []
    
    state = {"rag_queries": ["System Design concepts"]}
    result = retrieve_knowledge(state)
    
    assert len(result["retrieved_evidence"]) == 0
    assert result["knowledge_grounding_available"] is False

@patch('career_intelligence.nodes.CareerIntelligenceRetriever')
def test_retrieve_knowledge_high_quality(mock_retriever_cls):
    from career_intelligence.nodes import retrieve_knowledge
    mock_retriever = MagicMock()
    mock_retriever_cls.return_value = mock_retriever
    
    mock_retriever.invoke.return_value = [Document(page_content="SQL indexing is crucial.", metadata={"score": 0.9})]
    
    state = {"rag_queries": ["SQL concepts"]}
    result = retrieve_knowledge(state)
    
    assert len(result["retrieved_evidence"]) == 1
    assert result["knowledge_grounding_available"] is True

def test_validation_logic():
    from career_intelligence.nodes import validate_output
    
    # Missing insights
    state = {"career_insights": None, "recommendations": None}
    result = validate_output(state)
    assert len(result["validation_errors"]) >= 2
    assert result["retry_count"] == 1
    
    # Valid output
    insights = CareerInsights(readiness="Strong", target_role="Dev", strengths=[], skill_gaps=[], ats_improvements=[], role_priorities=[], observations="")
    recs = [RecommendationAction(priority=1, skill="Python", reason="", action="")]
    state = {
        "career_insights": insights, 
        "recommendations": recs,
        "identified_gaps": [Gap(skill="Python", current_level="Weak", importance="High", gap="High")]
    }
    result = validate_output(state)
    assert len(result["validation_errors"]) == 0

def test_conditional_edges():
    state_basic = {"entitlement_tier": "basic"}
    assert should_retrieve_knowledge(state_basic) == "generate_career_insights"
    
    state_advanced = {"entitlement_tier": "full_agentic_audit"}
    assert should_retrieve_knowledge(state_advanced) == "retrieve_knowledge"
    
    state_valid = {"validation_errors": [], "retry_count": 0}
    assert check_validation(state_valid) == "build_final_report"
    
    state_invalid_retry = {"validation_errors": ["Error"], "retry_count": 0}
    assert check_validation(state_invalid_retry) == "generate_career_insights"

# ---------------------------------------------------------------------------
# Test API and Auth
# ---------------------------------------------------------------------------
def test_unauthorized_access():
    response = client.post("/api/career-intelligence/generate", json={"target_role": "Backend"})
    assert response.status_code == 401

@patch('routers.career_intelligence.get_user_entitlements')
@patch('routers.career_intelligence.get_current_user')
def test_subscription_entitlement_blocked(mock_current_user, mock_entitlements):
    # Mock user and entitlements
    mock_user = MagicMock(id=1)
    mock_current_user.return_value = mock_user
    mock_entitlements.return_value = {"ai_career_intelligence": False}
    
    # App overrides for Depends
    from main import get_current_user as actual_get_user
    app.dependency_overrides[actual_get_user] = lambda: mock_user
    
    response = client.post("/api/career-intelligence/generate", json={"target_role": "Backend"})
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "UPGRADE_REQUIRED"
    
    app.dependency_overrides.clear()
