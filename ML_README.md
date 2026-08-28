# ML Resume–Job Domain Matching Ecosystem

## 1. Problem Formulation & Objective
The platform predicts whether a given **Resume** and **Job Description** belong to the **Same Professional Domain (Label 1)** or **Cross Domain (Label 0)**.

- **Primary Challenge:** Synthesize exact technical lexical matches (e.g., `Python`, `FastAPI`, `Docker`) with contextual semantic similarity (e.g., matching a backend engineer resume to a distributed systems job posting).
- **Target Label:** Binary ($1 = \text{Same Domain / Match}$, $0 = \text{Cross Domain / Non-Match}$).

---

## 2. Dataset & Unbiased Partitioning
- **Dataset:** `0xnbk/resume-domain-classifier-v1-en` (37,740 total samples).
- **Partitioning Strategy (70 / 15 / 15 Stratified Split, `random_state=42`):**
  - **Training Set (70% - 26,418 samples):** Used to fit TF-IDF vectorizers, classical classifiers, and SBERT feature classifiers.
  - **Validation Set (15% - 5,661 samples):** Reserved for hyperparameter selection, threshold optimization, and Hybrid Ensemble weighting.
  - **Held-Out Test Set (15% - 5,661 samples):** RESERVED exclusively for final unbiased evaluation on locked models and thresholds.

> **Dataset Origin Notice:** Resume content is synthetically generated paired with real LinkedIn Job posting data.

---

## 3. Sentence-BERT Semantic Matching Architecture (`all-MiniLM-L6-v2`)

### Why Sentence-BERT?
Unlike classical TF-IDF (which relies on exact N-gram matches) or sequence-level transformers like DistilBERT (which suffer from asymmetric sequence truncation), **Sentence-BERT (`all-MiniLM-L6-v2`)** generates dense 384-dimensional contextual embeddings for both resume and job text independently.

### Why `all-MiniLM-L6-v2`?
- **Extreme CPU Efficiency:** 6 Transformer layers, 384-dim embeddings, 22.9M parameters.
- **Microsecond Latency:** Executes in **~4.5 ms** per sample on CPU instances.
- **Superior Semantic Representations:** Fine-tuned on 1B+ sentence pairs for semantic textual similarity (STS).

### Engineered Feature Representation
1. Resume Embedding ($u \in \mathbb{R}^{384}$)
2. Job Description Embedding ($v \in \mathbb{R}^{384}$)
3. Absolute Embedding Difference ($|u - v| \in \mathbb{R}^{384}$)
4. Element-Wise Product ($u \odot v \in \mathbb{R}^{384}$)
5. Cosine Similarity ($s = \sum u_i \cdot v_i \in \mathbb{R}^1$)
6. **Combined Feature Matrix:** $X_{\text{feat}} = [u; v; |u - v|; u \odot v; s] \in \mathbb{R}^{1153}$.

A lightweight `LogisticRegression` classifier is trained on top of this 1153-dimensional feature space.

---

## 4. Final Held-Out Test Performance Comparison (15% Unbiased Split)

| Model Pipeline | Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC | CPU Latency | Production Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Sentence-BERT (`all-MiniLM-L6-v2`)** | **0.8240** | **0.7742** | **0.8571** | **0.8136** | **0.8756** | **0.8644** | **~4.5 ms** | **Production Champion (v2.1)** |
| **Hybrid Ensemble (TF-IDF + SBERT)** | 0.8120 | 0.7680 | 0.8420 | 0.8000 | 0.8641 | 0.8510 | ~5.0 ms | Experimental |
| **TF-IDF + Logistic Regression (Baseline)** | 0.6711 | 0.6189 | 0.8920 | 0.7308 | 0.7470 | 0.6887 | < 1 ms | Fallback Baseline |
| **TF-IDF + Linear SVM (5-Fold CV Mean)** | 0.6422 | 0.6417 | 0.6458 | 0.6435 | 0.6918 | 0.6514 | < 1 ms | Candidate Benchmark |
| **TF-IDF + Multinomial Naive Bayes** | 0.6274 | 0.6391 | 0.5858 | 0.6110 | 0.6667 | 0.6541 | < 1 ms | Candidate Benchmark |
| **DistilBERT (Historical Experiment)** | 0.5000 | 0.5000 | 1.0000 | 0.6667 | 0.5400 | 0.5350 | ~45 ms | *Deprecated* |

---

## 5. Threshold Optimization Strategy
- **Validation Set Search:** Classification thresholds from 0.20 to 0.80 (step 0.05) were evaluated on the 15% Validation Set.
- **Selected Threshold:** **`0.45`** maximized Validation F1-Score (`0.7956`).
- **Locked Test Evaluation:** The `0.45` threshold was locked and evaluated ONCE on the held-out test set, yielding an unbiased test F1-Score of **`0.8136`** and ROC-AUC of **`0.8756`**.

---

## 6. How to Run, Retrain, & Test

### Run All Unit Tests
```bash
python tests/test_ml_pipeline.py
```
*Output:* `Ran 7 tests in 14.730s - OK`

### Retrain Classical Baseline Models
```bash
python backend/ml/train_baseline.py
```

### Retrain Sentence-BERT (`all-MiniLM-L6-v2`) Champion Pipeline
```bash
python backend/ml/train_sbert.py
```

### Run Comparative Evaluator & Update `ML_RESULTS.md`
```bash
python backend/ml/evaluator.py
```

---

## 7. Production API Usage (`POST /api/ml/resume-job-match`)

### Request
```json
{
  "resume_text": "Experienced Python Software Engineer with FastAPI, SQL, Docker, and REST API expertise.",
  "job_description": "We are seeking a Senior Backend Engineer proficient in Python, FastAPI, and PostgreSQL."
}
```

### Response
```json
{
  "prediction": 1,
  "label": "Same Domain",
  "match_probability": 0.8412,
  "model": "Sentence-BERT + Logistic Regression (all-MiniLM-L6-v2)",
  "model_version": "v2.1",
  "inference_latency_ms": 4.52,
  "explanation": {
    "semantic_similarity": 0.8145,
    "matching_terms": ["docker", "fastapi", "python", "sql"],
    "top_positive_signals": ["fastapi", "python"],
    "top_negative_signals": []
  }
}
```
