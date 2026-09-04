import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Send, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu, 
  Sparkles, 
  AlertCircle, 
  Code2, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Loader2,
  Lock,
  RotateCcw
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const CodingRoundCard = ({ sessionId, apiFetch, onNextQuestion, recordMonitoringEvent }) => {
  const [questionData, setQuestionData] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [errorNotice, setErrorNotice] = useState('');
  
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [isLanguageLocked, setIsLanguageLocked] = useState(false);

  const [runLoading, setRunLoading] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(true);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitResults, setSubmitResults] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Fetch coding question for current session
  const fetchQuestion = async () => {
    setLoadingQuestion(true);
    setErrorNotice('');
    try {
      const fetchFn = apiFetch || fetch;
      const targetSessionId = sessionId || 'default';
      const res = await fetchFn(`${API_BASE_URL}/api/interview/${targetSessionId}/coding-question`);
      if (!res.ok) {
        throw new Error(`Failed to load coding question (status ${res.status})`);
      }
      const data = await res.json();
      setQuestionData(data);
      const initialLang = 'python';
      setLanguage(initialLang);
      const template = data.starter_code?.[initialLang] || '# Write your solution here\n';
      setCode(template);
    } catch (err) {
      console.error('Error fetching coding question:', err);
      setErrorNotice('Unable to load coding problem. Please check connection and click Retry.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, [sessionId]);

  const handleLanguageChange = (newLang) => {
    if (isLanguageLocked) return;
    setLanguage(newLang);
    const template = questionData?.starter_code?.[newLang] || '// Write your solution here\n';
    setCode(template);
    setRunResults(null);
  };

  const handleCodeChange = (newCode) => {
    const val = newCode || '';
    setCode(val);
    if (!isLanguageLocked && val.trim().length > 0) {
      setIsLanguageLocked(true);
    }
  };

  const handleRunCode = async () => {
    if (!code.trim() || runLoading || submitLoading) return;
    setRunLoading(true);
    setErrorNotice('');
    try {
      const fetchFn = apiFetch || fetch;
      const targetSessionId = sessionId || 'default';
      const res = await fetchFn(`${API_BASE_URL}/api/interview/${targetSessionId}/run-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          question_id: questionData?.id
        })
      });
      if (!res.ok) {
        throw new Error('Code execution runner failed');
      }
      const data = await res.json();
      setRunResults(data);
      setIsTerminalExpanded(true);
    } catch (err) {
      console.error('Run code error:', err);
      setErrorNotice('Code execution service unavailable or timed out. Please try again.');
    } finally {
      setRunLoading(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!code.trim() || submitLoading) return;
    setSubmitLoading(true);
    setErrorNotice('');
    try {
      const fetchFn = apiFetch || fetch;
      const targetSessionId = sessionId || 'default';
      const res = await fetchFn(`${API_BASE_URL}/api/interview/${targetSessionId}/submit-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          question_id: questionData?.id
        })
      });
      if (!res.ok) {
        throw new Error('Code submission failed');
      }
      const data = await res.json();
      setSubmitResults(data);
      setHasSubmitted(true);
    } catch (err) {
      console.error('Submit code error:', err);
      setErrorNotice('Code evaluation failed. Please check network and try submitting again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loadingQuestion) {
    return (
      <div className="surface-card p-12 flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#8a5d2f]" />
        <p className="font-bold text-slate-800">Loading Coding Challenge...</p>
        <div className="w-full max-w-md space-y-2">
          <div className="h-4 bg-stone-200 rounded animate-pulse w-3/4 mx-auto" />
          <div className="h-4 bg-stone-200 rounded animate-pulse w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (errorNotice && !questionData) {
    return (
      <div className="surface-card p-12 flex flex-col items-center justify-center min-h-[450px] text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Failed to Load Coding Problem</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">{errorNotice}</p>
        </div>
        <button
          onClick={fetchQuestion}
          className="primary-action px-8 py-3 rounded-full font-bold text-sm flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Retry Fetch
        </button>
      </div>
    );
  }

  const difficultyColor = 
    questionData?.difficulty === 'hard' ? 'bg-rose-50 text-rose-700 border-rose-200' :
    questionData?.difficulty === 'medium' ? 'bg-amber-50 text-amber-900 border-amber-200' :
    'bg-emerald-50 text-emerald-800 border-emerald-200';

  return (
    <div className="w-full flex flex-col gap-6 text-slate-900">
      {errorNotice && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice('')} className="text-xs font-bold underline text-rose-800">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Coding Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Problem Statement & Test Cases */}
        <div className="lg:col-span-5 surface-card p-6 flex flex-col gap-5 max-h-[700px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-4">
            <div>
              <div className="section-eyebrow text-[#16324f] flex items-center gap-1.5 mb-1">
                <Code2 className="w-4 h-4" /> {questionData?.category || 'Technical Coding'}
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">{questionData?.title || 'Coding Challenge'}</h2>
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${difficultyColor}`}>
              {questionData?.difficulty || 'Medium'}
            </span>
          </div>

          {/* Question Description */}
          <div className="prose prose-slate text-sm leading-relaxed whitespace-pre-line text-slate-700 bg-white p-4 rounded-2xl border border-stone-200">
            {questionData?.question_text}
          </div>

          {/* Sample Test Cases (Visible) */}
          {questionData?.sample_test_cases && questionData.sample_test_cases.length > 0 && (
            <div className="space-y-3">
              <div className="section-eyebrow text-[#8a5d2f]">Sample Test Cases (Visible)</div>
              {questionData.sample_test_cases.map((tc, idx) => (
                <div key={idx} className="bg-[#f8f4ec] p-3.5 rounded-2xl border border-stone-200 text-xs font-mono space-y-1.5">
                  <div className="flex gap-2">
                    <span className="text-[#8a5d2f] font-bold uppercase text-[10px]">Input:</span>
                    <span className="text-slate-800">{tc.input}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-700 font-bold uppercase text-[10px]">Expected:</span>
                    <span className="text-slate-800">{tc.expected}</span>
                  </div>
                  {tc.explanation && (
                    <p className="text-[11px] font-sans text-slate-500 italic pt-1">{tc.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Code Editor & Action Bar */}
        <div className="lg:col-span-7 surface-card p-6 flex flex-col gap-4">
          {/* Header Controls: Language Selector & Freeze Status */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Language:</label>
              <select
                value={language}
                disabled={isLanguageLocked}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold bg-white text-slate-800 transition-colors ${
                  isLanguageLocked ? 'border-stone-200 opacity-65 cursor-not-allowed' : 'border-stone-300 hover:border-stone-400'
                }`}
              >
                <option value="python">Python 3</option>
                <option value="cpp">C++ (GCC)</option>
                <option value="java">Java 17</option>
                <option value="c">C (GCC)</option>
              </select>
              {isLanguageLocked && (
                <span className="text-[10px] text-amber-800 font-medium flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Lock className="w-3 h-3" /> Locked for attempt
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Live Monaco Sandbox
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="rounded-2xl border border-stone-300 overflow-hidden shadow-inner bg-white">
            <Editor
              height="340px"
              theme="vs-light"
              language={language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : language === 'c' ? 'c' : 'python'}
              value={code}
              onChange={handleCodeChange}
              onPaste={(event) => {
                const pastedText = event.clipboardData?.getData('text') || '';
                if (pastedText.length > 60 && recordMonitoringEvent) {
                  recordMonitoringEvent(
                    'large_paste',
                    'A large paste was detected in the coding editor.',
                    'amber',
                    'coding'
                  );
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* Action Buttons: Run vs Submit Split */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={handleRunCode}
              disabled={runLoading || submitLoading || !code.trim()}
              className="secondary-action py-3 px-6 rounded-full text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {runLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#8a5d2f]" /> : <Play className="w-4 h-4 text-[#8a5d2f]" />}
              <span>{runLoading ? 'Running Tests...' : 'Run (Sample Tests)'}</span>
            </button>

            <button
              onClick={handleSubmitCode}
              disabled={submitLoading || runLoading || !code.trim()}
              className="primary-action py-3 px-8 rounded-full text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
              <span>{submitLoading ? 'Evaluating Submission...' : 'Submit Solution'}</span>
            </button>
          </div>

          {/* Run Output Panel (Collapsible Dark Terminal) */}
          {runResults && (
            <div className="mt-2 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 overflow-hidden font-mono text-xs shadow-md">
              <div 
                onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
                className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-sans font-bold text-xs">Run Output — Sample Tests ({runResults.passed_tests}/{runResults.total_tests} Passed)</span>
                </div>
                {isTerminalExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {isTerminalExpanded && (
                <div className="p-4 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                  {runResults.test_details?.map((td, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-sans">
                        <span className="font-bold text-slate-300">Test Case {i+1}</span>
                        <span className={`px-2 py-0.5 rounded font-bold ${td.passed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                          {td.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      <div className="text-slate-400">Input: {td.input}</div>
                      <div className="text-slate-400">Expected: {td.expected}</div>
                      <div className={td.passed ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        Output: {td.actual || '(no stdout output)'}
                      </div>
                      {td.stderr && (
                        <div className="text-rose-300 text-[11px] pt-1">Error: {td.stderr}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit Evaluation Results Panel (Framer Motion Animation) */}
      <AnimatePresence>
        {submitResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="surface-card p-6 md:p-8 border-2 border-emerald-500/20 shadow-xl space-y-6"
          >
            {/* Header Score Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-200 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#16324f] text-2xl font-extrabold shadow-sm">
                  {submitResults.score}/100
                </div>
                <div>
                  <div className="section-eyebrow text-[#8a5d2f]">Live Submission Evaluation</div>
                  <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3 mt-0.5">
                    <span>{submitResults.score >= 80 ? 'Outstanding Code!' : submitResults.score >= 50 ? 'Solid Attempt' : 'Needs Optimization'}</span>
                    <span className="text-xs px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 font-bold">
                      {submitResults.passed_tests}/{submitResults.total_tests} Hidden Tests Passed
                    </span>
                  </h3>
                </div>
              </div>

              {/* Next Question CTA */}
              <button
                onClick={onNextQuestion}
                className="primary-action py-3.5 px-8 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-md"
              >
                <span>Continue to Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Test Case Pass Rate & Metrics Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-stone-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#8a5d2f]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Test Case Pass Rate</div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {Math.round((submitResults.passed_tests / submitResults.total_tests) * 100)}%
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-stone-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#16324f]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Time Complexity</div>
                  <div className="text-lg font-extrabold text-slate-900">{submitResults.complexity?.time || 'O(N)'}</div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-stone-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Space Complexity</div>
                  <div className="text-lg font-extrabold text-slate-900">{submitResults.complexity?.space || 'O(1)'}</div>
                </div>
              </div>
            </div>

            {/* AI Qualitative Feedback & Strengths Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#f8f4ec] p-5 rounded-2xl border border-stone-200 space-y-3">
                <div className="section-eyebrow text-[#8a5d2f] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> AI Feedback Summary
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{submitResults.feedback}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
                <div className="section-eyebrow text-emerald-800">Key Strengths</div>
                <ul className="space-y-2">
                  {submitResults.evaluation?.strengths?.map((str, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                      <span className="text-emerald-700 font-bold mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Model Suggested Solution / Improvement */}
            {submitResults.suggested_improvement && (
              <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
                <div className="section-eyebrow text-[#16324f] flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" /> Model Refactored Solution & Improvement
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  {submitResults.suggested_improvement}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CodingRoundCard;
