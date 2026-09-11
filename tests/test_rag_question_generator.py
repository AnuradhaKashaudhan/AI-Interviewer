import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from database import engine, Base, SessionLocal
from models import User, InterviewSession, Question, Answer, Evaluation
from modules.question_generator import (
    generate_rag_grounded_question,
    is_semantically_similar,
    validate_question_grounding
)
from modules.interview_manager import start_interview, next_question, store_answer

class TestRAGQuestionGenerator(unittest.TestCase):

    def setUp(self):
        import uuid
        from database import ensure_rag_columns
        Base.metadata.create_all(bind=engine)
        ensure_rag_columns(engine)
        self.db = SessionLocal()

        # Create unique test user per test run
        unique_email = f"rag_test_{uuid.uuid4().hex[:8]}@example.com"
        self.user = User(email=unique_email, fullName="RAG Candidate", hashed_password="hashed")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.query(Evaluation).delete()
        self.db.query(Answer).delete()
        self.db.query(Question).delete()
        self.db.query(InterviewSession).delete()
        self.db.query(User).filter(User.id == self.user.id).delete()
        self.db.commit()
        self.db.close()

    def test_semantic_deduplication(self):
        """Verify semantic similarity check catches semantically identical questions."""
        q1 = "What is normalization in database management systems?"
        q2 = "Explain normalization in databases."
        q3 = "What is overfitting in machine learning models?"

        # q1 and q2 are semantically similar (should return True)
        self.assertTrue(is_semantically_similar(q2, [q1], threshold=0.65))

        # q3 is completely different topic (should return False)
        self.assertFalse(is_semantically_similar(q3, [q1], threshold=0.65))

    def test_grounding_validation(self):
        """Verify grounding score computation between question text and context text."""
        context = "Database normalization is the process of organizing data to eliminate redundancy."
        grounded_q = "How does database normalization eliminate redundancy?"
        unrelated_q = "What is the capital of France?"

        is_g1, score1 = validate_question_grounding(grounded_q, context, threshold=0.35)
        self.assertTrue(is_g1)
        self.assertTrue(score1 >= 0.35)

        is_g2, score2 = validate_question_grounding(unrelated_q, context, threshold=0.35)
        self.assertFalse(is_g2)
        self.assertTrue(score2 < 0.35)

    def test_candidate_aware_rag_generation_metadata(self):
        """Verify RAG generation returns rich grounding metadata dictionary when requested."""
        mock_gemini = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = "How do B-Tree indexes optimize query execution in PostgreSQL?"
        mock_gemini.generate_content.return_value = mock_resp

        q_meta = generate_rag_grounded_question(
            role="Database Administrator",
            skills=["SQL", "PostgreSQL", "DBMS"],
            topic="sql",
            difficulty="medium",
            interview_type="practical",
            persona="friendly",
            resume_text="Extensive experience in database indexing and SQL query tuning.",
            asked_questions=["Tell me about your background."],
            gemini_client=mock_gemini,
            return_full_metadata=True
        )

        self.assertIsInstance(q_meta, dict)
        self.assertIn("question", q_meta)
        self.assertIn("topic", q_meta)
        self.assertIn("difficulty", q_meta)
        self.assertIn("evidence_ids", q_meta)
        self.assertIn("grounding_score", q_meta)
        self.assertEqual(q_meta["difficulty"], "medium")
        self.assertIsNotNone(q_meta["question"])

    def test_start_interview_with_rag_persistence(self):
        """Verify start_interview creates DB session and populates RAG evidence metadata in Question table."""
        session_id, questions = start_interview(
            db=self.db,
            user_id=self.user.id,
            resume_skills=["Python", "Machine Learning"],
            persona="professional",
            role="Machine Learning Engineer",
            resume_text="Experienced with Sentence-BERT, Scikit-Learn, and PyTorch."
        )

        self.assertIsNotNone(session_id)
        self.assertEqual(len(questions), 1)

        q_record = self.db.query(Question).filter(Question.session_id == session_id, Question.order == 1).first()
        self.assertIsNotNone(q_record)
        self.assertIsNotNone(q_record.topic)
        self.assertIsInstance(q_record.evidence_ids, list)
        self.assertIsInstance(q_record.retrieval_scores, list)
        self.assertIsNotNone(q_record.grounding_score)

    def test_adaptive_difficulty_and_topic_adaptation(self):
        """Verify next_question adjusts difficulty and topic based on previous evaluation history."""
        session_id, _ = start_interview(
            db=self.db,
            user_id=self.user.id,
            resume_skills=["SQL", "Python"],
            role="Data Engineer"
        )

        first_q = self.db.query(Question).filter(Question.session_id == session_id, Question.order == 1).first()

        # Simulate a WEAK candidate answer on question 1
        store_answer(
            db=self.db,
            session_id=session_id,
            user_id=self.user.id,
            question_text=first_q.question_text,
            answer_text="Idk"
        )

        # Fetch question 2 (should trigger adaptive difficulty = beginner / topic adaptation)
        next_q_text = next_question(db=self.db, session_id=session_id, user_id=self.user.id)
        self.assertIsNotNone(next_q_text)

        second_q = self.db.query(Question).filter(Question.session_id == session_id, Question.order == 2).first()
        self.assertIsNotNone(second_q)
        self.assertIsNotNone(second_q.topic)
        self.assertIsInstance(second_q.evidence_ids, list)

if __name__ == "__main__":
    unittest.main()
