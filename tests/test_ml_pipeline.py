import os
import sys
import unittest
from pathlib import Path

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from ml.dataset_loader import extract_text_pairs
from ml.predictor import get_predictor, ResumeDomainMatchPredictor
from modules.ats_checker import check_ats_score
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestMLPipeline(unittest.TestCase):

    def test_dataset_pair_extraction(self):
        """Verify that extract_text_pairs correctly separates resume and job description strings."""
        sample_text = "Experienced Python Software Engineer [SEP] Looking for a Senior Backend Developer with Python experience."
        resumes, jobs = extract_text_pairs([sample_text])
        self.assertEqual(len(resumes), 1)
        self.assertEqual(len(jobs), 1)
        self.assertIn("Experienced Python", resumes[0])
        self.assertIn("Looking for a Senior Backend", jobs[0])

    def test_predictor_singleton_initialization(self):
        """Verify singleton instance of ResumeDomainMatchPredictor."""
        p1 = get_predictor()
        p2 = get_predictor()
        self.assertIs(p1, p2)
        self.assertIsInstance(p1, ResumeDomainMatchPredictor)

    def test_predictor_normal_input(self):
        """Verify prediction on a valid matching resume and job description pair."""
        predictor = get_predictor()
        resume = "Experienced Python Backend Developer proficient in FastAPI, SQL, Docker, and REST APIs."
        job = "We are seeking a Backend Engineer with strong Python, FastAPI, PostgreSQL, and Docker skills."
        
        result = predictor.predict(resume, job)
        self.assertIn("prediction", result)
        self.assertIn(result["prediction"], [0, 1])
        self.assertIn("label", result)
        self.assertIn(result["label"], ["Same Domain", "Cross Domain"])
        self.assertIn("match_probability", result)
        self.assertTrue(0.0 <= result["match_probability"] <= 1.0)
        self.assertEqual(result["model_version"], "v2.1")
        self.assertIn("inference_latency_ms", result)

    def test_predictor_explainability_output(self):
        """Verify semantic similarity and matching terms in explanation dictionary."""
        predictor = get_predictor()
        resume = "Python Developer with Django, FastAPI, React, SQL, and Docker experience."
        job = "Looking for Python Engineer with Django, SQL, and Docker knowledge."
        
        result = predictor.predict(resume, job)
        self.assertIn("explanation", result)
        explanation = result["explanation"]
        self.assertIn("semantic_similarity", explanation)
        self.assertIn("matching_terms", explanation)
        self.assertIn("top_positive_signals", explanation)
        self.assertIn("top_negative_signals", explanation)
        self.assertIsInstance(explanation["matching_terms"], list)

    def test_predictor_edge_cases(self):
        """Test predictor resiliency against empty, malformed, or excessively long input strings."""
        predictor = get_predictor()
        
        # 1. Empty resume
        res_empty = predictor.predict("", "Job description text")
        self.assertEqual(res_empty["prediction"], 0)
        self.assertEqual(res_empty["label"], "Invalid Input")
        self.assertIn("error", res_empty)
        
        # 2. Empty job description
        res_no_job = predictor.predict("Software engineer resume text", "")
        self.assertIn(res_no_job["prediction"], [0, 1])
        self.assertTrue(0.0 <= res_no_job["match_probability"] <= 1.0)
        
        # 3. Very long input string
        long_resume = "Python developer " * 500
        long_job = "Backend role " * 500
        res_long = predictor.predict(long_resume, long_job)
        self.assertIn(res_long["prediction"], [0, 1])

    def test_ats_scoring_weighted_formula(self):
        """Verify check_ats_score returns normalized overall score and sub_scores dictionary."""
        resume = "John Doe\nEmail: john@example.com\nPhone: 123-456-7890\nSkills: Python, FastAPI, Docker, SQL\nExperience: Developed REST APIs and microservices using Python."
        job = "Seeking Python Developer with FastAPI and SQL experience."
        
        ats_result = check_ats_score(resume, job)
        self.assertIn("score", ats_result)
        self.assertTrue(0 <= ats_result["score"] <= 100)
        self.assertIn("sub_scores", ats_result)
        sub = ats_result["sub_scores"]
        self.assertIn("keyword_match", sub)
        self.assertIn("formatting", sub)
        self.assertIn("action_verbs", sub)
        self.assertIn("quantified_impact", sub)
        self.assertIn("section_completeness", sub)

    def test_ml_fastapi_endpoint_integration(self):
        """Test FastAPI POST /api/ml/resume-job-match endpoint."""
        payload = {
            "resume_text": "Experienced Python Software Engineer",
            "job_description": "Senior Python Backend Developer needed"
        }
        response = client.post("/api/ml/resume-job-match", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("prediction", data)
        self.assertIn("match_probability", data)
        self.assertIn("explanation", data)
        self.assertEqual(data["model_version"], "v2.1")

if __name__ == "__main__":
    unittest.main()
