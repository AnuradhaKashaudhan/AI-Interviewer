from typing import List, Optional, Dict, Any, Tuple
from .embeddings import RAGEmbeddings
from .vector_store import FAISSVectorStore
from .reranker import RAGReranker
from .schemas import RetrievalResult, RerankedResult, RetrievalDiagnostics
from .config import RAG_TOP_K, RAG_SIMILARITY_THRESHOLD

class RAGRetriever:
    """Metadata-aware intelligent retriever with dynamic semantic query construction and fallback."""

    def __init__(self, vector_store: FAISSVectorStore, embeddings: RAGEmbeddings, reranker: Optional[RAGReranker] = None):
        self.vector_store = vector_store
        self.embeddings = embeddings
        self.reranker = reranker or RAGReranker()

    def construct_query(
        self,
        query: Optional[str] = None,
        skills: Optional[List[str]] = None,
        target_role: Optional[str] = None,
        interview_type: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        current_question: Optional[str] = None,
        previous_questions: Optional[List[str]] = None,
        previous_performance: Optional[Dict[str, Any]] = None,
        candidate_answer: Optional[str] = None
    ) -> str:
        """Constructs a rich dynamic semantic query from interview context."""
        parts = []

        if query and query.strip():
            parts.append(query.strip())

        if target_role:
            parts.append(f"Role: {target_role}")

        if topic:
            parts.append(f"Topic: {topic}")

        if skills:
            clean_skills = [s.strip() for s in skills if s and s.strip()]
            if clean_skills:
                parts.append(f"Skills: {', '.join(clean_skills[:5])}")

        if current_question and current_question.strip():
            parts.append(f"Question: {current_question.strip()}")

        if candidate_answer and candidate_answer.strip():
            parts.append(f"Answer Context: {candidate_answer.strip()[:200]}")

        if previous_performance:
            perf_notes = []
            if isinstance(previous_performance, dict):
                quality = previous_performance.get("answer_quality")
                weaknesses = previous_performance.get("weaknesses", [])
                if quality:
                    perf_notes.append(f"Performance Quality: {quality}")
                if weaknesses:
                    perf_notes.append(f"Focus Gaps: {', '.join(weaknesses[:2])}")
            if perf_notes:
                parts.append(" | ".join(perf_notes))

        if not parts:
            return "Technical interview concepts and foundational domain knowledge"

        return " - ".join(parts)

    def _matches_filters(self, metadata: Dict[str, Any], domain: Optional[str], topic: Optional[str], difficulty: Optional[str]) -> bool:
        """Verifies if chunk metadata satisfies non-null filter criteria."""
        chunk_meta = metadata.get("metadata", metadata)

        if domain:
            c_domain = str(chunk_meta.get("domain", "")).lower().strip()
            req_domain = domain.lower().strip()
            if c_domain != req_domain and c_domain != "general" and req_domain not in c_domain:
                return False

        if topic:
            c_topic = str(chunk_meta.get("topic", "")).lower().strip()
            req_topic = topic.lower().strip()
            if c_topic and req_topic and (req_topic not in c_topic and c_topic not in req_topic):
                return False

        if difficulty:
            c_diff = str(chunk_meta.get("difficulty", "")).lower().strip()
            if c_diff and c_diff != difficulty.lower().strip():
                return False

        return True

    def retrieve(
        self,
        query: Optional[str] = None,
        domain: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        skills: Optional[List[str]] = None,
        target_role: Optional[str] = None,
        interview_type: Optional[str] = None,
        current_question: Optional[str] = None,
        previous_questions: Optional[List[str]] = None,
        previous_performance: Optional[Dict[str, Any]] = None,
        candidate_answer: Optional[str] = None,
        top_k: int = RAG_TOP_K,
        similarity_threshold: float = RAG_SIMILARITY_THRESHOLD
    ) -> Tuple[List[RerankedResult], RetrievalDiagnostics]:
        """Performs metadata-aware semantic retrieval, fallback, and lightweight reranking."""
        empty_diag = RetrievalDiagnostics(
            query=query or "",
            retrieved_chunks=[],
            scores=[],
            filters_applied={"domain": domain, "topic": topic, "difficulty": difficulty},
            fallback_used=False
        )

        if not self.vector_store.is_available():
            return [], empty_diag

        constructed_query = self.construct_query(
            query=query,
            skills=skills,
            target_role=target_role,
            interview_type=interview_type,
            topic=topic,
            difficulty=difficulty,
            current_question=current_question,
            previous_questions=previous_questions,
            previous_performance=previous_performance,
            candidate_answer=candidate_answer
        )

        query_vector = self.embeddings.embed_query(constructed_query)
        candidate_pool = self.vector_store.search(query_vector, top_k=max(top_k * 4, 20))

        filtered_results: List[RetrievalResult] = []
        unfiltered_results: List[RetrievalResult] = []

        for score, chunk_dict in candidate_pool:
            res = RetrievalResult(
                content=chunk_dict.get("content", ""),
                score=score,
                metadata=chunk_dict.get("metadata", {})
            )
            if score >= similarity_threshold:
                unfiltered_results.append(res)
                if self._matches_filters(chunk_dict, domain, topic, difficulty):
                    filtered_results.append(res)

        fallback_used = False
        if filtered_results:
            selected_candidates = filtered_results
        else:
            selected_candidates = unfiltered_results if unfiltered_results else [
                RetrievalResult(content=c.get("content", ""), score=s, metadata=c.get("metadata", {}))
                for s, c in candidate_pool[:top_k]
            ]
            if domain or topic or difficulty:
                fallback_used = True

        reranked = self.reranker.rerank(
            retrieved=selected_candidates,
            query=constructed_query,
            domain=domain,
            topic=topic,
            difficulty=difficulty,
            top_k=top_k
        )

        filters_applied = {
            k: v for k, v in {"domain": domain, "topic": topic, "difficulty": difficulty}.items() if v is not None
        }

        diagnostics = self.reranker.build_diagnostics(
            query=constructed_query,
            reranked_results=reranked,
            filters_applied=filters_applied,
            fallback_used=fallback_used
        )

        return reranked, diagnostics
