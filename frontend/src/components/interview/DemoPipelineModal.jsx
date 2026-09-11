import React from 'react';
import { X, Cpu, BookOpen, ShieldCheck, CheckCircle2, Award, Zap, Layers } from 'lucide-react';

export default function DemoPipelineModal({ isOpen, onClose, currentEvaluation, questionText }) {
  if (!isOpen) return null;

  const evalData = currentEvaluation || {
    score: 85,
    technical_accuracy_score: 86,
    relevance_score: 88,
    semantic_similarity: 0.82,
    evidence_coverage: 0.85,
    evaluation_confidence: 0.91,
    strengths: ['Core Architecture', 'Design Patterns'],
    weaknesses: ['Corner Case Handling']
  };

  const steps = [
    {
      num: '01',
      name: 'Candidate Answer Input',
      desc: 'Transcribed speech text or written response captured cleanly via audio recording or editor.',
      badge: 'STT / Input Layer'
    },
    {
      num: '02',
      name: 'Sentence-BERT Dense Encoding',
      desc: 'Transforms answer text into a 384-dimensional dense vector space using sentence-transformers/all-MiniLM-L6-v2.',
      badge: 'SBERT Vector Embeddings'
    },
    {
      num: '03',
      name: 'FAISS Dense Knowledge Retrieval',
      desc: 'Retrieves top-K domain reference chunks using Inner Product cosine similarity over FAISS index.',
      badge: 'RAG Retrieval Engine'
    },
    {
      num: '04',
      name: 'RAG Knowledge Reranking',
      desc: 'Applies keyword overlap & domain metadata bonus reranking to filter candidate reference chunks.',
      badge: 'RAG Reranker'
    },
    {
      num: '05',
      name: 'Concept Coverage & Error Classification',
      desc: 'Extracts multi-word technical concepts and checks candidate claims against multi-tier contradiction rules.',
      badge: 'NLP & Error Taxonomy'
    },
    {
      num: '06',
      name: 'Deterministic Multi-Signal Scoring',
      desc: 'Computes technical accuracy and overall score via mathematical weighting on CPU (~18ms overhead).',
      badge: 'ML Scorer Engine'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-950/80 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                ML-RAG Evaluation Pipeline Architecture
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Demo Mode
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                How CareerPilot AI evaluates answers without relying on black-box LLM scoring
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Live Question Banner */}
          {questionText && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                Active Interview Question:
              </span>
              <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
                "{questionText}"
              </p>
            </div>
          )}

          {/* Pipeline Steps List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Execution Sequence
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      Step {step.num}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                      {step.badge}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-200">{step.name}</h5>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Architectural Signals Summary */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
            <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              Live Evaluation Metrics Snapshot
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">SBERT Alignment</span>
                <span className="text-sm font-bold text-cyan-300 font-mono">
                  {Math.round((evalData.semantic_similarity || 0.82) * 100)}%
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Evidence Coverage</span>
                <span className="text-sm font-bold text-indigo-300 font-mono">
                  {Math.round((evalData.evidence_coverage || 0.85) * 100)}%
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Eval Confidence</span>
                <span className="text-sm font-bold text-emerald-300 font-mono">
                  {Math.round((evalData.evaluation_confidence || 0.91) * 100)}%
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Overall Score</span>
                <span className="text-sm font-bold text-white font-mono">
                  {Math.round(evalData.score || 85)} / 100
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            Deterministic & Traceable Evaluation Pipeline
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
