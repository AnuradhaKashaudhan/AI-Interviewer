import os
import sys
import json
import logging
from pathlib import Path
import torch
import numpy as np

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DISTILBERT_MODEL_DIR = BASE_DIR / "models" / "distilbert_resume_job_match"
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
        self.model = None
        self.tokenizer = None
        self.baseline_pipeline = None
        self.active_model_type = "None"
        self.artifact_path = "None"
        self._load_models()
        self._initialized = True

    def _load_models(self):
        """
        Loads the selected Champion Model based on empirical evaluation (ML_RESULTS.md).
        TF-IDF + Logistic Regression is loaded as champion (F1=0.6738 vs DistilBERT F1=0.0000).
        """
        # 1. Load Champion Model: TF-IDF + Logistic Regression Baseline
        if BASELINE_MODEL_PATH.exists():
            try:
                import joblib
                logger.info(f"Loading Champion Model (TF-IDF Baseline) from {BASELINE_MODEL_PATH}...")
                self.baseline_pipeline = joblib.load(BASELINE_MODEL_PATH)
                self.active_model_type = "TF-IDF + Logistic Regression (Champion Model)"
                self.artifact_path = str(BASELINE_MODEL_PATH)
                logger.info("TF-IDF Baseline champion predictor successfully initialized.")
                return
            except Exception as e:
                logger.error(f"Failed to load baseline champion model: {e}")

        # 2. Check DistilBERT artifact fallback if baseline is unavailable
        if (DISTILBERT_MODEL_DIR / "config.json").exists():
            try:
                from transformers import AutoTokenizer, AutoModelForSequenceClassification
                logger.info(f"Loading Fine-Tuned DistilBERT from {DISTILBERT_MODEL_DIR}...")
                self.tokenizer = AutoTokenizer.from_pretrained(str(DISTILBERT_MODEL_DIR))
                self.model = AutoModelForSequenceClassification.from_pretrained(str(DISTILBERT_MODEL_DIR))
                self.model.to(self.device)
                self.model.eval()
                self.active_model_type = "Fine-Tuned DistilBERT (Experimental)"
                self.artifact_path = str(DISTILBERT_MODEL_DIR)
                logger.info("DistilBERT predictor successfully initialized.")
                return
            except Exception as e:
                logger.warning(f"Failed to load DistilBERT model: {e}")

        logger.warning("No trained ML model artifacts found.")

    def predict(self, resume_text: str, job_description: str) -> dict:
        """
        Executes real domain-matching inference for given resume text and job description.
        Returns label, prediction (0/1), match probability, active model name, and artifact path.
        """
        if not resume_text or not resume_text.strip():
            return {
                "prediction": 0,
                "label": "Invalid Input",
                "match_probability": 0.0,
                "model": self.active_model_type,
                "error": "Resume text cannot be empty."
            }

        # Form combined text with explicit [SEP] token
        formatted_text = f"{resume_text.strip()} [SEP] {job_description.strip() if job_description else ''}"

        # 1. Champion Model: Baseline TF-IDF + Logistic Regression Inference
        if self.baseline_pipeline:
            try:
                probs = self.baseline_pipeline.predict_proba([formatted_text])[0]
                prob_match = float(probs[1])
                prediction_class = int(np.argmax(probs))
                label_str = "Same Domain" if prediction_class == 1 else "Cross Domain"

                return {
                    "prediction": prediction_class,
                    "label": label_str,
                    "match_probability": round(prob_match, 4),
                    "model": self.active_model_type
                }
            except Exception as e:
                logger.error(f"Baseline inference error: {e}")

        # 2. Experimental DistilBERT Inference (Fallback)
        if self.model and self.tokenizer:
            try:
                inputs = self.tokenizer(
                    formatted_text,
                    truncation=True,
                    max_length=512,
                    padding=True,
                    return_tensors="pt"
                ).to(self.device)

                with torch.no_grad():
                    outputs = self.model(**inputs)
                    logits = outputs.logits
                    probabilities = torch.softmax(logits, dim=-1)[0]
                    prob_match = float(probabilities[1].item())
                    prediction_class = int(torch.argmax(probabilities).item())

                label_str = "Same Domain" if prediction_class == 1 else "Cross Domain"
                return {
                    "prediction": prediction_class,
                    "label": label_str,
                    "match_probability": round(prob_match, 4),
                    "model": self.active_model_type,
                    "device": str(self.device)
                }
            except Exception as e:
                logger.error(f"DistilBERT inference error: {e}")

        # 3. Controlled Service Fallback if models are unavailable
        return {
            "prediction": 0,
            "label": "Model Initializing",
            "match_probability": 0.50,
            "model": "System Initializing",
            "note": "ML model artifact loading pending."
        }

# Singleton accessor
def get_predictor() -> ResumeDomainMatchPredictor:
    return ResumeDomainMatchPredictor()
