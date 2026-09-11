import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SECTION_ORDER = ["Contact", "Summary", "Experience", "Projects", "Education", "Skills", "Certifications", "General"];

const FixItEditor = ({ resumeText, issues, activeIssueId, onSelectIssue, onApplyFix }) => {
  const [sections, setSections] = useState({});
  const [flashIssueId, setFlashIssueId] = useState(null);

  // Group text by section, maintaining order as best as possible
  useEffect(() => {
    const lines = resumeText.split('\n');
    const grouped = {};
    
    let currentSection = "General";
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const possibleSection = SECTION_ORDER.find(s => 
        trimmed.length < 30 && trimmed.toLowerCase().includes(s.toLowerCase())
      );
      
      if (possibleSection) {
        currentSection = possibleSection;
      }
      
      if (!grouped[currentSection]) grouped[currentSection] = [];
      grouped[currentSection].push(line);
    });
    
    setSections(grouped);
  }, [resumeText]);

  // Flash effect when an issue is fixed
  useEffect(() => {
    if (flashIssueId) {
      const timer = setTimeout(() => setFlashIssueId(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [flashIssueId]);

  const handleApplyFix = (issue) => {
    setFlashIssueId(issue.id);
    if (onSelectIssue) onSelectIssue(null);
    onApplyFix(issue);
  };

  const renderHighlightedLine = (line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return <span>{line}</span>;

    // Find issue whose line_text matches this line (ignoring strict section name matching)
    const issue = (issues || []).find(i => {
      if (!i.line_text) return false;
      const target = i.line_text.trim();
      if (!target) return false;

      // Substring match
      if (line.includes(target) || target.includes(trimmedLine)) return true;

      // Clean leading bullet symbols
      const cleanLine = trimmedLine.replace(/^[-•*–►]\s*/, '').toLowerCase();
      const cleanTarget = target.replace(/^[-•*–►]\s*/, '').toLowerCase();

      return (
        cleanLine === cleanTarget ||
        (cleanLine.length > 15 && cleanTarget.length > 15 && (cleanLine.includes(cleanTarget) || cleanTarget.includes(cleanLine)))
      );
    });

    if (!issue) {
      return <span>{line}</span>;
    }

    const isFlash = flashIssueId === issue.id;
    const isActive = activeIssueId === issue.id;

    let highlightClass = "ats-highlight-weak";
    if (issue.type === 'missing_metric') highlightClass = "ats-highlight-missing";
    else if (issue.type === 'filler_phrase') highlightClass = "ats-highlight-filler";

    return (
      <span className="relative inline-block w-full">
        <span 
          className={`cursor-pointer transition-colors rounded px-1 -mx-1 relative inline-block w-full ${
            isFlash ? 'bg-emerald-200 text-emerald-900 font-semibold' : highlightClass
          } ${isActive ? 'ring-2 ring-[#16324f] shadow-sm' : ''}`}
          onClick={() => onSelectIssue && onSelectIssue(isActive ? null : issue.id)}
        >
          {line}
          
          {/* Inline Popover */}
          <AnimatePresence>
            {isActive && !isFlash && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="fix-it-popover absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 p-4 sm:p-5 text-left cursor-auto max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  {issue.severity === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" /> : 
                   issue.severity === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" /> :
                   <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />}
                  
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-snug">{issue.title || issue.message}</p>
                      {issue.evidence && (
                        <p className="text-xs text-slate-500 mt-1 italic">{issue.evidence}</p>
                      )}
                    </div>
                    
                    {/* Suggested Replacement Section */}
                    {issue.replacement_text ? (
                      <div className="p-3 bg-[#16324f]/5 border border-[#16324f]/15 rounded-xl space-y-1">
                        <p className="text-[10px] text-[#16324f] font-bold uppercase tracking-wider">Suggested Replacement:</p>
                        <p className="text-xs font-semibold text-slate-800 leading-relaxed select-all">
                          "{issue.replacement_text}"
                        </p>
                      </div>
                    ) : null}

                    {/* Why This is Better Section */}
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Why This is Better:</p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {issue.explanation || issue.suggestion}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                      <button 
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                        onClick={() => onSelectIssue && onSelectIssue(null)}
                      >
                        Dismiss
                      </button>
                      <button 
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#16324f] hover:bg-[#0f2438] text-white text-xs font-bold rounded-full transition shadow-sm"
                        onClick={() => handleApplyFix(issue)}
                      >
                        <Check className="w-3.5 h-3.5" /> Apply Fix
                      </button>
                    </div>
                  </div>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-[8px] border-transparent border-t-stone-200" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] border-[7px] border-transparent border-t-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </span>
      </span>
    );
  };

  return (
    <div className="bg-white rounded-[28px] border border-stone-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Resume Content</h2>
          <p className="text-sm text-slate-500">Click highlighted text to review and apply fixes.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300" /> Weak Verb
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
             <div className="w-3 h-3 rounded-sm bg-rose-100 border border-rose-300" /> Missing Metric
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
             <div className="w-3 h-3 rounded-sm line-through text-slate-400 decoration-slate-400" /> Filler
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-8 font-body text-[15px] leading-relaxed text-slate-700 bg-white">
        {SECTION_ORDER.map(sectionName => {
          if (!sections[sectionName] || sections[sectionName].length === 0) return null;
          
          return (
            <div key={sectionName} className="mb-8 last:mb-0">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 select-none">
                {sectionName}
              </div>
              <div className="space-y-1.5">
                {sections[sectionName].map((line, idx) => (
                  <div key={idx} className="min-h-[1.5rem]">
                    {renderHighlightedLine(line)}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default FixItEditor;
