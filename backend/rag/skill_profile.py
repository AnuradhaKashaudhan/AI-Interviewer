"""
CareerPilot AI — Candidate Skill Profile & Contextual Query Builder (backend/rag/skill_profile.py)
Tracks candidate topic performance, technical accuracy, and concept coverage gaps to generate
personalized contextual RAG queries for adaptive question selection.
"""

from typing import Dict, List, Any, Optional


class CandidateSkillProfileManager:
    """
    Manages candidate interview skill profile and generates targeted, contextual RAG queries.
    """

    def __init__(self):
        self.profile: Dict[str, Dict[str, Any]] = {}

    def update_profile(self, topic: str, eval_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Updates topic-level candidate performance metrics after an answer evaluation.
        """
        if not topic:
            topic = "General"

        topic_key = topic.strip()
        if topic_key not in self.profile:
            self.profile[topic_key] = {
                "topic": topic_key,
                "questions_attempted": 0,
                "average_score": 0.0,
                "technical_accuracy": 0.0,
                "concept_coverage": 0.0,
                "weakness_score": 0.0,
                "evaluation_confidence": 0.80,
                "missing_concepts": [],
                "weaknesses": []
            }

        data = self.profile[topic_key]
        n = data["questions_attempted"] + 1

        score = float(eval_result.get("overall_score", eval_result.get("score", 50)))
        tech_acc = float(eval_result.get("technical_accuracy_score", 50))
        ev_cov = float(eval_result.get("evidence_coverage", eval_result.get("semantic_similarity", 0.50)))
        eval_conf = float(eval_result.get("evaluation_confidence", 0.80))
        missing = eval_result.get("missing_concepts", eval_result.get("missing_keywords", []))
        weaknesses = eval_result.get("weaknesses", [])

        # Running average updates
        data["questions_attempted"] = n
        data["average_score"] = round((data["average_score"] * (n - 1) + score) / n, 2)
        data["technical_accuracy"] = round((data["technical_accuracy"] * (n - 1) + tech_acc) / n, 2)
        data["concept_coverage"] = round((data["concept_coverage"] * (n - 1) + ev_cov) / n, 2)
        data["evaluation_confidence"] = round((data["evaluation_confidence"] * (n - 1) + eval_conf) / n, 2)
        data["weakness_score"] = round(100.0 - data["technical_accuracy"], 2)

        # Merge missing concepts
        for m in missing:
            if m not in data["missing_concepts"]:
                data["missing_concepts"].append(m)
        data["missing_concepts"] = data["missing_concepts"][:10]

        for w in weaknesses:
            if w not in data["weaknesses"]:
                data["weaknesses"].append(w)
        data["weaknesses"] = data["weaknesses"][:5]

        return data

    def get_topic_metrics(self, topic: str) -> Optional[Dict[str, Any]]:
        return self.profile.get(topic.strip()) if topic else None

    def get_all_weak_topics(self, threshold: float = 65.0) -> List[str]:
        """Returns list of topics where technical accuracy or score is below threshold."""
        weak = []
        for topic, data in self.profile.items():
            if data["technical_accuracy"] < threshold or data["average_score"] < threshold:
                weak.append(topic)
        return weak

    def get_contextual_rag_query(
        self,
        role: str = "",
        skills: List[str] = None,
        current_topic: str = "",
        difficulty: str = "medium"
    ) -> str:
        """
        Builds a rich, personalized RAG retrieval query targeting candidate skill gaps and missing concepts.
        """
        query_parts = []
        if role:
            query_parts.append(f"{role} interview questions")

        if current_topic:
            query_parts.append(current_topic)

        if difficulty:
            query_parts.append(f"{difficulty} difficulty")

        topic_data = self.get_topic_metrics(current_topic)
        if topic_data:
            missing = topic_data.get("missing_concepts", [])
            if missing:
                query_parts.append(f"focus on concepts {' '.join(missing[:3])}")
            if topic_data.get("weakness_score", 0) > 35:
                query_parts.append("candidate demonstrates gap in core depth and trade-offs")
        elif skills:
            query_parts.append(f"skills {' '.join(skills[:3])}")

        return ", ".join(query_parts) if query_parts else f"{current_topic or 'technical'} interview questions"
