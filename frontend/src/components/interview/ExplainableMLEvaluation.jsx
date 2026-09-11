import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle, Cpu, ShieldCheck } from 'lucide-react';

export default function ExplainableMLEvaluation({ evaluation }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!evaluation) return null;

  const {
    semantic_similarity = 0.75,
    concept_coverage,
    strengths = [],
    weaknesses = [],
    missing_concepts = [],
    technical_errors = [],
    evaluation_confidence = 0.85,
    qa_relevance = 0.82,
    evidence_coverage = 0.80
  } = evaluation;

  const coveredList = concept_coverage?.covered_concepts || strengths || [];
  const missingList = concept_coverage?.missing_concepts || missing_concepts || weaknesses || [];

  // Determine Confidence Tag
  let confState = 'High confidence';
  let confColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (evaluation_confidence < 0.60) {
    confState = 'Low confidence';
    confColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  } else if (evaluation_confidence < 0.80) {
    confState = 'Medium confidence';
    confColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  }

  const sbertPercent = Math.round((semantic_similarity || 0.75) * 100);

  return (
    <div className="mt-4 border border-cyan-500/20 bg-slate-900/60 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-cyan-950/30 hover:bg-cyan-900/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              Why was this answer scored this way?
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Explainable ML Signals
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparent multi-signal breakdown from SBERT alignment & conceptual analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-cyan-400">
          <span className="text-xs font-medium hidden sm:inline">
            {isOpen ? 'Hide Signals' : 'Inspect Signals'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-5 bg-slate-950/40">
          {/* 1. Semantic Alignment & Vector Similarity */}
          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                SBERT Semantic Vector Alignment
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300">
                {sbertPercent}% Similarity Score ({semantic_similarity?.toFixed(3) || '0.750'})
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${sbertPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              Evaluates how closely your answer aligns with expected technical concepts using sentence-transformer dense vector embeddings.
            </p>
          </div>

          {/* 2. Concept Coverage Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Covered Concepts */}
            <div className="p-4 rounded-lg bg-emerald-950/10 border border-emerald-500/20">
              <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Covered Technical Concepts ({coveredList.length})
              </h5>
              {coveredList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {coveredList.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium"
                    >
                      ✓ {typeof item === 'string' ? item : item.concept || item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific key concepts matched.</p>
              )}
            </div>

            {/* Missing Concepts */}
            <div className="p-4 rounded-lg bg-amber-950/10 border border-amber-500/20">
              <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Missing / Recommended Concepts ({missingList.length})
              </h5>
              {missingList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {missingList.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium"
                    >
                      ! {typeof item === 'string' ? item : item.concept || item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-400/80 font-medium">All essential domain concepts covered!</p>
              )}
            </div>
          </div>

          {/* 3. Technical Error Taxonomy */}
          {technical_errors && technical_errors.length > 0 && (
            <div className="p-4 rounded-lg bg-rose-950/10 border border-rose-500/30">
              <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Detected Technical Issues ({technical_errors.length})
              </h5>
              <div className="space-y-2.5">
                {technical_errors.map((err, idx) => {
                  const typeLabel = (err.type || err.category || 'imprecision').replace(/_/g, ' ');
                  const sevColor =
                    err.severity === 'high'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                  return (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900/90 border border-rose-500/20 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-rose-300 uppercase tracking-wide">
                          Category: {typeLabel}
                        </span>
                        <span className={`px-2 py-0.5 rounded border uppercase font-bold text-[10px] ${sevColor}`}>
                          Severity: {err.severity || 'medium'}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {err.explanation || err.detail || err}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Evaluation Confidence Banner */}
          <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-200">Evaluation Confidence:</span>
                <span className={`text-xs px-2 py-0.5 rounded border font-bold ${confColor}`}>
                  {confState} ({(evaluation_confidence * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Confidence reflects how strongly the available semantic and knowledge evidence supports this evaluation.
              </p>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              v2.0-ml-rag engine
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
