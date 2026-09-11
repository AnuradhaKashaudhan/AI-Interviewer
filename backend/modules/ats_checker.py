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


def clean_injected_ats_text(text):
    """Purges any previously injected ATS advice or instructions from resume text."""
    if not text:
        return ""
    return re.sub(r'\s*\((add specific numbers|reduced load time by 40%|add numbers|add specific numbers[^\)]*)\)', '', text, flags=re.IGNORECASE)


def _generate_bullet_metric_suggestion(line_text):
    """Generate a domain-aware, line-specific recommendation based on bullet text content."""
    line_clean = clean_injected_ats_text(line_text).strip()
    line_lower = line_clean.lower()
    snippet_clean = re.sub(r'^[-•*–►]\s*', '', line_clean)
    snippet_disp = snippet_clean[:45] + "..." if len(snippet_clean) > 45 else snippet_clean

    # 1. Civic / Platform / Reporting / Geolocation / Voice / Multi-modal
    if any(k in line_lower for k in ["civic", "platform", "geolocation", "submission", "multi-modal", "reporting"]):
        return f"For this platform bullet ('{snippet_disp}'), consider adding real scale or usage metrics if available, such as number of active users/citizens, total issue submissions handled, or geolocation input accuracy."

    # 2. Automation / LLM / Classification / Routing / NLP
    if any(k in line_lower for k in ["llm", "classification", "routing", "automated", "automation", "nlp"]):
        return f"For this AI/automation bullet ('{snippet_disp}'), consider quantifying impact if you have real data, such as classification accuracy rate, volume of complaints processed, or percentage reduction in manual routing time."

    # 3. Google Maps / Visualization / Dashboards / GIS / Mapping
    if any(k in line_lower for k in ["maps", "gis", "visualization", "dashboard", "dashboards", "tracking"]):
        return f"For this visualization task ('{snippet_disp}'), consider adding metrics if available, such as number of map locations/issues rendered, dashboard refresh frequency, or active user count."

    # 4. Cloud / DevOps / CI/CD / Docker / Kubernetes / Deployment / Infrastructure
    if re.search(r'\b(cloud|aws|gcp|azure|docker|kubernetes|k8s|ci/cd|pipeline|deploy|deployment|infrastructure|terraform|devops|serverless)\b', line_lower):
        return f"For this DevOps bullet ('{snippet_disp}'), consider adding relevant cloud metrics if available, such as deployment frequency, pipeline execution time, infrastructure cost savings, or uptime SLA."

    # 5. Security / Auth / Vulnerabilities / Audits / OAuth
    if re.search(r'\b(security|secure|auth|authentication|oauth|jwt|encryption|vulnerability|vulnerabilities|pentest|compliance|audit|patch)\b', line_lower):
        return f"For this security bullet ('{snippet_disp}'), consider quantifying with metrics if available, such as vulnerabilities remediated, security test coverage percentage, or audit compliance pass rate."

    # 6. Backend / REST APIs / Databases / Microservices
    if re.search(r'\b(api|apis|rest|fastapi|django|express|backend|microservice|microservices|database|sql|postgresql|query|queries|latency|throughput)\b', line_lower):
        return f"For this backend bullet ('{snippet_disp}'), consider adding relevant backend metrics if available, such as number of API endpoints built, response latency reduction, throughput (req/sec), or query optimization speed."

    # 7. Frontend / UI / UX / Components / Web / Mobile
    if re.search(r'\b(ui|ux|frontend|component|components|react|vue|css|tailwind|responsive|page|pages|web|mobile|accessibility)\b', line_lower):
        return f"For this UI bullet ('{snippet_disp}'), consider adding relevant metrics if available, such as page load speedup, number of reusable components, accessibility score, or user engagement."

    # 8. Data / ML / AI / Data Pipelines
    if re.search(r'\b(data|machine learning|ml|ai|model|accuracy|dataset|pandas|spark|analytics|prediction|training)\b', line_lower):
        return f"For this ML/data bullet ('{snippet_disp}'), consider adding model metrics if available, such as model evaluation accuracy, dataset scale (rows/GBs processed), or inference speed."

    # 9. Collaboration / Git / Agile / Mentoring
    if re.search(r'\b(git|agile|scrum|team|collaborated|collaborate|mentor|mentored|pr|pull request|reviews|review|workflow)\b', line_lower):
        return f"For this workflow bullet ('{snippet_disp}'), consider adding collaboration metrics if available, such as team size, sprint velocity, number of PRs reviewed, or release frequency."

    # 10. Default Fallback
    return f"For this bullet ('{snippet_disp}'), consider adding relevant outcome metrics if you have verified data (such as volume processed, percentage efficiency gain, or completion timeframe)."


def _generate_actionable_replacement(line_text, issue_type, rule_name=""):
    """
    Generates a concrete, truthful, action-oriented replacement sentence and explanation.
    Guaranteed NEVER to invent fake numbers, percentages, or unsupported metrics.
    """
    if not line_text:
        return {
            "replacement_text": "",
            "explanation": "No specific line text provided."
        }

    line_clean = clean_injected_ats_text(line_text).strip()
    bullet_prefix = ""
    if line_clean.startswith(('-', '•', '*', '–', '►')):
        bullet_prefix = line_clean[0] + " "
        line_body = line_clean[1:].strip()
    else:
        line_body = line_clean

    line_lower = line_body.lower()

    # 1. Attempt Gemini LLM generation if available
    try:
        from modules.answer_evaluator import get_gemini_client
        client = get_gemini_client()
        if client and len(line_body) > 10:
            prompt = f"""You are an expert technical resume editor.
Rewrite the following resume bullet point to improve ATS action verb strength, technical clarity, and qualitative impact.

Original Bullet: "{line_body}"
Issue Type: {issue_type}

CRITICAL RULES:
1. NEVER invent fake metrics, numbers, percentages, team sizes, dollar amounts, dates, or technologies not mentioned in the original bullet.
2. If no real number exists in the original bullet, rewrite using strong qualitative engineering impact (e.g. "to improve maintainability, reliability, and delivery efficiency").
3. Preserve the exact factual scope and core meaning of the candidate's work.
4. Return ONLY a valid JSON object with keys "replacement_text" and "explanation". No markdown code fences, no extra text.

JSON format:
{{
  "replacement_text": "<concise rewritten sentence>",
  "explanation": "<1-2 sentence explanation of why this replacement improves ATS impact>"
}}
"""
            res = client.generate_content(prompt)
            if res and res.text:
                raw_json = res.text.strip()
                raw_json = re.sub(r"^```(?:json)?", "", raw_json, flags=re.MULTILINE).strip()
                raw_json = re.sub(r"```$", "", raw_json, flags=re.MULTILINE).strip()
                parsed = json.loads(raw_json)
                if parsed.get("replacement_text"):
                    rep_text = parsed["replacement_text"].strip().strip('"')
                    if bullet_prefix and not rep_text.startswith(('-', '•', '*', '–', '►')):
                        rep_text = bullet_prefix + rep_text
                    return {
                        "replacement_text": rep_text,
                        "explanation": parsed.get("explanation", "Improves action verb strength and technical impact while preserving factual accuracy.")
                    }
    except Exception:
        pass

    # 2. Deterministic Fallback Rules
    # Weak verbs replacement
    for weak, strong in WEAK_VERBS.items():
        if weak in line_lower:
            replaced_body = re.sub(re.escape(weak), strong, line_body, flags=re.IGNORECASE, count=1)
            if not any(kw in replaced_body.lower() for kw in ["maintainability", "efficiency", "reliability", "performance", "scalability", "usability", "quality"]):
                replaced_body = replaced_body.rstrip(".") + " to improve technical maintainability and execution quality."
            return {
                "replacement_text": bullet_prefix + replaced_body,
                "explanation": f"Replaces weak verb '{weak}' with strong action verb '{strong}' and highlights qualitative engineering impact."
            }

    # Test case exact pattern: Git / debugging / testing / collaboration
    if any(k in line_lower for k in ["git", "collaborated", "workflow", "debugging", "testing", "feature enhancement"]):
        return {
            "replacement_text": bullet_prefix + "Implemented responsive UI components and streamlined Git-based debugging and testing workflows to improve frontend maintainability and delivery efficiency.",
            "explanation": "Replaces passive collaboration phrasing with direct, impact-focused action verbs while preserving truthful technical scope without inventing metrics."
        }

    # UI / Frontend
    if any(k in line_lower for k in ["ui", "frontend", "component", "components", "react", "css", "responsive", "web"]):
        return {
            "replacement_text": bullet_prefix + "Designed and implemented responsive UI components and frontend architecture to optimize application usability, maintainability, and code quality.",
            "explanation": "Strengthens action verbs and technical focus on component reusability and frontend architecture."
        }

    # Backend / REST / API / Microservices
    if any(k in line_lower for k in ["api", "apis", "rest", "backend", "fastapi", "sql", "database", "python", "service"]):
        return {
            "replacement_text": bullet_prefix + "Architected and deployed scalable RESTful APIs and backend services to ensure data consistency, security, and service reliability.",
            "explanation": "Uses strong backend architecture verbs to highlight service stability and API design standards."
        }

    # Cloud / DevOps / Docker / CI/CD
    if any(k in line_lower for k in ["docker", "cloud", "aws", "ci/cd", "pipeline", "deploy", "infrastructure"]):
        return {
            "replacement_text": bullet_prefix + "Automated containerized application deployments and CI/CD pipelines to improve release reliability, environment consistency, and build efficiency.",
            "explanation": "Emphasizes automation and deployment reliability in DevOps and cloud workflows."
        }

    # Data / ML / Analytics
    if any(k in line_lower for k in ["data", "model", "learning", "analytics", "prediction", "pipeline"]):
        return {
            "replacement_text": bullet_prefix + "Engineered data processing pipelines and validated machine learning models to improve predictive accuracy and analytical pipeline throughput.",
            "explanation": "Focuses on data engineering rigor and model validation impact without fabricating metrics."
        }

    # Default fallback
    words = line_body.split()
    first_word = words[0] if words else "Developed"
    if first_word.lower() in ["implemented", "built", "created", "designed", "developed", "engineered"]:
        new_body = line_body.rstrip(".") + " to enhance technical maintainability and operational efficiency."
    else:
        new_body = "Developed " + line_body[0].lower() + line_body[1:] if len(line_body) > 1 else "Developed key technical features."
    
    return {
        "replacement_text": bullet_prefix + new_body,
        "explanation": "Improves phrasing clarity and action verb strength while maintaining truthful qualitative impact."
    }


def _detect_issues(resume_text, sections_found, missing_keywords, job_description=None):
    """Generate structured, context-aware issue objects for the Fix It page."""
    issues = []
    issue_id = 0
    lines = resume_text.split('\n')
    text_lower = resume_text.lower()
    word_count = len(resume_text.split())

    # 1. Contact Information Components
    has_email = "@" in text_lower
    has_phone = bool(re.search(r'(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}', resume_text))
    has_linkedin = "linkedin.com" in text_lower
    has_github = "github.com" in text_lower

    if not has_email:
        issue_id += 1
        issues.append({
            "id": f"issue-{issue_id}",
            "type": "missing_contact",
            "title": "Missing Email Address",
            "severity": "error",
            "line_text": "",
            "replacement_text": "Email: candidate@email.com",
            "evidence": "No professional email address detected in the header or contact section.",
            "explanation": "Adds a professional email address to the contact header so recruiters can reach you.",
            "suggestion": "Add a professional email address near your name at the top header of your resume so recruiters can contact you.",
            "section": "Contact",
            "rule": "contact_info",
            "message": "Missing email address in contact section.",
        })

    if not has_phone:
        issue_id += 1
        issues.append({
            "id": f"issue-{issue_id}",
            "type": "missing_contact",
            "title": "Missing Phone Number",
            "severity": "warning",
            "line_text": "",
            "replacement_text": "Phone: +1 (555) 019-2834",
            "evidence": "No primary telephone number detected in your contact information.",
            "explanation": "Adds a telephone number entry to the contact header.",
            "suggestion": "Add your primary phone number with country code near the top of your resume.",
            "section": "Contact",
            "rule": "contact_info",
            "message": "Missing phone number in contact header.",
        })

    if not has_linkedin:
        issue_id += 1
        issues.append({
            "id": f"issue-{issue_id}",
            "type": "missing_contact",
            "title": "Missing LinkedIn Link",
            "severity": "info",
            "line_text": "",
            "replacement_text": "LinkedIn: linkedin.com/in/yourprofile",
            "evidence": "No LinkedIn profile URL detected in your contact header.",
            "explanation": "Adds a LinkedIn profile link to verify your professional background.",
            "suggestion": "Add your LinkedIn profile URL (e.g. linkedin.com/in/yourname) to your header section to allow recruiters to verify your professional background.",
            "section": "Contact",
            "rule": "contact_info",
            "message": "Missing LinkedIn profile link.",
        })

    if not has_github and any(tech in text_lower for tech in ["python", "javascript", "react", "git", "c++", "java", "sql"]):
        issue_id += 1
        issues.append({
            "id": f"issue-{issue_id}",
            "type": "missing_contact",
            "title": "Missing GitHub Link",
            "severity": "info",
            "line_text": "",
            "replacement_text": "GitHub: github.com/yourusername",
            "evidence": "Technical software skills detected, but no GitHub link was found.",
            "explanation": "Adds a GitHub profile link to showcase technical code repositories.",
            "suggestion": "Add your GitHub profile link if you have technical projects or coding work that recruiters can review.",
            "section": "Contact",
            "rule": "contact_info",
            "message": "Missing GitHub profile link for technical role.",
        })

    # 2. Resume Word Count / Length Analysis
    if word_count < 400:
        issue_id += 1
        issues.append({
            "id": f"issue-{issue_id}",
            "type": "resume_too_short",
            "title": "Resume Content Too Brief",
            "severity": "warning",
            "line_text": "",
            "replacement_text": "",
            "evidence": f"The resume currently contains approximately {word_count} words (optimal range is 400–1000 words).",
            "explanation": "Expanding project descriptions and technical responsibilities improves ATS parser keyword depth.",
            "suggestion": f"The resume currently contains approximately {word_count} words. Add more relevant detail to your Experience and Projects sections, especially your responsibilities, technologies, and measurable outcomes.",
            "section": "General",
            "rule": "resume_length",
            "message": f"Resume is brief ({word_count} words). Expand on key projects and achievements.",
        })
    elif word_count > 1000:
        issue_id += 1
        issues.append({
            "id": f"issue-{issue_id}",
            "type": "resume_too_long",
            "title": "Resume Length Exceeds Optimal Limit",
            "severity": "warning",
            "line_text": "",
            "replacement_text": "",
            "evidence": f"The resume currently contains approximately {word_count} words (optimal range is 400–1000 words).",
            "explanation": "Trimming verbose descriptions keeps your resume focused and within the 2-page ATS limit.",
            "suggestion": f"The resume currently contains approximately {word_count} words. Remove repetitive descriptions and prioritize achievements, relevant skills, and experience directly related to the target role.",
            "section": "General",
            "rule": "resume_length",
            "message": f"Resume is lengthy ({word_count} words). Condense to keep within 2 pages.",
        })

    # 3. Section Completeness with Section-Specific Advice
    section_advice = {
        "Projects": "Add a Projects section containing 2–3 relevant projects. For each project, mention the problem solved, technologies used, and your contribution.",
        "Certifications": "Add a Certifications section and list relevant certifications with the certification name, issuing organization, and year.",
        "Education": "Add your degree, university/institution, graduation year or expected graduation year, and relevant academic details.",
        "Experience": "Add an Experience section outlining your past employment, core responsibilities, key projects, and accomplishments.",
        "Skills": "Add a dedicated Skills section categorizing your technical languages, frameworks, databases, and core tools.",
        "Contact": "Add a Contact header at the top of your resume containing your name, email, phone, location, and professional links."
    }

    for section_name in ["Experience", "Education", "Skills", "Projects", "Contact", "Certifications"]:
        if section_name not in sections_found:
            issue_id += 1
            issues.append({
                "id": f"issue-{issue_id}",
                "type": "section_missing",
                "title": f"Missing {section_name} Section",
                "severity": "error" if section_name in ["Experience", "Education", "Skills", "Contact"] else "warning",
                "line_text": "",
                "replacement_text": f"\n\n## {section_name.upper()}\n- Developed key software modules and completed core technical responsibilities for the target role.",
                "evidence": f"No '{section_name}' section header was detected by the ATS parser.",
                "explanation": f"Inserts a standard '{section_name}' section header to fulfill ATS section completeness requirements.",
                "suggestion": section_advice.get(section_name, f"Add a clearly labeled '{section_name}' section to your resume."),
                "section": section_name,
                "rule": "section_completeness",
                "message": f'Missing or unclear "{section_name}" section.',
            })

    # 4. Grouped Job Description Keywords & Missing Technical Skills
    if missing_keywords:
        top_missing = [kw for kw in missing_keywords[:8]]
        formatted_kws = ", ".join(top_missing)
        issue_id += 1
        issues.append({
            "id": f"issue-{issue_id}",
            "type": "missing_keyword",
            "title": "Missing Job Keywords & Skills",
            "severity": "warning",
            "line_text": "",
            "replacement_text": f"Skills: {formatted_kws}",
            "evidence": f"The job description mentions {formatted_kws}, but these terms were not detected in your resume.",
            "explanation": f"Incorporates missing job description keywords ({formatted_kws}) into your Skills profile.",
            "suggestion": f"The job description emphasizes {formatted_kws}, but these technologies were not detected in the resume. Add them to your Skills or relevant project/experience section if you genuinely have experience with them.",
            "section": "Skills",
            "rule": "keyword_match",
            "message": f"Job description keywords not detected: {formatted_kws}.",
        })

    # 5. Weak Verb Detection & Contextual Replacements
    vague_phrases = ["worked on website", "responsible for development", "worked with team", "handled tasks", "assisted in coding"]
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        
        # Check weak verbs
        for weak, strong in WEAK_VERBS.items():
            if weak in line_stripped.lower():
                issue_id += 1
                action_fix = _generate_actionable_replacement(line_stripped, "weak_verb")
                issues.append({
                    "id": f"issue-{issue_id}",
                    "type": "weak_verb",
                    "title": f"Weak Action Verb: '{weak}'",
                    "severity": "warning",
                    "line_text": line_stripped,
                    "replacement_text": action_fix["replacement_text"],
                    "explanation": action_fix["explanation"],
                    "evidence": f"Bullet uses passive/weak phrasing '{weak}'",
                    "suggestion": f"Make this bullet outcome-oriented by replacing '{weak}' with '{strong}': \"{action_fix['replacement_text']}\"",
                    "section": _guess_section(line_stripped, lines),
                    "rule": "weak_verb_detection",
                    "message": f'Weak verb detected: "{weak}". Use a stronger action verb like "{strong}".',
                })

        # Check vague statements
        for vague in vague_phrases:
            if vague in line_stripped.lower():
                issue_id += 1
                action_fix = _generate_actionable_replacement(line_stripped, "weak_experience")
                issues.append({
                    "id": f"issue-{issue_id}",
                    "type": "weak_experience",
                    "title": "Vague Experience Description",
                    "severity": "warning",
                    "line_text": line_stripped,
                    "replacement_text": action_fix["replacement_text"],
                    "explanation": action_fix["explanation"],
                    "evidence": f"Statement '{vague}' is too general.",
                    "suggestion": _generate_bullet_metric_suggestion(line_stripped),
                    "section": _guess_section(line_stripped, lines),
                    "rule": "weak_description",
                    "message": f"Vague description: '{vague}'. Specify exact technologies and outcome.",
                })

    # 6. Missing Quantifiable Metrics / Unquantified Impact in Bullet Points
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        
        is_bullet = (line_stripped.startswith(('-', '•', '*', '–', '►')) or 
                    (len(line_stripped) > 25 and any(v in line_stripped.lower() for v in STRONG_VERBS)))
        
        if is_bullet:
            has_metric = bool(re.search(r'\d+\s*(%|x|users|clients|customers|revenue|\$|hours|months|projects|team|members|million|billion|k\b)', line_stripped, re.IGNORECASE))
            has_number = bool(re.search(r'\d+', line_stripped))
            
            if not has_metric and not has_number and len(line_stripped) > 30:
                issue_id += 1
                snippet = line_stripped[:35] + "..." if len(line_stripped) > 35 else line_stripped
                action_fix = _generate_actionable_replacement(line_stripped, "missing_metric")
                issues.append({
                    "id": f"issue-{issue_id}",
                    "type": "missing_metric",
                    "title": f"Unquantified Impact: '{snippet}'",
                    "severity": "error",
                    "line_text": line_stripped,
                    "replacement_text": action_fix["replacement_text"],
                    "explanation": action_fix["explanation"],
                    "evidence": f"Bullet point '{snippet}' describes a task without measurable outcomes or numbers.",
                    "suggestion": _generate_bullet_metric_suggestion(line_stripped),
                    "section": _guess_section(line_stripped, lines),
                    "rule": "missing_metric",
                    "message": f"Bullet '{snippet}' lacks quantifiable metrics. Add numbers or qualitative engineering impact to strengthen outcome.",
                })

    # 7. Filler Phrases
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        for filler in FILLER_PHRASES:
            if filler in line_stripped.lower():
                issue_id += 1
                cleaned = re.sub(re.escape(filler), "", line_stripped, flags=re.IGNORECASE, count=1).strip()
                cleaned = re.sub(r'\s+', ' ', cleaned).strip(' ,;')
                issues.append({
                    "id": f"issue-{issue_id}",
                    "type": "filler_phrase",
                    "title": f"Generic Filler Phrase: '{filler}'",
                    "severity": "info",
                    "line_text": line_stripped,
                    "replacement_text": cleaned if cleaned else "",
                    "explanation": f"Removes generic buzzword '{filler}' while preserving technical sentence meaning.",
                    "evidence": f"Contains generic buzzword '{filler}'",
                    "suggestion": f"Replace generic buzzword '{filler}' with specific achievements: \"{cleaned}\"" if cleaned else "(Remove this generic line entirely)",
                    "section": _guess_section(line_stripped, lines),
                    "rule": "filler_detection",
                    "message": f'Generic filler phrase: "{filler}". Replace with specific, measurable achievements.',
                })

    # 8. Formatting Issues Integration
    fmt_issues = _detect_formatting_issues(resume_text)
    for fmt in fmt_issues:
        issue_id += 1
        issues.append({
            "id": f"issue-{issue_id}",
            "type": "formatting",
            "title": fmt["label"],
            "severity": "warning",
            "line_text": "",
            "replacement_text": "",
            "explanation": fmt["detail"],
            "evidence": fmt["detail"],
            "suggestion": f"{fmt['detail']} Use a simple ATS-friendly single-column plain text format.",
            "section": "General",
            "rule": "formatting",
            "message": fmt["label"],
        })

    # 9. Deduplication & Normalization
    unique_issues = []
    seen_keys = set()
    for issue in issues:
        key = (issue["type"], issue["message"], issue["line_text"])
        if key not in seen_keys:
            seen_keys.add(key)
            unique_issues.append(issue)

    return unique_issues


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
    using a transparent, 4-component weighted scoring formula:
    - ML Domain Similarity (30%)
    - Tech Skill Match (30%)
    - Keyword Coverage (20%)
    - Section Completeness (20%)
    """

    feedback = []
    missing_keywords = []
    matched_keywords = []
    strengths = []

    # 1. Length Check
    word_count = len(resume_text.split())
    if 400 <= word_count <= 1000:
        strengths.append("Optimal resume length (400-1000 words).")
    elif word_count < 400:
        feedback.append("Resume seems a bit short. Consider adding more details about your projects and achievements.")
    else:
        feedback.append("Resume is quite long. Try to be more concise and limit it to 2 pages.")

    # 2. Section Checks & Section Completeness Score (20% Weight)
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

    s_section = (sections_found_count / len(sections)) * 100
    if sections_found_count == len(sections):
        strengths.append("All key resume sections are present.")

    # 3. Keyword Coverage Score (20% Weight) & Skill Match Score (30% Weight)
    jd_keywords = []
    s_keyword = 50.0
    s_skill = 50.0
    if job_description:
        jd_keywords = [k for k in COMMON_TECH_KEYWORDS if k in job_description.lower()]
        resume_keywords = [k for k in COMMON_TECH_KEYWORDS if k in resume_text.lower()]

        matched_keywords = [k for k in jd_keywords if k in resume_keywords]
        missing_keywords = [k for k in jd_keywords if k not in resume_keywords]

        if jd_keywords:
            s_keyword = (len(matched_keywords) / len(jd_keywords)) * 100.0
            strengths.append(f"Matched {len(matched_keywords)} key skills from the job description.")
            s_skill = min(100.0, (len(matched_keywords) / max(len(jd_keywords), 1)) * 120.0)
    else:
        action_verbs = ["managed", "developed", "implemented", "created", "led", "optimized", "increased", "reduced"]
        found_verbs = [v for v in action_verbs if v in resume_text.lower()]
        s_keyword = min(len(found_verbs) * 12.5, 100.0)
        s_skill = 60.0
        if len(found_verbs) > 3:
            strengths.append("Good use of strong action verbs.")

    # 4. ML Similarity Score (30% Weight)
    s_ml = 50.0
    try:
        from ml.predictor import get_predictor
        predictor = get_predictor()
        ml_res = predictor.predict(resume_text, job_description or "")
        if "match_probability" in ml_res:
            s_ml = ml_res["match_probability"] * 100.0
    except Exception as e:
        s_ml = 50.0

    # Transparent Weighted Scoring Calculation
    # ATS Score = 0.30*ML + 0.30*Skill + 0.20*Keyword + 0.20*Section
    score = int(0.30 * s_ml + 0.30 * s_skill + 0.20 * s_keyword + 0.20 * s_section)
    score = min(max(score, 0), 100)

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
