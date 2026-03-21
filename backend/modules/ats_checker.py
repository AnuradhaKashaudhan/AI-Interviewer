import re
import json

def check_ats_score(resume_text, job_description=None):
    """
    Analyzes resume text against a job description (if provided) 
    to calculate an ATS matching score and provide suggestions.
    """
    
    # Generic ATS checks
    score = 0
    feedback = []
    missing_keywords = []
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
        "Contact": r"(contact|email|phone|linkedin)"
    }
    
    sections_found = 0
    for section, pattern in sections.items():
        if re.search(pattern, resume_text, re.IGNORECASE):
            sections_found += 1
        else:
            feedback.append(f"Missing or unclear '{section}' section.")
            
    score += (sections_found / len(sections)) * 30
    if sections_found == len(sections):
        strengths.append("All key resume sections are present.")

    # 3. Keyword Matching (if job description provided)
    if job_description:
        # Extract keywords from JD (simple implementation for now)
        # In a real app, we'd use NLP to extract entities
        common_tech_keywords = [
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
            "git", "linux", "trello", "jira", "microservices"
        ]
        
        jd_keywords = [k for k in common_tech_keywords if k in job_description.lower()]
        resume_keywords = [k for k in common_tech_keywords if k in resume_text.lower()]
        
        matching = [k for k in jd_keywords if k in resume_keywords]
        missing = [k for k in jd_keywords if k not in resume_keywords]
        
        if jd_keywords:
            match_percentage = (len(matching) / len(jd_keywords)) * 50
            score += match_percentage
            missing_keywords = missing
            strengths.append(f"Matched {len(matching)} key skills from the job description.")
        else:
            score += 25 # Default if JD has no recognizable keywords
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
    
    if "Contact" not in [s for s, p in sections.items() if re.search(p, resume_text, re.IGNORECASE)]:
        improvement_suggestions.append("Ensure your contact information is easily visible at the top.")

    return {
        "score": score,
        "feedback": feedback,
        "strengths": strengths,
        "missing_keywords": missing_keywords,
        "improvement_suggestions": improvement_suggestions
    }
