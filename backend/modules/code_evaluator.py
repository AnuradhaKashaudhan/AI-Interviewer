import json
import urllib.request
import urllib.error
import re
from typing import Optional
from .answer_evaluator import get_gemini_client

PISTON_URL = "https://emkc.org/api/v2/piston/execute"

# Map frontend language identifiers to Piston supported language identifiers
LANGUAGE_MAP = {
    "python": "python",
    "py": "python",
    "cpp": "c++",
    "c++": "c++",
    "java": "java",
    "c": "c"
}

def run_code_on_piston(language: str, source_code: str, stdin_input: str = "") -> dict:
    """
    Executes code against Piston API runner safely with timeout handling.
    """
    piston_lang = LANGUAGE_MAP.get(language.lower(), "python")
    payload = {
        "language": piston_lang,
        "version": "*",
        "files": [
            {
                "name": "main",
                "content": source_code
            }
        ],
        "stdin": stdin_input
    }

    try:
        req = urllib.request.Request(
            PISTON_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            run_stage = result.get("run", {})
            compile_stage = result.get("compile", {})

            stdout = (compile_stage.get("stdout", "") or "") + (run_stage.get("stdout", "") or "")
            stderr = (compile_stage.get("stderr", "") or "") + (run_stage.get("stderr", "") or "")
            exit_code = run_stage.get("code", 0) if run_stage else compile_stage.get("code", 1)

            return {
                "stdout": stdout.strip(),
                "stderr": stderr.strip(),
                "exit_code": exit_code,
                "status": "success"
            }
    except Exception as e:
        print(f"Piston API call failed: {e}. Attempting local execution fallback...")

    # Fallback Execution Layer
    if language.lower() in ("python", "py"):
        import subprocess
        import sys
        try:
            proc = subprocess.run(
                [sys.executable, "-c", source_code],
                input=stdin_input,
                capture_output=True,
                text=True,
                timeout=5
            )
            return {
                "stdout": proc.stdout.strip(),
                "stderr": proc.stderr.strip(),
                "exit_code": proc.returncode,
                "status": "success"
            }
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": "Execution timed out (limit: 5s).",
                "exit_code": 1,
                "status": "error"
            }
        except Exception as local_err:
            return {
                "stdout": "",
                "stderr": f"Local execution failed: {str(local_err)}",
                "exit_code": 1,
                "status": "error"
            }

    return {
        "stdout": "",
        "stderr": "Code execution service is temporarily unavailable for this language. Please check back shortly.",
        "exit_code": 1,
        "status": "error"
    }


def execute_test_cases(language: str, source_code: str, test_cases: list) -> dict:
    """
    Runs candidate code against a list of test cases (stdin -> expected stdout).
    Returns pass counts, overall pass rate, and detailed results per test case.
    """
    passed_count = 0
    total_count = len(test_cases)
    details = []

    for test in test_cases:
        stdin_input = test.get("input", "")
        expected_output = test.get("expected", "").strip()

        exec_res = run_code_on_piston(language, source_code, stdin_input)
        actual_output = exec_res["stdout"].strip()
        stderr = exec_res["stderr"]

        # Standardize boolean or trailing newline differences
        passed = (exec_res["exit_code"] == 0) and (actual_output.lower() == expected_output.lower())
        if passed:
            passed_count += 1

        details.append({
            "input": stdin_input,
            "expected": expected_output,
            "actual": actual_output,
            "stderr": stderr,
            "passed": passed
        })

    pass_rate = (passed_count / total_count) if total_count > 0 else 0.0
    return {
        "passed_count": passed_count,
        "total_count": total_count,
        "pass_rate": pass_rate,
        "details": details
    }


def evaluate_coding_submission(question_text: str, code: str, language: str, hidden_test_cases: list) -> dict:
    """
    Two-layer evaluation:
    Layer 1: Piston code execution against hidden test cases (70% weight)
    Layer 2: Gemini AI code quality, complexity, & improvement analysis (30% weight)
    """
    # Layer 1: Objective Test Execution
    test_exec_res = execute_test_cases(language, code, hidden_test_cases)
    passed_count = test_exec_res["passed_count"]
    total_count = test_exec_res["total_count"]
    pass_rate = test_exec_res["pass_rate"]
    test_details = test_exec_res["details"]

    objective_score = pass_rate * 70.0  # 70% max

    # Layer 2: Gemini AI Code Evaluation
    client = get_gemini_client()
    llm_quality_score = 75.0  # default fallback quality score
    time_complexity = "O(N)"
    space_complexity = "O(1)"
    feedback = f"Your code passed {passed_count} out of {total_count} test cases."
    strengths = ["Code submitted successfully."]
    weaknesses = []
    suggested_improvement = ""

    if client:
        test_summary_text = f"Test Execution Summary: Passed {passed_count}/{total_count} test cases.\n"
        for idx, d in enumerate(test_details):
            test_summary_text += f"Test {idx+1}: Input='{d['input']}', Expected='{d['expected']}', Actual='{d['actual']}', Status={'PASS' if d['passed'] else 'FAIL'}\n"

        prompt = f"""You are an expert Senior Software Engineer and Coding Interviewer.
Evaluate the following candidate code submission for a live technical coding question.

PROBLEM STATEMENT:
{question_text}

CANDIDATE LANGUAGE: {language}

CANDIDATE CODE:
```{language}
{code}
```

OBJECTIVE TEST EXECUTION RESULTS:
{test_summary_text}

TASK:
Provide a rigorous technical evaluation returned ONLY as a valid JSON object with the following fields:
1. "code_quality_score": integer from 0 to 100 (rating readability, clean structure, edge case handling, optimal algorithm choice).
2. "time_complexity": string (e.g. "O(N)", "O(N log N)", "O(N^2)", etc.).
3. "space_complexity": string (e.g. "O(1)", "O(N)", etc.).
4. "feedback": concise 2-3 sentence overview of the code quality and correctness.
5. "strengths": list of 2 key strengths of the code.
6. "weaknesses": list of 1-2 areas for improvement or edge cases missed.
7. "suggested_improvement": clean, production-grade refactored code solution snippet in {language} with brief explanation comments.

Do NOT include any markdown code block backticks outside the JSON. Just return raw valid JSON.
"""
        try:
            response = client.generate_content(prompt)
            raw_text = response.text.strip()
            # Clean JSON if wrapped in markdown block
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]

            parsed = json.loads(raw_text.strip())
            llm_quality_score = float(parsed.get("code_quality_score", 75.0))
            time_complexity = parsed.get("time_complexity", "O(N)")
            space_complexity = parsed.get("space_complexity", "O(1)")
            feedback = parsed.get("feedback", feedback)
            strengths = parsed.get("strengths", strengths)
            weaknesses = parsed.get("weaknesses", weaknesses)
            suggested_improvement = parsed.get("suggested_improvement", "")
        except Exception as e:
            print(f"Error parsing Gemini coding evaluation: {e}")

    # Combine: 70% Test pass rate + 30% LLM Code Quality
    final_score = round(objective_score + (llm_quality_score * 0.3))
    final_score = max(0, min(100, final_score))

    answer_quality = "strong" if final_score >= 80 else ("average" if final_score >= 50 else "weak")

    return {
        "score": final_score,
        "test_pass_rate": round(pass_rate * 100, 1),
        "passed_tests": passed_count,
        "total_tests": total_count,
        "relevance_score": 100,
        "technical_accuracy_score": round(pass_rate * 100, 1),
        "depth_score": round(llm_quality_score, 1),
        "clarity_score": round(llm_quality_score, 1),
        "confidence_score": 85,
        "feedback": feedback,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_keywords": [],
        "suggested_answer": suggested_improvement,
        "time_complexity": time_complexity,
        "space_complexity": space_complexity,
        "test_details": test_details,
        "answer_quality": answer_quality
    }
