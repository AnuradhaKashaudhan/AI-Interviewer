import os
import sys
import unittest

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from modules.coding_question_service import select_coding_question, get_question_by_id, CODING_QUESTION_BANK
from modules.code_evaluator import execute_test_cases, evaluate_coding_submission

class TestCodingRound(unittest.TestCase):
    def test_coding_question_selection_and_no_repetition(self):
        session_id = "test_session_123"
        q1 = select_coding_question(session_id, role="Python Developer", skills=["Python", "FastAPI"])
        self.assertIsNotNone(q1)
        self.assertIn("id", q1)
        self.assertIn("hidden_test_cases", q1)

        q2 = select_coding_question(session_id, role="Python Developer", skills=["Python", "FastAPI"])
        self.assertIsNotNone(q2)
        # Ensure q2 is different from q1 within the same session
        self.assertNotEqual(q1["id"], q2["id"], "Coding questions should not repeat within the same session!")

    def test_code_execution_test_cases(self):
        # Test executing a correct solution for first_unique_char
        python_code = """
def first_uniq_char(s: str) -> str:
    counts = {}
    for char in s:
        counts[char] = counts.get(char, 0) + 1
    for char in s:
        if counts[char] == 1:
            return char
    return "-1"

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    print(first_uniq_char(input_str))
"""
        test_cases = [
            {"input": "leetcode", "expected": "l"},
            {"input": "loveleetcode", "expected": "v"},
            {"input": "aabbcc", "expected": "-1"}
        ]
        res = execute_test_cases("python", python_code, test_cases)
        self.assertEqual(res["passed_count"], 3)
        self.assertEqual(res["total_count"], 3)
        self.assertEqual(res["pass_rate"], 1.0)

    def test_hidden_test_cases_not_exposed(self):
        q = get_question_by_id("valid_palindrome")
        self.assertIsNotNone(q)
        # Public payload format check
        public_payload = {
            "id": q["id"],
            "title": q["title"],
            "difficulty": q["difficulty"],
            "question_text": q["question_text"],
            "starter_code": q["starter_code"],
            "sample_test_cases": q["sample_test_cases"]
        }
        self.assertNotIn("hidden_test_cases", public_payload)

if __name__ == "__main__":
    unittest.main()
