import re
import json

# Weak verbs and their strong replacements
WEAK_VERBS = {
    "responsible for": "Led",
    "helped with": "Contributed to",
    "worked on": "Developed",
    "assisted in": "Supported",
    "participated in": "Collaborated on",
    "was involved in": "Drove",
    "handled": "Managed",
    "did": "Executed",
    "made": "Created",
    "got": "Achieved",
}

FILLER_PHRASES = [
    "team player",
    "hard worker",
    "detail-oriented",
    "self-starter",
    "think outside the box",
    "go-getter",
    "results-driven",
    "dynamic individual",
    "synergy",
    "proactive",
    "passionate about",
]

STRONG_VERBS = [
    "managed", "developed", "implemented", "created", "led", "optimized",
    "increased", "reduced", "designed", "architected", "delivered",
    "streamlined", "built", "launched", "spearheaded", "automated",
    "negotiated", "mentored", "transformed", "scaled",
]

COMMON_TECH_KEYWORDS = [
    # Backend
    "python", "javascript", "react", "node", "aws", "sql", "nosql",
    "docker", "kubernetes", "typescript", "java", "c++", "go", "rust",
    "terraform", "ci/cd", "agile", "scrum", "machine learning", "ai",
    "backend", "frontend", "fullstack", "api", "rest", "graphql",
    # Frontend
    "next.js", "vue", "tailwind", "sass", "redux", "jest",
    # Cloud/DevOps
    "azure", "gcp", "lambda", "serverless", "jenkins", "github actions",
    # Data
    "pandas", "numpy", "spark", "hadoop", "tensorflow", "pytorch",
    # Other
    "git", "linux", "trello", "jira", "microservices",
]


def _detect_formatting_issues(resume_text):
    """Detect ATS-breaking formatting patterns in the resume text."""
    issues = []

    # Check for table-like patterns (multiple tabs or pipe characters)
    if re.search(r'\t{2,}', resume_text) or resume_text.count('|') > 5:
        issues.append({
            "type": "tables",
            "label": "Table-like formatting detected",
            "detail": "ATS parsers often fail to read tables correctly. Use simple bullet points instead.",
        })

    # Check for multi-column hints (multiple consecutive spaces suggesting columns)
    column_lines = 0
    for line in resume_text.split('\n'):
        if re.search(r'\S\s{4,}\S', line):
            column_lines += 1
    if column_lines > 3:
        issues.append({
            "type": "multi_column",
            "label": "Multi-column layout detected",
            "detail": "Multi-column layouts confuse ATS parsers. Use a single-column format.",
        })

    # Check for image references
    if re.search(r'\.(png|jpg|jpeg|gif|svg|bmp|ico)', resume_text, re.IGNORECASE):
        issues.append({
            "type": "images",
            "label": "Image references found",
            "detail": "ATS systems cannot read images. Ensure all information is in plain text.",
        })

    # Check for header/footer patterns
    if re.search(r'(page\s+\d+\s*(of|/)\s*\d+|header|footer)', resume_text, re.IGNORECASE):
        issues.append({
            "type": "headers_footers",
            "label": "Headers/footers detected",
            "detail": "Some ATS systems skip or misread content in headers and footers.",
        })

    # Check for non-standard characters / symbols
    special_chars = re.findall(r'[^\x00-\x7F]', resume_text)
    if len(special_chars) > 10:
        issues.append({
            "type": "special_characters",
            "label": "Non-standard characters found",
            "detail": "Special Unicode characters may not parse correctly in all ATS systems.",
        })

    # Check for very long lines (possible formatting issues)
    long_lines = [l for l in resume_text.split('\n') if len(l) > 200]
    if len(long_lines) > 3:
        issues.append({
            "type": "long_lines",
            "label": "Excessively long text lines",
            "detail": "Very long lines may indicate missing line breaks or formatting issues.",
        })

    return issues


def _detect_issues(resume_text, sections_found, missing_keywords, job_description=None):
    """Generate structured issue objects for the Fix It page."""
    issues = []
    issue_id = 0
    lines = resume_text.split('\n')

    # 1. Weak verb detection
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        for weak, strong in WEAK_VERBS.items():
            if weak in line_stripped.lower():
                issue_id += 1
                # Build suggestion by replacing the weak verb
                suggestion = re.sub(
                    re.escape(weak),
                    strong,
                    line_stripped,
                    flags=re.IGNORECASE,
                    count=1,
                )
                issues.append({
                    "id": f"issue-{issue_id}",
                    "type": "weak_verb",
                    "severity": "warning",
                    "line_text": line_stripped,
                    "suggestion": suggestion,
                    "section": _guess_section(line_stripped, lines),
                    "rule": "weak_verb_detection",
                    "message": f'Weak verb detected: "{weak}". Use a stronger action verb like "{strong}".',
                })

    # 2. Missing metrics in bullet points
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        # Only check lines that look like bullet points or experience descriptions
        if (line_stripped.startswith(('-', '•', '*', '–', '►')) or
                (len(line_stripped) > 20 and any(v in line_stripped.lower() for v in STRONG_VERBS + list(WEAK_VERBS.keys())))):
            # Check if the line has any numbers/metrics
            has_metric = bool(re.search(r'\d+\s*(%|x|users|clients|customers|revenue|\$|hours|months|projects|team|members|million|billion|k\b)', line_stripped, re.IGNORECASE))
            has_any_number = bool(re.search(r'\d+', line_stripped))
            if not has_metric and not has_any_number and len(line_stripped) > 30:
                issue_id += 1
                issues.append({
                    "id": f"issue-{issue_id}",
                    "type": "missing_metric",
                    "severity": "error",
                    "line_text": line_stripped,
                    "suggestion": line_stripped + " (add specific numbers, e.g., 'reduced load time by 40%')",
                    "section": _guess_section(line_stripped, lines),
                    "rule": "missing_metric",
                    "message": "This bullet point lacks quantifiable metrics. Add numbers to strengthen impact.",
                })

    # 3. Filler phrases
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        for filler in FILLER_PHRASES:
            if filler in line_stripped.lower():
                issue_id += 1
                cleaned = re.sub(
                    re.escape(filler),
                    "",
                    line_stripped,
                    flags=re.IGNORECASE,
                    count=1,
                ).strip()
                cleaned = re.sub(r'\s+', ' ', cleaned).strip(' ,;')
                issues.append({
                    "id": f"issue-{issue_id}",
                    "type": "filler_phrase",
                    "severity": "info",
                    "line_text": line_stripped,
                    "suggestion": cleaned if cleaned else "(Remove this line entirely)",
                    "section": _guess_section(line_stripped, lines),
                    "rule": "filler_detection",
                    "message": f'Generic filler phrase: "{filler}". Replace with specific, measurable achievements.',
                })

    # 4. Missing keywords (from JD comparison)
    for kw in missing_keywords:
        issue_id += 1
        issues.append({
            "id": f"issue-{issue_id}",
            "type": "missing_keyword",
            "severity": "warning",
            "line_text": "",
            "suggestion": f"Add '{kw}' to your Skills or Experience section where relevant.",
            "section": "Skills",
            "rule": "keyword_match",
            "message": f'Job description keyword "{kw}" not found in your resume.',
        })

    # 5. Missing sections
    for section_name in ["Experience", "Education", "Skills", "Projects", "Contact"]:
        if section_name not in sections_found:
            issue_id += 1
            issues.append({
                "id": f"issue-{issue_id}",
                "type": "section_missing",
                "severity": "error",
                "line_text": "",
                "suggestion": f"Add a clearly labeled '{section_name}' section to your resume.",
                "section": section_name,
                "rule": "section_completeness",
                "message": f'Missing or unclear "{section_name}" section.',
            })

    return issues


def _guess_section(line, all_lines):
    """Try to determine which resume section a line belongs to."""
    section_headers = {
        "Experience": r"(experience|work history|employment|professional)",
        "Education": r"(education|academic|university|college|degree)",
        "Skills": r"(skills|technical skills|technologies|competencies)",
        "Projects": r"(projects|personal projects|portfolio)",
        "Contact": r"(contact|email|phone|linkedin|address)",
        "Summary": r"(summary|objective|profile|about)",
        "Certifications": r"(certifications?|licenses?|credentials)",
    }

    line_idx = None
    for i, l in enumerate(all_lines):
        if l.strip() == line:
            line_idx = i
            break

    if line_idx is None:
        return "General"

    # Walk backward to find the nearest section header
    for i in range(line_idx, max(-1, line_idx - 20), -1):
        for section_name, pattern in section_headers.items():
            if re.search(pattern, all_lines[i], re.IGNORECASE):
                return section_name

    return "General"


def _compute_sub_scores(resume_text, word_count, sections_found, total_sections,
                        matching_keywords, jd_keywords, job_description):
    """Compute the five sub-score components (each 0-100)."""

    # 1. Keyword Match
    if job_description and jd_keywords:
        keyword_score = int((len(matching_keywords) / max(len(jd_keywords), 1)) * 100)
    else:
        keyword_score = 50  # neutral if no JD

    # 2. Formatting / Parseability
    formatting_score = 100
    if word_count < 200:
        formatting_score -= 30
    elif word_count < 400:
        formatting_score -= 15
    elif word_count > 1200:
        formatting_score -= 20
    elif word_count > 1000:
        formatting_score -= 10

    lines = resume_text.split('\n')
    bullet_lines = [l for l in lines if l.strip().startswith(('-', '•', '*', '–', '►'))]
    for bl in bullet_lines:
        wc = len(bl.split())
        if wc > 40:
            formatting_score -= 3
        elif wc < 5:
            formatting_score -= 2
    formatting_score = max(0, min(100, formatting_score))

    # 3. Action-Verb Strength
    text_lower = resume_text.lower()
    strong_count = sum(1 for v in STRONG_VERBS if v in text_lower)
    weak_count = sum(1 for v in WEAK_VERBS if v in text_lower)
    filler_count = sum(1 for f in FILLER_PHRASES if f in text_lower)

    verb_score = min(100, strong_count * 10)
    verb_score -= weak_count * 12
    verb_score -= filler_count * 8
    verb_score = max(0, min(100, verb_score))

    # 4. Quantified Impact
    metric_pattern = r'\d+\s*(%|x|users|clients|revenue|\$|hours|months|projects|team|members|million|billion|k\b)'
    metric_matches = re.findall(metric_pattern, resume_text, re.IGNORECASE)
    impact_score = min(100, len(metric_matches) * 15)

    # 5. Section Completeness
    section_score = int((sections_found / max(total_sections, 1)) * 100)

    return {
        "keyword_match": keyword_score,
        "formatting": formatting_score,
        "action_verbs": verb_score,
        "quantified_impact": impact_score,
        "section_completeness": section_score,
    }


def check_ats_score(resume_text, job_description=None):
    """
    Analyzes resume text against a job description (if provided)
    to calculate an ATS matching score and provide suggestions.
    Returns an enhanced payload with sub-scores, structured issues,
    section data, and formatting checks for the staged parsing animation
    and Fix It page.
    """

    # Generic ATS checks
    score = 0
    feedback = []
    missing_keywords = []
    matched_keywords = []
    strengths = []

    # 1. Length Check
    word_count = len(resume_text.split())
    if 400 <= word_count <= 1000:
        score += 20
        strengths.append("Optimal resume length (400-1000 words).")
    elif word_count < 400:
        score += 10
        feedback.append("Resume seems a bit short. Consider adding more details about your projects and achievements.")
    else:
        score += 10
        feedback.append("Resume is quite long. Try to be more concise and limit it to 2 pages.")

    # 2. Section Checks
    sections = {
        "Experience": r"(experience|work history|employment)",
        "Education": r"(education|academic)",
        "Skills": r"(skills|technical skills|technologies)",
        "Projects": r"(projects|personal projects)",
        "Contact": r"(contact|email|phone|linkedin)",
        "Certifications": r"(certifications?|licenses?|credentials)",
    }

    found_sections_list = []
    missing_sections_list = []
    sections_found_count = 0
    for section, pattern in sections.items():
        if re.search(pattern, resume_text, re.IGNORECASE):
            sections_found_count += 1
            found_sections_list.append(section)
        else:
            missing_sections_list.append(section)
            feedback.append(f"Missing or unclear '{section}' section.")

    score += (sections_found_count / len(sections)) * 30
    if sections_found_count == len(sections):
        strengths.append("All key resume sections are present.")

    # 3. Keyword Matching (if job description provided)
    jd_keywords = []
    if job_description:
        jd_keywords = [k for k in COMMON_TECH_KEYWORDS if k in job_description.lower()]
        resume_keywords = [k for k in COMMON_TECH_KEYWORDS if k in resume_text.lower()]

        matched_keywords = [k for k in jd_keywords if k in resume_keywords]
        missing_keywords = [k for k in jd_keywords if k not in resume_keywords]

        if jd_keywords:
            match_percentage = (len(matched_keywords) / len(jd_keywords)) * 50
            score += match_percentage
            strengths.append(f"Matched {len(matched_keywords)} key skills from the job description.")
        else:
            score += 25  # Default if JD has no recognizable keywords
    else:
        # If no JD, check for general professional keywords
        action_verbs = ["managed", "developed", "implemented", "created", "led", "optimized", "increased", "reduced"]
        found_verbs = [v for v in action_verbs if v in resume_text.lower()]
        score += min(len(found_verbs) * 5, 20)
        if len(found_verbs) > 3:
            strengths.append("Good use of strong action verbs.")
        else:
            feedback.append("Consider using more action verbs like 'Implemented', 'Led', 'Optimized'.")

        # General score boost for having a JD to compare against
        score += 10

    # Ensure score is within 0-100
    score = min(max(int(score), 0), 100)

    # Generate Improvement Suggestions
    improvement_suggestions = []
    if score < 70:
        improvement_suggestions.append("Tailor your skills section to match specific job requirements.")
        improvement_suggestions.append("Quantify your achievements (e.g., 'Increased efficiency by 20%').")

    if "Contact" not in found_sections_list:
        improvement_suggestions.append("Ensure your contact information is easily visible at the top.")

    # Formatting issues
    formatting_issues = _detect_formatting_issues(resume_text)

    # Structured issues for Fix It page
    issues = _detect_issues(resume_text, found_sections_list, missing_keywords, job_description)

    # Sub-scores
    sub_scores = _compute_sub_scores(
        resume_text,
        word_count,
        sections_found_count,
        len(sections),
        matched_keywords,
        jd_keywords,
        job_description,
    )

    return {
        "score": score,
        "feedback": feedback,
        "strengths": strengths,
        "missing_keywords": missing_keywords,
        "matched_keywords": matched_keywords,
        "improvement_suggestions": improvement_suggestions,
        "word_count": word_count,
        "sections_found": found_sections_list,
        "sections_missing": missing_sections_list,
        "formatting_issues": formatting_issues,
        "issues": issues,
        "sub_scores": sub_scores,
    }
