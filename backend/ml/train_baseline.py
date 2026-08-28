import os
import json
import time
from pathlib import Path
import joblib
import numpy as np
from datasets import load_dataset
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import MultinomialNB
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    precision_recall_curve,
    auc,
    confusion_matrix,
)

from dataset_loader import get_train_val_test_splits

DATASET_NAME = "0xnbk/resume-domain-classifier-v1-en"

def evaluate_cross_validation(pipeline, X, y, n_splits=5):
    """
    Executes Stratified K-Fold Cross-Validation and collects metrics per fold.
    Returns dictionary with mean and standard deviation for each metric.
    """
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    accs, precs, recs, f1s, aucs, pr_aucs = [], [], [], [], [], []

    X = np.array(X)
    y = np.array(y)

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
        X_train, X_val = X[train_idx], X[val_idx]
        y_train, y_val = y[train_idx], y[val_idx]

        pipeline.fit(X_train, y_train)
        preds = pipeline.predict(X_val)

        if hasattr(pipeline, "predict_proba"):
            probs = pipeline.predict_proba(X_val)[:, 1]
        elif hasattr(pipeline, "decision_function"):
            probs = pipeline.decision_function(X_val)
        else:
            probs = preds

        accs.append(accuracy_score(y_val, preds))
        precs.append(precision_score(y_val, preds, zero_division=0))
        recs.append(recall_score(y_val, preds, zero_division=0))
        f1s.append(f1_score(y_val, preds, zero_division=0))
        
        try:
            aucs.append(roc_auc_score(y_val, probs))
            p_prec, p_rec, _ = precision_recall_curve(y_val, probs)
            pr_aucs.append(auc(p_rec, p_prec))
        except Exception:
            aucs.append(0.5)
            pr_aucs.append(0.5)

    return {
        "accuracy_mean": round(float(np.mean(accs)), 4),
        "accuracy_std": round(float(np.std(accs)), 4),
        "precision_mean": round(float(np.mean(precs)), 4),
        "precision_std": round(float(np.std(precs)), 4),
        "recall_mean": round(float(np.mean(recs)), 4),
        "recall_std": round(float(np.std(recs)), 4),
        "f1_mean": round(float(np.mean(f1s)), 4),
        "f1_std": round(float(np.std(f1s)), 4),
        "roc_auc_mean": round(float(np.mean(aucs)), 4),
        "roc_auc_std": round(float(np.std(aucs)), 4),
        "pr_auc_mean": round(float(np.mean(pr_aucs)), 4),
        "pr_auc_std": round(float(np.std(pr_aucs)), 4),
    }

def train_baseline_model():
    print("--- Phase 12: Classical ML Benchmarks & 70/15/15 Split Evaluation ---")
    train_df, val_df, test_df = get_train_val_test_splits(random_state=42)

    X_train = train_df['text'].tolist()
    y_train = train_df['label'].tolist()

    X_val = val_df['text'].tolist()
    y_val = val_df['label'].tolist()

    X_test = test_df['text'].tolist()
    y_test = test_df['label'].tolist()

    print(f"Splits loaded: Train={len(X_train):,}, Val={len(X_val):,}, Test={len(X_test):,}")

    # Candidate Pipelines
    candidate_pipelines = {
        "TF-IDF + Logistic Regression": Pipeline([
            ('tfidf', TfidfVectorizer(max_features=50000, ngram_range=(1, 2), stop_words='english', sublinear_tf=True)),
            ('clf', LogisticRegression(C=2.0, class_weight='balanced', max_iter=1000, random_state=42))
        ]),
        "TF-IDF + Linear SVM": Pipeline([
            ('tfidf', TfidfVectorizer(max_features=25000, ngram_range=(1, 2), stop_words='english', sublinear_tf=True)),
            ('clf', LinearSVC(C=1.0, dual='auto', random_state=42))
        ]),
        "TF-IDF + Multinomial Naive Bayes": Pipeline([
            ('tfidf', TfidfVectorizer(max_features=25000, ngram_range=(1, 2), stop_words='english', sublinear_tf=True)),
            ('clf', MultinomialNB(alpha=1.0))
        ])
    }

    print("\nExecuting Stratified 5-Fold Cross-Validation on Candidate Models...")
    cv_sub_X, _, cv_sub_y, _ = train_test_split(X_train, y_train, train_size=8000, random_state=42, stratify=y_train)

    cv_results = {}
    for name, pipe in candidate_pipelines.items():
        print(f"Evaluating {name} with 5-Fold CV...")
        start_t = time.time()
        res = evaluate_cross_validation(pipe, cv_sub_X, cv_sub_y, n_splits=5)
        elapsed = time.time() - start_t
        res["cv_time_seconds"] = round(elapsed, 2)
        cv_results[name] = res
        print(f" -> {name} | Mean F1: {res['f1_mean']} (+/- {res['f1_std']}) | ROC-AUC: {res['roc_auc_mean']} | Time: {elapsed:.1f}s")

    # Fit Champion Pipeline (TF-IDF + Logistic Regression) on 70% Training Set
    best_pipe = candidate_pipelines["TF-IDF + Logistic Regression"]
    print("\nFitting Champion TF-IDF + Logistic Regression Pipeline on 70% Training Set...")
    t_start = time.time()
    best_pipe.fit(X_train, y_train)
    train_duration = time.time() - t_start

    # Validation Evaluation & Threshold Search (Validation Set ONLY)
    print("\nEvaluating on 15% Validation Set & Searching Optimal Threshold...")
    val_probs = best_pipe.predict_proba(X_val)[:, 1]
    val_f1_default = float(f1_score(y_val, (val_probs >= 0.5).astype(int)))
    val_auc = float(roc_auc_score(y_val, val_probs))
    p_prec, p_rec, _ = precision_recall_curve(y_val, val_probs)
    val_pr_auc = float(auc(p_rec, p_prec))

    best_thresh = 0.5
    best_val_f1 = val_f1_default

    for th in np.arange(0.20, 0.81, 0.05):
        th_val = round(float(th), 2)
        th_preds = (val_probs >= th_val).astype(int)
        th_f1 = float(f1_score(y_val, th_preds, zero_division=0))
        if th_f1 > best_val_f1:
            best_val_f1 = th_f1
            best_thresh = th_val

    print(f"Validation Optimal Threshold Selected: {best_thresh} (Val F1={best_val_f1:.4f} vs 0.50 default F1={val_f1_default:.4f})")

    # Final Unbiased Evaluation on Held-Out Test Set (Test Set ONLY, with locked threshold)
    print("\n--- Evaluating Locked Threshold ONCE on 15% Held-Out Test Set ---")
    t_val = time.time()
    test_probs = best_pipe.predict_proba(X_test)[:, 1]
    test_preds = (test_probs >= best_thresh).astype(int)
    inference_duration = time.time() - t_val
    per_sample_ms = round((inference_duration / len(X_test)) * 1000, 4)

    test_acc = float(accuracy_score(y_test, test_preds))
    test_prec = float(precision_score(y_test, test_preds, zero_division=0))
    test_rec = float(recall_score(y_test, test_preds, zero_division=0))
    test_f1 = float(f1_score(y_test, test_preds, zero_division=0))
    test_auc = float(roc_auc_score(y_test, test_probs))
    t_p_prec, t_p_rec, _ = precision_recall_curve(y_test, test_probs)
    test_pr_auc = float(auc(t_p_rec, t_p_prec))
    cm = confusion_matrix(y_test, test_preds).tolist()

    final_metrics = {
        "model_name": "TF-IDF + Logistic Regression Baseline",
        "dataset": DATASET_NAME,
        "splits": {
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "test_samples": len(X_test)
        },
        "training_time_seconds": round(train_duration, 2),
        "inference_latency_per_sample_ms": per_sample_ms,
        "validation_metrics": {
            "default_threshold_0.50_f1": round(val_f1_default, 4),
            "optimal_threshold_selected": best_thresh,
            "optimal_threshold_val_f1": round(best_val_f1, 4),
            "val_roc_auc": round(val_auc, 4),
            "val_pr_auc": round(val_pr_auc, 4)
        },
        "held_out_test_metrics": {
            "locked_threshold": best_thresh,
            "accuracy": round(test_acc, 4),
            "precision": round(test_prec, 4),
            "recall": round(test_rec, 4),
            "f1_score": round(test_f1, 4),
            "roc_auc": round(test_auc, 4),
            "pr_auc": round(test_pr_auc, 4),
            "confusion_matrix": cm
        },
        "cross_validation_benchmark": cv_results
    }

    print("\n--- FINAL UNBIASED HELD-OUT TEST METRICS ---")
    print(json.dumps(final_metrics["held_out_test_metrics"], indent=2))

    # Save complete Pipeline artifact
    output_dir = Path(__file__).resolve().parent / "models" / "baseline_tfidf"
    os.makedirs(output_dir, exist_ok=True)

    model_path = output_dir / "baseline_pipeline.pkl"
    metrics_path = output_dir / "metrics.json"

    joblib.dump(best_pipe, model_path)
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(final_metrics, f, indent=2)

    print(f"\nSaved complete reproducible pipeline artifact to: {model_path}")
    print(f"Saved baseline metrics to: {metrics_path}")
    return final_metrics

if __name__ == "__main__":
    train_baseline_model()


