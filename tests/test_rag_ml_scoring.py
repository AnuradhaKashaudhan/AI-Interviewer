import os
import sys
import unittest
import uuid
from pathlib import Path

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from database import engine, Base, SessionLocal, ensure_rag_columns
from models import User, InterviewSession, Question, Answer, Evaluation
from rag.scoring import RAGMLScorer
from rag.skill_profile import CandidateSkillProfileManager
from modules.answer_evaluator import evaluate_answer, extract_concept_coverage, detect_technical_errors
from modules.interview_manager import start_interview, store_answer, next_question


class TestRAGMLScoringPart4(unittest.TestCase):

    def setUp(self):
        Base.metadata.create_all(bind=engine)
        ensure_rag_columns(engine)
        self.db = SessionLocal()

        unique_email = f"part4_test_{uuid.uuid4().hex[:8]}@example.com"
        self.user = User(email=unique_email, fullName="Part4 Candidate", hashed_password="hashed")
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

    def test_qa_relevance_calculation(self):
        """Verify SBERT QA relevance score produces high value for direct answers and low value for off-topic answers."""
        scorer = RAGMLScorer()
        question = "What is database normalization?"
        relevant_ans = "Database normalization reduces data redundancy across tables using normal forms."
        offtopic_ans = "React is a JavaScript frontend library for building component-based UIs."

        rel_high = scorer.compute_qa_relevance(question, relevant_ans)
        rel_low = scorer.compute_qa_relevance(question, offtopic_ans)

        self.assertTrue(rel_high > rel_low)
        self.assertTrue(rel_high >= 0.40)
        self.assertTrue(rel_low <= 0.30)

    def test_sentence_aggregate_similarity(self):
        """Verify sentence-level aggregation calculates similarity across multi-sentence candidate answers."""
        scorer = RAGMLScorer()
        evidence = ["Overfitting occurs when a model learns training noise. Prevent it using regularization."]
        ans = "Overfitting is when a model fits noise. We use L1/L2 regularization to generalize better."

        sim = scorer.compute_sentence_aggregate_similarity(ans, evidence)
        self.assertTrue(0.0 <= sim <= 1.0)
        self.assertTrue(sim >= 0.40)

    def test_concept_coverage_extraction_multiword(self):
        """Verify extract_concept_coverage extracts multi-word technical concepts and ignores generic stopwords."""
        answer = "We use l1/l2 regularization and cross-validation to prevent overfitting."
        evidence = ["L1/L2 regularization and cross-validation are standard techniques to prevent overfitting in machine learning."]

        covered, missing, ratio = extract_concept_coverage(answer, evidence)
        self.assertTrue(len(covered) > 0)
        self.assertTrue(ratio > 0.0)

    def test_multitier_error_detection(self):
        """Verify detect_technical_errors classifies error types and applies proportional penalties."""
        err_answer = "Overfitting causes poorly on training data and decreases training accuracy."
        evidence = ["Overfitting occurs when a model performs exceptionally well on training data."]

        errors, penalty = detect_technical_errors(err_answer, evidence)
        self.assertTrue(len(errors) > 0)
        self.assertIn("Explicit Contradiction", errors[0])
        self.assertTrue(penalty >= 15.0)

    def test_evidence_quality_and_eval_confidence(self):
        """Verify evaluation confidence calculation based on evidence quality and alignment clarity."""
        scorer = RAGMLScorer()
        quality = scorer.compute_evidence_quality([])
        conf = scorer.compute_evaluation_confidence(evidence_quality=0.8, sbert_similarity=0.75, qa_relevance=0.85, error_count=1)

        self.assertTrue(0.0 <= quality <= 1.0)
        self.assertTrue(0.0 <= conf <= 1.0)
        self.assertTrue(conf >= 0.70)

    def test_deterministic_ml_scoring_without_llm(self):
        """Verify RAGMLScorer.calculate_ml_scores produces structured evaluation scores deterministically without LLM calls."""
        scorer = RAGMLScorer()
        res = scorer.calculate_ml_scores(
            question="What is overfitting in machine learning?",
            answer="Overfitting happens when a model fits training noise. We prevent it with regularization.",
            retrievals=[],
            evidence_texts=["Overfitting occurs when a model learns noise in training data. Regularization helps."],
            covered_concepts=["overfitting", "regularization"],
            missing_concepts=["cross-validation"],
            coverage_ratio=0.66,
            technical_errors=[],
            error_penalty=0.0
        )

        self.assertIn("score", res)
        self.assertIn("overall_score", res)
        self.assertIn("technical_accuracy_score", res)
        self.assertIn("relevance_score", res)
        self.assertIn("qa_relevance", res)
        self.assertIn("evidence_coverage", res)
        self.assertIn("evaluation_confidence", res)
        self.assertEqual(res["scoring_version"], "v2.0-ml-rag")
        self.assertTrue(res["overall_score"] > 0)

    def test_candidate_skill_profile_manager(self):
        """Verify CandidateSkillProfileManager updates topic metrics and constructs contextual RAG queries targeting skill gaps."""
        mgr = CandidateSkillProfileManager()
        eval_res = {
            "overall_score": 60,
            "technical_accuracy_score": 55,
            "evidence_coverage": 0.40,
            "evaluation_confidence": 0.85,
            "missing_concepts": ["cross-validation", "hyperparameters"],
            "weaknesses": ["Lacks depth in validation"]
        }

        updated = mgr.update_profile("Machine learning", eval_res)
        self.assertEqual(updated["topic"], "Machine learning")
        self.assertEqual(updated["questions_attempted"], 1)

        query = mgr.get_contextual_rag_query(role="ML Engineer", current_topic="Machine learning", difficulty="medium")
        self.assertIn("Machine learning", query)

    def test_store_answer_part4_db_persistence(self):
        """Verify store_answer persists Part 4 ML metadata fields into Evaluation table."""
        from unittest.mock import patch
        with patch("modules.answer_evaluator.get_gemini_client", return_value=None), \
             patch("modules.interview_manager.get_gemini_client", return_value=None):
            session_id, questions = start_interview(
                db=self.db,
                user_id=self.user.id,
                resume_skills=["Machine Learning"],
                role="Machine Learning Engineer"
            )

            q_text = questions[0]
            eval_result = store_answer(
                db=self.db,
                session_id=session_id,
                user_id=self.user.id,
                question_text=q_text,
                answer_text="Overfitting happens when a model learns noise in training data. We prevent it using L1/L2 regularization."
            )

            self.assertIsNotNone(eval_result)
            self.assertIn("score", eval_result)
            self.assertIn("evaluation_confidence", eval_result)

            eval_record = self.db.query(Evaluation).join(Answer).join(Question).filter(Question.session_id == session_id).first()
            self.assertIsNotNone(eval_record)
            self.assertIsNotNone(eval_record.evidence_coverage)
            self.assertIsNotNone(eval_record.qa_relevance)
            self.assertIsNotNone(eval_record.evaluation_confidence)
            self.assertEqual(eval_record.scoring_version, "v2.0-ml-rag")


if __name__ == "__main__":
    unittest.main()
