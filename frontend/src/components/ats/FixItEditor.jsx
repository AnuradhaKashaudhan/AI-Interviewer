import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SECTION_ORDER = ["Contact", "Summary", "Experience", "Projects", "Education", "Skills", "Certifications", "General"];

const FixItEditor = ({ resumeText, issues, onApplyFix }) => {
  const [sections, setSections] = useState({});
  const [activeIssueId, setActiveIssueId] = useState(null);
  const [flashIssueId, setFlashIssueId] = useState(null);

  // Group text by section, maintaining order as best as possible
  useEffect(() => {
    const lines = resumeText.split('\n');
    const grouped = {};
    
    // Simple heuristic to split text into sections matching the issues
    let currentSection = "General";
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Look for a section change
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
    setActiveIssueId(null);
    onApplyFix(issue);
  };

  const renderHighlightedLine = (line, sectionName) => {
    // Find if this line has any active issues
    const lineIssues = issues.filter(i => 
      i.section === sectionName && 
      i.line_text && 
      line.includes(i.line_text)
    );

    if (lineIssues.length === 0) {
      return <span>{line}</span>;
    }

    // For simplicity, just use the first issue found on this line
    const issue = lineIssues[0];
    const isFlash = flashIssueId === issue.id;

    let highlightClass = "";
    if (issue.type === 'weak_verb') highlightClass = "ats-highlight-weak";
    else if (issue.type === 'missing_metric') highlightClass = "ats-highlight-missing";
    else if (issue.type === 'filler_phrase') highlightClass = "ats-highlight-filler";
    
    // Split the line into three parts: before, matched, after
    const matchIndex = line.indexOf(issue.line_text);
    if (matchIndex === -1) return <span>{line}</span>;

    const before = line.substring(0, matchIndex);
    const matched = issue.line_text;
    const after = line.substring(matchIndex + matched.length);

    return (
      <span className="relative inline-block w-full">
        <span>{before}</span>
        <span 
          className={`cursor-pointer transition-colors rounded px-1 -mx-1 relative ${
            isFlash ? 'bg-emerald-200 text-emerald-900' : highlightClass
          } ${activeIssueId === issue.id ? 'ring-2 ring-[#16324f]' : ''}`}
          onClick={() => setActiveIssueId(activeIssueId === issue.id ? null : issue.id)}
        >
          {matched}
          
          {/* Inline Popover */}
          <AnimatePresence>
            {activeIssueId === issue.id && !isFlash && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="fix-it-popover absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 p-4 text-left cursor-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  {issue.severity === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" /> : 
                   issue.severity === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" /> :
                   <Info className="w-5 h-5 text-blue-500 mt-0.5" />}
                  
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{issue.message}</p>
                    
                    <div className="mt-3 p-2 bg-stone-50 border border-stone-200 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">Suggested Fix:</p>
                      <p className="text-sm text-slate-700 font-medium">{issue.suggestion}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button 
                        className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                        onClick={() => setActiveIssueId(null)}
                      >
                        Dismiss
                      </button>
                      <button 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16324f] hover:bg-[#0f2438] text-white text-xs font-semibold rounded-lg transition shadow-sm"
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
        <span>{after}</span>
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
                    {renderHighlightedLine(line, sectionName)}
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
