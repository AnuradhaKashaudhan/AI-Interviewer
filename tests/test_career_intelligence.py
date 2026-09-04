import unittest
import sys
import os

# Add project root and backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User, InterviewSession, Question, Answer, Evaluation, CodingProfile, AuditLog
from modules.career_intelligence import analyze_candidate_career_intelligence, get_latest_candidate_recommendation
from services.audit_service import get_user_audit_logs


class TestCareerIntelligenceAgent(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = SessionLocal()

        self.user = User(
            id="user_ci_test_123",
            email="ai_candidate@example.com",
            fullName="AI Engineer Candidate",
            hashed_password="dummy_pwd"
        )
        self.db.add(self.user)

        # Add mock session & evaluations
        session = InterviewSession(id="sess_1", user_id=self.user.id, role="AI Architect")
        self.db.add(session)

        q1 = Question(id="q_1", session_id="sess_1", question_text="Design an LLM caching layer", order=1)
        self.db.add(q1)

        ans1 = Answer(id="a_1", question_id="q_1", transcript_text="Use Redis with vector embeddings")
        self.db.add(ans1)

        eval1 = Evaluation(
            id="e_1",
            answer_id="a_1",
            score=72.0,
            technical_accuracy_score=70.0,
            depth_score=60.0,
            clarity_score=80.0,
            confidence_score=75.0,
            feedback="Good awareness of Redis, but lacked high-availability cluster details."
        )
        self.db.add(eval1)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_career_intelligence_analysis(self):
        result = analyze_candidate_career_intelligence(self.db, self.user.id, target_role="AI Engineer")
        self.assertIsNotNone(result)
        self.assertEqual(result["target_role"], "AI Engineer")
        self.assertGreaterEqual(result["readiness_score"], 0)
        self.assertLessEqual(result["readiness_score"], 100)
        
        self.assertIn("recommended_product", result)
        self.assertIsNotNone(result["reason"])
        self.assertTrue(len(result["reason"]) > 10)

        # Check Audit Log created
        audit_logs = get_user_audit_logs(self.db, self.user.id)
        actions = [log["action"] for log in audit_logs]
        self.assertIn("RECOMMENDATION_GENERATED", actions)

    def test_get_latest_recommendation(self):
        analyze_candidate_career_intelligence(self.db, self.user.id, target_role="Senior Frontend Engineer")
        latest = get_latest_candidate_recommendation(self.db, self.user.id)
        self.assertIsNotNone(latest)
        self.assertEqual(latest["target_role"], "Senior Frontend Engineer")


if __name__ == "__main__":
    unittest.main()
