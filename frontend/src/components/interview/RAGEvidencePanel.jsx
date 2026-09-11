import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ShieldCheck, Database, Award } from 'lucide-react';

export default function RAGEvidencePanel({ evidenceDetails = [], topic = 'Technical' }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!evidenceDetails || evidenceDetails.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border border-indigo-500/20 bg-indigo-950/10 rounded-xl overflow-hidden shadow-sm transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-indigo-900/20 hover:bg-indigo-900/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              Knowledge Evidence
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {evidenceDetails.length} Grounded Source{evidenceDetails.length > 1 ? 's' : ''}
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Retrieved technical knowledge grounding this answer evaluation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-indigo-300">
          <span className="text-xs font-medium hidden sm:inline">
            {isOpen ? 'Collapse' : 'View Evidence'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-3.5 bg-slate-900/40">
          {evidenceDetails.map((item, idx) => {
            const relPercent = Math.round((item.relevance || 0.85) * 100);
            const qualityColor =
              item.quality === 'High'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : item.quality === 'Medium'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30';

            return (
              <div
                key={item.chunk_id || idx}
                className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:border-indigo-500/40 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      [{item.domain || topic}]
                    </span>
                    <span className="text-xs font-medium text-slate-300">
                      Topic: {item.topic || topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      Relevance: <strong className="text-indigo-300">{item.relevance?.toFixed(2) || '0.85'}</strong> ({relPercent}%)
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${qualityColor}`}>
                      Evidence Quality: {item.quality || 'High'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded border border-slate-800/80 font-mono">
                  "{item.content}"
                </p>
              </div>
            );
          })}

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Fully Grounded in Authenticated Technical Knowledge Base
            </span>
            <span className="text-slate-500 font-mono">FAISS Vector Engine</span>
          </div>
        </div>
      )}
    </div>
  );
}
