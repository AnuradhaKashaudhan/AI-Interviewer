# ML Training & Execution Guide (`ML_TRAINING.md`)

## Prerequisites & Dependencies
Ensure Python `3.10+` virtual environment (`venv`) is activated with required ML dependencies installed:
```bash
.\venv\Scripts\activate
pip install -r requirements.txt
```

---

## 1. Programmatic Dataset Inspection & Verification
Runs reproducible Hugging Face dataset download, verifies dataset splits, checks delimiter integrity, and updates `ML_DATASET_REPORT.md`:
```bash
python backend/ml/dataset_loader.py
```

---

## 2. Train TF-IDF + Logistic Regression Baseline
Trains the baseline NLP model on the 80/20 train/validation split, evaluates metrics, and saves the pipeline artifact:
```bash
python backend/ml/train_baseline.py
```
- **Output Artifact:** `backend/ml/models/baseline_tfidf/baseline_pipeline.pkl`
- **Output Metrics:** `backend/ml/models/baseline_tfidf/metrics.json`

---

## 3. Fine-Tune DistilBERT Sequence Classifier
Fine-tunes `distilbert-base-uncased` sequence classifier on Hugging Face dataset:
```bash
python backend/ml/train_distilbert.py
```
- **Hardware Safety:** Automatically detects CUDA GPU, Apple MPS, or CPU.
- **Output Artifacts:** `backend/ml/models/distilbert_resume_job_match/` (`model.safetensors`, `config.json`, `tokenizer.json`, `metrics.json`, `metadata.json`).

---

## 4. Generate Comparative Evaluation Report
Loads metrics from baseline and DistilBERT models, compares Accuracy, Precision, Recall, F1, and ROC-AUC, selects the champion model, and generates `ML_RESULTS.md`:
```bash
python backend/ml/evaluator.py
```
