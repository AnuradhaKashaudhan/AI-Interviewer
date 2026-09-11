from typing import List, Union
from .schemas import RetrievalResult, RerankedResult

class ContextBuilder:
    """Builds clean, structured, deterministic context strings for downstream consumption."""

    def __init__(self, max_characters: int = 3500):
        self.max_characters = max_characters

    def deduplicate(self, items: List[Union[RetrievalResult, RerankedResult]]) -> List[Union[RetrievalResult, RerankedResult]]:
        """Removes exact or duplicate content snippets while preserving rank order."""
        seen_texts = set()
        deduped = []
        for item in items:
            normalized = " ".join(item.content.lower().split())[:120]
            if normalized not in seen_texts:
                seen_texts.add(normalized)
                deduped.append(item)
        return deduped

    def build_context(self, items: List[Union[RetrievalResult, RerankedResult]]) -> str:
        """Formats evidence chunks into a clean, structured string with metadata and sources."""
        if not items:
            return ""

        deduped_items = self.deduplicate(items)
        formatted_chunks = []
        current_len = 0

        for idx, item in enumerate(deduped_items, start=1):
            meta = getattr(item, "metadata", {})
            source = meta.get("source", "Technical Reference")
            domain = meta.get("domain", "General")
            topic = meta.get("topic", "Concepts")
            difficulty = meta.get("difficulty", "medium")
            score = getattr(item, "rerank_score", getattr(item, "score", 0.0))

            header = f"[Source {idx} | Domain: {domain} | Topic: {topic} | Level: {difficulty} | Score: {score:.2f} | File: {source}]"
            body = item.content.strip()
            block = f"{header}\n{body}"

            if current_len + len(block) > self.max_characters:
                remaining = self.max_characters - current_len
                if remaining > 150:
                    truncated_body = body[: remaining - 80] + "..."
                    block = f"{header}\n{truncated_body}"
                    formatted_chunks.append(block)
                break

            formatted_chunks.append(block)
            current_len += len(block) + 2  # spacing

        return "\n\n".join(formatted_chunks)
