import os
import json
import time
from pathlib import Path
import joblib
import numpy as np
import torch
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
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

MODEL_NAME = "all-MiniLM-L6-v2"
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "models" / "sbert_minilm"

# Optimize CPU PyTorch threading
torch.set_num_threads(os.cpu_count() or 4)

def compute_sbert_features(sbert_model, resumes, jobs, batch_size=128):
    """
    Computes dense normalized embeddings and engineered semantic features.
    Returns feature matrix X_feat of shape (N, 1153) and cosine similarities array.
    """
    t0 = time.time()
    print(f"Generating SBERT embeddings for {len(resumes):,} pairs using '{MODEL_NAME}' (batch_size={batch_size})...")
    
    # Generate batch normalized embeddings
    u = sbert_model.encode(resumes, batch_size=batch_size, show_progress_bar=False, normalize_embeddings=True)
    v = sbert_model.encode(jobs, batch_size=batch_size, show_progress_bar=False, normalize_embeddings=True)

    # Engineered semantic features
    abs_diff = np.abs(u - v)
    hadamard = u * v
    # Dot product of normalized vectors equals cosine similarity
    cos_sim = np.sum(u * v, axis=1, keepdims=True)

    X_feat = np.hstack([u, v, abs_diff, hadamard, cos_sim])
    elapsed = time.time() - t0
    print(f"Embedding & feature extraction completed in {elapsed:.2f}s (avg {elapsed/len(resumes)*1000:.2f}ms/pair).")
    return X_feat, cos_sim.flatten()

def train_sbert_pipeline():
    print("--- Phase 3: Sentence-BERT (all-MiniLM-L6-v2) Semantic Pipeline ---")
    
    # 1. Load 70/15/15 Dataset Splits
    full_train, full_val, full_test = get_train_val_test_splits(random_state=42)
    
    # Fast CPU optimization: Use stratified 1,500 sample subset (1,000 train / 250 val / 250 test)
    print("Applying CPU hardware configuration: 1,500 stratified samples (1,000 train / 250 val / 250 test)...")
    train_df = full_train.sample(n=1000, random_state=42)
    val_df = full_val.sample(n=250, random_state=42)
    test_df = full_test.sample(n=250, random_state=42)

    print(f"Splits loaded: Train={len(train_df):,}, Val={len(val_df):,}, Test={len(test_df):,}")

    train_resumes = train_df['resume_text'].tolist()
    train_jobs = train_df['job_description'].tolist()
    y_train = train_df['label'].to_numpy()

    val_resumes = val_df['resume_text'].tolist()
    val_jobs = val_df['job_description'].tolist()
    y_val = val_df['label'].to_numpy()

    test_resumes = test_df['resume_text'].tolist()
    test_jobs = test_df['job_description'].tolist()
    y_test = test_df['label'].to_numpy()

    # 2. Load Sentence-BERT Model with CPU sequence length optimization
    print(f"Loading Sentence-BERT model '{MODEL_NAME}'...")
    sbert_model = SentenceTransformer(MODEL_NAME)
    sbert_model.max_seq_length = 128

    # 3. Extract Dense Features
    print("\n[1/3] Processing Training Set Features...")
    t_tr_start = time.time()
    X_train_feat, _ = compute_sbert_features(sbert_model, train_resumes, train_jobs)
    train_feat_time = time.time() - t_tr_start

    print("\n[2/3] Processing Validation Set Features...")
    X_val_feat, val_cos_sims = compute_sbert_features(sbert_model, val_resumes, val_jobs)

    print("\n[3/3] Processing Held-Out Test Set Features...")
    X_test_feat, test_cos_sims = compute_sbert_features(sbert_model, test_resumes, test_jobs)

    # 4. Train Lightweight Classifier on Training Features
    print("\nFitting Logistic Regression classifier on 70% SBERT features...")
    clf_start = time.time()
    clf = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
    clf.fit(X_train_feat, y_train)
    clf_fit_time = time.time() - clf_start
    print(f"Classifier fit completed in {clf_fit_time:.2f}s.")

    # 5. Validation Evaluation & Threshold Optimization (Validation Set ONLY)
    print("\nEvaluating on 15% Validation Set & Searching Optimal Threshold...")
    val_probs = clf.predict_proba(X_val_feat)[:, 1]

    val_acc_default = float(accuracy_score(y_val, (val_probs >= 0.5).astype(int)))
    val_f1_default = float(f1_score(y_val, (val_probs >= 0.5).astype(int)))
    val_auc = float(roc_auc_score(y_val, val_probs))
    v_prec, v_rec, _ = precision_recall_curve(y_val, val_probs)
    val_pr_auc = float(auc(v_rec, v_prec))

    # Grid search threshold on Validation Set ONLY
    threshold_results = []
    best_thresh = 0.5
    best_val_f1 = val_f1_default

    for th in np.arange(0.20, 0.81, 0.05):
        th_val = round(float(th), 2)
        th_preds = (val_probs >= th_val).astype(int)
        th_acc = float(accuracy_score(y_val, th_preds))
        th_prec = float(precision_score(y_val, th_preds, zero_division=0))
        th_rec = float(recall_score(y_val, th_preds, zero_division=0))
        th_f1 = float(f1_score(y_val, th_preds, zero_division=0))

        threshold_results.append({
            "threshold": th_val,
            "accuracy": round(th_acc, 4),
            "precision": round(th_prec, 4),
            "recall": round(th_rec, 4),
            "f1_score": round(th_f1, 4)
        })

        if th_f1 > best_val_f1:
            best_val_f1 = th_f1
            best_thresh = th_val

    print(f"Validation Optimal Threshold Selected: {best_thresh} (Val F1={best_val_f1:.4f} vs 0.50 default F1={val_f1_default:.4f})")

    # 6. Final Unbiased Evaluation on Held-Out Test Set (Test Set ONLY, with locked threshold)
    print("\n--- Evaluating Locked Threshold ONCE on 15% Held-Out Test Set ---")
    t_infer_start = time.time()
    test_probs = clf.predict_proba(X_test_feat)[:, 1]
    infer_time_total = time.time() - t_infer_start
    per_sample_ms = round((infer_time_total / len(test_resumes)) * 1000, 2)

    test_preds_locked = (test_probs >= best_thresh).astype(int)

    test_acc = float(accuracy_score(y_test, test_preds_locked))
    test_prec = float(precision_score(y_test, test_preds_locked, zero_division=0))
    test_rec = float(recall_score(y_test, test_preds_locked, zero_division=0))
    test_f1 = float(f1_score(y_test, test_preds_locked, zero_division=0))
    test_auc = float(roc_auc_score(y_test, test_probs))
    t_p_prec, t_p_rec, _ = precision_recall_curve(y_test, test_probs)
    test_pr_auc = float(auc(t_p_rec, t_p_prec))
    test_cm = confusion_matrix(y_test, test_preds_locked).tolist()

    final_metrics = {
        "model_name": "Sentence-BERT + Logistic Regression (all-MiniLM-L6-v2)",
        "dataset": "0xnbk/resume-domain-classifier-v1-en",
        "splits": {
            "train_samples": len(train_df),
            "val_samples": len(val_df),
            "test_samples": len(test_df)
        },
        "training_time_seconds": round(train_feat_time + clf_fit_time, 2),
        "inference_latency_per_sample_ms": per_sample_ms,
        "validation_metrics": {
            "default_threshold_0.50_f1": round(val_f1_default, 4),
            "optimal_threshold_selected": best_thresh,
            "optimal_threshold_val_f1": round(best_val_f1, 4),
            "val_roc_auc": round(val_auc, 4),
            "val_pr_auc": round(val_pr_auc, 4),
            "threshold_grid_search": threshold_results
        },
        "held_out_test_metrics": {
            "locked_threshold": best_thresh,
            "accuracy": round(test_acc, 4),
            "precision": round(test_prec, 4),
            "recall": round(test_rec, 4),
            "f1_score": round(test_f1, 4),
            "roc_auc": round(test_auc, 4),
            "pr_auc": round(test_pr_auc, 4),
            "confusion_matrix": test_cm
        }
    }

    print("\n--- FINAL UNBIASED HELD-OUT TEST METRICS ---")
    print(json.dumps(final_metrics["held_out_test_metrics"], indent=2))

    # 7. Save Model Artifacts
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    joblib.dump({"clf": clf, "threshold": best_thresh, "feature_config": "concat_u_v_diff_prod_sim"}, OUTPUT_DIR / "sbert_classifier.pkl")
    
    with open(OUTPUT_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(final_metrics, f, indent=2)

    metadata = {
        "model_type": "SentenceTransformer",
        "sbert_model_name": MODEL_NAME,
        "embedding_dim": 384,
        "feature_dim": 1153,
        "classifier_type": "LogisticRegression",
        "locked_threshold": best_thresh
    }
    with open(OUTPUT_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved Sentence-BERT classifier artifact to: {OUTPUT_DIR / 'sbert_classifier.pkl'}")
    print(f"Saved Sentence-BERT metrics to: {OUTPUT_DIR / 'metrics.json'}")
    return final_metrics

if __name__ == "__main__":
    train_sbert_pipeline()
