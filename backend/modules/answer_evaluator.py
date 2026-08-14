import os
import json
import re
from dotenv import load_dotenv

# Search for .env in current and parent directory
if os.path.exists(".env"):
    load_dotenv(".env")
elif os.path.exists("../.env"):
    load_dotenv("../.env")
else:
    load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(f"DEBUG: Loaded GEMINI_API_KEY: {'[FOUND]' if GEMINI_API_KEY else '[MISSING]'}")

# Lazy-load the Gemini client
_gemini_client = None

def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        try:
            import google.generativeai as genai
            if not GEMINI_API_KEY:
                print("ERROR: GEMINI_API_KEY is not set.")
                return None
            genai.configure(api_key=GEMINI_API_KEY)
            
            models_to_try = ["gemini-1.5-flash", "gemini-pro", "gemini-1.5-pro"]
            for model_name in models_to_try:
                try:
                    print(f"DEBUG: Testing Gemini model: {model_name}")
                    client = genai.GenerativeModel(model_name)
                    # Test if the model actually works
                    test_response = client.generate_content("Ping")
                    if test_response:
                        _gemini_client = client
                        print(f"Gemini client initialized successfully with model: {model_name}")
                        break
                except Exception as ex:
                    print(f"DEBUG: Model {model_name} is not available: {ex}")
            
            if _gemini_client is None:
                print("ERROR: All Gemini models failed to initialize.")
        except Exception as e:
            print(f"Error initializing Gemini client: {e}")
    return _gemini_client


def evaluate_answer(question: str, answer: str, context: list = None, role: str = None, resume_text: str = None, persona: str = "friendly") -> dict:
    """
    Uses Gemini AI to evaluate candidate's interview answer.
    Returns a rich, structured evaluation with unique feedback per answer.

    Args:
        question (str): The interview question asked.
        answer (str): The candidate's answer.
        context (list): Previous Q&A history for context-aware evaluation.
        role (str): The target role for the interview.
        resume_text (str): Extracted resume/profile text.
        persona (str): The interviewer persona.

    Returns:
        dict: Full structured evaluation JSON.
    """
    if not answer or len(answer.strip()) < 5:
        # Use fallback evaluation for short or empty answers instead of zero scores
        return _fallback_evaluate(question, answer)

    client = get_gemini_client()
    if not client:
        return _fallback_evaluate(question, answer)

    # Build context string from previous Q&A
    context_str = ""
    if context:
        context_str = "\n\nPrevious interview Q&A history:\n"
        for i, qa in enumerate(context, 1):
            context_str += f"Q{i}: {qa.get('question', '')}\nA{i}: {qa.get('answer', '')}\n"

    role_str = f"Target Role: {role}\n" if role else ""
    resume_str = f"Candidate Profile/Resume: {resume_text[:2000]}\n" if resume_text else ""

    prompt = f"""You are an expert technical interviewer ({persona} persona) conducting a live interview.
{role_str}{resume_str}{context_str}
Current Question Asked: {question}
Candidate's Answer: {answer}

Evaluate the candidate's answer thoroughly. Compare the candidate's answer against the expected ideal/model answer for this question and calculate the required metrics.

Return ONLY a valid JSON object with this exact structure:
{{
  "score": <integer 0-100 representing overall average of sub-scores>,
  "relevance_score": <integer 0-100, how well they addressed the core question asked>,
  "technical_accuracy_score": <integer 0-100, accuracy of the technical concepts mentioned>,
  "depth_score": <integer 0-100, level of detail/explanation depth>,
  "clarity_score": <integer 0-100, logical flow and ease of understanding>,
  "confidence_score": <integer 0-100, assertiveness vs filler words or hesitation>,
  "feedback": "<2-3 sentences of specific, unique, constructive feedback based on EXACTLY what the candidate said. Highlight what was good and specifically where they fell short.>",
  "strengths": ["<specific strength from their answer>", ...],
  "weaknesses": ["<specific weakness or gap in their answer>", ...],
  "missing_keywords": ["<important technical terms or concepts they should have mentioned>", ...],
  "suggested_answer": "<A concise 2-3 sentence model answer for this question>",
  "next_question": "<An adaptive follow-up question. If their answer is weak (score < 50), ask a simpler corrective or basic conceptual question. If their answer is strong (score >= 75), ask a deeper or more complex follow-up question. Otherwise (average), ask a clarifying medium-difficulty question. Keep track of already asked questions in the history to avoid repeating them.>",
  "difficulty": "<easy | medium | hard>",
  "answer_quality": "<weak | average | strong>"
}}

Rules:
- Make sure the feedback and next_question feel highly realistic and adaptive.
- Do NOT use generic feedback.
- Return ONLY the raw JSON object, no markdown code fences, no extra text.
"""

    print(f"--- AI EVALUATION PROMPT ---\n{prompt}\n-----------------------------")

    try:
        response = client.generate_content(prompt)
        raw = response.text.strip()
        print(f"--- RAW AI RESPONSE ---\n{raw}\n-----------------------")

        # Clean up any markdown code fences if present
        raw = re.sub(r"^```(?:json)?", "", raw, flags=re.MULTILINE).strip()
        raw = re.sub(r"```$", "", raw, flags=re.MULTILINE).strip()

        result = json.loads(raw)
        print(f"--- PARSED JSON FEEDBACK ---\n{json.dumps(result, indent=2)}\n-----------------------------")

        # Ensure all required fields exist
        required_fields = [
            "score", "relevance_score", "technical_accuracy_score", "depth_score",
            "clarity_score", "confidence_score", "feedback", "strengths", "weaknesses",
            "missing_keywords", "suggested_answer", "next_question", "difficulty", "answer_quality"
        ]
        for field in required_fields:
            if field not in result:
                result[field] = _get_default_field(field)

        # Clamp and convert scores
        for score_field in ["score", "relevance_score", "technical_accuracy_score", "depth_score", "clarity_score", "confidence_score"]:
            result[score_field] = max(0, min(100, int(result.get(score_field, 0))))

        return result

    except Exception as e:
        print(f"Gemini evaluation error: {e}")
        return _fallback_evaluate(question, answer)


def _get_default_field(field: str):
    defaults = {
        "score": 0,
        "relevance_score": 0,
        "technical_accuracy_score": 0,
        "depth_score": 0,
        "clarity_score": 0,
        "confidence_score": 0,
        "feedback": "Unable to evaluate.",
        "strengths": [],
        "weaknesses": [],
        "missing_keywords": [],
        "suggested_answer": "",
        "next_question": "",
        "difficulty": "medium",
        "answer_quality": "average"
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
        next_question = "What tradeoffs or edge cases would you consider if you implemented that in production?"
    elif score >= 45:
        quality = "average"
        feedback = f"Your answer covers the basics but could benefit from more specific examples."
        next_question = "Can you walk me through one concrete example to make your approach clearer?"
    else:
        quality = "weak"
        feedback = f"Your answer is quite brief at {word_count} words. Try to expand with examples and technical detail."
        next_question = "Can you explain the core idea in simpler terms and use a small example?"

    # Generate realistic sub-scores based on overall score for the fallback UI
    return {
        "score": score,
        "relevance_score": min(score + 10, 100),
        "technical_accuracy_score": max(score - 5, 0),
        "depth_score": max(score - 10, 0),
        "clarity_score": min(score + 5, 100),
        "confidence_score": min(score + 15, 100),
        "feedback": feedback,
        "strengths": ["Attempted to answer the question", "Good verbal flow"] if word_count > 20 else ["Began responding"],
        "weaknesses": ["Needs more technical depth", "Incorporate more industry terminology"] if score < 70 else [],
        "missing_keywords": ["STAR method", "concrete examples"],
        "suggested_answer": f"A strong answer to '{question}' would include specific examples, technical terms, and a clear explanation of the underlying concepts.",
        "next_question": next_question,
        "difficulty": "medium",
        "answer_quality": quality
    }
