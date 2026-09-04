from typing import List, Optional, Dict, Any
from .embeddings import RAGEmbeddings
from .vector_store import FAISSVectorStore
from .schemas import RetrievalResult
from .config import RAG_TOP_K, RAG_SIMILARITY_THRESHOLD

class RAGRetriever:
    def __init__(self, vector_store: FAISSVectorStore, embeddings: RAGEmbeddings):
        self.vector_store = vector_store
        self.embeddings = embeddings

    def _matches_filters(self, metadata: Dict[str, Any], domain: Optional[str], topic: Optional[str], difficulty: Optional[str]) -> bool:
        """Verifies if chunk metadata satisfies non-null filter criteria."""
        chunk_meta = metadata.get("metadata", metadata)

        if domain:
            c_domain = str(chunk_meta.get("domain", "")).lower().strip()
            if c_domain != domain.lower().strip() and c_domain != "general":
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
        query: str,
        domain: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        top_k: int = RAG_TOP_K,
        similarity_threshold: float = RAG_SIMILARITY_THRESHOLD
    ) -> List[RetrievalResult]:
        """Retrieves relevant chunks given a query and optional metadata filters."""
        if not self.vector_store.is_available():
            return []

        if not query or not query.strip():
            return []

        query_vector = self.embeddings.embed_query(query)
        # Fetch candidate pool for filtering
        candidate_pool = self.vector_store.search(query_vector, top_k=max(top_k * 4, 20))

        filtered_results = []
        unfiltered_results = []

        for score, chunk_dict in candidate_pool:
            if score < similarity_threshold:
                continue

            res = RetrievalResult(
                content=chunk_dict.get("content", ""),
                score=score,
                metadata=chunk_dict.get("metadata", {})
            )
            unfiltered_results.append(res)

            if self._matches_filters(chunk_dict, domain, topic, difficulty):
                filtered_results.append(res)

        # Graceful fallback: If metadata filtering returns nothing, fall back to top semantic matches
        final_list = filtered_results if filtered_results else unfiltered_results
        return final_list[:top_k]
