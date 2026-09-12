import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture
def mock_entitlement_service():
    with patch('backend.routers.system_design.get_user_entitlement') as mock:
        mock.return_value = {"tier": "advanced"}
        yield mock

def test_api_start_drill_success(mock_entitlement_service):
    from backend.routers.system_design import api_start_drill, StartDrillRequest
    
    mock_db = MagicMock()
    req = StartDrillRequest(topic="url_shortener")
    
    # Needs a mock session
    with patch('backend.routers.system_design.start_system_design_session') as mock_start:
        mock_session = MagicMock()
        mock_session.id = "session_123"
        mock_session.topic = "url_shortener"
        mock_session.scenario = "Design a URL shortener."
        mock_session.requirements = ["Req 1"]
        mock_start.return_value = mock_session
        
        result = api_start_drill(req, mock_db, "user_1")
        
        assert result["session_id"] == "session_123"
        assert result["topic"] == "url_shortener"
        assert "Req 1" in result["requirements"]

def test_api_start_drill_forbidden():
    from backend.routers.system_design import api_start_drill, StartDrillRequest
    from fastapi import HTTPException
    
    with patch('backend.routers.system_design.get_user_entitlement') as mock:
        mock.return_value = {"tier": "pro"}
        
        mock_db = MagicMock()
        req = StartDrillRequest(topic="url_shortener")
        
        with pytest.raises(HTTPException) as excinfo:
            api_start_drill(req, mock_db, "user_1")
            
        assert excinfo.value.status_code == 403
        assert "Advanced plan" in excinfo.value.detail

@patch('backend.system_design.nodes.get_rag_service')
@patch('backend.system_design.nodes.llm_mini.with_structured_output')
@patch('backend.system_design.nodes.llm_pro.with_structured_output')
def test_system_design_graph_execution(mock_llm_pro, mock_llm_mini, mock_rag):
    from backend.system_design.graph import system_design_graph
    
    # Mock LLM Extraction
    mock_mini_chain = MagicMock()
    mock_llm_mini.return_value = mock_mini_chain
    from backend.system_design.schemas import ExtractedCandidateResponse
    mock_mini_chain.invoke.return_value = ExtractedCandidateResponse(
        architecture_components="I will use redis and a load balancer.",
        data_design_components="SQL database.",
        scalability_components="Horizontal scaling.",
        reliability_components="Replication.",
        tradeoffs_components="Eventual consistency."
    )
    
    # Mock RAG Retrieval
    mock_rag_instance = MagicMock()
    mock_rag.return_value = mock_rag_instance
    mock_rag_instance.retrieve_context.return_value = []
    
    # Mock LLM Feedback
    mock_pro_chain = MagicMock()
    mock_llm_pro.return_value = mock_pro_chain
    from backend.system_design.schemas import FinalSystemDesignFeedback
    mock_pro_chain.invoke.return_value = FinalSystemDesignFeedback(
        overall_score=85,
        dimension_scores={},
        what_you_did_well=["Good architecture"],
        missing_concepts=["Caching"],
        technical_issues=[],
        improvement_suggestions=["Add redis"],
        recommended_next_topic="chat_system",
        evaluation_confidence=0.9
    )
    
    state = {
        "session_id": "test",
        "topic": "url_shortener",
        "candidate_response": "My design uses redis and postgres."
    }
    
    final_state = system_design_graph.invoke(state)
    
    assert "scenario" in final_state
    assert final_state["scenario"].topic == "url_shortener"
    
    # Assert extracted chunks
    assert "redis and a load balancer" in final_state["extracted_architecture"]
    
    # Assert feedback
    feedback = final_state["final_feedback"]
    assert feedback.what_you_did_well == ["Good architecture"]
    # Overall score should be overwritten by the deterministic ML synthesis calculation!
    assert feedback.overall_score is not None
