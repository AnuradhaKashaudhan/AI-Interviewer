from langchain_core.prompts import ChatPromptTemplate

EXTRACT_COMPONENTS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert System Design Interviewer.
Your task is to break down the candidate's raw system design answer into specific architectural dimensions.
Do NOT evaluate the answer or generate feedback yet. ONLY extract the parts of the answer that correspond to each dimension.
If a dimension is not explicitly mentioned, output "Not mentioned by the candidate."

Scenario:
{problem_statement}

Requirements:
{requirements}
"""),
    ("user", "Candidate Response: {candidate_response}")
])

GENERATE_FEEDBACK_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a Principal Engineer evaluating a System Design Interview.
You have the deterministic ML-RAG evaluation results for each dimension of the candidate's design.
Synthesize these results into a highly constructive, professional, and actionable feedback report.

Scenario: {problem_statement}

Dimensions evaluated:
{dimension_evaluations}

Your feedback should include:
- What the candidate did well (based on the strengths in the eval data)
- Missing Concepts (based directly on the missing_concepts in the eval data)
- Technical Issues (based directly on technical_errors in the eval data)
- Improvement suggestions
- Overall confidence in the evaluation

Do not fabricate any concepts or errors that are not present in the provided evaluation data.
"""),
    ("user", "Please generate the final system design feedback payload.")
])
