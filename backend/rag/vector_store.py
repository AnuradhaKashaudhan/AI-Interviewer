import os
import json
import threading
import numpy as np
import faiss
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from .config import FAISS_INDEX_PATH, METADATA_STORE_PATH
from .schemas import ChunkSchema

class FAISSVectorStore:
    def __init__(self, index_path: Path = FAISS_INDEX_PATH, metadata_path: Path = METADATA_STORE_PATH):
        self.index_path = Path(index_path)
        self.metadata_path = Path(metadata_path)
        self.index: Optional[faiss.Index] = None
        self.chunk_metadata: List[Dict[str, Any]] = []
        self._lock = threading.Lock()
        self.load_index()

    def is_available(self) -> bool:
        """Returns True if FAISS index is loaded and non-empty."""
        with self._lock:
            return self.index is not None and self.index.ntotal > 0

    def load_index(self) -> bool:
        """Loads index and metadata from disk if present."""
        with self._lock:
            if self.index_path.exists() and self.metadata_path.exists():
                try:
                    self.index = faiss.read_index(str(self.index_path))
                    with open(self.metadata_path, "r", encoding="utf-8") as f:
                        self.chunk_metadata = json.load(f)
                    print(f"[FAISSVectorStore] Loaded FAISS index with {self.index.ntotal} vectors.")
                    return True
                except Exception as e:
                    print(f"[FAISSVectorStore] Error loading FAISS index: {e}")
                    self.index = None
                    self.chunk_metadata = []
                    return False
            else:
                self.index = None
                self.chunk_metadata = []
                return False

    def build_index(self, embeddings: np.ndarray, chunks: List[ChunkSchema]) -> bool:
        """Builds a new FAISS IndexFlatIP (Cosine Similarity) index and saves to disk."""
        with self._lock:
            if embeddings.shape[0] == 0:
                print("[FAISSVectorStore] Warning: Empty embeddings provided to build_index.")
                return False

            dimension = embeddings.shape[1]
            # Inner product index for normalized cosine similarity vectors
            index = faiss.IndexFlatIP(dimension)
            index.add(embeddings)

            self.index_path.parent.mkdir(parents=True, exist_ok=True)
            faiss.write_index(index, str(self.index_path))

            metadata_list = [c.model_dump() if hasattr(c, "model_dump") else c.dict() for c in chunks]
            with open(self.metadata_path, "w", encoding="utf-8") as f:
                json.dump(metadata_list, f, indent=2)

            self.index = index
            self.chunk_metadata = metadata_list
            print(f"[FAISSVectorStore] Successfully built and saved FAISS index ({index.ntotal} vectors, {dimension} dim).")
            return True

    def search(self, query_vector: np.ndarray, top_k: int = 5) -> List[Tuple[float, Dict[str, Any]]]:
        """Performs cosine similarity search returning list of (score, chunk_dict)."""
        with self._lock:
            if self.index is None or self.index.ntotal == 0:
                return []

            k = min(top_k, self.index.ntotal)
            scores, indices = self.index.search(query_vector, k)

            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx >= 0 and idx < len(self.chunk_metadata):
                    # Clip score range [0, 1] for cosine similarity
                    normalized_score = float(max(0.0, min(1.0, float(score))))
                    results.append((normalized_score, self.chunk_metadata[idx]))
            return results
