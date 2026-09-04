from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from .schemas import DocumentMetadata, ChunkSchema
from .config import RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP

class TextChunker:
    def __init__(self, chunk_size: int = RAG_CHUNK_SIZE, chunk_overlap: int = RAG_CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )

    def split_document(self, text: str, metadata: DocumentMetadata) -> List[ChunkSchema]:
        """Splits a document string into metadata-aware ChunkSchema objects."""
        if not text or not text.strip():
            return []

        raw_chunks = self.splitter.split_text(text)
        chunk_schemas = []

        base_meta = metadata.model_dump() if hasattr(metadata, "model_dump") else metadata.dict()

        for idx, chunk_text in enumerate(raw_chunks):
            chunk_id = f"{metadata.document_id}_chunk_{idx}"
            chunk_meta = {
                **base_meta,
                "chunk_id": chunk_id,
                "chunk_index": idx,
                "total_chunks": len(raw_chunks)
            }
            chunk_schemas.append(
                ChunkSchema(
                    chunk_id=chunk_id,
                    document_id=metadata.document_id,
                    content=chunk_text.strip(),
                    metadata=chunk_meta
                )
            )

        return chunk_schemas
