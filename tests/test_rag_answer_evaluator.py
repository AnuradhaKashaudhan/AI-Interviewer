import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from database import engine, Base, SessionLocal, ensure_rag_columns
from models import User, InterviewSession, Question, Answer, Evaluation
from modules.answer_evaluator import (
    evaluate_answer,
    extract_concept_coverage,
    detect_technical_errors
)
from modules.interview_manager import start_interview, next_question, store_answer, generate_final_report

class TestRAGAnswerEvaluator(unittest.TestCase):

    def setUp(self):
        import uuid
        Base.metadata.create_all(bind=engine)
        ensure_rag_columns(engine)
        self.db = SessionLocal()

        unique_email = f"eval_test_{uuid.uuid4().hex[:8]}@example.com"
        self.user = User(email=unique_email, fullName="Eval Candidate", hashed_password="hashed")
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

    def test_concept_coverage_extraction(self):
        """Verify extract_concept_coverage identifies covered vs missing technical terms."""
        answer = "Overfitting is when a model learns training data noise and fails to generalize."
        evidence = [
            "Overfitting occurs when a model learns noise in training data. Prevention techniques include regularization, early stopping, and cross-validation."
        ]

        covered, missing, ratio = extract_concept_coverage(answer, evidence)
        self.assertIn("overfitting", covered)
        self.assertIn("training", covered)
        self.assertIn("regularization", missing)
        self.assertTrue(0.0 <= ratio <= 1.0)

    def test_technical_error_detection(self):
        """Verify detect_technical_errors catches contradictory technical statements."""
        err_answer = "Overfitting means the model performs poorly on training data but well on test data."
        evidence = ["Overfitting occurs when a model performs exceptionally well on training data."]

        errors, penalty = detect_technical_errors(err_answer, evidence)
        self.assertTrue(len(errors) > 0)
        self.assertTrue(penalty >= 15.0)

    def test_rag_grounded_answer_evaluation_structure(self):
        """Verify evaluate_answer returns structured scores, evidence list, and SBERT similarity."""
        mock_gemini = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = """{
          "relevance_score": 90,
          "llm_accuracy_score": 88,
          "completeness_score": 85,
          "depth_score": 80,
          "clarity_score": 90,
          "confidence_score": 85,
          "feedback": "Great explanation of overfitting and regularization.",
          "strengths": ["Clear definition", "Mentioned regularization"],
          "weaknesses": ["Could mention cross-validation"],
          "missing_keywords": ["cross-validation"],
          "suggested_answer": "Overfitting happens when a model fits noise. Prevent it using regularization.",
          "next_question": "What is the difference between L1 and L2 regularization?",
          "difficulty": "medium",
          "answer_quality": "strong"
        }"""
        mock_gemini.generate_content.return_value = mock_resp

        res = evaluate_answer(
            question="What is overfitting in machine learning?",
            answer="Overfitting is when a model fits noise in training data. We prevent it with L1/L2 regularization.",
            role="Machine Learning Engineer",
            skills=["Machine Learning"],
            topic="machine_learning",
            client=mock_gemini
        )

        self.assertIn("overall_score", res)
        self.assertIn("technical_accuracy_score", res)
        self.assertIn("relevance_score", res)
        self.assertIn("evidence", res)
        self.assertIn("semantic_similarity", res)
        self.assertTrue(res["overall_score"] > 0)

    def test_store_answer_with_evaluation_rag_persistence(self):
        """Verify store_answer persists RAG evidence metadata in Evaluation table."""
        session_id, questions = start_interview(
            db=self.db,
            user_id=self.user.id,
            resume_skills=["SQL", "Database"],
            role="Database Administrator"
        )

        q_text = questions[0]
        eval_result = store_answer(
            db=self.db,
            session_id=session_id,
            user_id=self.user.id,
            question_text=q_text,
            answer_text="Database normalization reduces data redundancy across tables using normal forms like 1NF, 2NF, and 3NF."
        )

        self.assertIsNotNone(eval_result)
        self.assertIn("score", eval_result)

        eval_record = self.db.query(Evaluation).join(Answer).join(Question).filter(Question.session_id == session_id).first()
        self.assertIsNotNone(eval_record)
        self.assertIsNotNone(eval_record.semantic_similarity)
        self.assertIsInstance(eval_record.evidence_ids, list)

    def test_generate_final_report_integration(self):
        """Verify generate_final_report aggregates evaluation metrics across DB records."""
        session_id, questions = start_interview(
            db=self.db,
            user_id=self.user.id,
            resume_skills=["Python"],
            role="Python Developer"
        )

        first_q = questions[0]
        store_answer(self.db, session_id, self.user.id, first_q, "Python uses a reference counting garbage collector combined with a cyclic garbage collector.")

        report = generate_final_report(self.db, session_id, self.user.id)
        self.assertIsNotNone(report)
        self.assertIn("total_score", report)
        self.assertIn("technical_score", report)
        self.assertIn("communication_score", report)
        self.assertTrue(report["total_score"] > 0)

if __name__ == "__main__":
    unittest.main()
