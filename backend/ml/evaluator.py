import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
BASELINE_METRICS_PATH = BASE_DIR / "models" / "baseline_tfidf" / "metrics.json"
DISTILBERT_METRICS_PATH = BASE_DIR / "models" / "distilbert_resume_job_match" / "metrics.json"

def generate_comparison_report():
    print("--- Phase 14: Generating Comparative Model Evaluation Report ---")

    baseline_metrics = {}
    if BASELINE_METRICS_PATH.exists():
        with open(BASELINE_METRICS_PATH, "r", encoding="utf-8") as f:
            baseline_metrics = json.load(f)

    distilbert_metrics = {}
    if DISTILBERT_METRICS_PATH.exists():
        with open(DISTILBERT_METRICS_PATH, "r", encoding="utf-8") as f:
            distilbert_metrics = json.load(f)

    b_acc = baseline_metrics.get("accuracy", 0.0)
    b_prec = baseline_metrics.get("precision", 0.0)
    b_rec = baseline_metrics.get("recall", 0.0)
    b_f1 = baseline_metrics.get("f1_score", 0.0)
    b_auc = baseline_metrics.get("roc_auc", 0.0)

    d_acc = distilbert_metrics.get("accuracy", 0.0)
    d_prec = distilbert_metrics.get("precision", 0.0)
    d_rec = distilbert_metrics.get("recall", 0.0)
    d_f1 = distilbert_metrics.get("f1_score", 0.0)
    d_auc = distilbert_metrics.get("roc_auc", 0.0)

    # Winner selection based on F1 Score
    if d_f1 > b_f1:
        winner = "Fine-Tuned DistilBERT"
        reason = f"DistilBERT achieved a higher F1-score ({d_f1:.4f} vs {b_f1:.4f}) and superior contextual semantic understanding of job descriptions and resume text."
    elif b_f1 > d_f1:
        winner = "TF-IDF + Logistic Regression Baseline"
        reason = f"TF-IDF Baseline achieved a higher F1-score ({b_f1:.4f} vs {d_f1:.4f}) with lower computational latency."
    else:
        winner = "Tie / Comparative Parity"
        reason = "Both models achieved identical F1-score metrics on validation samples."

    results_md = f"""# ML Evaluation & Comparative Results Report (`ML_RESULTS.md`)

## 1. Executive Summary & Selected Model
- **Selected Champion Model:** `{winner}`
- **Selection Rationale:** {reason}

> **Mandatory Dataset Attribution:** The dataset uses job-posting data derived from real LinkedIn Jobs data, while resume content is synthetically generated.

---

## 2. Empirical Performance Comparison

| Metric | TF-IDF + Logistic Regression Baseline | Fine-Tuned DistilBERT (`distilbert-base-uncased`) | Delta (DistilBERT vs Baseline) |
| :--- | :--- | :--- | :--- |
| **Accuracy** | `{b_acc:.4f}` | `{d_acc:.4f}` | `{(d_acc - b_acc):+.4f}` |
| **Precision** | `{b_prec:.4f}` | `{d_prec:.4f}` | `{(d_prec - b_prec):+.4f}` |
| **Recall** | `{b_rec:.4f}` | `{d_rec:.4f}` | `{(d_rec - b_rec):+.4f}` |
| **F1-Score** | `{b_f1:.4f}` | `{d_f1:.4f}` | `{(d_f1 - b_f1):+.4f}` |
| **ROC-AUC** | `{b_auc:.4f}` | `{d_auc:.4f}` | `{(d_auc - b_auc):+.4f}` |
| **Training Time** | `{baseline_metrics.get('training_time_seconds', 0)}s` | `{distilbert_metrics.get('training_time_seconds', 0)}s` | - |
| **Hardware** | `CPU` | `{distilbert_metrics.get('device', 'CPU')}` | - |

---

## 3. Detailed Model Artifact Metrics

### Baseline Model (`TF-IDF + Logistic Regression`)
```json
{json.dumps(baseline_metrics, indent=2)}
```

### Deep Learning Model (`Fine-Tuned DistilBERT`)
```json
{json.dumps(distilbert_metrics, indent=2)}
```

---

## 4. Confusion Matrices

- **Baseline Confusion Matrix (`[[TN, FP], [FN, TP]]`):** `{baseline_metrics.get('confusion_matrix', [])}`
- **DistilBERT Confusion Matrix (`[[TN, FP], [FN, TP]]`):** `{distilbert_metrics.get('confusion_matrix', [])}`

---

## 5. Architectural & Resource Trade-off Analysis
- **Inference Latency:** TF-IDF + Logistic Regression provides ultra-fast microsecond inference suitable for CPU-only micro-instances.
- **Contextual Nuance:** Fine-tuned DistilBERT utilizes deep bidirectional self-attention transformer layers capable of recognizing domain vocabulary semantics beyond exact word overlap.
"""

    root_dir = Path(__file__).resolve().parent.parent.parent
    output_path = root_dir / "ML_RESULTS.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(results_md)

    print(f"ML_RESULTS.md successfully generated at: {output_path}")
    return winner

if __name__ == "__main__":
    generate_comparison_report()
