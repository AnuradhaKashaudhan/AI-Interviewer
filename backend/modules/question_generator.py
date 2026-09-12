import random
import numpy as np
import time
import concurrent.futures

# Expanded question bank with difficulty levels and follow-up pairs
SKILL_QUESTIONS_DB = {
    "Python": [
        {
            "question": "What are the differences between lists and tuples in Python?",
            "difficulty": "easy",
            "weak_followup": "Can you give me a simple example of when you would use a list vs a tuple?",
            "strong_followup": "How does Python's memory management differ between lists and tuples internally, and how does this affect performance in large-scale applications?"
        },
        {
            "question": "How does memory management work in Python?",
            "difficulty": "medium",
            "weak_followup": "What is a garbage collector and why does Python need one?",
            "strong_followup": "Can you explain the difference between reference counting and cyclic garbage collection, and describe a scenario where cyclic GC would be critical?"
        },
        {
            "question": "Explain the context manager and the 'with' statement in Python.",
            "difficulty": "medium",
            "weak_followup": "Can you show me a basic example of using 'with open()' to read a file?",
            "strong_followup": "How would you implement a custom context manager using both the __enter__/__exit__ protocol and the contextlib.contextmanager decorator? When would you choose one over the other?"
        },
        {
            "question": "What are decorators, and how are they used?",
            "difficulty": "medium",
            "weak_followup": "Can you describe what happens step-by-step when Python encounters the '@' syntax before a function?",
            "strong_followup": "How would you write a decorator that accepts arguments and preserves the wrapped function's metadata? Give an example of a real-world use case."
        },
        {
            "question": "Explain the difference between deep and shallow copy in Python.",
            "difficulty": "easy",
            "weak_followup": "What happens when you assign one list to another variable in Python?",
            "strong_followup": "In what scenarios can a shallow copy cause subtle bugs in production code? How would you handle nested mutable objects safely?"
        },
        {
            "question": "What are Python generators and how do they differ from regular functions?",
            "difficulty": "hard",
            "weak_followup": "What is the 'yield' keyword and how does it pause a function?",
            "strong_followup": "How would you implement a generator pipeline for processing large data streams, and how does this compare to an async generator approach?"
        },
    ],
    "Java": [
        {
            "question": "What is the difference between an Interface and an Abstract class?",
            "difficulty": "easy",
            "weak_followup": "Can a class implement multiple interfaces in Java?",
            "strong_followup": "With Java 8+ default methods in interfaces, how do you decide whether to use an interface with default methods vs an abstract class? What are the key design considerations?"
        },
        {
            "question": "How does Garbage Collection work in Java?",
            "difficulty": "medium",
            "weak_followup": "What does it mean when we say an object is 'eligible for garbage collection'?",
            "strong_followup": "Compare the G1GC and ZGC collectors in Java 17. In what production scenarios would you tune GC parameters, and what metrics would you monitor?"
        },
        {
            "question": "Explain the concept of Multi-threading in Java.",
            "difficulty": "hard",
            "weak_followup": "What is a Thread and how do you create one in Java?",
            "strong_followup": "Explain the Java Memory Model and how happens-before relationships affect visibility of shared state across threads. How does this relate to the volatile keyword?"
        },
    ],
    "Javascript": [
        {
            "question": "Explain closures in JavaScript and provide an example.",
            "difficulty": "medium",
            "weak_followup": "What does it mean for a function to have access to its outer scope?",
            "strong_followup": "How do closures relate to the module pattern and IIFE? How would you use closures to implement private state in JavaScript without using classes?"
        },
        {
            "question": "What is the event loop and how does it handle asynchronous code?",
            "difficulty": "hard",
            "weak_followup": "What is the difference between synchronous and asynchronous code in JavaScript?",
            "strong_followup": "Explain the difference between the microtask queue and the macrotask queue. What is the execution order of Promises, setTimeout, and queueMicrotask?"
        },
        {
            "question": "What are Promises and how do they differ from callbacks?",
            "difficulty": "medium",
            "weak_followup": "What problem do Promises solve compared to plain callbacks?",
            "strong_followup": "Compare Promise.all, Promise.allSettled, Promise.race, and Promise.any. When would you use each, and how do you handle partial failures in a Promise.all chain?"
        },
    ],
    "React": [
        {
            "question": "Explain the virtual DOM and its benefits.",
            "difficulty": "easy",
            "weak_followup": "What is the DOM and why is directly manipulating it slow?",
            "strong_followup": "How does React's reconciliation algorithm (Fiber) decide which nodes to update? What are the performance implications of using keys incorrectly in lists?"
        },
        {
            "question": "What are React Hooks? Can you name some common ones?",
            "difficulty": "easy",
            "weak_followup": "What is the difference between useState and a regular variable in a component?",
            "strong_followup": "When would you create a custom hook vs using useContext directly? Walk me through building a custom hook that fetches data with loading and error states."
        },
        {
            "question": "How do you manage state in a complex React application?",
            "difficulty": "hard",
            "weak_followup": "What is prop drilling and why is it a problem?",
            "strong_followup": "Compare Zustand, Redux Toolkit, and React Query for state management. How would you decide which to use for a large-scale production app with real-time data needs?"
        },
        {
            "question": "What is reconciliation in React?",
            "difficulty": "hard",
            "weak_followup": "How does React know what changed between renders?",
            "strong_followup": "Explain how React.memo, useMemo, and useCallback prevent unnecessary reconciliation. When does memoization actually hurt performance?"
        },
    ],
    "Machine learning": [
        {
            "question": "What is overfitting, and how do you prevent it?",
            "difficulty": "easy",
            "weak_followup": "What does it mean when a model performs well on training data but poorly on test data?",
            "strong_followup": "Compare L1 and L2 regularization mathematically. How does L1 produce sparse weights and when would you prefer it over L2 in a production ML pipeline?"
        },
        {
            "question": "Can you explain the difference between supervised and unsupervised learning?",
            "difficulty": "easy",
            "weak_followup": "Can you give me a real-world example of a supervised learning problem?",
            "strong_followup": "How would you apply semi-supervised learning when you have 100 labeled samples and 100,000 unlabeled samples? What algorithms would you consider and what metrics would you track?"
        },
        {
            "question": "Describe a precision vs. recall tradeoff in a classification model.",
            "difficulty": "medium",
            "weak_followup": "What is a false positive and a false negative in a medical diagnosis context?",
            "strong_followup": "How would you set the classification threshold for a cancer detection model vs a spam filter? Walk me through the ROC-AUC vs PR-AUC choice and why it matters for imbalanced datasets."
        },
        {
            "question": "Explain the concept of cross-validation.",
            "difficulty": "medium",
            "weak_followup": "Why can't we just evaluate a model on the same data we trained it on?",
            "strong_followup": "Compare k-fold CV, stratified k-fold, and time-series cross-validation. When does nested cross-validation become necessary and what problem does it solve?"
        },
        {
            "question": "What is the attention mechanism in transformer models?",
            "difficulty": "hard",
            "weak_followup": "Have you heard of BERT or GPT? What problem were they designed to solve?",
            "strong_followup": "Explain multi-head self-attention mathematically. How do Query, Key, and Value matrices relate, and how does scaled dot-product attention prevent gradient vanishing?"
        },
    ],
    "Fastapi": [
        {
            "question": "What makes FastAPI faster than other Python frameworks like Flask?",
            "difficulty": "medium",
            "weak_followup": "What is ASGI and how is it different from WSGI?",
            "strong_followup": "How would you design a FastAPI app to handle 10,000 concurrent WebSocket connections? What would be your approach to async task management and connection pooling?"
        },
        {
            "question": "How does FastAPI handle asynchronous requests?",
            "difficulty": "medium",
            "weak_followup": "What is the difference between async def and def in a FastAPI route?",
            "strong_followup": "How do you handle CPU-bound tasks in FastAPI without blocking the event loop? Compare running tasks with asyncio.run_in_executor vs using a task queue like Celery."
        },
        {
            "question": "Explain dependency injection as implemented in FastAPI.",
            "difficulty": "hard",
            "weak_followup": "What is the Depends() function in FastAPI and when would you use it?",
            "strong_followup": "How would you design a dependency injection system for database session management with connection pooling, ensuring sessions are properly closed even on exceptions?"
        },
    ],
    "Docker": [
        {
            "question": "Explain the difference between a Docker image and a Docker container.",
            "difficulty": "easy",
            "weak_followup": "How do you run a Docker image to create a container?",
            "strong_followup": "Explain Docker's layered filesystem and how copy-on-write works. How do you optimize a Dockerfile to minimize image size and maximize layer caching?"
        },
        {
            "question": "What are the main advantages of using Docker for deployment?",
            "difficulty": "easy",
            "weak_followup": "What problem does Docker solve that didn't exist before containers?",
            "strong_followup": "Compare Docker Swarm and Kubernetes for orchestration. In what scenarios would you choose one over the other for a microservices architecture at scale?"
        },
        {
            "question": "How do you network multiple containers together using Docker Compose?",
            "difficulty": "medium",
            "weak_followup": "How does service discovery work in Docker Compose?",
            "strong_followup": "How would you secure inter-container communication in Docker Compose? Explain network isolation, secrets management, and how you'd handle production environment variables."
        },
    ],
    "Git": [
        {
            "question": "What is the difference between git fetch and git pull?",
            "difficulty": "easy",
            "weak_followup": "What happens to your local branch when you run git pull?",
            "strong_followup": "Explain how you would set up a team Git workflow with branch protection, PR reviews, and automated CI gates. How do you handle hotfixes during an active sprint?"
        },
        {
            "question": "How do you resolve a merge conflict?",
            "difficulty": "medium",
            "weak_followup": "What causes a merge conflict to happen?",
            "strong_followup": "When would you use git rerere for repeated merge conflict resolution? How do you prevent conflicts proactively through branching strategy and team conventions?"
        },
    ],
    "Sql": [
        {
            "question": "What is the difference between INNER JOIN and LEFT JOIN?",
            "difficulty": "easy",
            "weak_followup": "Can you draw a Venn diagram of what rows INNER JOIN would return?",
            "strong_followup": "How do you optimize a query with multiple JOINs on a 50M row table? Walk me through EXPLAIN plan analysis and index strategy."
        },
        {
            "question": "Explain the concept of database normalization.",
            "difficulty": "medium",
            "weak_followup": "What problem does normalization solve?",
            "strong_followup": "When would you deliberately denormalize a database? Compare OLTP and OLAP schemas and explain why star schema is preferred for analytical workloads."
        },
    ],
    "General": [
        {
            "question": "Tell me about a complex technical challenge you solved and how you approached it.",
            "difficulty": "medium",
            "weak_followup": "Can you describe a specific bug or problem you fixed recently?",
            "strong_followup": "How did you measure the impact of your solution? What would you do differently if you faced the same problem today with your current knowledge?"
        },
        {
            "question": "How do you approach learning a new technology or framework?",
            "difficulty": "easy",
            "weak_followup": "Can you name a technology you learned recently?",
            "strong_followup": "Describe a time you had to rapidly learn and apply a new technology under deadline pressure. How do you evaluate when you know enough to be production-ready?"
        },
    ]
}

GENERAL_HR_QUESTIONS = [
    {
        "question": "Tell me about yourself and your technical background.",
        "difficulty": "easy",
        "weak_followup": "What technology are you most comfortable with and why?",
        "strong_followup": "How have your past projects specifically prepared you for the technical challenges of this role?"
    },
    {
        "question": "Where do you see yourself in 5 years technically?",
        "difficulty": "easy",
        "weak_followup": "What skills are you currently working to improve?",
        "strong_followup": "How do you plan to stay current with the rapid pace of technological change? Give me a concrete example of how you've done this recently."
    },
    {
        "question": "Describe a time you disagreed with a technical decision and how you handled it.",
        "difficulty": "medium",
        "weak_followup": "Have you ever had a disagreement with a colleague about how to solve a problem?",
        "strong_followup": "How do you build consensus in a team with strong technical opinions? What is your framework for evaluating competing technical approaches objectively?"
    },
    {
        "question": "What are your greatest technical strengths and one area you're actively improving?",
        "difficulty": "easy",
        "weak_followup": "What do you consider yourself best at technically?",
        "strong_followup": "How do you measure improvement in technical skills? Give me a specific example of how you identified and addressed a technical weakness."
    },
]


def generate_questions(skills: list) -> dict:
    """
    Generates a structured interview question set based on extracted skills.
    Returns questions with difficulty levels and follow-up metadata.
    """
    technical_questions = []

    for skill in skills:
        matched_skill = next(
            (k for k in SKILL_QUESTIONS_DB.keys() if k.lower() == skill.lower()), None
        )
        if matched_skill:
            pool = SKILL_QUESTIONS_DB[matched_skill]
            selected = random.sample(pool, min(2, len(pool)))
            for q in selected:
                technical_questions.append({
                    "skill": matched_skill,
                    **q
                })

    # Fallback for unmatched skills
    if not technical_questions:
        general_pool = SKILL_QUESTIONS_DB.get("General", [])
        for q in general_pool[:2]:
            technical_questions.append({"skill": "General", **q})

    random.shuffle(technical_questions)
    technical_questions = technical_questions[:5]

    # Select 2 HR questions
    hr_questions = random.sample(GENERAL_HR_QUESTIONS, min(2, len(GENERAL_HR_QUESTIONS)))

    return {
        "hr_questions": hr_questions,
        "technical_questions": technical_questions,
    }


def is_semantically_similar(new_question: str, asked_questions: list, threshold: float = 0.75) -> bool:
    """
    Checks if a newly generated question is semantically similar to any previously asked questions
    using Sentence-BERT vector embeddings.
    """
    if not new_question or not asked_questions:
        return False

    try:
        try:
            from rag.embeddings import RAGEmbeddings
        except ImportError:
            from backend.rag.embeddings import RAGEmbeddings

        embedder = RAGEmbeddings()
        new_vec = embedder.embed_query(new_question.strip())
        if new_vec.shape[0] == 0:
            return False

        for past_q in asked_questions:
            if not past_q or not past_q.strip():
                continue
            # Exact string check
            if new_question.strip().lower() == past_q.strip().lower():
                return True

            past_vec = embedder.embed_query(past_q.strip())
            sim = float(np.dot(new_vec[0], past_vec[0]))
            if sim >= threshold:
                print(f"[RAG Deduplication] Rejected question due to high similarity ({sim:.3f}): '{new_question[:60]}...' vs '{past_q[:60]}...'")
                return True
    except Exception as e:
        print(f"[RAG Deduplication] Warning during similarity check: {e}")
        # Fallback to simple string check
        for past_q in asked_questions:
            if new_question.strip().lower() == past_q.strip().lower():
                return True

    return False


def validate_question_grounding(question_text: str, context_text: str, threshold: float = 0.35) -> tuple[bool, float]:
    """
    Validates whether a generated question is semantically grounded in the retrieved context using Sentence-BERT embeddings.
    Returns (is_grounded: bool, score: float).
    """
    if not question_text or not context_text:
        return True, 0.50

    try:
        try:
            from rag.embeddings import RAGEmbeddings
        except ImportError:
            from backend.rag.embeddings import RAGEmbeddings

        embedder = RAGEmbeddings()
        q_vec = embedder.embed_query(question_text.strip())
        ctx_vec = embedder.embed_query(context_text.strip()[:1000])

        sim = float(np.dot(q_vec[0], ctx_vec[0]))
        score = round(max(0.0, min(1.0, sim)), 4)
        is_grounded = score >= threshold
        return is_grounded, score
    except Exception as e:
        print(f"[RAG Grounding Validation] Warning: {e}")
        return True, 0.50


def generate_rag_grounded_question(
    role: str,
    skills: list = None,
    topic: str = None,
    difficulty: str = "medium",
    interview_type: str = "technical",
    persona: str = "friendly",
    resume_text: str = None,
    asked_questions: list = None,
    previous_performance: dict = None,
    gemini_client = None,
    return_full_metadata: bool = False
):
    """
    Generates an interview question grounded in RAG retrieved technical knowledge chunks.
    Supports candidate-aware retrieval, question types (conceptual, practical, scenario, debugging, architecture, resume-specific, follow-up),
    semantic deduplication, and grounding validation score calculation.
    """
    t_start = time.time()
    asked_list = list(asked_questions) if asked_questions else []
    skills_list = skills or []
    target_topic = topic or (skills_list[0] if skills_list else role)

    evidence_ids = []
    retrieval_scores = []
    context_text = ""
    retrievals = []
    diagnostics = None
    fallback_used = False
    
    t_retrieval_start = time.time()

    # 1. Candidate-Aware RAG Retrieval & Reranking
    try:
        try:
            from rag import get_rag_service
        except ImportError:
            from backend.rag import get_rag_service

        rag_service = get_rag_service()
        retrievals, diagnostics = rag_service.retrieve_with_diagnostics(
            query=f"{interview_type} concepts for {target_topic}",
            domain=target_topic.lower() if target_topic else role.lower(),
            topic=target_topic,
            difficulty=difficulty,
            skills=skills_list,
            target_role=role,
            interview_type=interview_type,
            previous_questions=asked_list,
            previous_performance=previous_performance,
            top_k=5
        )

        if retrievals:
            context_text = rag_service.build_context_prompt(retrievals)
            for res in retrievals:
                meta = getattr(res, "metadata", {})
                c_id = meta.get("chunk_id") or meta.get("metadata", {}).get("chunk_id") or "chunk_unknown"
                score = getattr(res, "rerank_score", getattr(res, "score", 0.0))
                evidence_ids.append(c_id)
                retrieval_scores.append(round(score, 4))
    except Exception as e:
        print(f"[RAG Grounding] Warning: Retrieval failed or unavailable: {e}")

    t_retrieval_end = time.time()

    # 2. RAG Grounded Generation with Gemini
    q_text = None
    grounding_score = 0.50
    t_gen_start = time.time()

    if gemini_client and context_text:
        skills_str = ", ".join(skills_list) if skills_list else "general technical skills"
        prompt = f"""SYSTEM INSTRUCTIONS:
You are an expert technical interviewer ({persona} persona) interviewing a candidate for the role of '{role}'.

CANDIDATE & INTERVIEW CONTEXT:
Target Role: {role}
Interview Category / Question Type: {interview_type.upper()} (conceptual, practical, scenario, debugging, architecture, resume-specific, follow-up)
Target Topic: {target_topic}
Target Difficulty: {difficulty}
Candidate Skills: {skills_str}
Resume Profile: {(resume_text or '')[:1000]}

RETRIEVED TECHNICAL KNOWLEDGE BASE CONTEXT:
{context_text}

TASK & GENERATION REQUIREMENTS:
1. Use the RETRIEVED TECHNICAL KNOWLEDGE BASE CONTEXT above as your primary technical grounding for the question.
2. Formulate one clear, high-quality, {interview_type} interview question matching the requested difficulty ({difficulty}).
3. Do NOT invent unsupported technical facts outside of the retrieved domain context.
4. Do NOT copy the document verbatim or expose internal RAG metadata/source tags to the candidate.
5. Do NOT repeat any previously asked questions: {asked_list[:5]}
6. Return ONLY the raw question text without greetings, markdown formatting, quotes, or meta-commentary.
"""
        def _call_gemini():
            return gemini_client.generate_content(prompt)

        for attempt in range(2):
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            try:
                # Add strict 12-second timeout per attempt to prevent hanging
                future = executor.submit(_call_gemini)
                response = future.result(timeout=12)

                cand_text = response.text.strip().strip('"').strip("'")

                if len(cand_text) > 15:
                    if is_semantically_similar(cand_text, asked_list):
                        print(f"[RAG Generation] Attempt {attempt+1}: Question was semantically duplicate. Regenerating...")
                        continue

                    # Lightweight deterministic validation instead of a second heavy LLM call
                    is_grounded, g_score = validate_question_grounding(cand_text, context_text)
                    grounding_score = g_score
                    if not is_grounded and attempt == 0:
                        print(f"[RAG Generation] Question grounding low ({g_score:.3f}). Retrying generation...")
                        continue

                    q_text = cand_text
                    break
            except concurrent.futures.TimeoutError:
                print(f"[RAG Generation] Attempt {attempt+1}: Timeout exceeded (12s).")
            except Exception as e:
                print(f"[RAG Generation] Error generating Gemini question: {e}")
            finally:
                executor.shutdown(wait=False, cancel_futures=True)

    t_gen_end = time.time()

    # 3. Formulate Fallback Question if RAG/Gemini was unavailable or generated empty
    if not q_text:
        fallback_used = True
        q_text = None
        
        # Try to pull a deterministic question from SKILL_QUESTIONS_DB based on topic
        if target_topic:
            matched_skill = next((k for k in SKILL_QUESTIONS_DB.keys() if k.lower() == target_topic.lower()), None)
            if matched_skill:
                pool = SKILL_QUESTIONS_DB[matched_skill]
                # Filter by difficulty if possible, else take any
                diff_pool = [q for q in pool if q.get("difficulty") == difficulty.lower()]
                if not diff_pool:
                    diff_pool = pool
                
                # Pick one not in asked_list
                for q in diff_pool:
                    if q["question"] not in asked_list:
                        q_text = q["question"]
                        break

        # Ultimate fallback
        if not q_text:
            q_text = f"Can you explain key practical principles of {target_topic} in the context of building a {role} system?"
            
        print(f"[QUESTION_GENERATION] generation_failed=true error='Model failed or timed out' fallback=true")

    t_end = time.time()
    
    # Timing Logs
    print(f"[INTERVIEW TIMING] topic_selection: {int((t_retrieval_start - t_start)*1000)} ms | "
          f"rag_retrieval: {int((t_retrieval_end - t_retrieval_start)*1000)} ms | "
          f"question_generation: {int((t_gen_end - t_gen_start)*1000)} ms | "
          f"total: {int((t_end - t_start)*1000)} ms | "
          f"fallback={str(fallback_used).lower()}")

    if return_full_metadata:
        return {
            "question": q_text,
            "topic": target_topic,
            "difficulty": difficulty,
            "question_type": interview_type,
            "evidence_ids": evidence_ids,
            "retrieval_scores": retrieval_scores,
            "grounding_score": grounding_score
        }

    return q_text


