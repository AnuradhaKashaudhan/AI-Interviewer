# Resume Domain Classifier Dataset Documentation

## Overview
- **Dataset Name:** `0xnbk/resume-domain-classifier-v1-en`
- **Hugging Face Hub Location:** [https://huggingface.co/datasets/0xnbk/resume-domain-classifier-v1-en](https://huggingface.co/datasets/0xnbk/resume-domain-classifier-v1-en)
- **License:** Apache 2.0
- **Language:** English (`en`)

## Dataset Composition & Size
- **Total Examples:** 47,176
- **Training Set (`train`):** 37,740 pairs
- **Validation Set (`validation`):** 9,436 pairs
- **Class Balance:** Balanced 50/50 binary target distribution ($1 = \text{Same Domain}$, $0 = \text{Different Domain}$)

## Schema & Columns
| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | Formatted combined string containing `resume [SEP] job_description` |
| `label` | `int64` | Target binary label ($1 = \text{Same Domain / Match}$, $0 = \text{Cross Domain / Mismatch}$) |
| `pair_type` | `string` | Category of pair (e.g. `positive`, `negative`) |
| `resume_domain` | `string` | Specific professional domain of the resume (e.g. `Software Development`, `Finance`) |
| `job_domain` | `string` | Target professional domain of the job description |

## Dataset Limitations & Explicit Attribution
> **Mandatory Notice:** The dataset uses job-posting data derived from real LinkedIn Jobs data, while resume content is synthetically generated.

### Additional Limitations:
1. **Synthetic Resume Content:** Resume samples are artificially generated text structures rather than actual human resumes, which may lack complex formatting or real-world typos.
2. **LinkedIn Job Origin:** Job descriptions reflect publicly posted LinkedIn positions, which may favor standard corporate and technology role descriptions.
3. **Domain Compatibility vs. Hiring Suitability:** The model predicts professional domain alignment ($1$ vs $0$), NOT candidate quality, qualification level, or an automated hiring decision.
4. **English Only:** All text is in English.
5. **Hybrid Roles & Career Transitioners:** Interdisciplinary roles (e.g., Bio-Informatics, FinTech, Product Management) may exhibit overlapping domain signals.

## Usage & Reproducibility
The dataset is loaded reproducibly using the Hugging Face `datasets` Python library:
```python
from datasets import load_dataset

dataset = load_dataset("0xnbk/resume-domain-classifier-v1-en")
print(dataset)
```
No local file paths are hard-coded.
