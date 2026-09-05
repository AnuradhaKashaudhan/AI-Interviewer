import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import FixItEditor from '../components/ats/FixItEditor.jsx';
import FixItScorecard from '../components/ats/FixItScorecard.jsx';
import { runClientHeuristics } from '../utils/atsHeuristics.js';
import { API_BASE_URL, buildApiUrl } from '../utils/apiConfig.js';

const ATSFixItPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [serverResults, setServerResults] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [previousScore, setPreviousScore] = useState(0);
  const [subScores, setSubScores] = useState({});
  const [issues, setIssues] = useState([]);
  const [totalInitialIssues, setTotalInitialIssues] = useState(0);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs for debouncing
  const debounceTimer = useRef(null);
  
  // Initialize from location state
  useEffect(() => {
    if (!location.state || !location.state.resumeText || !location.state.atsResults) {
      // Direct navigation without state, redirect back
      navigate('/ats-checker', { replace: true });
      return;
    }
    
    const { resumeText: initialText, jobDescription: initialJd, atsResults } = location.state;
    
    const rawInitialText = initialText || "";
    const cleanInitialText = rawInitialText.replace(/\s*\((add specific numbers|reduced load time by 40%|add numbers|add specific numbers[^\)]*)\)/gi, '');
    
    setResumeText(cleanInitialText);
    setJobDescription(initialJd || "");
    setServerResults(atsResults);
    
    setCurrentScore(atsResults.score);
    setPreviousScore(atsResults.score);
    setSubScores(atsResults.sub_scores || {});
    
    // We use the server issues if available, otherwise run heuristics
    let initialIssues = atsResults.issues || [];
    
    // If the backend didn't send issues (e.g. old backend version), fallback to client
    if (initialIssues.length === 0) {
        const clientResults = runClientHeuristics(cleanInitialText, initialJd, atsResults);
        initialIssues = clientResults.issues;
        setSubScores(clientResults.sub_scores);
    }
    
    setIssues(initialIssues);
    setTotalInitialIssues(initialIssues.length);
    setIsInitialized(true);
  }, [location.state, navigate]);

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
        
    } catch (err) {
        console.error("Failed to run server recheck:", err);
    } finally {
        setIsReanalyzing(false);
    }
  }, [jobDescription, currentScore]);

  // Handle applying a fix
  const handleApplyFix = (issue) => {
    if (!resumeText || !issue) return;
    
    let newText = resumeText;
    
    // Perform text replacement ONLY for specific actionable issue types with valid replacements.
    if (issue.type === 'weak_verb' && issue.replacement_text) {
        newText = newText.replace(issue.line_text, issue.replacement_text);
    } else if (issue.type === 'filler_phrase') {
        if (issue.suggestion.includes("(Remove this line entirely)") || !issue.replacement_text) {
            newText = newText.replace(issue.line_text, "");
        } else {
            newText = newText.replace(issue.line_text, issue.replacement_text);
        }
    } else {
        // For missing_metric or general advice issues, NEVER append advice text into resumeText.
        // Dismiss the issue prompt from the active scorecard list so the user can edit manually.
        setIssues(prev => prev.filter(i => i.id !== issue.id));
        return;
    }
    
    setResumeText(newText);
    
    // Instantly run client heuristics for snappiness
    const clientResults = runClientHeuristics(newText, jobDescription, serverResults);
    
    setPreviousScore(currentScore);
    setCurrentScore(clientResults.score);
    setSubScores(clientResults.sub_scores);
    setIssues(prev => prev.filter(i => i.id !== issue.id));
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
        runServerRecheck(newText);
    }, 1200);
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
            />
        </div>

      </div>
    </div>
  );
};

export default ATSFixItPage;
