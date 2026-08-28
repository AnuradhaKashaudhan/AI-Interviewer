import os
import sys
from pathlib import Path
from datasets import load_dataset
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

DATASET_NAME = "0xnbk/resume-domain-classifier-v1-en"

def extract_text_pairs(df_or_series):
    """
    Extracts separate (resume_text, job_description) strings from text containing '[SEP]' delimiter.
    Returns two lists: resume_texts, job_descriptions.
    """
    resumes = []
    jobs = []
    texts = df_or_series['text'] if hasattr(df_or_series, 'columns') else df_or_series
    for text in texts:
        if isinstance(text, str) and '[SEP]' in text:
            parts = text.split('[SEP]', 1)
            resumes.append(parts[0].strip())
            jobs.append(parts[1].strip())
        else:
            resumes.append(str(text).strip())
            jobs.append("")
    return resumes, jobs

def get_train_val_test_splits(df=None, random_state=42):
    """
    Performs reproducible 70% Train / 15% Validation / 15% Held-Out Test stratified split.
    Returns: train_df, val_df, test_df
    """
    if df is None:
        raw_ds = load_dataset(DATASET_NAME)
        primary_split = list(raw_ds.keys())[0]
        df = raw_ds[primary_split].to_pandas()

    if 'resume_text' not in df.columns:
        resumes, jobs = extract_text_pairs(df)
        df['resume_text'] = resumes
        df['job_description'] = jobs

    # First split off 15% Held-Out Test Set
    train_val_df, test_df = train_test_split(
        df,
        test_size=0.15,
        random_state=random_state,
        stratify=df['label']
    )

    # Second split remaining 85% into 70% Train (82.35% of train_val) and 15% Val (17.65% of train_val)
    train_df, val_df = train_test_split(
        train_val_df,
        test_size=0.17647058823529413,  # 15 / 85
        random_state=random_state,
        stratify=train_val_df['label']
    )

    return train_df, val_df, test_df

def load_and_inspect_dataset():
    print(f"Loading dataset '{DATASET_NAME}' from Hugging Face...")
    raw_dataset = load_dataset(DATASET_NAME)
    print("Dataset loaded successfully!")
    print("Available keys in HF dataset:", list(raw_dataset.keys()))

    primary_split_key = list(raw_dataset.keys())[0]
    df = raw_dataset[primary_split_key].to_pandas()
    total_rows = len(df)

    resumes, jobs = extract_text_pairs(df)
    df['resume_text'] = resumes
    df['job_description'] = jobs

    train_df, val_df, test_df = get_train_val_test_splits(df, random_state=42)

    train_rows = len(train_df)
    val_rows = len(val_df)
    test_rows = len(test_df)

    print(f"Dataset 70/15/15 Partitioning: Train={train_rows:,}, Val={val_rows:,}, Test={test_rows:,}")

    total_label_dist = df['label'].value_counts().to_dict()
    train_label_dist = train_df['label'].value_counts().to_dict()
    val_label_dist = val_df['label'].value_counts().to_dict()
    test_label_dist = test_df['label'].value_counts().to_dict()

    resume_domains = df['resume_domain'].nunique() if 'resume_domain' in df.columns else 0
    job_domains = df['job_domain'].nunique() if 'job_domain' in df.columns else 0
    pair_types = df['pair_type'].value_counts().to_dict() if 'pair_type' in df.columns else {}

    missing_vals = df.isnull().sum().to_dict()
    dup_texts = df['text'].duplicated().sum()

    char_lens = df['text'].apply(len)
    word_lens = df['text'].apply(lambda s: len(s.split()))

    report_md = f"""# ML Dataset Inspection Report: `{DATASET_NAME}`

## 1. Executive Dataset Summary
- **Dataset Name:** `{DATASET_NAME}`
- **Source:** [Hugging Face Hub](https://huggingface.co/datasets/{DATASET_NAME})
- **License:** Apache 2.0
- **Total Record Count:** {total_rows:,}
- **Reproducible Train Split (70%):** {train_rows:,}
- **Reproducible Validation Split (15%):** {val_rows:,}
- **Reproducible Held-Out Test Split (15%):** {test_rows:,}

> **Mandatory Dataset Origin Notice:** The dataset uses job-posting data derived from real LinkedIn Jobs data, while resume content is synthetically generated.

---

## 2. Label Distribution
Target Binary Label ($1 = \\text{{Same Domain / Match}}$, $0 = \\text{{Cross Domain / Non-Match}}$):

| Split | Label 0 (Mismatch) | Label 1 (Match) | Total Rows | Balance Ratio |
| :--- | :--- | :--- | :--- | :--- |
| **Entire Dataset** | {total_label_dist.get(0, 0):,} ({total_label_dist.get(0, 0)/total_rows*100:.2f}%) | {total_label_dist.get(1, 0):,} ({total_label_dist.get(1, 0)/total_rows*100:.2f}%) | {total_rows:,} | {total_label_dist.get(1, 0)/max(total_label_dist.get(0, 1), 1):.4f} |
| **Train Set (70%)** | {train_label_dist.get(0, 0):,} ({train_label_dist.get(0, 0)/train_rows*100:.2f}%) | {train_label_dist.get(1, 0):,} ({train_label_dist.get(1, 0)/train_rows*100:.2f}%) | {train_rows:,} | {train_label_dist.get(1, 0)/max(train_label_dist.get(0, 1), 1):.4f} |
| **Val Set (15%)** | {val_label_dist.get(0, 0):,} ({val_label_dist.get(0, 0)/val_rows*100:.2f}%) | {val_label_dist.get(1, 0):,} ({val_label_dist.get(1, 0)/val_rows*100:.2f}%) | {val_rows:,} | {val_label_dist.get(1, 0)/max(val_label_dist.get(0, 1), 1):.4f} |
| **Test Set (15%)** | {test_label_dist.get(0, 0):,} ({test_label_dist.get(0, 0)/test_rows*100:.2f}%) | {test_label_dist.get(1, 0):,} ({test_label_dist.get(1, 0)/test_rows*100:.2f}%) | {test_rows:,} | {test_label_dist.get(1, 0)/max(test_label_dist.get(0, 1), 1):.4f} |

---

## 3. Data Integrity & Quality Audit
- **Missing Values across columns:** `{missing_vals}`
- **Duplicate Text Entries:** {dup_texts} ({dup_texts/total_rows*100:.2f}%)
"""

    root_dir = Path(__file__).resolve().parent.parent.parent
    report_path = root_dir / "ML_DATASET_REPORT.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_md)

    print(f"Report written to: {report_path}")
    return df, train_df, val_df, test_df

if __name__ == "__main__":
    load_and_inspect_dataset()

