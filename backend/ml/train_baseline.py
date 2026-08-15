import os
import json
import time
from pathlib import Path
import joblib
import numpy as np
from datasets import load_dataset
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

DATASET_NAME = "0xnbk/resume-domain-classifier-v1-en"

def train_baseline_model():
    print("--- Phase 12: Training Baseline (TF-IDF + Logistic Regression) ---")
    print(f"Loading dataset '{DATASET_NAME}'...")
    raw_ds = load_dataset(DATASET_NAME)
    primary_split = list(raw_ds.keys())[0]
    df = raw_ds[primary_split].to_pandas()

    print(f"Total dataset size: {len(df):,} samples.")
    print("Performing stratified 80/20 train/validation split...")
    train_df, val_df = train_test_split(
        df,
        test_size=0.20,
        random_state=42,
        stratify=df['label']
    )

    train_text = train_df['text'].tolist()
    train_labels = train_df['label'].tolist()

    val_text = val_df['text'].tolist()
    val_labels = val_df['label'].tolist()

    print(f"Train samples: {len(train_text):,}, Validation samples: {len(val_text):,}")

    print("Building TF-IDF + Logistic Regression pipeline...")
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=25000, ngram_range=(1, 2), stop_words='english')),
        ('clf', LogisticRegression(C=1.0, max_iter=1000, random_state=42))
    ])

    start_time = time.time()
    print("Fitting baseline pipeline on training data...")
    pipeline.fit(train_text, train_labels)
    train_time = time.time() - start_time
    print(f"Baseline training completed in {train_time:.2f} seconds.")

    print("Evaluating baseline on validation set...")
    val_start = time.time()
    val_preds = pipeline.predict(val_text)
    val_probs = pipeline.predict_proba(val_text)[:, 1]
    val_time = time.time() - val_start

    accuracy = float(accuracy_score(val_labels, val_preds))
    precision = float(precision_score(val_labels, val_preds))
    recall = float(recall_score(val_labels, val_preds))
    f1 = float(f1_score(val_labels, val_preds))
    roc_auc = float(roc_auc_score(val_labels, val_probs))
    cm = confusion_matrix(val_labels, val_preds).tolist()

    metrics = {
        "model_name": "TF-IDF + Logistic Regression Baseline",
        "dataset": DATASET_NAME,
        "train_samples": len(train_text),
        "val_samples": len(val_text),
        "training_time_seconds": round(train_time, 2),
        "inference_time_seconds": round(val_time, 4),
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": cm
    }

    print("--- Baseline Validation Metrics ---")
    print(json.dumps(metrics, indent=2))

    # Save artifact
    output_dir = Path(__file__).resolve().parent / "models" / "baseline_tfidf"
    os.makedirs(output_dir, exist_ok=True)

    model_path = output_dir / "baseline_pipeline.pkl"
    metrics_path = output_dir / "metrics.json"

    joblib.dump(pipeline, model_path)
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"Saved baseline pipeline artifact to: {model_path}")
    print(f"Saved baseline metrics to: {metrics_path}")
    return metrics

if __name__ == "__main__":
    train_baseline_model()
