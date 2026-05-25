import random

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
