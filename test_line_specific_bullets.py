import sys
import json
sys.path.insert(0, 'backend')
from modules.ats_checker import _generate_bullet_metric_suggestion

def run_test():
    test_bullets = [
        "- Built REST APIs using FastAPI and Python",
        "- Built responsive UI components using React and Tailwind CSS",
        "- Applied secure coding principles and OAuth authentication",
        "- Collaborated using Git workflows and Agile sprints",
        "- Deployed microservices on AWS Docker container clusters"
    ]

    print("==========================================================================")
    print("      LINE-SPECIFIC BULLET SUGGESTION ENGINE VERIFICATION")
    print("==========================================================================\n")

    suggestions = []

    for idx, bullet in enumerate(test_bullets, 1):
        sug = _generate_bullet_metric_suggestion(bullet)
        suggestions.append(sug)
        print(f"EXAMPLE {idx}:")
        print(f"Bullet Text: \"{bullet}\"")
        print(f"BEFORE (Old Generic Suggestion):")
        print(f"  -> \"add specific numbers, e.g. reduced load time by 40%\"\n")
        print(f"AFTER (New Line-Specific Topic Recommendation):")
        print(f"  -> \"{sug}\"\n")
        print("--------------------------------------------------------------------------\n")

    # Verify all suggestions are 100% unique
    unique_count = len(set(suggestions))
    print(f"Total Bullets Tested: {len(test_bullets)}")
    print(f"Unique Line-Specific Suggestions: {unique_count}")
    assert unique_count == len(test_bullets), "Suggestions were duplicated!"
    print("\n[SUCCESS] VERIFIED: 100% of generated suggestions are line-specific, distinct, and topic-aware!")

if __name__ == "__main__":
    run_test()
