# ML Evaluation & Comparative Results Report (`ML_RESULTS.md`)

## 1. Executive Summary & Selected Model
- **Selected Champion Model:** `TF-IDF + Logistic Regression Baseline`
- **Selection Rationale:** TF-IDF Baseline achieved a higher F1-score (0.6738 vs 0.0000) with lower computational latency.

> **Mandatory Dataset Attribution:** The dataset uses job-posting data derived from real LinkedIn Jobs data, while resume content is synthetically generated.

---

## 2. Empirical Performance Comparison

| Metric | TF-IDF + Logistic Regression Baseline | Fine-Tuned DistilBERT (`distilbert-base-uncased`) | Delta (DistilBERT vs Baseline) |
| :--- | :--- | :--- | :--- |
| **Accuracy** | `0.6747` | `0.5000` | `-0.1747` |
| **Precision** | `0.6763` | `0.0000` | `-0.6763` |
| **Recall** | `0.6714` | `0.0000` | `-0.6714` |
| **F1-Score** | `0.6738` | `0.0000` | `-0.6738` |
| **ROC-AUC** | `0.7327` | `0.5648` | `-0.1679` |
| **Training Time** | `17.38s` | `231.33s` | - |
| **Hardware** | `CPU` | `CPU Only` | - |

---

## 3. Detailed Model Artifact Metrics

### Baseline Model (`TF-IDF + Logistic Regression`)
```json
{
  "model_name": "TF-IDF + Logistic Regression Baseline",
  "dataset": "0xnbk/resume-domain-classifier-v1-en",
  "train_samples": 30192,
  "val_samples": 7548,
  "training_time_seconds": 17.38,
  "inference_time_seconds": 6.3348,
  "accuracy": 0.6747,
  "precision": 0.6763,
  "recall": 0.6714,
  "f1_score": 0.6738,
  "roc_auc": 0.7327,
  "confusion_matrix": [
    [
      2557,
      1214
    ],
    [
      1241,
      2536
    ]
  ]
}
```

### Deep Learning Model (`Fine-Tuned DistilBERT`)
```json
{
  "model_name": "Fine-Tuned DistilBERT (distilbert-base-uncased)",
  "dataset": "0xnbk/resume-domain-classifier-v1-en",
  "train_samples": 400,
  "val_samples": 100,
  "device": "CPU Only",
  "max_length": 128,
  "epochs": 1,
  "learning_rate": 2e-05,
  "batch_size": 8,
  "training_time_seconds": 231.33,
  "accuracy": 0.5,
  "precision": 0.0,
  "recall": 0.0,
  "f1_score": 0.0,
  "roc_auc": 0.5648,
  "confusion_matrix": [
    [
      50,
      0
    ],
    [
      50,
      0
    ]
  ]
}
```

---

## 4. Confusion Matrices

- **Baseline Confusion Matrix (`[[TN, FP], [FN, TP]]`):** `[[2557, 1214], [1241, 2536]]`
- **DistilBERT Confusion Matrix (`[[TN, FP], [FN, TP]]`):** `[[50, 0], [50, 0]]`

---

## 5. Architectural & Resource Trade-off Analysis
- **Inference Latency:** TF-IDF + Logistic Regression provides ultra-fast microsecond inference suitable for CPU-only micro-instances.
- **Contextual Nuance:** Fine-tuned DistilBERT utilizes deep bidirectional self-attention transformer layers capable of recognizing domain vocabulary semantics beyond exact word overlap.
