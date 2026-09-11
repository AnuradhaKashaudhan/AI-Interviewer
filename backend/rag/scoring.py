"""
CareerPilot AI — Transparent ML Scoring Engine (backend/rag/scoring.py)
Provides deterministic, measurable ML scoring for candidate interview answers using
Sentence-BERT embeddings, QA relevance, evidence coverage, concept coverage, and multi-tier contradiction penalties.
"""

import re
import numpy as np
from typing import List, Dict, Tuple, Optional, Any


class RAGMLScorer:
    """
    Transparent, deterministic ML scoring engine for candidate answer evaluation.
    Reduces dependency on external LLMs by calculating sub-scores and overall scores
    directly from Sentence-BERT vector alignments, evidence coverage, and concept extraction.
    """

    # Configurable Scoring Weights for Technical Accuracy
    WEIGHT_SEMANTIC_ALIGNMENT = 0.30
    WEIGHT_QA_RELEVANCE = 0.25
    WEIGHT_EVIDENCE_COVERAGE = 0.25
    WEIGHT_CONCEPT_COVERAGE = 0.20

    # Configurable Sub-Score Weights for Overall Score
    WEIGHT_TECH_ACCURACY = 0.35
    WEIGHT_RELEVANCE = 0.20
    WEIGHT_COMPLETENESS = 0.15
    WEIGHT_DEPTH = 0.15
    WEIGHT_CLARITY = 0.08
    WEIGHT_CONFIDENCE = 0.07

    def __init__(self, embedder=None):
        self._embedder = embedder

    def get_embedder(self):
        if self._embedder is None:
            try:
                from backend.rag.embeddings import RAGEmbeddings
                self._embedder = RAGEmbeddings()
            except Exception:
                try:
                    from rag.embeddings import RAGEmbeddings
                    self._embedder = RAGEmbeddings()
                except Exception as e:
                    print(f"[RAGMLScorer] Warning: Could not initialize RAGEmbeddings: {e}")
        return self._embedder

    def compute_qa_relevance(self, question: str, answer: str) -> float:
        """
        Computes Sentence-BERT similarity between Question and Candidate Answer.
        Returns float between 0.0 and 1.0 representing direct topic relevance.
        """
        if not question or not answer or len(answer.strip()) < 5:
            return 0.20

        embedder = self.get_embedder()
        if not embedder:
            return 0.50

        try:
            q_vec = embedder.embed_query(question)
            a_vec = embedder.embed_query(answer)
            sim = float(np.dot(q_vec.flatten(), a_vec.flatten()))
            return round(max(0.0, min(1.0, sim)), 4)
        except Exception as e:
            print(f"[RAGMLScorer] Warning: QA relevance calculation error: {e}")
            return 0.50

    def compute_sentence_aggregate_similarity(self, answer: str, evidence_texts: List[str]) -> float:
        """
        Computes sentence-level embedding vectors and aggregates them against evidence chunks.
        Prevents a single correct sentence in a long, incorrect answer from skewing the score.
        """
        if not answer or not evidence_texts:
            return 0.50

        embedder = self.get_embedder()
        if not embedder:
            return 0.50

        try:
            # 1. Full answer vector similarity
            ans_vec = embedder.embed_query(answer)
            ev_vecs = [embedder.embed_query(ev[:800]) for ev in evidence_texts if ev.strip()]

            if not ev_vecs:
                return 0.50

            full_sims = [float(np.dot(ans_vec.flatten(), ev_v.flatten())) for ev_v in ev_vecs]
            max_full_sim = max(full_sims) if full_sims else 0.50

            # 2. Sentence-level breakdown
            sentences = [s.strip() for s in re.split(r'[.!?]+', answer) if len(s.strip()) > 8]

            if not sentences or len(sentences) <= 1:
                return round(max(0.0, min(1.0, max_full_sim)), 4)

            sent_sims = []
            for sent in sentences:
                sent_v = embedder.embed_query(sent)
                best_sent_sim = max([float(np.dot(sent_v.flatten(), ev_v.flatten())) for ev_v in ev_vecs])
                sent_sims.append(best_sent_sim)

            mean_sent_sim = float(np.mean(sent_sims))
            # Hybrid robust score: 60% max full vector sim + 40% average sentence sim
            aggregate_sim = 0.60 * max_full_sim + 0.40 * mean_sent_sim
            return round(max(0.0, min(1.0, aggregate_sim)), 4)

        except Exception as e:
            print(f"[RAGMLScorer] Warning: Sentence aggregate similarity error: {e}")
            return 0.50

    def compute_evidence_coverage(self, answer: str, evidence_texts: List[str]) -> float:
        """
        Calculates how much of the retrieved knowledge base evidence is covered by the answer.
        Returns float between 0.0 and 1.0.
        """
        if not answer or not evidence_texts:
            return 0.50

        embedder = self.get_embedder()
        ans_lower = answer.lower()

        # Break evidence into key semantic clauses/sentences
        clauses = []
        for ev in evidence_texts:
            for s in re.split(r'[.!?]+', ev):
                s_clean = s.strip()
                if len(s_clean) > 15:
                    clauses.append(s_clean)

        if not clauses:
            return 0.50

        if not embedder:
            # Fallback keyword overlap
            matched = sum(1 for c in clauses if any(w in ans_lower for w in c.lower().split() if len(w) > 4))
            return round(matched / len(clauses), 4)

        try:
            ans_v = embedder.embed_query(answer)
            covered_count = 0
            for clause in clauses[:8]:
                c_v = embedder.embed_query(clause[:300])
                sim = float(np.dot(ans_v.flatten(), c_v.flatten()))
                if sim >= 0.45:
                    covered_count += 1

            cov_score = float(covered_count / min(8, len(clauses)))
            return round(max(0.0, min(1.0, cov_score)), 4)
        except Exception as e:
            print(f"[RAGMLScorer] Warning: Evidence coverage error: {e}")
            return 0.50

    def compute_evidence_quality(self, retrievals: List[Any]) -> float:
        """
        Evaluates retrieval quality based on FAISS distance scores, rerank scores, and metadata match.
        Returns float between 0.0 and 1.0.
        """
        if not retrievals:
            return 0.30

        scores = []
        for r in retrievals:
            score = getattr(r, "rerank_score", getattr(r, "score", 0.0))
            scores.append(score)

        if not scores:
            return 0.30

        avg_score = float(np.mean(scores))
        max_score = float(max(scores))
        quality = 0.70 * max_score + 0.30 * avg_score
        return round(max(0.0, min(1.0, quality)), 4)

    def compute_evaluation_confidence(
        self,
        evidence_quality: float,
        sbert_similarity: float,
        qa_relevance: float,
        error_count: int
    ) -> float:
        """
        Derives system confidence in its evaluation accuracy based on evidence quality and alignment clarity.
        Returns float between 0.0 and 1.0.
        """
        conf = 0.40 * evidence_quality + 0.30 * qa_relevance + 0.30 * sbert_similarity
        if error_count > 0:
            conf += 0.10  # Explicit error detection increases grading confidence
        return round(max(0.20, min(1.0, conf)), 4)

    def calculate_ml_scores(
        self,
        question: str,
        answer: str,
        retrievals: List[Any],
        evidence_texts: List[str],
        covered_concepts: List[str],
        missing_concepts: List[str],
        coverage_ratio: float,
        technical_errors: List[str],
        error_penalty: float
    ) -> Dict[str, Any]:
        """
        Computes transparent multi-signal scores deterministically without requiring an LLM.
        Returns complete structured evaluation dictionary.
        """
        qa_rel = self.compute_qa_relevance(question, answer)
        sbert_sim = self.compute_sentence_aggregate_similarity(answer, evidence_texts)
        ev_cov = self.compute_evidence_coverage(answer, evidence_texts)
        ev_quality = self.compute_evidence_quality(retrievals)
        eval_conf = self.compute_evaluation_confidence(ev_quality, sbert_sim, qa_rel, len(technical_errors))

        # 1. Technical Accuracy Score
        raw_tech_acc = (
            self.WEIGHT_SEMANTIC_ALIGNMENT * (sbert_sim * 100.0) +
            self.WEIGHT_QA_RELEVANCE * (qa_rel * 100.0) +
            self.WEIGHT_EVIDENCE_COVERAGE * (ev_cov * 100.0) +
            self.WEIGHT_CONCEPT_COVERAGE * (coverage_ratio * 100.0) -
            error_penalty
        )
        tech_acc = int(round(max(0.0, min(100.0, raw_tech_acc))))

        # 2. Relevance Score
        relevance = int(round(max(0.0, min(100.0, qa_rel * 100.0))))

        # 3. Completeness Score
        completeness = int(round(max(0.0, min(100.0, (0.50 * ev_cov + 0.50 * coverage_ratio) * 100.0))))

        # 4. Depth Score (derived from word count, concept density, and structure)
        word_count = len(answer.split())
        depth_base = min(100.0, (word_count / 80.0) * 60.0 + len(covered_concepts) * 8.0)
        depth = int(round(max(15.0, min(100.0, depth_base))))

        # 5. Clarity Score (logical structure & transition keywords)
        ans_lower = answer.lower()
        has_struct = any(w in ans_lower for w in ["firstly", "secondly", "because", "therefore", "for example", "however", "specifically"])
        clarity_base = 65.0 + (15.0 if has_struct else 0.0) + (15.0 if word_count >= 20 else -15.0)
        clarity = int(round(max(20.0, min(100.0, clarity_base))))

        # 6. Candidate Confidence Score
        candidate_conf_base = 60.0 + (20.0 if word_count >= 30 else 0.0) - (15.0 if "i think" in ans_lower or "maybe" in ans_lower else 0.0)
        candidate_conf = int(round(max(20.0, min(100.0, candidate_conf_base))))

        # 7. Overall Score Formula
        overall_raw = (
            self.WEIGHT_TECH_ACCURACY * tech_acc +
            self.WEIGHT_RELEVANCE * relevance +
            self.WEIGHT_COMPLETENESS * completeness +
            self.WEIGHT_DEPTH * depth +
            self.WEIGHT_CLARITY * clarity +
            self.WEIGHT_CONFIDENCE * candidate_conf
        )
        overall_score = int(round(max(0.0, min(100.0, overall_raw))))

        quality = "strong" if overall_score >= 75 else ("weak" if overall_score < 50 else "average")

        return {
            "score": overall_score,
            "overall_score": overall_score,
            "relevance_score": relevance,
            "technical_accuracy_score": tech_acc,
            "completeness_score": completeness,
            "depth_score": depth,
            "clarity_score": clarity,
            "confidence_score": candidate_conf,
            "semantic_similarity": sbert_sim,
            "qa_relevance": qa_rel,
            "evidence_coverage": ev_cov,
            "evidence_quality": ev_quality,
            "evaluation_confidence": eval_conf,
            "scoring_version": "v2.0-ml-rag",
            "answer_quality": quality
        }
