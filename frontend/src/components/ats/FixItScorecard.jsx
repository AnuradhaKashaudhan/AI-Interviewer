import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, CheckCircle2, ChevronRight, Download, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

const SubScoreBar = ({ label, score, previousScore }) => {
  const diff = score - (previousScore ?? score);
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <div className="flex items-center gap-2">
          {diff !== 0 && (
            <motion.span 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-bold ${diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}%
            </motion.span>
          )}
          <span className="font-bold text-slate-900">{score}%</span>
        </div>
      </div>
      <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
        <motion.div 
          className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
          initial={{ width: `${previousScore ?? score}%` }}
          animate={{ width: `${score}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />
      </div>
    </div>
  );
};

const FixItScorecard = ({ 
    score, 
    previousScore, 
    subScores, 
    issues, 
    totalInitialIssues, 
    isReanalyzing 
}) => {
  const issuesFixed = totalInitialIssues - issues.length;
  const isPerfect = issues.length === 0;

  return (
    <div className="bg-white rounded-[28px] border border-stone-200 shadow-sm flex flex-col h-[calc(100vh-8rem)] sticky top-24">
      {/* Top Score Section */}
      <div className="p-8 border-b border-stone-100 relative overflow-hidden">
        {isReanalyzing && (
           <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-[#16324f] animate-spin opacity-50" />
           </div>
        )}
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800 mb-2">Live Score</div>
            <div className="flex items-baseline gap-2">
                <motion.div 
                    key={score}
                    initial={{ scale: 0.9, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-6xl font-black tracking-tighter ${score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-700' : 'text-rose-700'}`}
                >
                    {score}
                </motion.div>
                <span className="text-2xl font-bold text-slate-300">/100</span>
            </div>
          </div>
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${score >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : score >= 60 ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
              {score > (previousScore || score) ? <TrendingUp className="w-8 h-8" /> : 
               score < (previousScore || score) ? <TrendingDown className="w-8 h-8" /> : 
               <Sparkles className="w-8 h-8" />}
          </div>
        </div>

        {/* Sub Scores */}
        <div className="space-y-4">
          <SubScoreBar label="Keyword Match" score={subScores?.keyword_match || 0} />
          <SubScoreBar label="Format & Parseability" score={subScores?.formatting || 0} />
          <SubScoreBar label="Action Verbs" score={subScores?.action_verbs || 0} />
          <SubScoreBar label="Quantified Impact" score={subScores?.quantified_impact || 0} />
          <SubScoreBar label="Section Completeness" score={subScores?.section_completeness || 0} />
        </div>
      </div>

      {/* Issues Section */}
      <div className="flex-1 overflow-y-auto bg-stone-50/50 p-6 flex flex-col">
        {isPerfect ? (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center p-6 bg-emerald-50 border border-emerald-200 rounded-2xl"
            >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🎉</span>
                </div>
                <h3 className="text-lg font-bold text-emerald-900 mb-2">All flagged issues resolved!</h3>
                <p className="text-sm text-emerald-700 mb-6">Great job. Your resume is now highly optimized for ATS parsers.</p>
                <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full font-bold transition-colors shadow-lg shadow-emerald-600/20">
                    <Download className="w-4 h-4" /> Export as PDF
                </button>
            </motion.div>
        ) : (
            <>
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Issues Fixed</span>
                        <span className="text-xs font-bold text-slate-700">{issuesFixed} of {totalInitialIssues}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#16324f] rounded-full transition-all duration-500"
                            style={{ width: `${(issuesFixed / Math.max(totalInitialIssues, 1)) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Remaining Issues ({issues.length})</div>
                
                <div className="space-y-2 flex-1 overflow-y-auto pr-2 no-scrollbar">
                    <AnimatePresence>
                        {issues.slice(0, 8).map(issue => (
                            <motion.div 
                                key={issue.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20, height: 0, margin: 0 }}
                                className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm flex items-start gap-3 group cursor-pointer hover:border-stone-300 transition-colors"
                            >
                                {issue.severity === 'error' ? <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" /> : 
                                 issue.severity === 'warning' ? <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" /> :
                                 <CheckCircle2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-slate-800 truncate">{issue.message}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">{issue.section}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-5px] group-hover:translate-x-0" />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {issues.length > 8 && (
                        <div className="text-center py-2 text-xs text-slate-400 font-medium">
                            + {issues.length - 8} more issues
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default FixItScorecard;
