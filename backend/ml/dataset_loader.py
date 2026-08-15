import os
import sys
from pathlib import Path
from datasets import load_dataset
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

DATASET_NAME = "0xnbk/resume-domain-classifier-v1-en"

def load_and_inspect_dataset():
    print(f"Loading dataset '{DATASET_NAME}' from Hugging Face...")
    raw_dataset = load_dataset(DATASET_NAME)
    print("Dataset loaded successfully!")
    print("Available keys in HF dataset:", list(raw_dataset.keys()))

    # Extract primary table
    primary_split_key = list(raw_dataset.keys())[0]
    df = raw_dataset[primary_split_key].to_pandas()
    total_rows = len(df)

    # Perform reproducible 80/20 train/validation split
    train_df, val_df = train_test_split(
        df,
        test_size=0.20,
        random_state=42,
        stratify=df['label']
    )

    train_rows = len(train_df)
    val_rows = len(val_df)

    # Class distribution
    total_label_dist = df['label'].value_counts().to_dict()
    train_label_dist = train_df['label'].value_counts().to_dict()
    val_label_dist = val_df['label'].value_counts().to_dict()

    # Domain distribution
    resume_domains = df['resume_domain'].nunique() if 'resume_domain' in df.columns else 0
    job_domains = df['job_domain'].nunique() if 'job_domain' in df.columns else 0
    pair_types = df['pair_type'].value_counts().to_dict() if 'pair_type' in df.columns else {}

    # Missing values
    missing_vals = df.isnull().sum().to_dict()

    # Duplicate texts
    dup_texts = df['text'].duplicated().sum()

    # Text length stats
    char_lens = df['text'].apply(len)
    word_lens = df['text'].apply(lambda s: len(s.split()))

    sep_count = df['text'].apply(lambda s: s.count('[SEP]')).value_counts().to_dict()

    # Construct ML_DATASET_REPORT.md
    report_md = f"""# ML Dataset Inspection Report: `{DATASET_NAME}`

## 1. Executive Dataset Summary
- **Dataset Name:** `{DATASET_NAME}`
- **Source:** [Hugging Face Hub](https://huggingface.co/datasets/{DATASET_NAME})
- **License:** Apache 2.0
- **Total Record Count:** {total_rows:,}
- **Primary Split Name on HF:** `{primary_split_key}`
- **Reproducible Train Split (80%):** {train_rows:,}
- **Reproducible Validation Split (20%):** {val_rows:,} (Stratified `random_state=42`)

> **Mandatory Dataset Origin Notice:** The dataset uses job-posting data derived from real LinkedIn Jobs data, while resume content is synthetically generated.

---

## 2. Label Distribution
Target Binary Label ($1 = \\text{{Same Domain / Match}}$, $0 = \\text{{Cross Domain / Non-Match}}$):

| Split | Label 0 (Mismatch) | Label 1 (Match) | Total Rows | Balance Ratio |
| :--- | :--- | :--- | :--- | :--- |
| **Entire Dataset** | {total_label_dist.get(0, 0):,} ({total_label_dist.get(0, 0)/total_rows*100:.2f}%) | {total_label_dist.get(1, 0):,} ({total_label_dist.get(1, 0)/total_rows*100:.2f}%) | {total_rows:,} | {total_label_dist.get(1, 0)/max(total_label_dist.get(0, 1), 1):.4f} |
| **Train Set (80%)** | {train_label_dist.get(0, 0):,} ({train_label_dist.get(0, 0)/train_rows*100:.2f}%) | {train_label_dist.get(1, 0):,} ({train_label_dist.get(1, 0)/train_rows*100:.2f}%) | {train_rows:,} | {train_label_dist.get(1, 0)/max(train_label_dist.get(0, 1), 1):.4f} |
| **Validation Set (20%)** | {val_label_dist.get(0, 0):,} ({val_label_dist.get(0, 0)/val_rows*100:.2f}%) | {val_label_dist.get(1, 0):,} ({val_label_dist.get(1, 0)/val_rows*100:.2f}%) | {val_rows:,} | {val_label_dist.get(1, 0)/max(val_label_dist.get(0, 1), 1):.4f} |

---

## 3. Professional Domain & Pair Type Breakdown
- **Unique Resume Domains:** {resume_domains}
- **Unique Job Domains:** {job_domains}

### Pair Type Frequency
| Pair Type | Count | Percentage |
| :--- | :--- | :--- |
"""
    for pt, count in pair_types.items():
        report_md += f"| `{pt}` | {count:,} | {count/total_rows*100:.2f}% |\n"

    report_md += f"""
---

## 4. Text Structure & Length Statistics
- **Mean Character Count:** {char_lens.mean():.1f} (Min: {char_lens.min()}, Max: {char_lens.max()})
- **Mean Word Count:** {word_lens.mean():.1f} words (Min: {word_lens.min()}, Max: {word_lens.max()})
- **95th Percentile Word Count:** {np.percentile(word_lens, 95):.1f} words
- **99th Percentile Word Count:** {np.percentile(word_lens, 99):.1f} words

### Delimiter `[SEP]` Frequency
"""
    for cnt, num in sep_count.items():
        report_md += f"- Samples containing `{cnt}` `[SEP]` delimiter(s): {num:,} ({num/total_rows*100:.2f}%)\n"

    report_md += f"""
---

## 5. Data Integrity & Quality Audit
- **Missing Values across columns:** `{missing_vals}`
- **Duplicate Text Entries:** {dup_texts} ({dup_texts/total_rows*100:.2f}%)

---

## 6. Preprocessing Decision
- The dataset formatting contains explicit `[SEP]` delimiters in the combined `text` field separating the synthetic resume from the LinkedIn job description.
- For DistilBERT sequence classification, tokenizing the text field directly with `[SEP]` intact preserves exact transformer paired-attention mechanics.
"""

    root_dir = Path(__file__).resolve().parent.parent.parent
    report_path = root_dir / "ML_DATASET_REPORT.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_md)

    print(f"Report written to: {report_path}")
    return df, train_df, val_df

if __name__ == "__main__":
    load_and_inspect_dataset()
