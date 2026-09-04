import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.rag.config import FAISS_INDEX_PATH, METADATA_STORE_PATH
from backend.rag.embeddings import RAGEmbeddings
from backend.rag.vector_store import FAISSVectorStore
from backend.rag.retriever import RAGRetriever

BENCHMARK_QUERIES = [
    {
        "query": "What is overfitting in machine learning?",
        "expected_domain": "machine_learning",
        "expected_keywords": ["overfitting", "regularization", "l1", "l2", "generalize"]
    },
    {
        "query": "What is normalization in DBMS?",
        "expected_domain": "dbms",
        "expected_keywords": ["normalization", "1nf", "2nf", "3nf", "redundancy"]
    },
    {
        "query": "Explain process synchronization in operating systems",
        "expected_domain": "operating_systems",
        "expected_keywords": ["synchronization", "mutex", "semaphore", "concurrency"]
    },
    {
        "query": "What is polymorphism in OOP?",
        "expected_domain": "oop",
        "expected_keywords": ["polymorphism", "overriding", "overloading", "interface"]
    },
    {
        "query": "What are generators and the yield keyword in Python?",
        "expected_domain": "python",
        "expected_keywords": ["generator", "yield", "iterator", "memory"]
    }
]

def run_evaluation():
    """Evaluates RAG retrieval quality across benchmark queries."""
    print("=" * 70)
    print("RAG RETRIEVAL BENCHMARK EVALUATION")
    print("=" * 70)

    embedder = RAGEmbeddings()
    vector_store = FAISSVectorStore(index_path=FAISS_INDEX_PATH, metadata_path=METADATA_STORE_PATH)

    if not vector_store.is_available():
        print("[ERROR] FAISS index is not loaded or is empty. Please run ingestion first.")
        return

    retriever = RAGRetriever(vector_store, embedder)

    total_queries = len(BENCHMARK_QUERIES)
    successful_retrievals = 0

    for idx, test_case in enumerate(BENCHMARK_QUERIES, start=1):
        query = test_case["query"]
        expected_domain = test_case["expected_domain"]
        expected_kw = test_case["expected_keywords"]

        print(f"\n[Query #{idx}] '{query}'")
        print(f"Target Domain: {expected_domain}")

        results = retriever.retrieve(query, domain=expected_domain, top_k=3)

        if not results:
            print("  [FAIL] No results returned.")
            continue

        successful_retrievals += 1
        print(f"  Found {len(results)} relevant chunks:")

        for r_idx, res in enumerate(results, start=1):
            source = res.metadata.get("source", "unknown")
            domain = res.metadata.get("domain", "unknown")
            score = res.score
            snippet = res.content.replace("\n", " ")[:120]

            print(f"   ({r_idx}) Score: {score:.4f} | Domain: {domain} | Source: {source}")
            print(f"       Snippet: \"{snippet}...\"")

    print("\n" + "=" * 70)
    print("EVALUATION SUMMARY")
    print("-" * 70)
    print(f"Total Benchmark Queries : {total_queries}")
    print(f"Successful Retrievals   : {successful_retrievals} / {total_queries} ({(successful_retrievals/total_queries)*100:.1f}%)")
    print(f"FAISS Total Vector Count: {vector_store.index.ntotal if vector_store.index else 0}")
    print("=" * 70)

if __name__ == "__main__":
    run_evaluation()
