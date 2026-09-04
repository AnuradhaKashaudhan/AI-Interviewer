from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class DocumentMetadata(BaseModel):
    domain: str = Field(default="general", description="Primary technical or interview domain")
    topic: Optional[str] = Field(default=None, description="Specific topic within domain")
    subtopic: Optional[str] = Field(default=None, description="Subtopic within topic")
    difficulty: Optional[str] = Field(default="medium", description="Difficulty level: easy, medium, hard")
    source: str = Field(description="Filename or source path")
    document_id: str = Field(description="Unique document identifier")

class ChunkSchema(BaseModel):
    chunk_id: str = Field(description="Unique identifier for chunk")
    document_id: str = Field(description="Parent document identifier")
    content: str = Field(description="Cleaned text content of chunk")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata dictionary")

class RetrievalResult(BaseModel):
    content: str = Field(description="Retrieved chunk text content")
    score: float = Field(description="Cosine similarity relevance score [0, 1]")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Preserved metadata")

class RAGHealthSchema(BaseModel):
    enabled: bool
    vector_store: str
    embedding_model: str
    index_loaded: bool
    document_count: int
    chunk_count: int
    error: Optional[str] = None
