import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from .schemas import ChunkSchema
from .embeddings import RAGEmbeddings
from .vector_store import FAISSVectorStore
from .document_processor import compute_file_hash, DocumentProcessor
from .config import FAISS_INDEX_PATH, METADATA_STORE_PATH, HASH_STORE_PATH, KNOWLEDGE_BASE_DIR

class FAISSIndexer:
    """Manages reproducible FAISS index generation, document hash tracking, and persistence."""

    def __init__(
        self,
        knowledge_base_dir: Path = KNOWLEDGE_BASE_DIR,
        index_path: Path = FAISS_INDEX_PATH,
        metadata_path: Path = METADATA_STORE_PATH,
        hash_path: Path = HASH_STORE_PATH
    ):
        self.knowledge_base_dir = Path(knowledge_base_dir)
        self.index_path = Path(index_path)
        self.metadata_path = Path(metadata_path)
        self.hash_path = Path(hash_path)
        self.processor = DocumentProcessor(knowledge_base_dir=self.knowledge_base_dir)
        self.embedder = RAGEmbeddings()
        self.vector_store = FAISSVectorStore(index_path=self.index_path, metadata_path=self.metadata_path)

    def rebuild_index(self, force_rebuild: bool = False) -> Dict[str, Any]:
        """Builds or updates FAISS index from knowledge base files."""
        start_time = time.time()
        files = self.processor.loader.discover_files()
        
        if not files:
            return {
                "success": False,
                "message": "No knowledge base documents found",
                "document_count": 0,
                "chunk_count": 0
            }

        existing_hashes = {}
        if self.hash_path.exists() and not force_rebuild:
            try:
                with open(self.hash_path, "r", encoding="utf-8") as f:
                    existing_hashes = json.load(f)
            except Exception:
                existing_hashes = {}

        new_hashes = {}
        all_chunks: List[ChunkSchema] = []
        docs_loaded = 0
        domains = set()

        for filepath in files:
            rel_path = str(filepath.relative_to(self.knowledge_base_dir))
            current_hash = compute_file_hash(filepath)
            new_hashes[rel_path] = current_hash

            _, metadata, chunks = self.processor.process_file(filepath)
            if metadata and chunks:
                domains.add(metadata.domain)
                docs_loaded += 1
                all_chunks.extend(chunks)

        if not all_chunks:
            return {
                "success": False,
                "message": "No valid text chunks generated",
                "document_count": docs_loaded,
                "chunk_count": 0
            }

        texts = [c.content for c in all_chunks]
        embeddings = self.embedder.embed_documents(texts)
        success = self.vector_store.build_index(embeddings, all_chunks)

        if success:
            self.hash_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.hash_path, "w", encoding="utf-8") as f:
                json.dump(new_hashes, f, indent=2)

        elapsed = time.time() - start_time
        return {
            "success": success,
            "document_count": docs_loaded,
            "chunk_count": len(all_chunks),
            "vector_dimension": embeddings.shape[1] if embeddings.shape[0] > 0 else 0,
            "domains": sorted(list(domains)),
            "elapsed_seconds": round(elapsed, 2)
        }
