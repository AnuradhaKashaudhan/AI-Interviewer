import re
from typing import List, Dict, Any, Optional
from .schemas import RetrievalResult, RerankedResult, RetrievalDiagnostics

class RAGReranker:
    """Lightweight, CPU-friendly reranker combining vector similarity with term overlap and metadata relevance."""

    def __init__(self, vector_weight: float = 0.65, keyword_weight: float = 0.25, metadata_weight: float = 0.10):
        self.vector_weight = vector_weight
        self.keyword_weight = keyword_weight
        self.metadata_weight = metadata_weight

    def _extract_query_keywords(self, query: str) -> set:
        """Extracts unique lowercase alphanumeric tokens longer than 2 chars."""
        tokens = re.findall(r"\b[a-zA-Z0-9_\-\+]{3,}\b", query.lower())
        stopwords = {"what", "how", "why", "when", "where", "which", "is", "are", "the", "and", "for", "with", "that", "this", "can", "you", "explain"}
        return set(tokens) - stopwords

    def compute_keyword_score(self, content: str, query_keywords: set) -> float:
        """Computes keyword coverage ratio [0, 1]."""
        if not query_keywords:
            return 0.5
        content_lower = content.lower()
        matched = sum(1 for kw in query_keywords if kw in content_lower)
        return float(matched / len(query_keywords))

    def compute_metadata_score(self, metadata: Dict[str, Any], domain: Optional[str], topic: Optional[str], difficulty: Optional[str]) -> float:
        """Computes metadata match bonus score [0, 1]."""
        score = 0.5
        chunk_meta = metadata.get("metadata", metadata)

        if domain:
            c_domain = str(chunk_meta.get("domain", "")).lower()
            if c_domain == domain.lower():
                score += 0.25

        if topic:
            c_topic = str(chunk_meta.get("topic", "")).lower()
            if topic.lower() in c_topic or c_topic in topic.lower():
                score += 0.15

        if difficulty:
            c_diff = str(chunk_meta.get("difficulty", "")).lower()
            if c_diff == difficulty.lower():
                score += 0.10

        return min(1.0, score)

    def rerank(
        self,
        retrieved: List[RetrievalResult],
        query: str,
        domain: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        top_k: int = 5
    ) -> List[RerankedResult]:
        """Reranks retrieved candidate chunks and returns top_k sorted by rerank_score."""
        if not retrieved:
            return []

        keywords = self._extract_query_keywords(query)
        reranked = []

        for item in retrieved:
            v_score = item.score
            k_score = self.compute_keyword_score(item.content, keywords)
            m_score = self.compute_metadata_score(item.metadata, domain, topic, difficulty)

            final_score = (
                self.vector_weight * v_score +
                self.keyword_weight * k_score +
                self.metadata_weight * m_score
            )
            final_score = round(max(0.0, min(1.0, final_score)), 4)

            reranked.append(
                RerankedResult(
                    content=item.content,
                    original_score=round(v_score, 4),
                    rerank_score=final_score,
                    metadata=item.metadata
                )
            )

        # Sort descending by rerank score
        reranked.sort(key=lambda x: x.rerank_score, reverse=True)
        return reranked[:top_k]

    def build_diagnostics(
        self,
        query: str,
        reranked_results: List[RerankedResult],
        filters_applied: Dict[str, Any],
        fallback_used: bool
    ) -> RetrievalDiagnostics:
        """Constructs diagnostic reporting schema."""
        chunks = [
            {
                "content_snippet": r.content[:150] + ("..." if len(r.content) > 150 else ""),
                "original_score": r.original_score,
                "rerank_score": r.rerank_score,
                "domain": r.metadata.get("domain", "general"),
                "source": r.metadata.get("source", "unknown")
            }
            for r in reranked_results
        ]
        scores = [r.rerank_score for r in reranked_results]

        return RetrievalDiagnostics(
            query=query,
            retrieved_chunks=chunks,
            scores=scores,
            filters_applied=filters_applied,
            fallback_used=fallback_used
        )
