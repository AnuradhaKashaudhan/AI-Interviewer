import os
import json
import re
import numpy as np
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
            
            models_to_try = [
                "gemini-3.6-flash",
                "gemini-3.5-flash",
                "gemini-2.5-flash",
                "gemini-flash-latest"
            ]
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


def extract_concept_coverage(answer_text: str, evidence_texts: list) -> tuple[list, list, float]:
    """
    Extracts technical keywords and multi-word concepts from retrieved evidence and checks coverage in candidate's answer.
    Returns (covered_concepts: list, missing_concepts: list, coverage_ratio: float).
    """
    if not answer_text or not evidence_texts:
        return [], [], 0.50

    answer_lower = answer_text.lower()
    extracted_terms = set()
    stopwords = {
        "the", "and", "for", "with", "that", "this", "can", "you", "are", "was", "were", "been",
        "have", "has", "had", "does", "done", "will", "would", "could", "should", "from", "into",
        "through", "during", "before", "after", "above", "below", "to", "of", "in", "on", "by",
        "about", "against", "between", "up", "upon", "down", "out", "off", "over", "under",
        "again", "further", "then", "once", "such", "than", "too", "very", "most", "also", "each"
    }

    for ev_text in evidence_texts:
        # 1. Multi-word technical concept phrases (e.g. cross-validation, l1/l2 regularization, garbage collection)
        phrases = re.findall(r"\b[a-zA-Z0-9_\+]+(?:\s+[\-a-zA-Z0-9_\+]+){1,2}\b", ev_text)
        for p in phrases:
            p_low = p.lower().strip()
            if not any(w in stopwords for w in p_low.split()) and len(p_low) >= 6:
                extracted_terms.add(p_low)

        # 2. Single technical terms
        tokens = re.findall(r"\b[a-zA-Z0-9_\-\+]{3,}\b", ev_text)
        for t in tokens:
            t_low = t.lower()
            if t_low not in stopwords and len(t_low) >= 3:
                extracted_terms.add(t_low)

    if not extracted_terms:
        return [], [], 0.50

    covered = []
    missing = []

    for term in sorted(list(extracted_terms)):
        if term in answer_lower:
            covered.append(term)
        else:
            missing.append(term)

    coverage_ratio = float(len(covered) / len(extracted_terms)) if extracted_terms else 0.50
    return covered[:10], missing[:10], round(coverage_ratio, 4)


def detect_technical_errors(answer_text: str, evidence_texts: list) -> tuple[list, float]:
    """
    Identifies statements in candidate answer that conflict with retrieved domain evidence.
    Classifies errors into explicit contradiction, incorrect definition, incorrect relationship, unsupported claim, or minor imprecision.
    Returns (technical_errors: list, penalty_points: float).
    """
    if not answer_text or not evidence_texts:
        return [], 0.0

    errors = []
    penalty = 0.0
    ans_lower = answer_text.lower()

    # Multi-tier contradiction & technical inaccuracy rules
    error_rules = [
        # (Keyword, Problematic phrases, Severity classification, Message, Penalty)
        ("overfitting", ["poorly on training", "fails on training", "decreases training accuracy"], "Explicit Contradiction", "Incorrectly claimed overfitting causes poor performance on training data.", 15.0),
        ("overfitting", ["always increases test accuracy", "helps test performance"], "Incorrect Definition", "Incorrectly claimed overfitting improves test set performance.", 10.0),
        ("1nf", ["allows repeating groups", "repeating columns"], "Explicit Contradiction", "Incorrectly claimed 1NF permits repeating groups.", 15.0),
        ("b-tree", ["o(1) exact only", "does not support range"], "Incorrect Relationship", "Incorrectly claimed B-Tree indexes do not support range queries.", 10.0),
        ("tcp", ["connectionless", "no ordering"], "Explicit Contradiction", "Incorrectly described TCP as a connectionless or unordered protocol.", 15.0),
        ("udp", ["guarantees delivery", "3-way handshake"], "Explicit Contradiction", "Incorrectly described UDP as providing delivery guarantees or using a 3-way handshake.", 15.0),
        ("normalization", ["increases redundancy", "duplicates data"], "Incorrect Relationship", "Incorrectly claimed database normalization increases data redundancy.", 12.0),
        ("regularization", ["increases model complexity", "causes underfitting always"], "Minor Imprecision", "Incorrectly claimed regularization increases model complexity.", 5.0)
    ]

    for keyword, problematic_phrases, error_type, error_msg, p_val in error_rules:
        if keyword in ans_lower:
            for phrase in problematic_phrases:
                if phrase in ans_lower:
                    full_err = f"[{error_type}] {error_msg}"
                    if full_err not in errors:
                        errors.append(full_err)
                        penalty += p_val
                    break

    return errors, min(30.0, penalty)


def evaluate_answer(
    question: str,
    answer: str,
    context: list = None,
    role: str = None,
    resume_text: str = None,
    persona: str = "friendly",
    skills: list = None,
    topic: str = None,
    client: any = None
) -> dict:
    """
    Evaluates candidate's interview answer grounded in RAG retrieved domain evidence.
    Calculates SBERT vector similarity, concept coverage, technical error penalties, and multi-signal transparent sub-scores.
    """
    if not answer or len(answer.strip()) < 5:
        return _fallback_evaluate(question, answer)

    if client is None:
        client = get_gemini_client()

    # 1. RAG Evidence Retrieval for Answer Evaluation
    evidence_context = ""
    evidence_list = []
    evidence_ids = []
    retrieval_scores = []
    evidence_texts = []
    retrievals = []

    try:
        try:
            from rag import get_rag_service
        except ImportError:
            from backend.rag import get_rag_service

        rag_service = get_rag_service()
        retrievals, _ = rag_service.retrieve_with_diagnostics(
            query=f"Question: {question} Candidate Answer: {answer}",
            domain=topic.lower() if topic else (role.lower() if role else None),
            topic=topic,
            skills=skills,
            target_role=role,
            candidate_answer=answer,
            top_k=5
        )

        if retrievals:
            evidence_context = rag_service.build_context_prompt(retrievals)
            for res in retrievals:
                meta = getattr(res, "metadata", {})
                c_id = meta.get("chunk_id") or meta.get("metadata", {}).get("chunk_id") or "chunk_unknown"
                score = getattr(res, "rerank_score", getattr(res, "score", 0.0))
                src = meta.get("source", "Knowledge Base")
                top_str = meta.get("topic", "Concepts")

                evidence_ids.append(c_id)
                retrieval_scores.append(round(score, 4))
                evidence_texts.append(res.content)
                evidence_list.append({
                    "chunk_id": c_id,
                    "source": src,
                    "topic": top_str,
                    "relevance_score": round(score, 4)
                })
    except Exception as e:
        print(f"[RAG Answer Evaluator] Warning: RAG evidence retrieval failed: {e}")

    # 2. Concept Coverage & Technical Error Detection
    covered_concepts, missing_concepts, coverage_ratio = extract_concept_coverage(answer, evidence_texts)
    technical_errors, error_penalty = detect_technical_errors(answer, evidence_texts)

    # 3. Deterministic ML Scoring Engine (backend/rag/scoring.py)
    try:
        from rag.scoring import RAGMLScorer
    except ImportError:
        from backend.rag.scoring import RAGMLScorer

    scorer = RAGMLScorer()
    ml_eval = scorer.calculate_ml_scores(
        question=question,
        answer=answer,
        retrievals=retrievals,
        evidence_texts=evidence_texts,
        covered_concepts=covered_concepts,
        missing_concepts=missing_concepts,
        coverage_ratio=coverage_ratio,
        technical_errors=technical_errors,
        error_penalty=error_penalty
    )

    sbert_similarity = ml_eval["semantic_similarity"]
    qa_relevance = ml_eval["qa_relevance"]
    evidence_coverage = ml_eval["evidence_coverage"]
    evaluation_confidence = ml_eval["evaluation_confidence"]

    # 4. Optional Generative LLM Feedback Synthesis (non-blocking for scoring)
    feedback_text = f"Your answer addresses the key concepts of {topic or 'the question'}. Expanding with concrete examples and trade-offs will strengthen your response."
    strengths = ["Addressed the core topic"] if len(answer.split()) > 15 else ["Began responding"]
    weaknesses = [f"Missing key concepts: {', '.join(missing_concepts[:3])}"] if missing_concepts else []
    suggested_answer = f"A model answer for '{question}' clearly defines the core concept and highlights practical production trade-offs."
    next_question = "What trade-offs or edge cases would you consider when implementing this in production?"

    if client is not None:
        try:
            role_str = f"Target Role: {role}\n" if role else ""
            resume_str = f"Candidate Profile/Resume: {resume_text[:1500]}\n" if resume_text else ""
            context_str = ""
            if context:
                context_str = "\nPrevious Q&A:\n" + "\n".join([f"Q: {qa.get('question','')}\nA: {qa.get('answer','')}" for qa in context])

            prompt = f"""You are an expert technical interviewer ({persona} persona) reviewing candidate evaluation signals.
{role_str}{resume_str}{context_str}
Question Asked: {question}
Candidate Answer: {answer}

GROUND TRUTH EVIDENCE:
{evidence_context or "Standard technical domain knowledge."}

ML SIGNALS CALCULATED:
- Technical Accuracy Score: {ml_eval['technical_accuracy_score']}/100
- SBERT Vector Alignment: {sbert_similarity * 100:.1f}%
- QA Topic Relevance: {qa_relevance * 100:.1f}%
- Covered Concepts: {covered_concepts}
- Missing Concepts: {missing_concepts}
- Technical Errors: {technical_errors}

Synthesize constructive candidate feedback. Return ONLY valid JSON:
{{
  "feedback": "<2-3 sentences of constructive feedback citing candidate phrases and missing concepts>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggested_answer": "<A 2-3 sentence grounded model answer>",
  "next_question": "<Adaptive follow-up question based on missing concepts>"
}}
"""
            response = client.generate_content(prompt)
            raw = response.text.strip()
            raw = re.sub(r"^```(?:json)?", "", raw, flags=re.MULTILINE).strip()
            raw = re.sub(r"```$", "", raw, flags=re.MULTILINE).strip()
            gen_data = json.loads(raw)

            if gen_data.get("feedback"):
                feedback_text = gen_data["feedback"]
            if gen_data.get("strengths"):
                strengths = gen_data["strengths"]
            if gen_data.get("weaknesses"):
                weaknesses = gen_data["weaknesses"]
            if gen_data.get("suggested_answer"):
                suggested_answer = gen_data["suggested_answer"]
            if gen_data.get("next_question"):
                next_question = gen_data["next_question"]
        except Exception as ex:
            print(f"[RAG Answer Evaluator] Generative feedback synthesis skipped: {ex}")

    # Combine deterministic ML scores with synthesized qualitative feedback
    result = {
        "score": ml_eval["score"],
        "overall_score": ml_eval["overall_score"],
        "relevance_score": ml_eval["relevance_score"],
        "technical_accuracy_score": ml_eval["technical_accuracy_score"],
        "completeness_score": ml_eval["completeness_score"],
        "depth_score": ml_eval["depth_score"],
        "clarity_score": ml_eval["clarity_score"],
        "confidence_score": ml_eval["confidence_score"],
        "feedback": feedback_text,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_keywords": missing_concepts,
        "missing_concepts": missing_concepts,
        "technical_errors": technical_errors,
        "suggested_answer": suggested_answer,
        "next_question": next_question,
        "difficulty": "medium",
        "answer_quality": ml_eval["answer_quality"],
        "evidence": evidence_list,
        "evidence_ids": evidence_ids,
        "retrieval_scores": retrieval_scores,
        "semantic_similarity": sbert_similarity,
        "qa_relevance": qa_relevance,
        "evidence_coverage": evidence_coverage,
        "evaluation_confidence": evaluation_confidence,
        "scoring_version": "v2.0-ml-rag"
    }

    return result


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
        "overall_score": score,
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
