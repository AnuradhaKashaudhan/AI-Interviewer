# Career Intelligence Architecture — Part 1

## Overview

The AI Career Intelligence module provides an orchestrated, agentic workflow for analyzing a candidate's readiness for a specific target role. It leverages **LangGraph** for reliable multi-step orchestration and state management, **LangChain** for structured LLM generation and RAG retrieval, and safely integrates with the project's existing custom **FAISS / Sentence-BERT ML-RAG** implementation.

---

## 1. Responsibilities & Separation of Concerns

To maintain an un-tangled, scalable architecture, responsibilities are strictly divided:

### LangGraph (Orchestration Layer)
- Defines the `CareerIntelligenceState`.
- Manages the execution workflow and Node sequence.
- Implements conditional routing (e.g., `should_retrieve_knowledge` to skip RAG on lower tiers).
- Implements cyclic validation loops (e.g., retrying generation if output validation fails).

### LangChain (Retrieval & Generation Layer)
- Maps the native FAISS retrieval into a standardized `BaseRetriever` adapter (`CareerIntelligenceRetriever`).
- Uses `ChatPromptTemplate` for robust prompt construction.
- Uses `.with_structured_output()` to guarantee Pydantic schemas (e.g., `CareerInsights`, `RecommendationAction`).
- Abstracts the underlying LLM calls (`ChatOpenAI`).

### Existing ML / RAG Layer (Knowledge Foundation)
- **FAISS**: Vector indexing and fast inner-product search (`FAISSVectorStore`).
- **Sentence-BERT**: Lightweight embedding generation (`RAGEmbeddings`).
- **RAGService**: Handles native fallback logic, relevance thresholding, and semantic diagnostics (`retrieve_with_self_check`).

---

## 2. Execution Flow

```text
Candidate Request
       ↓
[Authentication Middleware] 
       ↓
[Entitlement Service Check] (Basic vs Advanced)
       ↓
[LangGraph State Initialization]
       ↓
(1) collect_candidate_data (DB: Resume, ATS, Coding Profiles, Interviews)
       ↓
(2) analyze_existing_skills (Categorizes current strengths/weaknesses)
       ↓
(3) identify_skill_gaps (LLM: Current Skills vs Target Role Requirements)
       ↓
(4) build_rag_queries (Formats dynamic queries based on actual gaps)
       ↓
       ├─ [Condition: Basic Tier?] ───→ (Skip Retrieval)
       │
       └─ [Condition: Advanced Tier?] → (5) retrieve_knowledge 
                                            ↓ 
                                    (CareerIntelligenceRetriever)
                                            ↓
                                    (RAGService.retrieve_with_self_check)
                                            ↓
(6) generate_career_insights (LLM: Synthesizes readiness score & observations)
       ↓
(7) generate_recommendations (LLM: Actionable, prioritized steps)
       ↓
(8) validate_output (Ensures missing data wasn't fabricated and gaps align)
       ↓
       ├─ [Invalid?] → Retry (6) generate_career_insights (Up to 2x)
       │
       └─ [Valid?] ──→ (9) build_final_report (Computes explainable confidence)
       ↓
Final Structured Output (Sent via API)
```

---

## 3. LangGraph Nodes

- **`collect_candidate_data`**: Reads from existing models (`User`, `CodingProfile`, `InterviewSession`). Does not crash if data is missing; simply logs `available_data_sources`.
- **`analyze_existing_skills`**: Derives proven strengths based on recorded technical interview scores and parsed ATS skills.
- **`identify_skill_gaps`**: Uses LangChain to perform a structured gap analysis against the target role.
- **`build_rag_queries`**: Transforms identified high/medium gaps into targeted semantic search queries (e.g., "System Design scalability concepts").
- **`retrieve_knowledge`**: Invokes the `CareerIntelligenceRetriever`. Converts retrieved evidence back into LangGraph State.
- **`generate_career_insights`**: Synthesizes the Candidate Gaps + Retrieved Evidence into a professional readiness report.
- **`generate_recommendations`**: Builds actionable steps directly grounded in the evidence.
- **`validate_output`**: Soft-validator that catches hallucinations or unmatched skill recommendations. Injects error context for retries.
- **`build_final_report`**: Packages the data into a strict schema and calculates an explainable `confidence` metric based on the availability of data and grounding.

---

## 4. State Definition (`CareerIntelligenceState`)

The graph runs on a strictly typed dictionary (`TypedDict`) containing:
- **Inputs**: `candidate_id`, `target_role`, `entitlement_tier`
- **Candidate Data**: `resume_data`, `coding_data`, `interview_data`
- **Analysis**: `skills`, `identified_strengths`, `identified_gaps`
- **Retrieval**: `rag_queries`, `retrieved_evidence`, `knowledge_grounding_available`
- **Generation**: `career_insights`, `recommendations`
- **Validation**: `validation_errors`, `retry_count`, `confidence`, `final_report`

---

## 5. Endpoints & Access Control

**`POST /api/career-intelligence/generate`**
- Verifies JWT token via `get_current_user`.
- Checks `ai_career_intelligence` entitlement flag.
  - If missing/False -> `403 Forbidden` (`UPGRADE_REQUIRED`)
  - If `basic` -> Executes partial graph (skipping expensive retrieval stages to save cost/latency).
  - If `full_agentic_audit` -> Executes full orchestrated multi-stage retrieval graph.

---

## 6. Known Limitations (Part 1)

This foundation establishes the orchestration logic. Part 2 will address:
1. Building out the frontend Dashboard interface to render this structured data cleanly.
2. Expanding the `analyze_existing_skills` node to perform deeper LLM parsing of the raw ATS resume text, rather than just relying on previous interview scores.
3. Enabling System Design Drills (as identified by the career intelligence recommendations).
