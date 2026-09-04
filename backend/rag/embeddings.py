import os
import torch
import numpy as np
from typing import List, Union
from sentence_transformers import SentenceTransformer
from .config import RAG_EMBEDDING_MODEL

# Optimize PyTorch CPU threading
torch.set_num_threads(min(os.cpu_count() or 4, 4))

class RAGEmbeddings:
    _instance = None
    _model = None

    def __new__(cls, model_name: str = RAG_EMBEDDING_MODEL):
        if cls._instance is None:
            cls._instance = super(RAGEmbeddings, cls).__new__(cls)
            cls._model_name = model_name
            print(f"[RAGEmbeddings] Initializing RAG embedding model: {cls._model_name}")
            cls._model = SentenceTransformer(cls._model_name, device="cpu")
        return cls._instance

    @property
    def embedding_dimension(self) -> int:
        """Returns dense embedding dimension (384 for all-MiniLM-L6-v2)."""
        return self._model.get_sentence_embedding_dimension()

    def embed_documents(self, texts: List[str], batch_size: int = 64) -> np.ndarray:
        """Computes dense normalized embeddings for a list of document strings."""
        if not texts:
            return np.empty((0, self.embedding_dimension), dtype=np.float32)

        embeddings = self._model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embeddings.astype(np.float32)

    def embed_query(self, query: str) -> np.ndarray:
        """Computes dense normalized embedding for a single query string."""
        if not query or not query.strip():
            return np.zeros((1, self.embedding_dimension), dtype=np.float32)

        embedding = self._model.encode(
            [query.strip()],
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embedding.astype(np.float32)
