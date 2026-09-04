# 📚 RAG Knowledge System Architecture & Operations Guide

## 1. Overview & Purpose
The **Retrieval-Augmented Generation (RAG)** knowledge system grounds the AI Mock Interviewer's question generation pipeline in verified technical domain documentation. 

Instead of relying solely on baseline parametric LLM knowledge or generic static question banks, RAG retrieves relevant technical chunks (e.g. system design tradeoffs, algorithms, memory management, database normal forms) from local domain knowledge repositories and injects them directly into Google Gemini prompts.

---

## 2. Directory Structure

```text
backend/rag/
├── __init__.py           # Package exports (RAGService, get_rag_service)
├── config.py             # Environment configuration & default parameters
├── schemas.py            # Pydantic schemas (DocumentMetadata, ChunkSchema, RetrievalResult)
├── document_loader.py    # Discovers & parses TXT, MD, PDF files with metadata extraction
├── chunker.py            # RecursiveCharacterTextSplitter with metadata preservation
├── embeddings.py         # Dedicated RAG embedding model (all-MiniLM-L6-v2)
├── vector_store.py       # FAISS vector store persistence, reload, and inner-product search
├── retriever.py          # Cosine similarity retriever with metadata filtering & fallback
├── ingestion.py          # CLI ingestion pipeline script with SHA256 document hashing
├── evaluation.py         # Retrieval benchmark utility across technical queries
├── rag_service.py        # Business service interface decoupled from HTTP routes
├── storage/              # Local index storage (faiss_index.bin, metadata.json, doc_hashes.json)
└── README.md             # RAG architecture documentation
```

---

## 3. Knowledge Base Format & Metadata
Documents reside in `data/knowledge_base/` partitioned by technical domain:

```text
data/knowledge_base/
├── dsa/
├── oop/
├── dbms/
├── operating_systems/
├── computer_networks/
├── python/
├── cpp/
├── java/
├── machine_learning/
├── artificial_intelligence/
├── web_development/
└── behavioral/
```

### Supported File Types
- `.txt` (Plain text documents)
- `.md` (Markdown documentation with optional metadata headers)
- `.pdf` (Parsed using `pdfplumber`)

### Document Metadata Attributes
Every document and chunk preserves the following schema:
- `domain`: Technical domain (`machine_learning`, `dbms`, `python`, etc.)
- `topic`: Topic within domain (`overfitting`, `normalization`, `memory_management`)
- `subtopic`: Optional subtopic string
- `difficulty`: Target difficulty level (`easy`, `medium`, `hard`)
- `source`: Source filename (e.g. `ml_notes.md`)
- `document_id`: Unique document ID (`doc_<md5_hash>`)
- `chunk_id`: Unique chunk ID (`<document_id>_chunk_<index>`)

---

## 4. Chunking & Embeddings

### Semantic Chunking (`chunker.py`)
- **Splitter**: `RecursiveCharacterTextSplitter`
- **Chunk Size**: `800` characters (configurable via `RAG_CHUNK_SIZE`)
- **Chunk Overlap**: `120` characters (configurable via `RAG_CHUNK_OVERLAP`)
- Metadata is attached to every individual chunk object.

### Vector Embeddings (`embeddings.py`)
- **Model**: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors).
- **Execution**: Optimized for CPU with batching and vector $L_2$-normalization for cosine similarity.

---

## 5. FAISS Vector Store Persistence (`vector_store.py`)
- **Index Type**: `faiss.IndexFlatIP` (Inner Product on $L_2$-normalized vectors $\equiv$ Cosine Similarity).
- **Persistence**: Saved to `backend/rag/storage/faiss_index.bin` and `metadata.json`.
- **Startup Loading**: Pre-loaded ONCE at backend application startup; never rebuilt on individual HTTP requests.

---

## 6. Retrieval & Metadata Filtering (`retriever.py`)
- Computes query embedding and retrieves top candidates from FAISS.
- Filters candidates by `domain`, `topic`, and `difficulty`.
- **Graceful Fallback**: If strict metadata filtering returns zero matches, the retriever automatically falls back to overall semantic similarity ranking to avoid returning empty context.
- Thresholding filters out chunks below `RAG_SIMILARITY_THRESHOLD` (default `0.35`).

---

## 7. Question Generation Integration (`question_generator.py`)
During mock interview question generation:
1. `rag_service.retrieve_for_interview(role, topic, skills, difficulty)` executes.
2. Top relevant technical chunks are formatted into a `RETRIEVED TECHNICAL KNOWLEDGE` prompt block.
3. Gemini is instructed to:
   - Ground the interview question in the retrieved technical concepts.
   - Maintain the candidate's target difficulty level.
   - Never copy documents verbatim or expose RAG metadata to the user.

### Failure Fallback Architecture
If `RAG_ENABLED=false`, the FAISS index is missing, or retrieval fails:
- The error is logged safely without interrupting FastAPI.
- The system seamlessly falls back to Gemini's parametric knowledge and standard question bank generation without crashing!

---

## 8. CLI Ingestion & Evaluation Commands

### Run Document Ingestion
```bash
python backend/rag/ingestion.py
```
*Force re-indexing:* `python backend/rag/ingestion.py --force`

### Run Retrieval Benchmark Evaluation
```bash
python backend/rag/evaluation.py
```

---

## 9. Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `RAG_ENABLED` | `true` | Enables/disables RAG knowledge retrieval |
| `RAG_EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Sentence-Transformer embedding model |
| `RAG_TOP_K` | `5` | Maximum retrieved context chunks per query |
| `RAG_SIMILARITY_THRESHOLD` | `0.35` | Minimum cosine similarity threshold |
| `RAG_CHUNK_SIZE` | `800` | Character chunk length for text splitting |
| `RAG_CHUNK_OVERLAP` | `120` | Character overlap between adjacent chunks |
| `RAG_VECTOR_STORE` | `faiss` | Vector store provider |
