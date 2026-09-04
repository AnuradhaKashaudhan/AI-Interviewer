import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent

# RAG Environment Configuration
RAG_ENABLED = os.getenv("RAG_ENABLED", "true").lower() in ("true", "1", "yes")
RAG_EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
RAG_SIMILARITY_THRESHOLD = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.35"))
RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "800"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "120"))
RAG_VECTOR_STORE = os.getenv("RAG_VECTOR_STORE", "faiss")

# Storage Paths
STORAGE_DIR = Path(os.getenv("RAG_STORAGE_DIR", str(BASE_DIR / "storage")))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

FAISS_INDEX_PATH = Path(os.getenv("RAG_INDEX_PATH", str(STORAGE_DIR / "faiss_index.bin")))
METADATA_STORE_PATH = Path(os.getenv("RAG_METADATA_PATH", str(STORAGE_DIR / "metadata.json")))
HASH_STORE_PATH = Path(os.getenv("RAG_HASH_PATH", str(STORAGE_DIR / "doc_hashes.json")))
KNOWLEDGE_BASE_DIR = Path(os.getenv("KNOWLEDGE_BASE_DIR", str(PROJECT_ROOT / "data" / "knowledge_base")))
