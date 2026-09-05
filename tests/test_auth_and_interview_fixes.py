import os
import sys
import unittest
import jwt
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from main import app
from database import get_db, Base, engine
from models import User, InterviewSession, Question, Answer, Evaluation
from auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, ALGORITHM

class TestAuthAndInterviewFixes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = next(get_db())
        user = db.query(User).filter(User.email == "fix_test_user@example.com").first()
        if not user:
            user = User(
                email="fix_test_user@example.com",
                fullName="Fix Test Candidate",
                hashed_password="hashed_password"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        cls.user = user

    def test_access_token_expiration_at_least_60_minutes(self):
        # 1. Verify configured constant is at least 60 minutes
        self.assertGreaterEqual(ACCESS_TOKEN_EXPIRE_MINUTES, 60, "Access token lifetime must be at least 60 minutes")

        # 2. Verify decoded JWT exp timestamp is at least 60 minutes in the future
        token = create_access_token(data={"sub": self.user.id})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        self.assertIsNotNone(exp)
        
        now_utc = datetime.utcnow()
        exp_dt = datetime.utcfromtimestamp(exp)
        diff_minutes = (exp_dt - now_utc).total_seconds() / 60.0
        self.assertGreaterEqual(diff_minutes, 58.0, "Created JWT access token expiration must be at least 60 minutes")

    def test_post_coding_next_question_flow(self):
        db = next(get_db())
        # Create session
        session = InterviewSession(
            user_id=self.user.id,
            role="Python Engineer",
            skills=["Python", "FastAPI"],
            status="in_progress"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # Question 1 (Behavioral)
        q1 = Question(session_id=session.id, question_text="Describe your experience with Python async.", category="behavioral", order=1)
        db.add(q1)
        db.commit()

        # Question 2 (Coding)
        q2 = Question(session_id=session.id, question_text="CODING ROUND: [first_unique_char] First Unique Char", category="coding", order=2)
        db.add(q2)
        db.commit()

        token = create_access_token(data={"sub": self.user.id})
        headers = {"Authorization": f"Bearer {token}"}

        # Submit code for coding round
        code_payload = {
            "code": "def solve(): pass",
            "language": "python",
            "question_id": "first_unique_char"
        }
        sub_res = self.client.post(f"/api/interview/{session.id}/submit-code", json=code_payload, headers=headers)
        self.assertEqual(sub_res.status_code, 200)

        # Now call /api/next-question endpoint
        next_res = self.client.post("/api/next-question", json={"session_id": session.id}, headers=headers)
        self.assertEqual(next_res.status_code, 200)
        data = next_res.json()

        self.assertIn("question", data)
        q_text = data["question"]
        # Ensure question returned is a real question, NOT "Great work completing..."
        self.assertFalse(q_text.startswith("Great work"), f"Returned next question must not be a compliment string! Got: {q_text}")
        self.assertNotIn("completing the live coding", q_text.lower())
        self.assertGreater(len(q_text), 15)

if __name__ == "__main__":
    unittest.main()
