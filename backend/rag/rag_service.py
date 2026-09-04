import logging
from typing import List, Optional, Dict, Any
from .config import (
    RAG_ENABLED,
    RAG_EMBEDDING_MODEL,
    RAG_VECTOR_STORE,
    RAG_TOP_K,
    RAG_SIMILARITY_THRESHOLD,
    FAISS_INDEX_PATH,
    METADATA_STORE_PATH,
)
from .schemas import RetrievalResult, RAGHealthSchema
from .embeddings import RAGEmbeddings
from .vector_store import FAISSVectorStore
from .retriever import RAGRetriever

logger = logging.getLogger("rag_service")

class RAGService:
    _instance = None

    def __init__(self):
        self.enabled = RAG_ENABLED
        self.embeddings = RAGEmbeddings()
        self.vector_store = FAISSVectorStore(index_path=FAISS_INDEX_PATH, metadata_path=METADATA_STORE_PATH)
        self.retriever = RAGRetriever(self.vector_store, self.embeddings)

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
            doc_cnt = len(set(m.get("document_id", "") for m in self.vector_store.chunk_metadata)) if loaded else 0

            return RAGHealthSchema(
                enabled=self.enabled,
                vector_store=RAG_VECTOR_STORE,
                embedding_model=RAG_EMBEDDING_MODEL,
                index_loaded=loaded,
                document_count=doc_cnt,
                chunk_count=cnt
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
                error=str(e)
            )

    def retrieve_context(
        self,
        query: str,
        domain: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        top_k: int = RAG_TOP_K
    ) -> List[RetrievalResult]:
        """Retrieves top relevant chunks for a given query."""
        if not self.enabled or not self.vector_store.is_available():
            return []

        try:
            return self.retriever.retrieve(
                query=query,
                domain=domain,
                topic=topic,
                difficulty=difficulty,
                top_k=top_k,
                similarity_threshold=RAG_SIMILARITY_THRESHOLD
            )
        except Exception as e:
            logger.error(f"[RAGService] Error retrieving context: {e}")
            return []

    def retrieve_for_interview(
        self,
        role: str,
        topic: Optional[str] = None,
        skills: Optional[List[str]] = None,
        difficulty: Optional[str] = "medium"
    ) -> List[RetrievalResult]:
        """Retrieves technical knowledge context tailored for interview question generation."""
        if not self.enabled or not self.vector_store.is_available():
            return []

        skills_text = ", ".join(skills) if skills else ""
        query_parts = [role]
        if topic:
            query_parts.append(topic)
        if skills_text:
            query_parts.append(skills_text)

        query = f"Interview technical concepts for {', '.join(query_parts)}"

        # Infer domain candidate from role / topic
        domain_candidate = topic.lower() if topic else role.lower()

        return self.retrieve_context(
            query=query,
            domain=domain_candidate,
            topic=topic,
            difficulty=difficulty,
            top_k=RAG_TOP_K
        )

    def build_context_prompt(self, retrievals: List[RetrievalResult]) -> str:
        """Formats retrieved chunks into a clean, structured context string for Gemini prompts."""
        if not retrievals:
            return ""

        formatted_sources = []
        for idx, res in enumerate(retrievals, start=1):
            source = res.metadata.get("source", "Technical Note")
            domain = res.metadata.get("domain", "General")
            formatted_sources.append(
                f"[Source {idx} - Domain: {domain} | File: {source}]\n{res.content.strip()}"
            )

        return "\n\n".join(formatted_sources)

def get_rag_service() -> RAGService:
    return RAGService.get_instance()
