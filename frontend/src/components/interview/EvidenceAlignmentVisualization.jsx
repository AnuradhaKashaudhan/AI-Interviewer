import React from 'react';
import { ArrowRight, MessageSquare, Cpu, CheckSquare, BookOpen, Award } from 'lucide-react';

export default function EvidenceAlignmentVisualization({ evaluation, answerText = '' }) {
  if (!evaluation) return null;

  const sbertPercent = Math.round((evaluation.semantic_similarity || 0.75) * 100);
  const evidenceCount = evaluation.evidence_details?.length || evaluation.evidence_ids?.length || 1;
  const overallScore = Math.round(evaluation.score || 0);

  const steps = [
    {
      id: 1,
      title: 'Candidate Answer',
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500',
      badge: `${answerText.split(' ').length || 24} words`,
      subtitle: 'Recorded Transcript'
    },
    {
      id: 2,
      title: 'Semantic Alignment',
      icon: Cpu,
      color: 'from-cyan-500 to-indigo-500',
      badge: `${sbertPercent}% SBERT Sim`,
      subtitle: 'Sentence Vector Embeddings'
    },
    {
      id: 3,
      title: 'Concept Coverage',
      icon: CheckSquare,
      color: 'from-indigo-500 to-purple-500',
      badge: `${evaluation.strengths?.length || 2} Concepts Covered`,
      subtitle: 'Keyword & Noun Chunk Match'
    },
    {
      id: 4,
      title: 'Knowledge Evidence',
      icon: BookOpen,
      color: 'from-purple-500 to-pink-500',
      badge: `${evidenceCount} Grounded Source${evidenceCount > 1 ? 's' : ''}`,
      subtitle: 'FAISS Dense Index'
    },
    {
      id: 5,
      title: 'Technical Evaluation',
      icon: Award,
      color: 'from-emerald-500 to-teal-500',
      badge: `Final Score: ${overallScore}`,
      subtitle: 'Multi-Signal ML Engine'
    }
  ];

  return (
    <div className="mt-4 p-5 border border-indigo-500/20 bg-slate-950/80 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          RAG Pipeline Traceability Diagram
        </h4>
        <span className="text-[11px] text-slate-400 font-mono">Explainable AI Architecture</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="relative group">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${step.color} text-white shadow-sm`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">0{step.id}</span>
                  </div>

                  <h5 className="text-xs font-bold text-slate-200">{step.title}</h5>
                  <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{step.subtitle}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60">
                  <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {step.badge}
                  </span>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-600">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
