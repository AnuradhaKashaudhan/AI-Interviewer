import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Lazy-load the Gemini client
_gemini_client = None

def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            _gemini_client = genai.GenerativeModel("gemini-1.5-flash")
            print("Gemini client initialized successfully.")
        except Exception as e:
            print(f"Error initializing Gemini client: {e}")
    return _gemini_client


def evaluate_answer(question: str, answer: str, context: list = None) -> dict:
    """
    Uses Gemini AI to evaluate candidate's interview answer.
    Returns a rich, structured evaluation with unique feedback per answer.

    Args:
        question (str): The interview question asked.
        answer (str): The candidate's answer.
        context (list): Previous Q&A history for context-aware evaluation.

    Returns:
        dict: Full structured evaluation JSON.
    """
    if not answer or len(answer.strip()) < 5:
        return {
            "score": 0,
            "feedback": "Your answer is too short to evaluate. Please provide a more detailed response.",
            "strengths": [],
            "weaknesses": ["Answer too short"],
            "missing_keywords": [],
            "suggested_answer": "",
            "next_question": question,
            "difficulty": "easy",
            "answer_quality": "weak"
        }

    client = get_gemini_client()
    if not client:
        return _fallback_evaluate(question, answer)

    # Build context string from previous Q&A
    context_str = ""
    if context:
        context_str = "\n\nPrevious interview context:\n"
        for i, qa in enumerate(context[-3:], 1):  # Only last 3 for brevity
            context_str += f"Q{i}: {qa.get('question', '')}\nA{i}: {qa.get('answer', '')}\n"

    prompt = f"""You are an expert technical interviewer evaluating a candidate's answer.
{context_str}
Current Question: {question}
Candidate's Answer: {answer}

Evaluate this answer thoroughly and return ONLY a valid JSON object with this exact structure:
{{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentences of specific, unique feedback based on EXACTLY what the candidate said. Reference specific words or phrases from their answer. Do NOT give generic feedback.>",
  "strengths": ["<specific strength from their answer>", ...],
  "weaknesses": ["<specific weakness or gap in their answer>", ...],
  "missing_keywords": ["<important technical terms they should have mentioned>", ...],
  "suggested_answer": "<A concise 2-3 sentence ideal answer for this question>",
  "next_question": "<An adaptive follow-up question: if score < 50, ask a simpler corrective question; if score 50-75, ask a clarifying question; if score > 75, ask a deeper harder question>",
  "difficulty": "<easy | medium | hard>",
  "answer_quality": "<weak | average | strong>"
}}

Rules:
- score < 50 = weak, 50-75 = average, > 75 = strong
- feedback MUST reference specific words or phrases from the candidate's actual answer
- next_question MUST be a real follow-up question, not empty
- Do NOT repeat the same question as next_question
- Return ONLY the JSON, no markdown, no extra text"""

    try:
        response = client.generate_content(prompt)
        raw = response.text.strip()

        # Clean up any markdown code fences if present
        raw = re.sub(r"^```(?:json)?", "", raw, flags=re.MULTILINE).strip()
        raw = re.sub(r"```$", "", raw, flags=re.MULTILINE).strip()

        result = json.loads(raw)

        # Ensure all required fields exist
        required_fields = ["score", "feedback", "strengths", "weaknesses",
                           "missing_keywords", "suggested_answer", "next_question",
                           "difficulty", "answer_quality"]
        for field in required_fields:
            if field not in result:
                result[field] = _get_default_field(field)

        # Ensure score is clamped
        result["score"] = max(0, min(100, int(result.get("score", 0))))

        return result

    except Exception as e:
        print(f"Gemini evaluation error: {e}")
        return _fallback_evaluate(question, answer)


def _get_default_field(field: str):
    defaults = {
        "score": 0, "feedback": "Unable to evaluate.", "strengths": [],
        "weaknesses": [], "missing_keywords": [], "suggested_answer": "",
        "next_question": "", "difficulty": "medium", "answer_quality": "average"
    }
    return defaults.get(field, "")


def _fallback_evaluate(question: str, answer: str) -> dict:
    """Rule-based fallback when Gemini is unavailable."""
    answer_lower = answer.lower()
    word_count = len(answer.split())

    score = 30
    if word_count > 50:
        score += 20
    if word_count > 100:
        score += 15
    if "example" in answer_lower or "for instance" in answer_lower:
        score += 10
    if any(w in answer_lower for w in ["because", "therefore", "however", "specifically"]):
        score += 10
    score = min(score, 85)

    if score >= 70:
        quality = "strong"
        feedback = f"Your answer of {word_count} words shows a reasonable understanding. You provided concrete detail."
    elif score >= 45:
        quality = "average"
        feedback = f"Your answer covers the basics but could benefit from more specific examples."
    else:
        quality = "weak"
        feedback = f"Your answer is quite brief at {word_count} words. Try to expand with examples and technical detail."

    return {
        "score": score,
        "feedback": feedback,
        "strengths": ["Attempted to answer the question"] if word_count > 20 else [],
        "weaknesses": ["Needs more technical depth"] if score < 70 else [],
        "missing_keywords": [],
        "suggested_answer": f"A strong answer to '{question}' would include specific examples, technical terms, and a clear explanation of the underlying concepts.",
        "next_question": f"Can you elaborate further on your approach to: {question}",
        "difficulty": "medium",
        "answer_quality": quality
    }
