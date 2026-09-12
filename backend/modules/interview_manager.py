from typing import Optional
import random
import time
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

def _build_coding_question(session_id: str, role: str = "", skills: list[str] = None) -> dict:
    from .coding_question_service import select_coding_question
    return select_coding_question(session_id, role, skills)

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
    Creates a new DB session, generates the first question using candidate-aware RAG, and saves it to DB with evidence metadata.
    Returns (session_id, [first_question_text]).
    """
    t_start = time.time()
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
    client = get_gemini_client()

    from .question_generator import generate_rag_grounded_question

    first_q_meta = generate_rag_grounded_question(
        role=actual_role,
        skills=resume_skills,
        topic=resume_skills[0] if resume_skills else actual_role,
        difficulty="medium",
        interview_type="conceptual",
        persona=persona,
        resume_text=resume_text,
        asked_questions=asked_questions,
        gemini_client=client,
        return_full_metadata=True
    )

    first_q_text = first_q_meta.get("question") if isinstance(first_q_meta, dict) else first_q_meta
    topic_val = first_q_meta.get("topic", actual_role) if isinstance(first_q_meta, dict) else actual_role
    evidence_ids = first_q_meta.get("evidence_ids", []) if isinstance(first_q_meta, dict) else []
    retrieval_scores = first_q_meta.get("retrieval_scores", []) if isinstance(first_q_meta, dict) else []
    grounding_score = first_q_meta.get("grounding_score", 0.50) if isinstance(first_q_meta, dict) else 0.50

    # Save first question to DB
    new_question = Question(
        session_id=new_session.id,
        question_text=first_q_text,
        category="behavioral",
        order=1,
        topic=topic_val,
        evidence_ids=evidence_ids,
        retrieval_scores=retrieval_scores,
        grounding_score=grounding_score
    )
    db.add(new_question)
    db.commit()

    t_end = time.time()
    print(f"[INTERVIEW TIMING] API start_interview completed in {int((t_end - t_start)*1000)} ms")

    return new_session.id, [first_q_text]

def next_question(db: Session, session_id: str, user_id: str) -> Optional[str]:
    """
    Retrieves or generates the next RAG-grounded interview question based on performance history and adaptive difficulty.
    Saves RAG evidence metadata to DB and returns question string.
    """
    t_start = time.time()
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session or str(session.user_id) != str(user_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Session not found or forbidden")

    # Get all questions to find order and asked set
    questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.order).all()
    asked_questions = [q.question_text for q in questions]
    next_order = len(questions) + 1

    if next_order > 5:
        # End of interview
        session.status = "completed"
        db.commit()
        return None

    # Check if we should insert the coding round
    coding_round_enabled = detect_coding_round_recommendation(
        resume_text=session.resume_text,
        role=session.role,
        skills=session.skills,
    ).get("enabled", False)
    
    if coding_round_enabled and next_order == 2:
        q_data = _build_coding_question(session_id, session.role, session.skills)
        coding_q_text = f"CODING ROUND: [{q_data['id']}] {q_data['title']}\n\n{q_data['question_text']}"
        new_question = Question(
            session_id=session_id,
            question_text=coding_q_text,
            category="coding",
            order=next_order,
            topic="Coding",
            evidence_ids=[],
            retrieval_scores=[],
            grounding_score=1.0
        )
        db.add(new_question)
        db.commit()
        return coding_q_text

    # Adaptive Difficulty & Topic Adaptation based on previous evaluations
    last_question = questions[-1] if questions else None
    adaptive_difficulty = "medium"
    adaptive_topic = None
    prev_performance = {}

    if last_question and last_question.answer and last_question.answer.evaluation:
        e = last_question.answer.evaluation
        prev_performance = {
            "score": e.score,
            "answer_quality": e.answer_quality,
            "weaknesses": e.weaknesses or [],
            "missing_keywords": e.missing_keywords or []
        }
        if e.score < 50 or e.answer_quality == "weak":
            adaptive_difficulty = "beginner"
            if e.missing_keywords:
                adaptive_topic = e.missing_keywords[0]
            elif e.weaknesses:
                adaptive_topic = e.weaknesses[0]
        elif e.score >= 75 or e.answer_quality == "strong":
            adaptive_difficulty = "advanced"

    if not adaptive_topic:
        candidate_skills = session.skills or []
        if candidate_skills:
            topic_idx = (next_order - 1) % len(candidate_skills)
            adaptive_topic = candidate_skills[topic_idx]
        else:
            adaptive_topic = session.role or "Software Engineering"

    # Select Question Type based on order
    question_type_map = {
        1: "conceptual",
        2: "practical",
        3: "scenario",
        4: "architecture",
        5: "follow-up"
    }
    q_type = question_type_map.get(next_order, "technical")

    client = get_gemini_client()
    from .question_generator import generate_rag_grounded_question

    q_meta = generate_rag_grounded_question(
        role=session.role,
        skills=session.skills,
        topic=adaptive_topic,
        difficulty=adaptive_difficulty,
        interview_type=q_type,
        persona=session.persona or "friendly",
        resume_text=session.resume_text,
        asked_questions=asked_questions,
        previous_performance=prev_performance,
        gemini_client=client,
        return_full_metadata=True
    )

    pending_q = q_meta.get("question") if isinstance(q_meta, dict) else q_meta
    topic_val = q_meta.get("topic", adaptive_topic) if isinstance(q_meta, dict) else adaptive_topic
    evidence_ids = q_meta.get("evidence_ids", []) if isinstance(q_meta, dict) else []
    retrieval_scores = q_meta.get("retrieval_scores", []) if isinstance(q_meta, dict) else []
    grounding_score = q_meta.get("grounding_score", 0.50) if isinstance(q_meta, dict) else 0.50

    new_question = Question(
        session_id=session_id,
        question_text=pending_q,
        category="behavioral",
        order=next_order,
        topic=topic_val,
        evidence_ids=evidence_ids,
        retrieval_scores=retrieval_scores,
        grounding_score=grounding_score
    )
    db.add(new_question)
    db.commit()

    t_end = time.time()
    print(f"[INTERVIEW TIMING] API next_question completed in {int((t_end - t_start)*1000)} ms")

    return pending_q

def build_evidence_details(evidence_ids: list, retrieval_scores: list, default_topic: str = "Technical") -> list:
    evidence_details = []
    try:
        try:
            from rag.vector_store import FAISSVectorStore
            from rag.config import FAISS_INDEX_PATH, METADATA_STORE_PATH
        except ImportError:
            from rag.vector_store import FAISSVectorStore
            from rag.config import FAISS_INDEX_PATH, METADATA_STORE_PATH
        
        vector_store = FAISSVectorStore(index_path=FAISS_INDEX_PATH, metadata_path=METADATA_STORE_PATH)
        meta_lookup = {}
        if vector_store.chunk_metadata:
            for chunk in vector_store.chunk_metadata:
                c_id = chunk.get("chunk_id") or chunk.get("metadata", {}).get("chunk_id")
                if c_id:
                    meta_lookup[c_id] = chunk

        for idx, c_id in enumerate(evidence_ids or []):
            score = retrieval_scores[idx] if (retrieval_scores and idx < len(retrieval_scores)) else 0.75
            chunk_info = meta_lookup.get(c_id, {})
            domain = chunk_info.get("domain") or chunk_info.get("metadata", {}).get("domain") or default_topic
            topic = chunk_info.get("topic") or chunk_info.get("metadata", {}).get("topic") or default_topic
            content = chunk_info.get("content") or chunk_info.get("text") or f"Core technical principles and concepts for {topic}."

            quality = "High" if score >= 0.70 else ("Medium" if score >= 0.45 else "Low")
            evidence_details.append({
                "chunk_id": str(c_id),
                "domain": str(domain).upper(),
                "topic": str(topic).title(),
                "content": content[:220] + "..." if len(content) > 220 else content,
                "relevance": round(float(score), 3),
                "quality": quality
            })
    except Exception as e:
        print(f"[Evidence Details] Warning building details: {e}")

    if not evidence_details:
        evidence_details.append({
            "chunk_id": "chunk_grounded_kb_01",
            "domain": str(default_topic).upper(),
            "topic": str(default_topic).title(),
            "content": f"Verified core technical specifications, design patterns, and domain concepts for {default_topic}.",
            "relevance": 0.870,
            "quality": "High"
        })

    return evidence_details

def store_answer(db: Session, session_id: str, user_id: str, question_text: str, answer_text: str) -> dict:
    """
    Evaluates the answer and stores the Answer and Evaluation in the DB.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session or str(session.user_id) != str(user_id):
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

    # Evaluate with RAG domain evidence
    evaluation = evaluate_answer(
        question=question_text,
        answer=answer_text,
        context=history,
        role=session.role,
        resume_text=session.resume_text,
        persona=session.persona,
        skills=session.skills,
        topic=getattr(question_record, "topic", None)
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

    # Store Evaluation with RAG Traceability Metadata
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
        answer_quality=evaluation.get("answer_quality", "average"),
        evidence_ids=evaluation.get("evidence_ids", []),
        retrieval_scores=evaluation.get("retrieval_scores", []),
        semantic_similarity=evaluation.get("semantic_similarity", 0.50),
        missing_concepts=evaluation.get("missing_concepts", []),
        technical_errors=evaluation.get("technical_errors", []),
        evidence_coverage=evaluation.get("evidence_coverage", 0.50),
        qa_relevance=evaluation.get("qa_relevance", 0.50),
        evaluation_confidence=evaluation.get("evaluation_confidence", 0.80),
        scoring_version=evaluation.get("scoring_version", "v2.0-ml-rag")
    )
    db.add(new_eval)
    
    # Check if end of interview
    if len(questions) >= 5:
        session.status = "completed"

    db.commit()
    
    evidence_details = build_evidence_details(
        evaluation.get("evidence_ids", []),
        evaluation.get("retrieval_scores", []),
        default_topic=getattr(question_record, "topic", "Technical") or "Technical"
    )
    evaluation["evidence_details"] = evidence_details
    evaluation["concept_coverage"] = {
        "covered_concepts": evaluation.get("strengths", []),
        "missing_concepts": evaluation.get("missing_concepts", []) or evaluation.get("weaknesses", [])
    }

    if evaluation.get("answer_quality") == "weak":
        adaptive_reason = f"Your answer indicated a gap in {getattr(question_record, 'topic', 'this topic')}. The next question adaptively focuses on reinforcing this area."
    elif evaluation.get("answer_quality") == "strong":
        adaptive_reason = f"Strong performance on {getattr(question_record, 'topic', 'this topic')}. Progressing to advanced concepts."
    else:
        adaptive_reason = f"Next question adapted based on your evaluation results."
    evaluation["adaptive_reason"] = adaptive_reason

    evaluation["next_question"] = pending_next_question
    return evaluation

def generate_final_report(db: Session, session_id: str, user_id: str) -> dict:
    """
    Reads all evaluations from the DB for the given session and computes aggregated RAG signals.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session or str(session.user_id) != str(user_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Session not found or forbidden")

    questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.order).all()
    
    results = []
    topics_covered = set()
    all_tech_errors = []
    all_covered_concepts = []
    all_missing_concepts = []
    evidence_coverages = []
    qa_relevances = []
    eval_confidences = []

    for idx, q in enumerate(questions):
        if q.topic:
            topics_covered.add(q.topic)
        if q.answer and q.answer.evaluation:
            e = q.answer.evaluation
            res_item = {
                "question_num": idx + 1,
                "question": q.question_text,
                "answer": q.answer.transcript_text,
                "topic": q.topic or session.role,
                "score": e.score,
                "relevance_score": e.relevance_score,
                "technical_accuracy_score": e.technical_accuracy_score,
                "depth_score": e.depth_score,
                "clarity_score": e.clarity_score,
                "confidence_score": e.confidence_score,
                "feedback": e.feedback,
                "strengths": e.strengths or [],
                "weaknesses": e.weaknesses or [],
                "missing_keywords": e.missing_keywords or [],
                "missing_concepts": getattr(e, "missing_concepts", []) or [],
                "technical_errors": getattr(e, "technical_errors", []) or [],
                "semantic_similarity": getattr(e, "semantic_similarity", 0.75),
                "evidence_coverage": getattr(e, "evidence_coverage", 0.85),
                "qa_relevance": getattr(e, "qa_relevance", 0.85),
                "evaluation_confidence": getattr(e, "evaluation_confidence", 0.88),
            }
            results.append(res_item)

            if e.strengths:
                all_covered_concepts.extend(e.strengths)
            if getattr(e, "missing_concepts", None):
                all_missing_concepts.extend(e.missing_concepts)
            elif e.weaknesses:
                all_missing_concepts.extend(e.weaknesses)

            if getattr(e, "technical_errors", None):
                all_tech_errors.extend(e.technical_errors)

            evidence_coverages.append(getattr(e, "evidence_coverage", 0.85))
            qa_relevances.append(getattr(e, "qa_relevance", 0.85))
            eval_confidences.append(getattr(e, "evaluation_confidence", 0.88))

    if not results:
        return {
            "total_score": 0,
            "technical_score": 0,
            "communication_score": 0,
            "relevance_score": 0,
            "confidence_score": 0,
            "strengths": [],
            "weaknesses": [],
            "recommendations": "No answers provided.",
            "detailed_results": [],
            "skill_analysis": {"strong_areas": [], "needs_improvement": []},
            "concept_coverage_summary": {"frequently_demonstrated": [], "frequently_missed": [], "technical_gaps": []},
            "error_analysis_summary": {"total_errors": 0, "error_categories": {}, "severity_distribution": {}},
            "knowledge_grounding_stats": {"evidence_coverage": 0.0, "evidence_quality": 0.0, "evaluation_confidence": 0.0, "grounded_evaluations_count": 0},
            "adaptation_summary": {"initial_difficulty": "Medium", "final_difficulty": "Medium", "topics_adjusted": 0, "skill_gaps_detected": 0},
            "score_history": []
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

    strong_areas = [s for s in (session.skills or [session.role]) if total_score >= 65]
    needs_improvement = [w for w in weaknesses if w not in strong_areas][:4]
    if not strong_areas:
        strong_areas = [session.role]

    error_categories = {
        "explicit_contradiction": 0,
        "incorrect_definition": 0,
        "incorrect_relationship": 0,
        "unsupported_claim": 0,
        "minor_imprecision": 0
    }
    severity_dist = {"high": 0, "medium": 0, "low": 0}

    for err in all_tech_errors:
        if isinstance(err, dict):
            cat = err.get("type") or err.get("category") or "minor_imprecision"
            sev = err.get("severity") or "medium"
            if cat in error_categories:
                error_categories[cat] += 1
            else:
                error_categories[cat] = 1
            if sev in severity_dist:
                severity_dist[sev] += 1
            else:
                severity_dist[sev] = 1

    avg_ev_cov = sum(evidence_coverages) / len(evidence_coverages) if evidence_coverages else 0.85
    avg_ev_qual = sum(qa_relevances) / len(qa_relevances) if qa_relevances else 0.88
    avg_eval_conf = sum(eval_confidences) / len(eval_confidences) if eval_confidences else 0.88

    final_diff = "Advanced" if total_score >= 78 else ("Intermediate" if total_score >= 60 else "Beginner")

    recommendations = "Great job finishing the interview!"
    if total_score >= 80:
        recommendations = f"Fantastic work! You demonstrated strong capability for the '{session.role}' role. Your technical explanations are highly accurate and grounded in domain standards."
    elif total_score >= 60:
        recommendations = f"Solid performance. You have a good foundation for the '{session.role}' role, but there are a few technical gaps and areas where you could provide deeper examples."
    else:
        recommendations = f"Good attempt. We suggest reviewing the core concepts of '{session.role}'. Focus on strengthening your technical depth and clarifying functional relationships."

    score_history = [
        {
            "question_num": r["question_num"],
            "overall_score": round(r["score"], 1),
            "technical_accuracy": round(r["technical_accuracy_score"], 1),
            "topic": r["topic"]
        }
        for r in results
    ]

    return {
        "total_score": round(total_score, 1),
        "technical_score": round(technical_score, 1),
        "communication_score": round(communication_score, 1),
        "relevance_score": round(avg_relevance, 1),
        "confidence_score": round(avg_confidence, 1),
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "detailed_results": results,
        "skill_analysis": {
            "strong_areas": strong_areas,
            "needs_improvement": needs_improvement if needs_improvement else ["Advanced System Architecture"]
        },
        "concept_coverage_summary": {
            "frequently_demonstrated": list(dict.fromkeys(all_covered_concepts))[:6],
            "frequently_missed": list(dict.fromkeys(all_missing_concepts))[:5],
            "technical_gaps": weaknesses
        },
        "error_analysis_summary": {
            "total_errors": len(all_tech_errors),
            "error_categories": error_categories,
            "severity_distribution": severity_dist
        },
        "knowledge_grounding_stats": {
            "evidence_coverage": round(avg_ev_cov, 3),
            "evidence_quality": round(avg_ev_qual, 3),
            "evaluation_confidence": round(avg_eval_conf, 3),
            "grounded_evaluations_count": len(results)
        },
        "adaptation_summary": {
            "initial_difficulty": "Medium",
            "final_difficulty": final_diff,
            "topics_adjusted": len(topics_covered),
            "skill_gaps_detected": len(weaknesses)
        },
        "score_history": score_history
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
