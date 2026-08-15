import os
import sys
import json
import time
from pathlib import Path
import torch
import numpy as np
from datasets import load_dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding,
)

DATASET_NAME = "0xnbk/resume-domain-classifier-v1-en"
MODEL_CHECKPOINT = "distilbert-base-uncased"
OUTPUT_DIR = Path(__file__).resolve().parent / "models" / "distilbert_resume_job_match"

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    probs = torch.softmax(torch.tensor(logits), dim=-1).numpy()[:, 1]
    preds = np.argmax(logits, axis=1)

    acc = float(accuracy_score(labels, preds))
    prec = float(precision_score(labels, preds, zero_division=0))
    rec = float(recall_score(labels, preds, zero_division=0))
    f1 = float(f1_score(labels, preds, zero_division=0))
    auc = float(roc_auc_score(labels, probs))

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(auc, 4),
    }

def train_distilbert():
    print("--- Phase 10: Training Fine-Tuned DistilBERT Model ---")

    print(f"Loading dataset '{DATASET_NAME}'...")
    raw_ds = load_dataset(DATASET_NAME)
    primary_split = list(raw_ds.keys())[0]
    df = raw_ds[primary_split].to_pandas()

    # Hardware detection & CPU Configuration Scaling
    if torch.cuda.is_available():
        device_str = f"CUDA GPU ({torch.cuda.get_device_name(0)})"
        batch_size = 16
        use_fp16 = True
        num_epochs = 2
        max_seq_length = 512
        subset_df = df  # Use full 37.7k dataset on GPU
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device_str = "Apple MPS GPU"
        batch_size = 16
        use_fp16 = False
        num_epochs = 2
        max_seq_length = 512
        subset_df = df
    else:
        device_str = "CPU Only"
        batch_size = 8
        use_fp16 = False
        num_epochs = 1
        max_seq_length = 128  # 16x speedup on CPU for quadratic self-attention
        print("WARNING: Training on CPU may take significantly longer. Recommended to use GPU if available.")
        print("Applying CPU hardware safety configuration: max_length=128, stratified 500 sample subset (400 train / 100 val).")
        # Stratified sampling for fast CPU fine-tuning
        subset_df, _ = train_test_split(df, train_size=500, random_state=42, stratify=df['label'])

    print(f"Hardware Environment: {device_str}")

    print("Performing stratified 80/20 train/validation split...")
    train_df, val_df = train_test_split(
        subset_df,
        test_size=0.20,
        random_state=42,
        stratify=subset_df['label']
    )

    print(f"Train samples: {len(train_df):,}, Validation samples: {len(val_df):,}")

    print(f"Loading tokenizer '{MODEL_CHECKPOINT}'...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_CHECKPOINT)

    # Convert to HF Dataset object for fast tokenization mapping
    from datasets import Dataset
    train_hf = Dataset.from_pandas(train_df[['text', 'label']])
    val_hf = Dataset.from_pandas(val_df[['text', 'label']])

    def preprocess_function(examples):
        return tokenizer(
            examples['text'],
            truncation=True,
            max_length=max_seq_length,
            padding=False,
        )

    print(f"Tokenizing train and validation splits (max_length={max_seq_length})...")
    tokenized_train = train_hf.map(preprocess_function, batched=True, remove_columns=['text'])
    tokenized_val = val_hf.map(preprocess_function, batched=True, remove_columns=['text'])

    print(f"Loading base model '{MODEL_CHECKPOINT}' with num_labels=2...")
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_CHECKPOINT,
        num_labels=2
    )

    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    training_args = TrainingArguments(
        output_dir=str(OUTPUT_DIR / "checkpoints"),
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        num_train_epochs=num_epochs,
        weight_decay=0.01,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        fp16=use_fp16,
        logging_steps=10,
        save_total_limit=1,
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        processing_class=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
    )

    print("Starting DistilBERT fine-tuning...")
    start_time = time.time()
    train_result = trainer.train()
    train_time = time.time() - start_time
    print(f"DistilBERT fine-tuning completed in {train_time:.2f} seconds.")

    print("Evaluating best model on validation set...")
    val_metrics = trainer.evaluate()

    # Detailed evaluation for metrics.json
    predictions = trainer.predict(tokenized_val)
    logits = predictions.predictions
    labels = predictions.label_ids
    probs = torch.softmax(torch.tensor(logits), dim=-1).numpy()[:, 1]
    preds = np.argmax(logits, axis=1)

    cm = confusion_matrix(labels, preds).tolist()

    final_metrics = {
        "model_name": "Fine-Tuned DistilBERT (distilbert-base-uncased)",
        "dataset": DATASET_NAME,
        "train_samples": len(train_df),
        "val_samples": len(val_df),
        "device": device_str,
        "max_length": max_seq_length,
        "epochs": num_epochs,
        "learning_rate": 2e-5,
        "batch_size": batch_size,
        "training_time_seconds": round(train_time, 2),
        "accuracy": round(float(accuracy_score(labels, preds)), 4),
        "precision": round(float(precision_score(labels, preds, zero_division=0)), 4),
        "recall": round(float(recall_score(labels, preds, zero_division=0)), 4),
        "f1_score": round(float(f1_score(labels, preds, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(labels, probs)), 4),
        "confusion_matrix": cm,
    }

    print("--- DistilBERT Validation Metrics ---")
    print(json.dumps(final_metrics, indent=2))

    # Save final model artifacts
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model.save_pretrained(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))

    with open(OUTPUT_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(final_metrics, f, indent=2)

    metadata = {
        "model_type": "DistilBertForSequenceClassification",
        "checkpoint": MODEL_CHECKPOINT,
        "num_labels": 2,
        "id2label": {0: "Cross Domain", 1: "Same Domain"},
        "label2id": {"Cross Domain": 0, "Same Domain": 1},
    }
    with open(OUTPUT_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Fine-tuned DistilBERT saved to: {OUTPUT_DIR}")
    return final_metrics

if __name__ == "__main__":
    train_distilbert()
