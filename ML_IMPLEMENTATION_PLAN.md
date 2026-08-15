# ML Implementation Plan: Resume–Job Domain Matching Engine

## 1. Executive Summary & Core Mandate
This document outlines the architectural plan for integrating a real Machine Learning / Deep Learning model (**Fine-tuned DistilBERT**) and NLP baseline (**TF-IDF + Logistic Regression**) into the existing **AI Interviewer & ATS Optimization Platform**.

**Primary Constraint:** **DO NOT BREAK EXISTING FUNCTIONALITY.**
- The existing working application, authentication (JWT/Supabase), FastAPI routes, Gemini evaluation, OpenAI Whisper ASR, PyTTSX3 TTS, Piston code execution runner, and heuristic ATS engine must remain 100% operational.
- The ML system will be constructed as an isolated module (`backend/ml/`) and integrated via a distinct endpoint (`POST /api/ml/resume-job-match`) before non-destructive presentation in the frontend ATS results UI.

---

## 2. Phase 0 Audit Results

### A. System Architecture & Flow
```
User (Browser)
   │
   ├──> PDF Upload ─────────> POST /api/upload-resume ──────> Supabase Storage ('resumes') + pdfplumber (In-memory text extraction)
   │
   ├──> Heuristic ATS ──────> POST /api/check-ats ──────────> backend/modules/ats_checker.py (Score, sub-scores, section checks)
   │
   └──> [NEW] ML Domain Match ─> POST /api/ml/resume-job-match ──> backend/ml/predictor.py (Fine-tuned DistilBERT domain classification)
```

### B. Audit Question Responses
1. **Where resume PDF is uploaded:**
   - **Frontend:** `frontend/src/ATSCheckerSection.jsx` (`handleFileUpload` function sending FormData with `file`).
   - **Backend:** `backend/main.py` (`@app.post("/api/upload-resume")` line 237). Uploads to Supabase Storage `resumes` bucket and extracts text.

2. **Where resume text is extracted:**
   - **Backend:** `backend/modules/resume_parser.py` (`extract_text_from_pdf` function using `pdfplumber`).

3. **Where SpaCy processes resume text:**
   - Documented in project dependencies (`requirements.txt`). Active regex-based keyword & entity extractors exist in `backend/modules/skill_extractor.py` and `backend/modules/resume_parser.py`.

4. **Where the job description is received:**
   - **Frontend:** `frontend/src/ATSCheckerSection.jsx` (textarea state `jobDescription`).
   - **Backend:** `backend/main.py` (`@app.post("/api/check-ats")` and `/api/ats-recheck` receiving `ATSRequest` Pydantic model).

5. **Where existing ATS score is calculated:**
   - **Backend:** `backend/modules/ats_checker.py` (`check_ats_score` function). Computes word length, section completeness, keyword match percentages, formatting issues, sub-scores, and structured fixes.

6. **Where ATS result is sent to frontend:**
   - **Backend:** `backend/main.py` returns JSON payload from `check_ats_score()` containing `{ score, feedback, strengths, missing_keywords, matched_keywords, improvement_suggestions, formatting_issues, issues, sub_scores }`.

7. **Which frontend component displays ATS score:**
   - `frontend/src/ATSCheckerSection.jsx` (rendered on `frontend/src/pages/ATSCheckerPage.jsx`), `frontend/src/components/ats/ATSParsingSequence.jsx`, and `frontend/src/pages/ATSFixItPage.jsx`.

---

## 3. ML Model & Architecture Design

### Dataset Specifications
- **Dataset:** `0xnbk/resume-domain-classifier-v1-en` (Hugging Face)
- **License:** Apache 2.0
- **Size:** ~47,176 examples (37,740 train, 9,436 validation)
- **Schema:** `text` (`resume [SEP] job_description`), `label` (`1 = Same Domain`, `0 = Cross Domain / Non-Match`), `pair_type`, `resume_domain`, `job_domain`.
- **Dataset Notice:** *The dataset uses job-posting data derived from LinkedIn Jobs data, while resume content is synthetically generated.*

### ML Problem Formulation
- **Task Type:** Binary Text Classification
- **Input:** Resume text + Job Description text concatenated with `[SEP]` token (or tokenized as paired text).
- **Target:** Binary label ($0$ or $1$) where $1$ denotes domain match and $0$ denotes domain mismatch.

### Dual-Model Pipeline & Baseline Strategy
1. **Baseline Model:** TF-IDF Vectorizer + Logistic Regression (`backend/ml/train_baseline.py`).
2. **Deep Learning Model:** Fine-tuned DistilBERT (`distilbert-base-uncased` via `AutoModelForSequenceClassification` with `num_labels=2`).
3. **Selection Criteria:** Empirical evaluation on held-out validation set using F1-Score, Precision, Recall, Accuracy, ROC-AUC, and latency/inference computational footprint.

---

## 4. Comprehensive Modification Plan

### Exact Files to be Created [NEW]
1. `ML_IMPLEMENTATION_PLAN.md` (This document)
2. `data/README.md` (Dataset documentation, license, limitations, and dataset attribution)
3. `backend/ml/__init__.py`
4. `backend/ml/dataset_loader.py` (Hugging Face dataset loader and verification script)
5. `backend/ml/train_baseline.py` (TF-IDF + Logistic Regression baseline trainer & evaluator)
6. `backend/ml/train_distilbert.py` (DistilBERT fine-tuning pipeline with PyTorch/Hugging Face Trainer)
7. `backend/ml/evaluator.py` (Metrics computation: Accuracy, F1, Precision, Recall, Confusion Matrix, ROC-AUC)
8. `backend/ml/predictor.py` (Singleton thread-safe inference predictor class)
9. `backend/ml/models/.gitignore` (Ignore heavy PyTorch/DistilBERT model weights from Git)
10. `ML_DATASET_REPORT.md` (Dataset statistical inspection report)
11. `ML_ARCHITECTURE.md` (Technical architecture document)
12. `ML_TRAINING.md` (Training commands & execution guide)
13. `ML_RESULTS.md` (Empirical evaluation results and model comparison)

### Exact Files to be Modified [MODIFY]
1. `.gitignore` (Add model weights, dataset caches, and temporary artifacts)
2. `requirements.txt` (Ensure `transformers`, `datasets`, `torch`, `scikit-learn`, `accelerate` are listed)
3. `backend/main.py` (Register `POST /api/ml/resume-job-match` endpoint with Pydantic request/response schemas; load ML predictor lazily/at startup safely)
4. `frontend/src/ATSCheckerSection.jsx` (Add AI/ML Resume Match card component to display prediction label, match probability, and model info side-by-side with heuristic ATS score)

---

## 5. Implementation Phases & Milestones

- **Phase 0:** Audit & Architecture Plan (`ML_IMPLEMENTATION_PLAN.md`)
- **Phase 1:** Git Safety Check & Environment Verification
- **Phase 2 & 3:** Dataset Acquisition (`data/README.md`) & Verification (`ML_DATASET_REPORT.md`)
- **Phase 4 to 9:** NLP Preprocessing, Tokenization, Hardware Detection, & Pipeline Setup
- **Phase 10 & 11:** DistilBERT Fine-Tuning & Metric Evaluation
- **Phase 12 to 15:** TF-IDF Baseline Training, Comparative Selection, & Model Artifact Persistence
- **Phase 16 & 17:** Thread-Safe Singleton Inference Predictor (`backend/ml/predictor.py`)
- **Phase 18 & 19:** FastAPI Integration (`POST /api/ml/resume-job-match`)
- **Phase 20 & 21:** Non-destructive Frontend UI Integration (`ATSCheckerSection.jsx`)
- **Phase 22 to 25:** Error Handling, Security Audit, & Full System Regression Testing
- **Phase 26 to 30:** Documentation (`ML_ARCHITECTURE.md`, `ML_TRAINING.md`, `ML_RESULTS.md`) & Acceptance Verification

---

## 6. Risk Assessment & Rollback Strategy

| Risk | Mitigation Strategy | Rollback Plan |
| :--- | :--- | :--- |
| **CUDA / Hardware Memory OOM** | Auto-detect GPU/MPS/CPU. Use gradient accumulation, dynamic batch sizing, or fallback to CPU with reduced sequence length. | Fallback to TF-IDF baseline predictor or CPU inference mode without breaking API. |
| **FastAPI Startup Blocking / Slowdown** | Lazy-load ML predictor or initialize singleton in a non-blocking background thread. | If model fail to load, return `503 Service Unavailable` on `/api/ml/resume-job-match` while keeping all other ATS endpoints running. |
| **Frontend UI Distortions** | Add isolated React sub-component for ML results that renders only when ML prediction data is present. | Revert `ATSCheckerSection.jsx` changes; standard heuristic ATS displays intact. |
| **Dependency Conflict** | Use existing `venv` virtual environment with compatible PyTorch and Hugging Face package versions. | Retain existing requirements list and revert new package additions if version conflict arises. |
