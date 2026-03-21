import re

# A simple predefined list of skills to match against
TECH_SKILLS = [
    "python", "java", "c++", "c#", "javascript", "typescript", "ruby", "php", "go", "rust",
    "react", "angular", "vue", "django", "flask", "fastapi", "spring boot", "express", "node.js",
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra",
    "aws", "gcp", "azure", "docker", "kubernetes", "jenkins", "git", "linux",
    "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch",
    "data science", "pandas", "numpy", "scikit-learn", "data engineering", "spark", "hadoop",
    "html", "css", "tailwind", "next.js", "vite", "redux", "graphql", "rest api", "unit testing",
    "agile", "scrum", "project management", "ui/ux", "frontend", "backend", "fullstack"
]

def extract_skills(text: str) -> list[str]:
    """
    Extracts skills from text using regular expressions and a predefined list of tech skills.
    
    Args:
        text (str): Input text (e.g., from a resume).
        
    Returns:
        list[str]: A list of extracted skills.
    """
    extracted_skills = set()
    text_lower = text.lower()
    
    for skill in TECH_SKILLS:
        # Use simple string matching or regex for exact word match
        # \b ensures we match complete words, e.g., 'go' won't match 'good'
        if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            extracted_skills.add(skill.capitalize())
            
    return list(extracted_skills)
