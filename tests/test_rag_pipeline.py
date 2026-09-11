import os
import sys
import unittest
import numpy as np
from pathlib import Path
from unittest.mock import MagicMock

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from rag.config import (
    RAG_ENABLED,
    RAG_EMBEDDING_MODEL,
    RAG_CHUNK_SIZE,
    RAG_CHUNK_OVERLAP,
)
from rag.schemas import (
    DocumentMetadata,
    ChunkSchema,
    RetrievalResult,
    RerankedResult,
    RetrievalDiagnostics,
    RAGHealthSchema,
)
from rag.document_loader import DocumentLoader, clean_text
from rag.document_processor import DocumentProcessor
from rag.chunker import TextChunker
from rag.embeddings import RAGEmbeddings
from rag.vector_store import FAISSVectorStore
from rag.indexer import FAISSIndexer
from rag.reranker import RAGReranker
from rag.context_builder import ContextBuilder
from rag.retriever import RAGRetriever
from rag.rag_service import RAGService, get_rag_service
from modules.question_generator import generate_rag_grounded_question

class TestRAGPipeline(unittest.TestCase):

    def setUp(self):
        self.tmp_dir = PROJECT_ROOT / "data" / "test_tmp"
        self.tmp_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.tmp_dir / "test_faiss.bin"
        self.metadata_path = self.tmp_dir / "test_metadata.json"

    def tearDown(self):
        if self.index_path.exists():
            self.index_path.unlink()
        if self.metadata_path.exists():
            self.metadata_path.unlink()

    def test_text_cleaning(self):
        """Verify clean_text strips control characters and normalizes whitespace."""
        raw = "Hello\x00\x08   World!\n\n\n\nNext line."
        cleaned = clean_text(raw)
        self.assertEqual(cleaned, "Hello World!\n\nNext line.")

    def test_chunker_metadata_preservation(self):
        """Verify TextChunker splits document and preserves chunk metadata."""
        meta = DocumentMetadata(
            domain="dbms",
            topic="normalization",
            difficulty="medium",
            source="dbms_notes.md",
            document_id="doc_test123"
        )
        text = "Database normalization is the process of organizing data to prevent anomalies. " * 10
        chunker = TextChunker(chunk_size=100, chunk_overlap=20)
        chunks = chunker.split_document(text, meta)

        self.assertTrue(len(chunks) > 1)
        for chunk in chunks:
            self.assertIsInstance(chunk, ChunkSchema)
            self.assertEqual(chunk.document_id, "doc_test123")
            self.assertEqual(chunk.metadata["domain"], "dbms")
            self.assertEqual(chunk.metadata["topic"], "normalization")
            self.assertIn("chunk_id", chunk.metadata)

    def test_rag_embeddings(self):
        """Verify RAGEmbeddings generates 384-dimensional normalized float32 vectors."""
        embedder = RAGEmbeddings()
        self.assertEqual(embedder.embedding_dimension, 384)

        query_vec = embedder.embed_query("What is normalization?")
        self.assertEqual(query_vec.shape, (1, 384))
        self.assertEqual(query_vec.dtype, np.float32)

        doc_vecs = embedder.embed_documents(["Doc 1 text", "Doc 2 text"])
        self.assertEqual(doc_vecs.shape, (2, 384))

    def test_faiss_vector_store_persistence(self):
        """Verify building, saving, reloading, and searching FAISS index."""
        embedder = RAGEmbeddings()
        vector_store = FAISSVectorStore(index_path=self.index_path, metadata_path=self.metadata_path)

        meta = DocumentMetadata(domain="machine_learning", topic="overfitting", source="ml.md", document_id="doc_ml")
        chunker = TextChunker(chunk_size=100, chunk_overlap=10)
        chunks = chunker.split_document("Overfitting happens when a model learns noise in the training set.", meta)

        embeddings = embedder.embed_documents([c.content for c in chunks])
        success = vector_store.build_index(embeddings, chunks)
        self.assertTrue(success)
        self.assertTrue(vector_store.is_available())

        # Reload from disk
        reloaded_store = FAISSVectorStore(index_path=self.index_path, metadata_path=self.metadata_path)
        self.assertTrue(reloaded_store.is_available())
        self.assertEqual(reloaded_store.index.ntotal, len(chunks))

        # Search test
        q_vec = embedder.embed_query("overfitting")
        results = reloaded_store.search(q_vec, top_k=2)
        self.assertTrue(len(results) > 0)
        score, chunk_dict = results[0]
        self.assertTrue(0.0 <= score <= 1.0)
        self.assertIn("content", chunk_dict)

    def test_dynamic_query_construction(self):
        """Verify dynamic semantic query construction from interview context."""
        retriever = RAGRetriever(FAISSVectorStore(self.index_path, self.metadata_path), RAGEmbeddings())
        query = retriever.construct_query(
            skills=["Python", "SQL"],
            target_role="Machine Learning Engineer",
            topic="Machine Learning",
            difficulty="medium",
            current_question="What is regularization?",
            candidate_answer="L1 and L2 regularization"
        )
        self.assertIn("Machine Learning Engineer", query)
        self.assertIn("Python, SQL", query)
        self.assertIn("What is regularization?", query)

    def test_retriever_metadata_filtering_and_fallback(self):
        """Verify metadata filtering and fallback with diagnostics."""
        embedder = RAGEmbeddings()
        vector_store = FAISSVectorStore(index_path=self.index_path, metadata_path=self.metadata_path)

        meta1 = DocumentMetadata(domain="python", topic="generators", source="py.md", document_id="doc_py")
        chunks1 = TextChunker(100, 10).split_document("Python generators yield items lazily using yield keyword.", meta1)
        embeds1 = embedder.embed_documents([c.content for c in chunks1])
        vector_store.build_index(embeds1, chunks1)

        retriever = RAGRetriever(vector_store, embedder)

        # 1. Matching domain
        res_match, diag_match = retriever.retrieve(query="yield keyword", domain="python", top_k=2)
        self.assertTrue(len(res_match) > 0)
        self.assertFalse(diag_match.fallback_used)

        # 2. Non-matching domain triggers fallback
        res_fallback, diag_fallback = retriever.retrieve(query="yield keyword", domain="non_existent_domain", top_k=2)
        self.assertTrue(len(res_fallback) > 0)
        self.assertTrue(diag_fallback.fallback_used)

    def test_reranker_and_context_builder(self):
        """Verify RAGReranker score boosting and ContextBuilder formatting/deduplication."""
        reranker = RAGReranker()
        builder = ContextBuilder(max_characters=1000)

        raw_results = [
            RetrievalResult(
                content="SQL INNER JOIN merges rows matching on key.",
                score=0.75,
                metadata={"domain": "sql", "topic": "joins", "source": "sql.md", "difficulty": "medium"}
            ),
            RetrievalResult(
                content="SQL INNER JOIN merges rows matching on key.",
                score=0.70,
                metadata={"domain": "sql", "topic": "joins", "source": "sql.md", "difficulty": "medium"}
            )
        ]

        reranked = reranker.rerank(raw_results, query="SQL INNER JOIN", domain="sql", top_k=2)
        self.assertEqual(len(reranked), 2)
        self.assertTrue(reranked[0].rerank_score >= reranked[0].original_score)

        formatted_context = builder.build_context(reranked)
        self.assertIn("[Source 1 | Domain: sql", formatted_context)
        # Verify deduplication reduced duplicate snippet to single block in formatted output
        self.assertEqual(formatted_context.count("[Source"), 1)

    def test_missing_index_fallback_behavior(self):
        """Verify missing FAISS index returns empty list without raising exceptions."""
        empty_store = FAISSVectorStore(index_path=self.tmp_dir / "missing.bin", metadata_path=self.tmp_dir / "missing.json")
        self.assertFalse(empty_store.is_available())

        retriever = RAGRetriever(empty_store, RAGEmbeddings())
        results, diagnostics = retriever.retrieve(query="query")
        self.assertEqual(results, [])
        self.assertFalse(diagnostics.fallback_used)

    def test_rag_health_check(self):
        """Verify RAGService health check response schema."""
        service = get_rag_service()
        health = service.health_check()
        self.assertIsInstance(health, RAGHealthSchema)
        self.assertIn(health.vector_store, ["faiss"])
        self.assertTrue(hasattr(health, "chunk_count"))
        self.assertTrue(hasattr(health, "metadata_available"))

    def test_rag_grounded_question_mocked_gemini(self):
        """Verify RAG question generator prompt assembly with mocked Gemini client."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "What is the role of L1 regularization in preventing overfitting in ML models?"
        mock_client.generate_content.return_value = mock_response

        q = generate_rag_grounded_question(
            role="Machine Learning Engineer",
            skills=["Machine learning", "Python"],
            topic="machine_learning",
            difficulty="medium",
            persona="friendly",
            gemini_client=mock_client
        )

        self.assertIsNotNone(q)
        self.assertIn("regularization", q.lower())
        self.assertTrue(mock_client.generate_content.called)

if __name__ == "__main__":
    unittest.main()
