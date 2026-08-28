# ML Dataset Inspection Report: `0xnbk/resume-domain-classifier-v1-en`

## 1. Executive Dataset Summary
- **Dataset Name:** `0xnbk/resume-domain-classifier-v1-en`
- **Source:** [Hugging Face Hub](https://huggingface.co/datasets/0xnbk/resume-domain-classifier-v1-en)
- **License:** Apache 2.0
- **Total Record Count:** 37,740
- **Reproducible Train Split (70%):** 26,418
- **Reproducible Validation Split (15%):** 5,661
- **Reproducible Held-Out Test Split (15%):** 5,661

> **Mandatory Dataset Origin Notice:** The dataset uses job-posting data derived from real LinkedIn Jobs data, while resume content is synthetically generated.

---

## 2. Label Distribution
Target Binary Label ($1 = \text{Same Domain / Match}$, $0 = \text{Cross Domain / Non-Match}$):

| Split | Label 0 (Mismatch) | Label 1 (Match) | Total Rows | Balance Ratio |
| :--- | :--- | :--- | :--- | :--- |
| **Entire Dataset** | 18,856 (49.96%) | 18,884 (50.04%) | 37,740 | 1.0015 |
| **Train Set (70%)** | 13,200 (49.97%) | 13,218 (50.03%) | 26,418 | 1.0014 |
| **Val Set (15%)** | 2,828 (49.96%) | 2,833 (50.04%) | 5,661 | 1.0018 |
| **Test Set (15%)** | 2,828 (49.96%) | 2,833 (50.04%) | 5,661 | 1.0018 |

---

## 3. Data Integrity & Quality Audit
- **Missing Values across columns:** `{'text': 0, 'label': 0, 'pair_type': 0, 'resume_domain': 0, 'job_domain': 0, 'resume_text': 0, 'job_description': 0}`
- **Duplicate Text Entries:** 0 (0.00%)
