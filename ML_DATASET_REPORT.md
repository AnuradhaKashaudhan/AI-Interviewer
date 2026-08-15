# ML Dataset Inspection Report: `0xnbk/resume-domain-classifier-v1-en`

## 1. Executive Dataset Summary
- **Dataset Name:** `0xnbk/resume-domain-classifier-v1-en`
- **Source:** [Hugging Face Hub](https://huggingface.co/datasets/0xnbk/resume-domain-classifier-v1-en)
- **License:** Apache 2.0
- **Total Record Count:** 37,740
- **Primary Split Name on HF:** `validation`
- **Reproducible Train Split (80%):** 30,192
- **Reproducible Validation Split (20%):** 7,548 (Stratified `random_state=42`)

> **Mandatory Dataset Origin Notice:** The dataset uses job-posting data derived from real LinkedIn Jobs data, while resume content is synthetically generated.

---

## 2. Label Distribution
Target Binary Label ($1 = \text{Same Domain / Match}$, $0 = \text{Cross Domain / Non-Match}$):

| Split | Label 0 (Mismatch) | Label 1 (Match) | Total Rows | Balance Ratio |
| :--- | :--- | :--- | :--- | :--- |
| **Entire Dataset** | 18,856 (49.96%) | 18,884 (50.04%) | 37,740 | 1.0015 |
| **Train Set (80%)** | 15,085 (49.96%) | 15,107 (50.04%) | 30,192 | 1.0015 |
| **Validation Set (20%)** | 3,771 (49.96%) | 3,777 (50.04%) | 7,548 | 1.0016 |

---

## 3. Professional Domain & Pair Type Breakdown
- **Unique Resume Domains:** 13
- **Unique Job Domains:** 13

### Pair Type Frequency
| Pair Type | Count | Percentage |
| :--- | :--- | :--- |
| `same_domain` | 18,884 | 50.04% |
| `cross_domain_hard` | 16,973 | 44.97% |
| `cross_domain_random` | 1,883 | 4.99% |

---

## 4. Text Structure & Length Statistics
- **Mean Character Count:** 1295.1 (Min: 374, Max: 1645)
- **Mean Word Count:** 186.0 words (Min: 58, Max: 251)
- **95th Percentile Word Count:** 219.0 words
- **99th Percentile Word Count:** 229.0 words

### Delimiter `[SEP]` Frequency
- Samples containing `1` `[SEP]` delimiter(s): 37,740 (100.00%)

---

## 5. Data Integrity & Quality Audit
- **Missing Values across columns:** `{'text': 0, 'label': 0, 'pair_type': 0, 'resume_domain': 0, 'job_domain': 0}`
- **Duplicate Text Entries:** 0 (0.00%)

---

## 6. Preprocessing Decision
- The dataset formatting contains explicit `[SEP]` delimiters in the combined `text` field separating the synthetic resume from the LinkedIn job description.
- For DistilBERT sequence classification, tokenizing the text field directly with `[SEP]` intact preserves exact transformer paired-attention mechanics.
