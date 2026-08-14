from typing import Optional
import random
from sqlalchemy.orm import Session
from models import InterviewSession, Question, Answer, Evaluation
from .answer_evaluator import evaluate_answer, get_gemini_client
from .question_generator import SKILL_QUESTIONS_DB, GENERAL_HR_QUESTIONS
from .resume_parser import detect_coding_round_recommendation

ROLE_TOPIC_HINTS = {
    "frontend": ["React", "Javascript"],
    "react": ["React", "Javascript"],
    "javascript": ["Javascript", "React"],
    "backend": ["Fastapi", "Python", "Docker", "Git"],
    "api": ["Fastapi", "Python"],
    "full stack": ["React", "Fastapi", "Javascript", "Python", "Docker", "Git"],
    "fullstack": ["React", "Fastapi", "Javascript", "Python", "Docker", "Git"],
    "data": ["Sql", "Python", "Machine learning"],
    "analyst": ["Sql", "Python", "Machine learning"],
    "machine learning": ["Machine learning", "Python"],
    "ml": ["Machine learning", "Python"],
    "ai": ["Machine learning", "Python"],
    "java": ["Java", "Docker", "Git"],
    "devops": ["Docker", "Git", "Fastapi"],
    "cloud": ["Docker", "Fastapi", "Git"],
    "security": ["Docker", "Git"],
    "sql": ["Sql"],
    "python": ["Python"],
}

TOPIC_ORDER = [
    "React",
    "Javascript",
    "Fastapi",
    "Python",
    "Machine learning",
    "Java",
    "Docker",
    "Git",
    "Sql",
]

def _normalize(value: Optional[str]) -> str:
    return value.lower().strip() if value else ""

def _candidate_topics(role: str, skills: list[str]) -> list[str]:
    candidates = []
    normalized_role = _normalize(role)

    for hint, topics in ROLE_TOPIC_HINTS.items():
        if hint in normalized_role:
            candidates.extend(topics)

    for skill in skills:
        skill_value = _normalize(skill)
        for topic in TOPIC_ORDER:
            if topic.lower() == skill_value:
                candidates.append(topic)

    if not candidates:
        candidates.append("General")

    ordered_candidates = []
    for topic in TOPIC_ORDER:
        if topic in candidates and topic not in ordered_candidates:
            ordered_candidates.append(topic)

    if "General" in candidates:
        ordered_candidates.append("General")

    return ordered_candidates

def _topic_pool(topics: list[str]) -> list[dict]:
    pool = []
    for topic in topics:
        if topic == "General":
            pool.extend(GENERAL_HR_QUESTIONS)
            continue

        if topic in SKILL_QUESTIONS_DB:
            pool.extend([{**item, "topic": topic} for item in SKILL_QUESTIONS_DB[topic]])

    return pool

def _pick_question(pool: list[dict], asked_questions: set, prefer_hard: bool = False) -> Optional[str]:
    if not pool:
        return None

    ordered_pool = pool
    if prefer_hard:
        hard_pool = [item for item in pool if item.get("difficulty") in {"hard", "medium"}]
        if hard_pool:
            ordered_pool = hard_pool
    else:
        medium_pool = [item for item in pool if item.get("difficulty") in {"medium", "hard"}]
        if medium_pool:
            ordered_pool = medium_pool

    random.shuffle(ordered_pool)
    for item in ordered_pool:
        question = item.get("question", "").strip()
        if question and question not in asked_questions:
            return question

    for item in pool:
        question = item.get("question", "").strip()
        if question and question not in asked_questions:
            return question

    return pool[0].get("question", "").strip() or None

def _match_bank_item(question: str, role: str, skills: list[str]) -> Optional[dict]:
    all_pools = _topic_pool(_candidate_topics(role, skills))
    for item in all_pools:
        if item.get("question", "").strip().lower() == question.strip().lower():
            return item
    return None

def _build_initial_question(role: str, skills: list[str], asked_questions: set) -> str:
    topic_pool = _topic_pool(_candidate_topics(role, skills))
    question = _pick_question(topic_pool, asked_questions, prefer_hard=True)
    if question:
        return question

    if role:
        return f"What is the most challenging technical problem you have solved that is relevant to the {role} role, and how did you approach it?"

    return "Tell me about a complex technical challenge you solved and how you approached it."

def _build_coding_question() -> str:
    return "CODING ROUND: Implement a function that returns the first non-repeating character in a string. Return the character or -1 if no such character exists."

def _build_followup_question(question: str, answer_quality: str, role: str, skills: list[str], asked_questions: set) -> str:
    matched_item = _match_bank_item(question, role, skills)

    if matched_item:
        if answer_quality == "strong":
            followup = matched_item.get("strong_followup", "").strip()
        elif answer_quality == "weak":
            followup = matched_item.get("weak_followup", "").strip()
        else:
            followup = matched_item.get("weak_followup", "").strip() or matched_item.get("strong_followup", "").strip()

        if followup and followup not in asked_questions:
            return followup

    topics = _candidate_topics(role, skills)
    topic_pool = _topic_pool(topics)
    if answer_quality == "strong":
        return _pick_question(topic_pool, asked_questions, prefer_hard=True) or "Can you go one level deeper and explain the tradeoffs in your approach?"
    if answer_quality == "weak":
        return _pick_question(topic_pool, asked_questions, prefer_hard=False) or "Can you explain that again using a simple concrete example?"
    return _pick_question(topic_pool, asked_questions, prefer_hard=False) or "Can you elaborate with a specific example or tradeoff?"


# DB Interface Methods

def start_interview(db: Session, user_id: str, resume_skills: list[str], persona: str = "friendly", role: str = None, resume_text: str = None):
    """
    Creates a new DB session, generates the first question, and saves it.
    Returns (session_id, first_question_text).
    """
    actual_role = role if role else (resume_skills[0] if resume_skills else "General Software Engineering")
    
    # Create new session in DB
    new_session = InterviewSession(
        user_id=user_id,
        resume_text=resume_text or "",
        skills=resume_skills or [],
        role=actual_role,
        persona=persona,
        status="in_progress"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    asked_questions = set()

    # Generate first question
    first_q = _build_initial_question(actual_role, resume_skills, asked_questions)

    client = get_gemini_client()
    if client and actual_role:
        skills_str = ", ".join(resume_skills) if resume_skills else "general technology"
        prompt = f"""You are an expert technical interviewer ({persona} persona) hiring for the role of '{actual_role}'.
Candidate's key skills: {skills_str}
Candidate's Profile details: {(resume_text or "")[:2000]}

Generate one deep, role-specific opening question that is NOT a generic introduce-yourself prompt.
It should be anchored in a concrete skill, architecture decision, or technical tradeoff relevant to the role.
Keep the question concise and realistic. Do NOT include any extra greetings, instructions, or meta-commentary. Just return the raw question text.
"""
        try:
            response = client.generate_content(prompt)
            q_text = response.text.strip().strip('"').strip("'")
            if len(q_text) > 10 and q_text not in asked_questions:
                first_q = q_text
        except Exception as e:
            print(f"Error generating dynamic first question: {e}")

    # Save first question to DB
    new_question = Question(
        session_id=new_session.id,
        question_text=first_q,
        category="behavioral",
        order=1
    )
    db.add(new_question)
    db.commit()

    return new_session.id, [first_q]

def next_question(db: Session, session_id: str, user_id: str) -> Optional[str]:
    """
    Retrieves the pending next question from the last evaluation or generates one if needed.
    Saves it to the DB and returns the question string.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session or session.user_id != user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Session not found or forbidden")

    # Get all questions to find order and asked set
    questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.order).all()
    asked_questions = {q.question_text for q in questions}
    next_order = len(questions) + 1

    if next_order > 5:
        # End of interview
        session.status = "completed"
        db.commit()
        return None

    # Check if we have a pending next_question_suggestion from the last evaluation
    last_question = questions[-1] if questions else None
    pending_q = None
    if last_question and last_question.answer and last_question.answer.evaluation:
        pending_q = last_question.answer.evaluation.next_question_suggestion

    if not pending_q:
        # Fallback to generating one
        pending_q = _pick_question(_topic_pool(_candidate_topics(session.role, session.skills)), asked_questions)
        if not pending_q:
            pending_q = "Could you tell me more about your technical background?"

    # Check if we should insert the coding round
    coding_round_enabled = detect_coding_round_recommendation(
        resume_text=session.resume_text,
        role=session.role,
        skills=session.skills,
    ).get("enabled", False)
    
    category = "behavioral"
    if coding_round_enabled and next_order == 2:
        pending_q = _build_coding_question()
        category = "coding"

    new_question = Question(
        session_id=session_id,
        question_text=pending_q,
        category=category,
        order=next_order
    )
    db.add(new_question)
    db.commit()

    return pending_q

def store_answer(db: Session, session_id: str, user_id: str, question_text: str, answer_text: str) -> dict:
    """
    Evaluates the answer and stores the Answer and Evaluation in the DB.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session or session.user_id != user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Session not found or forbidden")

    # Find the corresponding Question record
    question_record = db.query(Question).filter(
        Question.session_id == session_id,
        Question.question_text == question_text
    ).first()
    
    if not question_record:
        raise Exception("Question not found for this session")

    # Build history for Gemini
    questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.order).all()
    history = []
    for q in questions:
        if q.answer:
            history.append({
                "question": q.question_text,
                "answer": q.answer.transcript_text
            })

    # Evaluate
    evaluation = evaluate_answer(
        question=question_text,
        answer=answer_text,
        context=history,
        role=session.role,
        resume_text=session.resume_text,
        persona=session.persona
    )

    # Store Answer
    new_answer = Answer(
        question_id=question_record.id,
        transcript_text=answer_text
    )
    db.add(new_answer)
    db.flush() # flush to get answer id for evaluation

    # Determine adaptive next question for storage
    asked_questions = {q.question_text for q in questions}
    built_next_question = _build_followup_question(question_text, evaluation.get("answer_quality", "average"), session.role, session.skills, asked_questions)
    pending_next_question = built_next_question or evaluation.get("next_question", "")
    
    if len(questions) >= 5:
        pending_next_question = "Thank you! That concludes our interview today. I am generating your final analysis report."

    # Store Evaluation
    new_eval = Evaluation(
        answer_id=new_answer.id,
        score=evaluation.get("score", 0),
        relevance_score=evaluation.get("relevance_score", 0),
        technical_accuracy_score=evaluation.get("technical_accuracy_score", 0),
        depth_score=evaluation.get("depth_score", 0),
        clarity_score=evaluation.get("clarity_score", 0),
        confidence_score=evaluation.get("confidence_score", 0),
        feedback=evaluation.get("feedback", ""),
        strengths=evaluation.get("strengths", []),
        weaknesses=evaluation.get("weaknesses", []),
        missing_keywords=evaluation.get("missing_keywords", []),
        suggested_answer=evaluation.get("suggested_answer", ""),
        next_question_suggestion=pending_next_question,
        answer_quality=evaluation.get("answer_quality", "average")
    )
    db.add(new_eval)
    
    # Check if end of interview
    if len(questions) >= 5:
        session.status = "completed"

    db.commit()
    
    evaluation["next_question"] = pending_next_question
    return evaluation

def generate_final_report(db: Session, session_id: str, user_id: str) -> dict:
    """
    Reads all evaluations from the DB for the given session and computes averages.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session or session.user_id != user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Session not found or forbidden")

    questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.order).all()
    
    results = []
    for q in questions:
        if q.answer and q.answer.evaluation:
            e = q.answer.evaluation
            results.append({
                "question": q.question_text,
                "answer": q.answer.transcript_text,
                "score": e.score,
                "relevance_score": e.relevance_score,
                "technical_accuracy_score": e.technical_accuracy_score,
                "depth_score": e.depth_score,
                "clarity_score": e.clarity_score,
                "confidence_score": e.confidence_score,
                "feedback": e.feedback,
                "strengths": e.strengths,
                "weaknesses": e.weaknesses,
                "missing_keywords": e.missing_keywords
            })

    if not results:
        return {
            "total_score": 0,
            "technical_score": 0,
            "communication_score": 0,
            "strengths": [],
            "weaknesses": [],
            "recommendations": "No answers provided.",
            "detailed_results": []
        }

    total_score = sum(r["score"] for r in results) / len(results)
    tech_scores = [r["technical_accuracy_score"] for r in results]
    comm_scores = [r["clarity_score"] for r in results]
    relevance_scores = [r["relevance_score"] for r in results]
    confidence_scores = [r["confidence_score"] for r in results]

    technical_score = sum(tech_scores) / len(tech_scores) if tech_scores else total_score
    communication_score = sum(comm_scores) / len(comm_scores) if comm_scores else total_score
    avg_relevance = sum(relevance_scores) / len(relevance_scores) if relevance_scores else total_score
    avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else total_score

    all_strengths = []
    all_weaknesses = []
    for r in results:
        if r.get("strengths"):
            all_strengths.extend(r["strengths"])
        if r.get("weaknesses"):
            all_weaknesses.extend(r["weaknesses"])

    strengths = list(dict.fromkeys(all_strengths))[:5]
    weaknesses = list(dict.fromkeys(all_weaknesses))[:5]

    recommendations = "Great job finishing the interview!"
    if total_score >= 80:
        recommendations = f"Fantastic work! You demonstrated strong capability for the '{session.role}' role. Your technical explanation is highly accurate. To stand out even more, practice structuring answers with clear business impacts."
    elif total_score >= 60:
        recommendations = f"Solid performance. You have a good foundation for the '{session.role}' role, but there are a few technical gaps and areas where you could provide deeper examples. Focus on using the STAR method for behavioral/scenario questions."
    else:
        recommendations = f"Good attempt. We suggest reviewing the core concepts of '{session.role}'. Focus on strengthening your technical depth, incorporating key industry vocabulary, and explaining your thought process clearly."

    return {
        "total_score": round(total_score, 1),
        "technical_score": round(technical_score, 1),
        "communication_score": round(communication_score, 1),
        "relevance_score": round(avg_relevance, 1),
        "confidence_score": round(avg_confidence, 1),
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "detailed_results": results
    }


# ---------------------------------------------------------------------------
# Overall Platform Score Blending
# ---------------------------------------------------------------------------

def compute_overall_platform_score(
    interview_score: float,
    ats_score: float,
    coding_profiles: list,
) -> dict:
    """
    Blend the three pillar scores into a single overall platform score.

    Weights:
        interview_score   55%
        ats_score         25%
        coding_score      20%  (average across all linked coding profiles,
                                or 0.0 if none linked)

    Args:
        interview_score:  0-100 score from the latest interview session.
        ats_score:        0-100 score from the ATS checker.
        coding_profiles:  List of CodingProfile ORM objects (or dicts with
                          a ``profile_score`` key).  Empty list is fine.

    Returns:
        {
            "overall_score": float,
            "interview_score": float,
            "ats_score": float,
            "coding_score": float,
        }
    """
    if coding_profiles:
        # Accept either ORM objects or plain dicts
        scores = []
        for p in coding_profiles:
            if hasattr(p, "profile_score"):
                scores.append(float(p.profile_score or 0))
            elif isinstance(p, dict):
                scores.append(float(p.get("profile_score", 0)))
        coding_score = sum(scores) / len(scores) if scores else 0.0
    else:
        coding_score = 0.0

    overall = (
        float(interview_score) * 0.55
        + float(ats_score) * 0.25
        + coding_score * 0.20
    )

    return {
        "overall_score": round(overall, 2),
        "interview_score": round(float(interview_score), 2),
        "ats_score": round(float(ats_score), 2),
        "coding_score": round(coding_score, 2),
    }
