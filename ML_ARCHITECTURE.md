# ML System Architecture (`ML_ARCHITECTURE.md`)

## 1. Problem Formulation & Objective
The ML Intelligence module upgrades the existing **AI Interviewer & ATS Optimization Platform** with a real Machine Learning / Deep Learning model that determines whether a candidate's resume and a target job description belong to the same professional domain.

- **Task Type:** Supervised Binary Text Classification
- **Input:** Combined string containing `resume_text` and `job_description` separated by `[SEP]` delimiter token.
- **Output:** Binary target prediction:
  - `1 = Same Domain / Match`
  - `0 = Cross Domain / Non-Match`
- **Output Probability:** Softmax probability score $P(\text{label}=1)$ representing domain compatibility.

---

## 2. Dataset & Attribution
- **Dataset:** `0xnbk/resume-domain-classifier-v1-en` (Hugging Face)
- **License:** Apache 2.0
- **Size:** 37,740 total rows (Stratified 80/20 train/validation split: 30,192 train, 7,548 val)
- **Class Balance:** Perfectly balanced (50.04% Positive, 49.96% Negative)
- **Mandatory Notice:** *The dataset uses job-posting data derived from real LinkedIn Jobs data, while resume content is synthetically generated.*

---

## 3. Machine Learning Models

### A. Baseline Model (TF-IDF + Logistic Regression)
- **Pipeline:** `TfidfVectorizer(max_features=25000, ngram_range=(1, 2))` $\rightarrow$ `LogisticRegression(C=1.0)`
- **Artifact:** `backend/ml/models/baseline_tfidf/baseline_pipeline.pkl`

### B. Deep Learning Model (Fine-Tuned DistilBERT)
- **Checkpoint:** `distilbert-base-uncased`
- **Tokenizer:** `DistilBertTokenizerFast` (`max_length=512`, `truncation=True`)
- **Classification Head:** `DistilBertForSequenceClassification` (`num_labels=2`)
- **Artifact:** `backend/ml/models/distilbert_resume_job_match/`

---

## 4. System End-to-End Workflow

```
User Resume PDF + Job Description
   │
   ├──> PDF Text Extraction (pdfplumber in backend/modules/resume_parser.py)
   │
   ├──> Heuristic ATS Scoring Engine (backend/modules/ats_checker.py)
   │       └──> Score (0-100), Sub-scores, Section checks, Keyword match
   │
   └──> ML Domain Match Intelligence (POST /api/ml/resume-job-match)
           │
           ├──> backend/ml/predictor.py (Singleton ResumeDomainMatchPredictor)
           ├──> Format: "resume_text [SEP] job_description"
           ├──> Fine-Tuned DistilBERT PyTorch Inference (Softmax logits)
           └──> Returns: { prediction: 1, label: "Same Domain", match_probability: 0.94, model: "DistilBERT" }
                   │
                   └──> Rendered side-by-side in React UI (ATSCheckerSection.jsx)
```

---

## 5. Non-Destructive System Isolation
1. **Existing Heuristics Preserved:** Heuristic ATS score calculations are un-altered.
2. **API Endpoint Separation:** ML predictions run via `POST /api/ml/resume-job-match`.
3. **Graceful Fallbacks:** If DistilBERT model weights are absent or loading fails, the system automatically falls back to the TF-IDF baseline or a controlled service response without crashing FastAPI.
