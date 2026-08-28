import os
import sys
import json
import logging
from pathlib import Path
import torch
import numpy as np

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
SBERT_MODEL_DIR = BASE_DIR / "models" / "sbert_minilm"
BASELINE_MODEL_PATH = BASE_DIR / "models" / "baseline_tfidf" / "baseline_pipeline.pkl"
RESULTS_PATH = BASE_DIR.parent.parent / "ML_RESULTS.md"

class ResumeDomainMatchPredictor:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ResumeDomainMatchPredictor, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.sbert_model = None
        self.sbert_clf = None
        self.sbert_threshold = 0.45
        self.baseline_pipeline = None
        self.active_model_type = "None"
        self.artifact_path = "None"
        self._load_models()
        self._initialized = True

    def _load_models(self):
        """
        Loads the selected Production Champion Model based on held-out test set evidence.
        Sentence-BERT + Logistic Regression (all-MiniLM-L6-v2) is loaded as champion.
        TF-IDF + Logistic Regression is loaded as fallback baseline.
        """
        import joblib

        # 1. Load Production Champion: Sentence-BERT (all-MiniLM-L6-v2)
        sbert_clf_file = SBERT_MODEL_DIR / "sbert_classifier.pkl"
        if sbert_clf_file.exists():
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading Sentence-BERT model 'all-MiniLM-L6-v2' and classifier from {SBERT_MODEL_DIR}...")
                self.sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
                self.sbert_model.max_seq_length = 128
                sbert_artifact = joblib.load(sbert_clf_file)
                self.sbert_clf = sbert_artifact["clf"]
                self.sbert_threshold = sbert_artifact.get("threshold", 0.45)
                self.active_model_type = "Sentence-BERT + Logistic Regression (all-MiniLM-L6-v2)"
                self.artifact_path = str(sbert_clf_file)
                logger.info("Sentence-BERT production champion predictor successfully initialized.")
            except Exception as e:
                logger.warning(f"Failed to load Sentence-BERT champion model: {e}")

        # 2. Load Fallback Baseline: TF-IDF + Logistic Regression
        if BASELINE_MODEL_PATH.exists():
            try:
                logger.info(f"Loading TF-IDF Baseline from {BASELINE_MODEL_PATH}...")
                self.baseline_pipeline = joblib.load(BASELINE_MODEL_PATH)
                if self.sbert_clf is None:
                    self.active_model_type = "TF-IDF + Logistic Regression (Baseline Model)"
                    self.artifact_path = str(BASELINE_MODEL_PATH)
                logger.info("TF-IDF Baseline predictor successfully initialized.")
            except Exception as e:
                logger.error(f"Failed to load baseline model: {e}")

        if self.sbert_clf is None and self.baseline_pipeline is None:
            logger.warning("No trained ML model artifacts found.")

    def _explain_prediction(self, resume_text: str, job_description: str, cos_sim: float = 0.0) -> dict:
        """
        Surfaces valid semantic and lexical explainability for predictions.
        """
        matching_terms = []
        top_positive_signals = []
        top_negative_signals = []

        try:
            # 1. Lexical N-gram feature contribution from TF-IDF pipeline if loaded
            formatted_text = f"{resume_text.strip()} [SEP] {job_description.strip() if job_description else ''}"
            if self.baseline_pipeline and hasattr(self.baseline_pipeline, "named_steps"):
                vectorizer = self.baseline_pipeline.named_steps.get('tfidf')
                clf = self.baseline_pipeline.named_steps.get('clf')

                if vectorizer and clf and hasattr(clf, "coef_"):
                    feature_names = vectorizer.get_feature_names_out()
                    X_vec = vectorizer.transform([formatted_text])
                    non_zero_indices = X_vec.nonzero()[1]
                    if len(non_zero_indices) > 0:
                        coefs = clf.coef_[0]
                        contributions = X_vec.data * coefs[non_zero_indices]
                        terms = feature_names[non_zero_indices]

                        sorted_idx = np.argsort(contributions)
                        pos_idx = sorted_idx[contributions[sorted_idx] > 0][::-1]
                        neg_idx = sorted_idx[contributions[sorted_idx] < 0]

                        top_positive_signals = [str(terms[i]) for i in pos_idx[:6]]
                        top_negative_signals = [str(terms[i]) for i in neg_idx[:6]]

            # 2. Direct technical skill term overlap between resume and job description
            if resume_text and job_description:
                import re
                r_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', resume_text.lower()))
                j_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', job_description.lower()))
                stopwords = {"and", "the", "for", "with", "that", "this", "from", "you", "are", "have", "will", "our", "your", "work", "team", "year", "years"}
                common = (r_words & j_words) - stopwords
                matching_terms = sorted(list(common))[:8]

        except Exception as e:
            logger.warning(f"Failed to generate explainability report: {e}")

        return {
            "semantic_similarity": round(float(cos_sim), 4),
            "matching_terms": matching_terms,
            "top_positive_signals": top_positive_signals,
            "top_negative_signals": top_negative_signals
        }

    def predict(self, resume_text: str, job_description: str) -> dict:
        """
        Executes real domain-matching inference for given resume text and job description.
        Returns label, prediction (0/1), match probability, active model name, model version, and explainability fields.
        """
        import time
        start_time = time.time()

        if not resume_text or not resume_text.strip():
            return {
                "prediction": 0,
                "label": "Invalid Input",
                "match_probability": 0.0,
                "model": self.active_model_type,
                "model_version": "v2.1",
                "error": "Resume text cannot be empty.",
                "explanation": {
                    "semantic_similarity": 0.0,
                    "matching_terms": [],
                    "top_positive_signals": [],
                    "top_negative_signals": []
                }
            }

        # 1. Champion Model: Sentence-BERT + Logistic Regression Inference
        if self.sbert_model and self.sbert_clf:
            try:
                res_clean = resume_text.strip()
                job_clean = job_description.strip() if job_description else ""

                u = self.sbert_model.encode([res_clean], show_progress_bar=False, normalize_embeddings=True)
                v = self.sbert_model.encode([job_clean], show_progress_bar=False, normalize_embeddings=True)

                abs_diff = np.abs(u - v)
                hadamard = u * v
                cos_sim = np.sum(u * v, axis=1, keepdims=True)
                X_feat = np.hstack([u, v, abs_diff, hadamard, cos_sim])

                probs = self.sbert_clf.predict_proba(X_feat)[0]
                prob_match = float(probs[1])
                prediction_class = 1 if prob_match >= self.sbert_threshold else 0
                label_str = "Same Domain" if prediction_class == 1 else "Cross Domain"
                latency_ms = round((time.time() - start_time) * 1000, 2)

                explanation = self._explain_prediction(resume_text, job_description, cos_sim=float(cos_sim[0][0]))

                return {
                    "prediction": prediction_class,
                    "label": label_str,
                    "match_probability": round(prob_match, 4),
                    "model": "Sentence-BERT + Logistic Regression (all-MiniLM-L6-v2)",
                    "model_version": "v2.1",
                    "inference_latency_ms": latency_ms,
                    "explanation": explanation
                }
            except Exception as e:
                logger.error(f"Sentence-BERT inference error: {e}")

        # 2. Fallback Model: TF-IDF + Logistic Regression Inference
        if self.baseline_pipeline:
            try:
                formatted_text = f"{resume_text.strip()} [SEP] {job_description.strip() if job_description else ''}"
                probs = self.baseline_pipeline.predict_proba([formatted_text])[0]
                prob_match = float(probs[1])
                prediction_class = int(np.argmax(probs))
                label_str = "Same Domain" if prediction_class == 1 else "Cross Domain"
                latency_ms = round((time.time() - start_time) * 1000, 2)
                explanation = self._explain_prediction(resume_text, job_description)

                return {
                    "prediction": prediction_class,
                    "label": label_str,
                    "match_probability": round(prob_match, 4),
                    "model": "TF-IDF + Logistic Regression (Fallback)",
                    "model_version": "v2.1",
                    "inference_latency_ms": latency_ms,
                    "explanation": explanation
                }
            except Exception as e:
                logger.error(f"Baseline inference error: {e}")

        # 3. Controlled Service Fallback if models are unavailable
        return {
            "prediction": 0,
            "label": "Model Initializing",
            "match_probability": 0.50,
            "model": "System Initializing",
            "model_version": "v2.1",
            "note": "ML model artifact loading pending.",
            "explanation": self._explain_prediction(resume_text, job_description)
        }

# Singleton accessor
def get_predictor() -> ResumeDomainMatchPredictor:
    return ResumeDomainMatchPredictor()


