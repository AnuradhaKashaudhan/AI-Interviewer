import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from main import app
from database import get_db, Base, engine
from models import User, InterviewSession, Question, Answer, Evaluation
from auth import create_access_token

class TestCodingAPIIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        
        # Setup test user and session in DB
        db = next(get_db())
        test_user = db.query(User).filter(User.email == "test_coding@example.com").first()
        if not test_user:
            test_user = User(
                email="test_coding@example.com",
                fullName="Test Coding Candidate",
                hashed_password="hashed_password"
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        
        cls.user = test_user
        cls.token = create_access_token(data={"sub": test_user.id})

        # Create session
        session = InterviewSession(
            user_id=test_user.id,
            role="Python Backend Developer",
            skills=["Python", "FastAPI"],
            status="in_progress"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        cls.session_id = session.id

    def test_get_coding_question_endpoint(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        res = self.client.get(f"/api/interview/{self.session_id}/coding-question", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("id", data)
        self.assertIn("title", data)
        self.assertIn("question_text", data)
        self.assertIn("starter_code", data)
        self.assertIn("sample_test_cases", data)
        # Verify hidden test cases are NOT exposed
        self.assertNotIn("hidden_test_cases", data)

    def test_run_code_endpoint(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        python_code = """
def first_uniq_char(s: str) -> str:
    counts = {}
    for char in s:
        counts[char] = counts.get(char, 0) + 1
    for char in s:
        if counts[char] == 1:
            return char
    return "-1"

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    print(first_uniq_char(input_str))
"""
        payload = {
            "code": python_code,
            "language": "python",
            "question_id": "first_unique_char"
        }
        res = self.client.post(f"/api/interview/{self.session_id}/run-code", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("passed_tests", data)
        self.assertIn("total_tests", data)
        self.assertIn("test_details", data)
        self.assertEqual(data["passed_tests"], 2) # Sample test cases count for first_unique_char

    def test_submit_code_endpoint(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        python_code = """
def first_uniq_char(s: str) -> str:
    counts = {}
    for char in s:
        counts[char] = counts.get(char, 0) + 1
    for char in s:
        if counts[char] == 1:
            return char
    return "-1"

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    print(first_uniq_char(input_str))
"""
        payload = {
            "code": python_code,
            "language": "python",
            "question_id": "first_unique_char"
        }
        res = self.client.post(f"/api/interview/{self.session_id}/submit-code", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("passed_tests", data)
        self.assertIn("total_tests", data)
        self.assertIn("score", data)
        self.assertIn("feedback", data)
        self.assertIn("complexity", data)
        self.assertEqual(data["passed_tests"], 5) # 5 hidden test cases for first_unique_char
        self.assertGreaterEqual(data["score"], 70) # Passed 100% test cases -> minimum score >= 70

if __name__ == "__main__":
    unittest.main()
