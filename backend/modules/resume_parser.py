import re
from typing import Optional
import pdfplumber

PROGRAMMING_SIGNAL_TERMS = [
    "data structures",
    "algorithms",
    "dsa",
    "competitive programming",
    "leetcode",
    "programming",
    "developer",
    "implemented",
    "optimized",
    "backend",
    "software engineer",
    "machine learning",
    "python",
    "java",
    "c++",
    "c ",
    "javascript",
    "typescript",
    "react",
    "node",
    "docker",
    "kubernetes",
    "git",
    "sql",
]

TECHNICAL_ROLE_TERMS = [
    "software engineer",
    "backend",
    "full stack",
    "full-stack",
    "ml engineer",
    "machine learning",
    "data engineer",
    "data scientist",
    "developer",
    "engineer",
]


import io

def extract_text_from_pdf(filepath_or_bytes) -> str:
    """
    Extracts text from a PDF file path, raw bytes, or BytesIO stream.
    """
    extracted_text = ""
    try:
        if isinstance(filepath_or_bytes, bytes):
            stream = io.BytesIO(filepath_or_bytes)
        else:
            stream = filepath_or_bytes

        with pdfplumber.open(stream) as pdf:
            print(f"DEBUG: PDF opened. Total pages: {len(pdf.pages)}")
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
                print(f"DEBUG: Parsed page {i+1}")
        return extracted_text.strip()
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""


def detect_coding_round_recommendation(
    resume_text: Optional[str] = None,
    role: Optional[str] = None,
    skills: Optional[list[str]] = None,
) -> dict:
    """Decide whether a session should include a live coding round."""
    text_parts = []
    if resume_text:
        text_parts.append(resume_text)
    if role:
        text_parts.append(role)
    if skills:
        text_parts.extend(skills)

    combined_text = " ".join(text_parts).lower()
    has_programming_signal = any(term in combined_text for term in PROGRAMMING_SIGNAL_TERMS)

    technical_role = False
    if role:
        technical_role = any(term in role.lower() for term in TECHNICAL_ROLE_TERMS)

    enabled = has_programming_signal or (not resume_text and technical_role)
    if enabled:
        reason = (
            "Programming or DSA background detected, so a coding round is included."
            if has_programming_signal
            else "No resume was provided, but the selected role is technical, so a coding round is included."
        )
    else:
        reason = "No programming or DSA background detected."

    return {
        "enabled": enabled,
        "reason": reason,
    }
