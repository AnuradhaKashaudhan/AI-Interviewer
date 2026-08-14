import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles, FileText, Check, AlertTriangle, AlertCircle } from 'lucide-react';

const STAGES = [
  { id: 'upload', label: 'Uploading document', durationRange: [400, 700] },
  { id: 'extract', label: 'Extracting text from PDF', durationRange: [500, 800] },
  { id: 'sections', label: 'Detecting resume sections', durationRange: [600, 1000] },
  { id: 'formatting', label: 'Scanning for ATS-breaking formatting', durationRange: [400, 700] },
  { id: 'keywords', label: 'Matching JD keywords', durationRange: [600, 1000] },
  { id: 'score', label: 'Calculating match score', durationRange: [800, 1200] }
];

const getRandomDuration = (range) => Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

const ATSParsingSequence = ({ results, onComplete }) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState([]);
  const [animatedWordCount, setAnimatedWordCount] = useState(0);
  const [revealedSections, setRevealedSections] = useState([]);
  const [revealedKeywords, setRevealedKeywords] = useState([]);
  const [revealedFormatting, setRevealedFormatting] = useState([]);

  const currentStage = STAGES[currentStageIndex];

  // Stage Progression Logic
  useEffect(() => {
    if (!currentStage) return;

    // Fast-track keywords stage if no JD/keywords to match
    if (currentStage.id === 'keywords' && (!results.matched_keywords || results.matched_keywords.length === 0) && (!results.missing_keywords || results.missing_keywords.length === 0)) {
        handleStageComplete();
        return;
    }

    const duration = getRandomDuration(currentStage.durationRange);
    
    // Setup interval animations during the stage duration
    let intervalId;
    
    if (currentStage.id === 'extract') {
        const targetWords = results.word_count || 450;
        const steps = 10;
        const stepTime = duration / steps;
        let step = 0;
        
        intervalId = setInterval(() => {
            step++;
            setAnimatedWordCount(Math.floor((targetWords / steps) * step));
            if (step >= steps) clearInterval(intervalId);
        }, stepTime);
    } 
    else if (currentStage.id === 'sections') {
        const sections = results.sections_found || [];
        const stepTime = duration / Math.max(sections.length, 1);
        let step = 0;
        
        intervalId = setInterval(() => {
            if (step < sections.length) {
                setRevealedSections(prev => [...new Set([...prev, sections[step]])]);
                step++;
            } else {
                clearInterval(intervalId);
            }
        }, stepTime);
    }
    else if (currentStage.id === 'formatting') {
        const issues = results.formatting_issues || [];
        if (issues.length > 0) {
            const stepTime = duration / issues.length;
            let step = 0;
            intervalId = setInterval(() => {
                if (step < issues.length) {
                    setRevealedFormatting(prev => [...prev, issues[step]]);
                    step++;
                } else {
                    clearInterval(intervalId);
                }
            }, stepTime);
        }
    }
    else if (currentStage.id === 'keywords') {
        const allKeywords = [...(results.matched_keywords || []), ...(results.missing_keywords || [])].sort(() => 0.5 - Math.random()).slice(0, 8); // Show up to 8 max for animation
        const stepTime = duration / Math.max(allKeywords.length, 1);
        let step = 0;
        
        intervalId = setInterval(() => {
            if (step < allKeywords.length) {
                setRevealedKeywords(prev => [...prev, allKeywords[step]]);
                step++;
            } else {
                clearInterval(intervalId);
            }
        }, stepTime);
    }

    // Move to next stage
    const timeoutId = setTimeout(() => {
      handleStageComplete();
    }, duration);

    return () => {
        clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
    };
  }, [currentStageIndex, results]);

  const handleStageComplete = () => {
    setCompletedStages(prev => [...prev, currentStage.id]);
    if (currentStageIndex < STAGES.length - 1) {
      setCurrentStageIndex(prev => prev + 1);
    } else {
      setTimeout(onComplete, 500); // Brief pause before showing results
    }
  };

  const handleSkip = () => {
    setCompletedStages(STAGES.map(s => s.id));
    setCurrentStageIndex(STAGES.length);
    setAnimatedWordCount(results.word_count || 0);
    setRevealedSections(results.sections_found || []);
    setRevealedKeywords([...(results.matched_keywords || []), ...(results.missing_keywords || [])]);
    setRevealedFormatting(results.formatting_issues || []);
    onComplete();
  };

  const getStageContent = (stage) => {
    switch (stage.id) {
        case 'upload':
            return <div className="h-2 w-full max-w-[200px] bg-stone-100 rounded-full overflow-hidden mt-2">
                <motion.div 
                    className="h-full bg-emerald-500" 
                    initial={{ width: 0 }} 
                    animate={{ width: "100%" }} 
                    transition={{ duration: getRandomDuration(stage.durationRange) / 1000 }} 
                />
            </div>;
            
        case 'extract':
            return <div className="text-sm font-mono text-slate-500 mt-2">
                Extracted <span className="font-bold text-slate-800">{animatedWordCount}</span> words
            </div>;
            
        case 'sections':
            return <div className="flex flex-wrap gap-2 mt-2">
                <AnimatePresence>
                    {revealedSections.map(sec => (
                        <motion.span 
                            key={sec}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold"
                        >
                            <Check className="w-3 h-3" /> {sec}
                        </motion.span>
                    ))}
                </AnimatePresence>
            </div>;
            
        case 'formatting':
            if (revealedFormatting.length === 0 && completedStages.includes('formatting')) {
                return <div className="text-sm text-emerald-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Clean formatting detected
                </div>;
            }
            return <div className="flex flex-col gap-2 mt-2">
                <AnimatePresence>
                    {revealedFormatting.map((issue, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200"
                        >
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            {typeof issue === 'string' ? issue : (issue?.label || 'Formatting issue')}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>;

        case 'keywords':
            if (revealedKeywords.length === 0) return null;
            return <div className="flex flex-wrap gap-1 mt-2">
                <AnimatePresence>
                    {revealedKeywords.map(kw => {
                        const isMatch = (results.matched_keywords || []).includes(kw);
                        return (
                            <motion.span 
                                key={kw}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    isMatch 
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                        : 'bg-stone-100 text-stone-500 border border-stone-200'
                                }`}
                            >
                                {kw}
                            </motion.span>
                        )
                    })}
                </AnimatePresence>
            </div>;
            
        case 'score':
            return <div className="text-sm text-slate-500 mt-2">
                Running heuristic analysis...
            </div>;
            
        default:
            return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 items-center justify-center py-12">
      
      {/* Central Animation Area */}
      <div className="relative flex items-center justify-center">
         <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 rounded-full border border-dashed border-[#16324f]/20 flex items-center justify-center"
         >
            <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#16324f]/5 to-emerald-500/5 flex items-center justify-center"
            >
                {currentStageIndex < STAGES.length ? (
                   <Loader2 className="w-8 h-8 text-[#16324f] animate-spin" />
                ) : (
                   <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                )}
            </motion.div>
         </motion.div>
         <div className="absolute -top-4 -right-4">
             <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
         </div>
      </div>

      {/* Stage Tracker */}
      <div className="w-full space-y-4">
         {STAGES.map((stage, idx) => {
             const isActive = idx === currentStageIndex;
             const isComplete = completedStages.includes(stage.id);
             const isFuture = idx > currentStageIndex;

             // Fast-track keywords stage hiding if skipped
             if (stage.id === 'keywords' && (!results.matched_keywords?.length && !results.missing_keywords?.length)) {
                 if (isFuture || isComplete) return null; // Don't show if there are no keywords and we skipped it
             }

             return (
                 <motion.div 
                    key={stage.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                        opacity: isFuture ? 0.3 : 1, 
                        y: 0,
                        scale: isActive ? 1.02 : 1
                    }}
                    className={`p-4 rounded-2xl border transition-all ${
                        isActive 
                            ? 'bg-white border-[#16324f]/20 shadow-lg shadow-[#16324f]/5' 
                            : isComplete
                                ? 'bg-stone-50 border-stone-200'
                                : 'bg-transparent border-transparent'
                    }`}
                 >
                     <div className="flex items-start gap-3">
                         <div className="mt-0.5 flex-shrink-0">
                             {isComplete ? (
                                 <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                             ) : isActive ? (
                                 <div className="w-5 h-5 rounded-full border-2 border-[#16324f] border-t-transparent animate-spin" />
                             ) : (
                                 <div className="w-5 h-5 rounded-full border-2 border-stone-200" />
                             )}
                         </div>
                         <div className="flex-1">
                             <h4 className={`font-semibold ${isActive ? 'text-[#16324f]' : isComplete ? 'text-slate-700' : 'text-slate-400'}`}>
                                 {stage.label}
                             </h4>
                             {(isActive || isComplete) && (
                                 <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                 >
                                     {getStageContent(stage)}
                                 </motion.div>
                             )}
                         </div>
                     </div>
                 </motion.div>
             )
         })}
      </div>

      {/* Skip Button */}
      {currentStageIndex < STAGES.length && (
          <button 
            onClick={handleSkip}
            className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition underline underline-offset-4"
          >
              Skip animation →
          </button>
      )}
    </div>
  );
};

export default ATSParsingSequence;
