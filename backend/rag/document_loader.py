import os
import json
import re
import hashlib
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from .schemas import DocumentMetadata

def compute_file_hash(filepath: Path) -> str:
    """Computes SHA-256 hash of a file for incremental ingestion tracking."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

def clean_text(text: str) -> str:
    """Normalizes whitespace and strips non-printable control characters."""
    if not text:
        return ""
    # Remove control characters except standard whitespace
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    # Replace multiple spaces/newlines with clean formatting
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()

class DocumentLoader:
    def __init__(self, knowledge_base_dir: Path):
        self.knowledge_base_dir = Path(knowledge_base_dir)

    def discover_files(self) -> List[Path]:
        """Discovers all supported files (.txt, .md, .pdf) in the knowledge base directory."""
        if not self.knowledge_base_dir.exists():
            return []
        supported_extensions = {".txt", ".md", ".pdf"}
        files = []
        for root, _, filenames in os.walk(self.knowledge_base_dir):
            for filename in filenames:
                ext = Path(filename).suffix.lower()
                if ext in supported_extensions:
                    files.append(Path(root) / filename)
        return sorted(files)

    def extract_text(self, filepath: Path) -> str:
        """Extracts text content from TXT, MD, or PDF file."""
        ext = filepath.suffix.lower()
        text = ""
        if ext in {".txt", ".md"}:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        elif ext == ".pdf":
            try:
                import pdfplumber
                with pdfplumber.open(filepath) as pdf:
                    pages = [p.extract_text() or "" for p in pdf.pages]
                    text = "\n\n".join(pages)
            except Exception as e:
                print(f"[DocumentLoader] Warning: Failed to parse PDF {filepath}: {e}")
                text = ""
        return clean_text(text)

    def infer_metadata(self, filepath: Path, text: str) -> DocumentMetadata:
        """
        Infers document metadata from directory path, sidecar json, or markdown headers.
        Expected path layout: data/knowledge_base/<domain>/<filename>
        """
        rel_path = filepath.relative_to(self.knowledge_base_dir)
        parts = rel_path.parts

        domain = "general"
        topic = None
        subtopic = None
        difficulty = "medium"

        if len(parts) >= 2:
            domain = parts[0].lower()
            topic = parts[1].split(".")[0].lower()

        # Check for sidecar .json metadata file (e.g. file.json for file.pdf)
        json_sidecar = filepath.with_suffix(".json")
        if json_sidecar.exists():
            try:
                with open(json_sidecar, "r", encoding="utf-8") as f:
                    sidecar = json.load(f)
                    domain = sidecar.get("domain", domain)
                    topic = sidecar.get("topic", topic)
                    subtopic = sidecar.get("subtopic", subtopic)
                    difficulty = sidecar.get("difficulty", difficulty)
            except Exception:
                pass

        # Check inline markdown metadata headers if present
        domain_match = re.search(r"-\s*\*\*Domain\*\*:\s*([^\n]+)", text, re.IGNORECASE)
        if domain_match:
            domain = domain_match.group(1).strip().lower()

        topic_match = re.search(r"-\s*\*\*Topic\*\*:\s*([^\n]+)", text, re.IGNORECASE)
        if topic_match:
            topic = topic_match.group(1).strip().lower()

        diff_match = re.search(r"-\s*\*\*Difficulty\*\*:\s*([^\n]+)", text, re.IGNORECASE)
        if diff_match:
            difficulty = diff_match.group(1).strip().lower()

        doc_id = hashlib.md5(str(rel_path).encode("utf-8")).hexdigest()[:12]

        return DocumentMetadata(
            domain=domain,
            topic=topic or domain,
            subtopic=subtopic,
            difficulty=difficulty,
            source=filepath.name,
            document_id=f"doc_{doc_id}"
        )

    def load_document(self, filepath: Path) -> Tuple[Optional[str], Optional[DocumentMetadata]]:
        """Loads single file and returns (clean_text, DocumentMetadata)."""
        text = self.extract_text(filepath)
        if not text:
            return None, None
        metadata = self.infer_metadata(filepath, text)
        return text, metadata
