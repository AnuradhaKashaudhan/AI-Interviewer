from langchain_core.prompts import ChatPromptTemplate

# ---------------------------------------------------------------------------
# Skill Gap Analysis Prompt
# ---------------------------------------------------------------------------
SKILL_GAP_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are an expert technical recruiter and career coach.
Analyze the candidate's current skills against the target role.

Target Role: {target_role}

Candidate's Current Skills:
{current_skills}

Instructions:
1. Identify up to 5 critical skill gaps where the candidate's current level is below what is typically required for the Target Role.
2. If the candidate has no data, base the gaps on the most essential requirements for the Target Role.
3. Classify the candidate's current level as 'Strong', 'Developing', 'Weak', or 'Unknown'.
4. Classify the importance for the role as 'High', 'Medium', or 'Low'.
5. Classify the gap severity as 'High', 'Medium', or 'Low'.

Return the result as a structured list of gaps.
""")
])

# ---------------------------------------------------------------------------
# Career Insights Generation Prompt
# ---------------------------------------------------------------------------
CAREER_INSIGHTS_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are an expert AI Career Intelligence Agent.
Generate a structured career insights report for the candidate.

Target Role: {target_role}
Candidate Strengths: {strengths}
Candidate Gaps: {gaps}

RAG Evidence / Knowledge Context:
{evidence}

Instructions:
1. Generate an overall career readiness string ("Strong", "Developing", or "Needs Improvement").
2. Write a professional, encouraging observation paragraph summarizing their readiness.
3. List 3-4 top role priorities based on the target role and identified gaps.
4. Identify 2-3 important ATS/resume improvements based on the identified gaps.
5. Ground any technical observations in the provided RAG Evidence where applicable.
6. Do not invent candidate skills that are not listed.

Return the result strictly as a structured output matching the requested schema.
""")
])

# ---------------------------------------------------------------------------
# Recommendations Generation Prompt
# ---------------------------------------------------------------------------
RECOMMENDATIONS_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are an expert AI Career Coach.
Generate actionable, prioritized recommendations based on the candidate's skill gaps and retrieved technical knowledge.

Target Role: {target_role}
Candidate Gaps: {gaps}

RAG Evidence / Knowledge Context:
{evidence}

Instructions:
1. Generate a prioritized list of actionable steps (Priority 1, 2, 3, etc.). Focus strictly on the identified skill gaps.
2. For technical skills, incorporate concepts from the provided RAG Evidence to explain *why* the skill matters and *how* to practice it.
3. Generate a structured career roadmap (immediate, short_term, long_term) aligning with the recommended skills.
4. If no evidence was provided, provide general best-practice advice but note that it is general.
5. Do not fabricate candidate weaknesses.

Return the result strictly as a structured output containing recommendations and roadmap matching the schema.
""")
])

# ---------------------------------------------------------------------------
# Advanced Prompts
# ---------------------------------------------------------------------------
ADVANCED_RESUME_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are an expert technical recruiter. Analyze the candidate's Resume against the Target Role.
Target Role: {target_role}
Resume Data: {resume_data}
Identify the core skills, key projects, and note any important missing evidence or keyword gaps.
""")
])

ADVANCED_ATS_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are an expert ATS specialist. Analyze the existing ATS data against the Target Role.
Target Role: {target_role}
ATS Data: {ats_data}
Identify ATS strengths, missing keywords, and high-impact improvements.
""")
])

ADVANCED_CODING_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are an Engineering Manager. Analyze the candidate's Coding Profile data.
Target Role: {target_role}
Coding Data: {coding_data}
Identify coding activity patterns, problem-solving performance, and demonstrated skill areas.
""")
])

ADVANCED_INTERVIEW_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are a Principal Engineer. Analyze the candidate's Mock Interview evaluation.
Target Role: {target_role}
Interview Data: {interview_data}
Identify technical accuracy, concept coverage, technical errors, and recurring weaknesses.
""")
])

ADVANCED_CROSS_FEATURE_GAP_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are an AI Career Strategist. Compare signals across different data sources to identify Cross-Feature Gaps.
Target Role: {target_role}
Resume Analysis: {resume_analysis}
ATS Analysis: {ats_analysis}
Coding Analysis: {coding_analysis}
Interview Analysis: {interview_analysis}

Instructions:
1. Look for discrepancies (e.g., Resume says 'Python Strong', but Interview shows 'Python Weak').
2. Identify skills missing entirely across all available sources.
3. Classify the priority as 'Critical', 'High', 'Medium', or 'Low'.
4. Return a structured list of these cross-feature gaps, specifying which sources were compared.
""")
])

ADVANCED_CAREER_STRATEGY_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are a Staff-level Career Agent. Generate a definitive Career Strategy.
Target Role: {target_role}
Merged Analysis & Cross-Feature Gaps: {gaps}
RAG Evidence: {evidence}

Instructions:
1. Generate top strengths and biggest risks.
2. Identify the highest impact skill gaps.
3. Evaluate overall role readiness ("Strong", "Developing", "Needs Improvement").
4. Provide a focused recommendation summary (recommended_focus).
5. Ground conclusions using the provided RAG Evidence where applicable.
""")
])

ADVANCED_ROADMAP_PROMPT = ChatPromptTemplate.from_messages([
    ("user", """You are a Technical Mentor. Generate an actionable 90-day Career Roadmap.
Target Role: {target_role}
Strategy & Gaps: {strategy}
RAG Evidence: {evidence}

Instructions:
1. Generate Immediate (7-day), Short Term (30-day), Long Term (60-day), and Ninety Day (90-day) goals.
2. Ensure steps directly address the highest impact skill gaps and cross-feature discrepancies.
3. Incorporate RAG Evidence best practices to explain how to practice.
""")
])
