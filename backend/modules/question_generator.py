import random

# A predefined dictionary mapping skills to potential questions
SKILL_QUESTIONS_DB = {
    "Python": [
        "What are the differences between lists and tuples in Python?",
        "How does memory management work in Python?",
        "Explain the context manager and the 'with' statement in Python.",
        "What are decorators, and how are they used?",
        "Explain the difference between deep and shallow copy in Python."
    ],
    "Java": [
        "What is the difference between an Interface and an Abstract class?",
        "How does Garbage Collection work in Java?",
        "Explain the concept of Multi-threading in Java.",
        "What is the Java Memory Model?"
    ],
    "Javascript": [
        "Explain closures in JavaScript and provide an example.",
        "What is the event loop and how does it handle asynchronous code?",
        "Describe the difference between '==' and '==='.",
        "What are Promises and how do they differ from callbacks?"
    ],
    "React": [
        "Explain the virtual DOM and its benefits.",
        "What are React Hooks? Can you name some common ones?",
        "How do you manage state in a complex React application?",
        "What is the difference between functional and class components?",
        "What is reconciliation in React?"
    ],
    "Machine learning": [
        "Can you explain the difference between supervised and unsupervised learning?",
        "What is overfitting, and how do you prevent it?",
        "Describe a precision vs. recall tradeoff in a classification model.",
        "Explain the concept of cross-validation."
    ],
    "Fastapi": [
        "What makes FastAPI faster than other Python frameworks like Flask?",
        "How does FastAPI handle asynchronous requests?",
        "Explain dependency injection as implemented in FastAPI."
    ],
    "Docker": [
        "What are the main advantages of using Docker for deployment?",
        "Explain the difference between a Docker image and a Docker container.",
        "How do you network multiple containers together using Docker Compose?"
    ],
    "Git": [
        "What is the difference between git fetch and git pull?",
        "How do you resolve a merge conflict?",
        "What is rebasing and when should you use it over merging?"
    ],
    "Sql": [
        "What is the difference between INNER JOIN and LEFT JOIN?",
        "Explain the concept of database normalization.",
        "What are indexes and how do they improve query performance?"
    ],
    "Html": [
        "What are semantic HTML tags and why are they important?",
        "Explain the difference between block and inline elements."
    ],
    "Css": [
        "What is the CSS Box Model?",
        "Explain the difference between Flexbox and Grid.",
        "What are CSS custom properties (variables)?"
    ]
}

GENERAL_HR_QUESTIONS = [
    "Tell me about a time you faced a challenging technical problem and how you resolved it.",
    "Where do you see yourself in 5 years?",
    "Why are you interested in this position?",
    "Describe your experience working in a team environment.",
    "What are your greatest strengths and weaknesses?"
]

def generate_questions(skills: list[str]) -> dict:
    """
    Generates interview questions based on the extracted skills.
    """
    technical_questions = []
    
    # Collect technical questions based on identified skills
    for skill in skills:
        # Match case-insensitively
        matched_skill = next((k for k in SKILL_QUESTIONS_DB.keys() if k.lower() == skill.lower()), None)
        if matched_skill:
            selected_qs = random.sample(SKILL_QUESTIONS_DB[matched_skill], min(2, len(SKILL_QUESTIONS_DB[matched_skill])))
            for q in selected_qs:
                 technical_questions.append({"skill": matched_skill, "question": q})
                 
    # If no specific skills match, provide a few generic technical questions
    if not technical_questions:
        technical_questions.append({"skill": "General", "question": "Can you describe a complex project you recently built from scratch and the technologies you used?"})
        technical_questions.append({"skill": "General", "question": "Walk me through how you approach debugging a difficult piece of code."})
    
    # Shuffle total technical questions and pick top 5
    random.shuffle(technical_questions)
    technical_questions = technical_questions[:5]
    
    # Select 2 random HR questions
    hr_questions = random.sample(GENERAL_HR_QUESTIONS, 2)
    
    return {
        "hr_questions": hr_questions,
        "technical_questions": technical_questions,
        "project_based_questions": [
            "Walk me through the architecture of the most impactful project listed on your resume.",
            "If you had to redo your most proud project today, what technical decisions would you change and why?"
        ]
    }
