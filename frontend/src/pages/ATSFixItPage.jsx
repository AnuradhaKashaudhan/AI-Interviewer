import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import FixItEditor from '../components/ats/FixItEditor.jsx';
import FixItScorecard from '../components/ats/FixItScorecard.jsx';
import { runClientHeuristics } from '../utils/atsHeuristics.js';
import { buildApiUrl } from '../utils/apiConfig.js';
import { useATS } from '../context/ATSContext.jsx';

const ATSFixItPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const atsContext = useATS();
  
  // State
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [serverResults, setServerResults] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [previousScore, setPreviousScore] = useState(0);
  const [subScores, setSubScores] = useState({});
  const [issues, setIssues] = useState([]);
  const [totalInitialIssues, setTotalInitialIssues] = useState(0);
  const [activeIssueId, setActiveIssueId] = useState(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs for debouncing & initialization tracking
  const debounceTimer = useRef(null);
  const initializedRef = useRef(false);
  
  // Initialize from location state or ATSContext fallback ONCE on mount
  useEffect(() => {
    if (initializedRef.current) return;

    let initialText = "";
    let initialJd = "";
    let atsResults = null;

    // Prefer context data if context already has results from previous edits
    if (atsContext.resumeText && atsContext.results) {
      initialText = atsContext.resumeText;
      initialJd = atsContext.jobDescription || "";
      atsResults = atsContext.results;
    } else if (location.state && location.state.resumeText && location.state.atsResults) {
      initialText = location.state.resumeText;
      initialJd = location.state.jobDescription || "";
      atsResults = location.state.atsResults;
    } else {
      // Direct navigation without any state or stored ATS context, redirect back
      navigate('/ats-checker', { replace: true });
      return;
    }
    
    const cleanInitialText = (initialText || "").replace(/\s*\((add specific numbers|reduced load time by 40%|add numbers|add specific numbers[^\)]*)\)/gi, '');
    
    setResumeText(cleanInitialText);
    setJobDescription(initialJd);
    setServerResults(atsResults);
    
    setCurrentScore(atsResults.score);
    setPreviousScore(atsResults.score);
    setSubScores(atsResults.sub_scores || {});
    
    let initialIssues = atsResults.issues || [];
    
    if (initialIssues.length === 0) {
        const clientResults = runClientHeuristics(cleanInitialText, initialJd, atsResults);
        initialIssues = clientResults.issues;
        setSubScores(clientResults.sub_scores);
    }
    
    setIssues(initialIssues);
    setTotalInitialIssues(initialIssues.length);
    initializedRef.current = true;
    setIsInitialized(true);
  }, [location.state, atsContext.resumeText, atsContext.results, atsContext.jobDescription, navigate]);

  // Run server re-check (debounced)
  const runServerRecheck = useCallback(async (currentText) => {
    if (!currentText) return;
    
    try {
        setIsReanalyzing(true);
        const response = await fetch(buildApiUrl('/api/ats-recheck'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resume_text: currentText,
                job_description: jobDescription
            })
        });
        
        if (!response.ok) throw new Error("Recheck failed");
        
        const data = await response.json();
        
        setServerResults(data);
        setPreviousScore(currentScore);
        setCurrentScore(data.score);
        setSubScores(data.sub_scores || {});
        setIssues(data.issues || []);

        // Sync with ATSContext
        if (atsContext.updateFixItResults) {
          atsContext.updateFixItResults(currentText, data.score, data.sub_scores || {}, data.issues || [], data);
        }
        
    } catch (err) {
        console.error("Failed to run server recheck:", err);
    } finally {
        setIsReanalyzing(false);
    }
  }, [jobDescription, currentScore, atsContext]);

  // Handle applying a fix
  const handleApplyFix = async (issue) => {
    if (!resumeText || !issue) return;

    const targetLine = issue.line_text ? issue.line_text.trim() : "";
    const replacement = issue.replacement_text !== undefined ? issue.replacement_text : "";

    if (!replacement && targetLine) {
      console.warn("No replacement text available for issue:", issue);
      return;
    }

    let newText = resumeText;

    if (targetLine) {
      const lines = newText.split('\n');
      let replaced = false;

      // Clean target for matching (remove bullet symbols and trim)
      const cleanTarget = targetLine.replace(/^[-•*–►]\s*/, '').trim().toLowerCase();

      // Find exact or closest line in resumeText
      const lineIdx = lines.findIndex(l => {
        const cleanL = l.replace(/^[-•*–►]\s*/, '').trim().toLowerCase();
        if (!cleanL) return false;
        return (
          cleanL === cleanTarget ||
          cleanL.includes(cleanTarget) ||
          cleanTarget.includes(cleanL) ||
          (cleanL.length > 20 && cleanTarget.length > 20 && cleanL.slice(0, 30) === cleanTarget.slice(0, 30))
        );
      });

      if (lineIdx !== -1) {
        const origLine = lines[lineIdx];
        const hasBullet = /^[-•*–►]/.test(origLine.trim());
        const bulletChar = hasBullet ? origLine.trim()[0] + " " : "";

        let cleanRep = replacement.replace(/^[-•*–►]\s*/, '').trim();
        lines[lineIdx] = bulletChar + cleanRep;
        newText = lines.join('\n');
        replaced = true;
      }

      if (!replaced) {
        // Fallback: regex search across full text
        const escapedTarget = targetLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        const regex = new RegExp(escapedTarget, 'i');
        if (regex.test(newText)) {
          newText = newText.replace(regex, replacement);
          replaced = true;
        }
      }

      if (!replaced) {
        console.warn("Target line not found in resume content:", targetLine);
        return;
      }
    } else if (replacement) {
      // Section / Contact / Keyword insertion
      newText = newText.trim() + "\n\n" + replacement;
    } else {
      return;
    }

    // Update canonical state & UI immediately
    setResumeText(newText);
    setActiveIssueId(null);
    setIsReanalyzing(true);

    // Fast client-side recalculation for instant feedback
    const clientResults = runClientHeuristics(newText, jobDescription, serverResults);
    setPreviousScore(currentScore);
    setCurrentScore(clientResults.score);
    setSubScores(clientResults.sub_scores);
    setIssues(clientResults.issues);

    if (atsContext.updateFixItResults) {
      atsContext.updateFixItResults(newText, clientResults.score, clientResults.sub_scores, clientResults.issues, clientResults);
    }

    // Trigger full server re-analysis
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runServerRecheck(newText);
    }, 300);
  };

  if (!isInitialized) {
      return (
          <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="w-8 h-8 animate-spin text-[#16324f]" />
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => navigate('/ats-checker')}
            className="p-2 rounded-full hover:bg-stone-200 text-slate-500 transition-colors"
          >
              <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
              <h1 className="text-2xl font-display font-bold text-slate-900">Fix My Resume</h1>
              <p className="text-sm text-slate-500">Review flagged issues and apply suggestions to boost your score.</p>
          </div>
      </div>

      {/* Split Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* Left Pane: Editor */}
        <div className="lg:col-span-7 xl:col-span-8 h-full">
            <FixItEditor 
                resumeText={resumeText} 
                issues={issues}
                activeIssueId={activeIssueId}
                onSelectIssue={setActiveIssueId}
                onApplyFix={handleApplyFix}
            />
        </div>
        
        {/* Right Pane: Scorecard */}
        <div className="lg:col-span-5 xl:col-span-4 h-full">
            <FixItScorecard 
                score={currentScore}
                previousScore={previousScore}
                subScores={subScores}
                issues={issues}
                totalInitialIssues={totalInitialIssues}
                isReanalyzing={isReanalyzing}
                activeIssueId={activeIssueId}
                onSelectIssue={setActiveIssueId}
                onApplyFix={handleApplyFix}
            />
        </div>

      </div>
    </div>
  );
};

export default ATSFixItPage;
