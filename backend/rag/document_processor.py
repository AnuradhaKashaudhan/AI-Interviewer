from pathlib import Path
from typing import List, Tuple, Optional
from .schemas import DocumentMetadata, ChunkSchema
from .document_loader import DocumentLoader, clean_text, compute_file_hash
from .chunker import TextChunker
from .config import RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP, KNOWLEDGE_BASE_DIR

class DocumentProcessor:
    """Unified document processing pipeline for discovery, text cleaning, metadata extraction, and chunking."""
    
    def __init__(self, knowledge_base_dir: Path = KNOWLEDGE_BASE_DIR, chunk_size: int = RAG_CHUNK_SIZE, chunk_overlap: int = RAG_CHUNK_OVERLAP):
        self.knowledge_base_dir = Path(knowledge_base_dir)
        self.loader = DocumentLoader(self.knowledge_base_dir)
        self.chunker = TextChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    def process_file(self, filepath: Path) -> Tuple[Optional[str], Optional[DocumentMetadata], List[ChunkSchema]]:
        """Processes a single file and returns (cleaned_text, metadata, list_of_chunks)."""
        text, metadata = self.loader.load_document(filepath)
        if not text or not metadata:
            return None, None, []
        
        chunks = self.chunker.split_document(text, metadata)
        return text, metadata, chunks

    def process_directory(self) -> Tuple[List[DocumentMetadata], List[ChunkSchema]]:
        """Processes all documents in the knowledge base directory."""
        files = self.loader.discover_files()
        all_metadata = []
        all_chunks = []

        for filepath in files:
            _, metadata, chunks = self.process_file(filepath)
            if metadata and chunks:
                all_metadata.append(metadata)
                all_chunks.extend(chunks)

        return all_metadata, all_chunks
