import sys
import json
sys.path.insert(0, 'backend')
from modules.ats_checker import check_ats_score

def run_tests():
    print("=== RUNNING ATS FIX-IT SUGGESTION ENGINE TESTS ===")

    # TEST 1: Missing LinkedIn, Projects, AWS
    test1_resume = """
John Doe
Software Engineer
Email: john@example.com | Phone: 123-456-7890

Summary
Experienced backend developer skilled in Python and SQL.

Experience
Software Engineer at Acme Corp
- Worked on website backend APIs using Python.
- Handled database migrations in PostgreSQL.

Education
B.S. in Computer Science, Tech University
    """

    test1_jd = "Looking for a Cloud Developer with experience in AWS, Docker, and Kubernetes."

    res1 = check_ats_score(test1_resume, test1_jd)
    issues1 = res1.get("issues", [])
    print(f"\n--- TEST 1: Missing LinkedIn, Projects, AWS ---")
    print(f"Total Issues: {len(issues1)}")
    suggestions1 = [i["suggestion"] for i in issues1]
    for idx, iss in enumerate(issues1, 1):
        print(f"Issue {idx} [{iss['type']}]: Title='{iss.get('title')}'")
        print(f"  Evidence: {iss.get('evidence')}")
        print(f"  Suggestion: {iss['suggestion']}\n")

    # TEST 2: Resume has all sections and keywords
    test2_resume = """
John Doe
Email: john@example.com | Phone: 123-456-7890 | linkedin.com/in/johndoe | github.com/johndoe

Summary
Senior Cloud Engineer with 6 years experience building scalable microservices.

Experience
Senior Software Engineer - Tech Corp (2020 - Present)
- Architected microservices using Python, FastAPI, Docker, and AWS, serving 500k active users.
- Optimized PostgreSQL database queries, reducing API response latency by 45%.
- Implemented CI/CD pipelines using GitHub Actions and Kubernetes clusters.

Projects
Cloud Analytics Platform (2023)
- Developed real-time streaming analytics engine in Python and Docker.

Education
B.S. in Computer Science - State University (2019)

Skills
Languages: Python, JavaScript, SQL
Cloud & DevOps: AWS, Docker, Kubernetes, CI/CD, Linux

Certifications
AWS Certified Solutions Architect (2022)
    """

    test2_jd = "Looking for a Python Backend Engineer with AWS, Docker, and Kubernetes experience."
    res2 = check_ats_score(test2_resume, test2_jd)
    issues2 = res2.get("issues", [])
    print(f"--- TEST 2: High Quality Complete Resume ---")
    print(f"Total Issues Flagged: {len(issues2)} (Expected minimal/zero)")

    # TEST 3: Resume Too Short
    test3_resume = "John Doe\nPython Developer\nworked on backend."
    res3 = check_ats_score(test3_resume)
    issues3 = res3.get("issues", [])
    print(f"\n--- TEST 3: Resume Too Short ---")
    short_issue = next((i for i in issues3 if i["type"] == "resume_too_short"), None)
    if short_issue:
        print(f"Found Length Issue: {short_issue['suggestion']}")

    # TEST 4: Resume Too Long
    test4_resume = ("John Doe\nSoftware Engineer\n" + "Word "*1100)
    res4 = check_ats_score(test4_resume)
    issues4 = res4.get("issues", [])
    print(f"\n--- TEST 4: Resume Too Long ---")
    long_issue = next((i for i in issues4 if i["type"] == "resume_too_long"), None)
    if long_issue:
        print(f"Found Length Issue: {long_issue['suggestion']}")

    # TEST 5: Weak bullet point ("Worked on website.")
    print(f"\n--- TEST 5: Weak Bullet Point ---")
    weak_issue = next((i for i in issues1 if "worked on" in i.get("line_text", "").lower() or i["type"] in ["weak_verb", "weak_experience"]), None)
    if weak_issue:
        print(f"Weak Bullet Suggestion: {weak_issue['suggestion']}")

    # TEST 6: Duplicate Detection Check
    print(f"\n--- TEST 6: DUPLICATE DETECTION VERIFICATION ---")
    unique_suggestions = set(suggestions1)
    print(f"Total Suggestions Returned: {len(suggestions1)}")
    print(f"Unique Suggestions: {len(unique_suggestions)}")
    assert len(suggestions1) == len(unique_suggestions), "Duplicate suggestions detected!"
    print("[SUCCESS] VERIFIED: All returned suggestions are 100% distinct and unique!")

if __name__ == "__main__":
    run_tests()
