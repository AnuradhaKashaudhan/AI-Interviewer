import os
import sys
import json
import time
from pathlib import Path

# Add project root to sys.path for direct script execution
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from rag.config import (
    KNOWLEDGE_BASE_DIR,
    FAISS_INDEX_PATH,
    METADATA_STORE_PATH,
    HASH_STORE_PATH,
    RAG_CHUNK_SIZE,
    RAG_CHUNK_OVERLAP,
)
from rag.document_loader import DocumentLoader, compute_file_hash
from rag.chunker import TextChunker
from rag.embeddings import RAGEmbeddings
from rag.vector_store import FAISSVectorStore

def run_ingestion(force_rebuild: bool = False):
    """Executes full RAG document ingestion pipeline."""
    start_time = time.time()
    print("Starting RAG Knowledge Base Ingestion Pipeline")
    print(f"Knowledge Base Directory: {KNOWLEDGE_BASE_DIR}")
    print("=" * 60)

    loader = DocumentLoader(KNOWLEDGE_BASE_DIR)
    chunker = TextChunker(chunk_size=RAG_CHUNK_SIZE, chunk_overlap=RAG_CHUNK_OVERLAP)
    embedder = RAGEmbeddings()
    vector_store = FAISSVectorStore(index_path=FAISS_INDEX_PATH, metadata_path=METADATA_STORE_PATH)

    files = loader.discover_files()
    if not files:
        print("[Ingestion] Warning: No supported documents found in knowledge base directory.")
        return

    # Load existing hashes to skip unchanged files
    existing_hashes = {}
    if HASH_STORE_PATH.exists() and not force_rebuild:
        try:
            with open(HASH_STORE_PATH, "r", encoding="utf-8") as f:
                existing_hashes = json.load(f)
        except Exception:
            existing_hashes = {}

    new_hashes = {}
    all_chunks = []
    docs_loaded = 0
    docs_skipped = 0
    domains = set()

    for filepath in files:
        rel_path = str(filepath.relative_to(KNOWLEDGE_BASE_DIR))
        current_hash = compute_file_hash(filepath)
        new_hashes[rel_path] = current_hash

        text, metadata = loader.load_document(filepath)
        if not text or not metadata:
            docs_skipped += 1
            continue

        domains.add(metadata.domain)
        docs_loaded += 1

        chunks = chunker.split_document(text, metadata)
        all_chunks.extend(chunks)

    if not all_chunks:
        print("[Ingestion] No chunks created. Ingestion complete.")
        return

    print(f"[Ingestion] Generating embeddings for {len(all_chunks)} chunks...")
    texts = [c.content for c in all_chunks]
    embeddings = embedder.embed_documents(texts)

    print("[Ingestion] Building FAISS Vector Index...")
    success = vector_store.build_index(embeddings, all_chunks)

    if success:
        HASH_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(HASH_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(new_hashes, f, indent=2)

    elapsed = time.time() - start_time
    print("=" * 60)
    print("INGESTION SUMMARY REPORT")
    print("-" * 60)
    print(f"Documents loaded     : {docs_loaded}")
    print(f"Documents skipped    : {docs_skipped}")
    print(f"Chunks created       : {len(all_chunks)}")
    print(f"Embeddings generated : {embeddings.shape[0]}")
    print(f"Vector dimension     : {embeddings.shape[1] if embeddings.shape[0] > 0 else 0}")
    print(f"Index size           : {vector_store.index.ntotal if vector_store.index else 0}")
    print(f"Domains indexed      : {len(domains)} ({', '.join(sorted(domains))})")
    print(f"Execution time       : {elapsed:.2f}s")
    print(f"Status               : {'SUCCESS' if success else 'FAILED'}")
    print("=" * 60)

if __name__ == "__main__":
    force = "--force" in sys.argv
    run_ingestion(force_rebuild=force)
