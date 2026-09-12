from typing import List, Optional, Any
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from pydantic import PrivateAttr
import logging

from rag.rag_service import get_rag_service

logger = logging.getLogger(__name__)

class CareerIntelligenceRetriever(BaseRetriever):
    """
    LangChain adapter for the custom FAISS/Sentence-BERT RAG implementation.
    This safely bridges the LangGraph/LangChain workflow with the project's
    existing highly tuned retrieval and fallback logic.
    """
    
    _rag_service: Any = PrivateAttr()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._rag_service = get_rag_service()

    def _get_relevant_documents(
        self, query: str, *, run_manager=None
    ) -> List[Document]:
        """
        Executes the underlying RAG Service retrieval.
        Maps native `RerankedResult` to LangChain `Document`.
        """
        try:
            # We use retrieve_with_self_check to take advantage of the 
            # built-in fallback and quality thresholds defined in rag_service.
            results, diagnostics = self._rag_service.retrieve_with_self_check(
                query=query,
                top_k=5,
                min_quality_threshold=0.35
            )
            
            documents = []
            for res in results:
                # Merge native fields and metadata into the LangChain metadata dict
                metadata = res.metadata.copy() if res.metadata else {}
                metadata["score"] = getattr(res, "rerank_score", getattr(res, "score", 0.0))
                
                doc = Document(
                    page_content=res.content,
                    metadata=metadata
                )
                documents.append(doc)
            
            return documents
        except Exception as e:
            logger.error(f"[CareerIntelligenceRetriever] Retrieval failed: {e}")
            return []
