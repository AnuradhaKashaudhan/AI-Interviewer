import logging
from typing import List, Optional, Dict, Any, Tuple, Union
from .config import (
    RAG_ENABLED,
    RAG_EMBEDDING_MODEL,
    RAG_VECTOR_STORE,
    RAG_TOP_K,
    RAG_SIMILARITY_THRESHOLD,
    FAISS_INDEX_PATH,
    METADATA_STORE_PATH,
)
from .schemas import RetrievalResult, RerankedResult, RetrievalDiagnostics, RAGHealthSchema
from .embeddings import RAGEmbeddings
from .vector_store import FAISSVectorStore
from .retriever import RAGRetriever
from .reranker import RAGReranker
from .context_builder import ContextBuilder

logger = logging.getLogger("rag_service")

class RAGService:
    _instance = None

    def __init__(self):
        self.enabled = RAG_ENABLED
        self.embeddings = RAGEmbeddings()
        self.vector_store = FAISSVectorStore(index_path=FAISS_INDEX_PATH, metadata_path=METADATA_STORE_PATH)
        self.reranker = RAGReranker()
        self.retriever = RAGRetriever(self.vector_store, self.embeddings, self.reranker)
        self.context_builder = ContextBuilder()

    @classmethod
    def get_instance(cls) -> "RAGService":
        if cls._instance is None:
            cls._instance = RAGService()
        return cls._instance

    def health_check(self) -> RAGHealthSchema:
        """Returns structured health and status dictionary for the RAG system."""
        try:
            loaded = self.vector_store.is_available()
            cnt = self.vector_store.index.ntotal if loaded and self.vector_store.index else 0
            
            domains = set()
            doc_ids = set()
            metadata_avail = False
            
            if loaded and self.vector_store.chunk_metadata:
                metadata_avail = True
                for m in self.vector_store.chunk_metadata:
                    doc_id = m.get("document_id") or m.get("metadata", {}).get("document_id")
                    domain = m.get("domain") or m.get("metadata", {}).get("domain")
                    if doc_id:
                        doc_ids.add(doc_id)
                    if domain:
                        domains.add(domain.lower())

            return RAGHealthSchema(
                enabled=self.enabled,
                vector_store=RAG_VECTOR_STORE,
                embedding_model=RAG_EMBEDDING_MODEL,
                index_loaded=loaded,
                document_count=len(doc_ids),
                chunk_count=cnt,
                metadata_available=metadata_avail,
                domains_supported=sorted(list(domains))
            )
        except Exception as e:
            logger.error(f"[RAGService] Health check error: {e}")
            return RAGHealthSchema(
                enabled=self.enabled,
                vector_store=RAG_VECTOR_STORE,
                embedding_model=RAG_EMBEDDING_MODEL,
                index_loaded=False,
                document_count=0,
                chunk_count=0,
                metadata_available=False,
                domains_supported=[],
                error=str(e)
            )

    def retrieve_context(
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
        top_k: int = RAG_TOP_K
    ) -> List[RerankedResult]:
        """Retrieves top reranked relevant chunks for a given query or context dictionary."""
        if not self.enabled or not self.vector_store.is_available():
            return []

        try:
            results, _ = self.retriever.retrieve(
                query=query,
                domain=domain,
                topic=topic,
                difficulty=difficulty,
                skills=skills,
                target_role=target_role,
                interview_type=interview_type,
                current_question=current_question,
                previous_questions=previous_questions,
                previous_performance=previous_performance,
                candidate_answer=candidate_answer,
                top_k=top_k,
                similarity_threshold=RAG_SIMILARITY_THRESHOLD
            )
            return results
        except Exception as e:
            logger.error(f"[RAGService] Error retrieving context: {e}")
            return []

    def retrieve_with_diagnostics(
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
        top_k: int = RAG_TOP_K
    ) -> Tuple[List[RerankedResult], RetrievalDiagnostics]:
        """Retrieves top reranked chunks along with rich internal diagnostics."""
        if not self.enabled or not self.vector_store.is_available():
            empty_diag = RetrievalDiagnostics(
                query=query or "",
                retrieved_chunks=[],
                scores=[],
                filters_applied={"domain": domain, "topic": topic, "difficulty": difficulty},
                fallback_used=False
            )
            return [], empty_diag

        return self.retriever.retrieve(
            query=query,
            domain=domain,
            topic=topic,
            difficulty=difficulty,
            skills=skills,
            target_role=target_role,
            interview_type=interview_type,
            current_question=current_question,
            previous_questions=previous_questions,
            previous_performance=previous_performance,
            candidate_answer=candidate_answer,
            top_k=top_k,
            similarity_threshold=RAG_SIMILARITY_THRESHOLD
        )

    def retrieve_for_interview(
        self,
        role: str,
        topic: Optional[str] = None,
        skills: Optional[List[str]] = None,
        difficulty: Optional[str] = "medium"
    ) -> List[RerankedResult]:
        """Retrieves technical knowledge context tailored for interview question generation."""
        if not self.enabled or not self.vector_store.is_available():
            return []

        domain_candidate = topic.lower() if topic else role.lower()

        return self.retrieve_context(
            target_role=role,
            topic=topic,
            skills=skills,
            domain=domain_candidate,
            difficulty=difficulty,
            top_k=RAG_TOP_K
        )

    def retrieve_with_self_check(
        self,
        query: Optional[str] = None,
        domain: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        skills: Optional[List[str]] = None,
        target_role: Optional[str] = None,
        top_k: int = RAG_TOP_K,
        min_quality_threshold: float = 0.35,
        max_retries: int = 1
    ) -> Tuple[List[RerankedResult], RetrievalDiagnostics]:
        """
        Executes lightweight RAG grounding self-check. If retrieved evidence quality is low,
        performs a single contextual retry attempt with expanded query terms.
        """
        results, diagnostics = self.retrieve_with_diagnostics(
            query=query,
            domain=domain,
            topic=topic,
            difficulty=difficulty,
            skills=skills,
            target_role=target_role,
            top_k=top_k
        )

        max_score = max([getattr(r, "rerank_score", getattr(r, "score", 0.0)) for r in results]) if results else 0.0

        if (not results or max_score < min_quality_threshold) and max_retries > 0:
            logger.info(f"[RAG Grounding Self-Check] Quality low ({max_score:.3f} < {min_quality_threshold}). Executing 1-retry query...")
            expanded_query = f"{query or ''} {domain or ''} {topic or ''} {' '.join(skills or [])}".strip()
            retry_results, retry_diag = self.retrieve_with_diagnostics(
                query=expanded_query,
                domain=None,  # Broaden domain filter on retry
                topic=None,
                difficulty=difficulty,
                skills=skills,
                target_role=target_role,
                top_k=top_k
            )
            if retry_results:
                retry_diag.fallback_used = True
                return retry_results, retry_diag

        return results, diagnostics

    def build_context_prompt(self, retrievals: List[Union[RetrievalResult, RerankedResult]]) -> str:
        """Formats retrieved chunks into a clean, structured context string for downstream prompts."""
        return self.context_builder.build_context(retrievals)

def get_rag_service() -> RAGService:
    return RAGService.get_instance()
