import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Rocket, Target, ShieldAlert, Sparkles, BookOpen, 
  Map, FileCode, CheckCircle2, ChevronRight, Lock, 
  ArrowRight, ListChecks, AlertTriangle, Workflow, GitMerge, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getAuthToken } from '../services/authApi.js';
import { buildApiUrl } from '../utils/apiConfig.js';

const LOADING_STEPS = [
  "Collecting your career data...",
  "Analyzing your resume and ATS performance...",
  "Analyzing your technical profile...",
  "Finding cross-feature skill gaps...",
  "Retrieving relevant knowledge...",
  "Building your career strategy...",
  "Creating your personalized roadmap...",
  "Validating your career audit..."
];

export default function CareerIntelligencePage() {
  const navigate = useNavigate();
  const { entitlements } = useAuth();
  const [targetRole, setTargetRole] = useState('');
  const [report, setReport] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const [isUpgradeRequired, setIsUpgradeRequired] = useState(false);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch(buildApiUrl('/api/career-intelligence/latest'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReport(data);
          setTargetRole(data.target_role || '');
        }
      } catch (err) {
        console.error("No recent report found", err);
      }
    };
    fetchLatest();
  }, []);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const generateReport = async (e) => {
    e.preventDefault();
    if (!targetRole.trim()) return;

    setLoading(true);
    setError(null);
    setIsUpgradeRequired(false);
    setReport(null);

    try {
      const token = getAuthToken();
      const response = await fetch(buildApiUrl('/api/career-intelligence/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target_role: targetRole })
      });

      if (response.status === 403) {
        const errData = await response.json();
        if (errData.detail?.code === 'UPGRADE_REQUIRED') {
          setIsUpgradeRequired(true);
          setLoading(false);
          return;
        }
      }

      if (!response.ok) {
        throw new Error("Failed to generate career report.");
      }

      const data = await response.json();
      setReport(data.final_report || data);
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const readinessColor = {
    "Strong": "text-emerald-700 bg-emerald-50 border-emerald-200",
    "Developing": "text-amber-700 bg-amber-50 border-amber-200",
    "Needs Improvement": "text-rose-700 bg-rose-50 border-rose-200"
  }[report?.insights?.readiness] || "text-slate-700 bg-slate-50 border-slate-200";

  const isPro = entitlements?.plan_id === 'pro';
  const isAdvanced = entitlements?.plan_id === 'advanced';
  
  if (isUpgradeRequired || (entitlements && !['pro', 'advanced'].includes(entitlements.plan_id))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6 border border-rose-100">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-display font-bold text-slate-900 mb-3">Upgrade Required</h2>
        <p className="text-slate-600 mb-8 max-w-md">
          AI Career Intelligence is a premium feature available on Pro and Advanced plans. 
          Upgrade to unlock personalized career insights, skill gap analysis, and tailored roadmaps.
        </p>
        <button 
          onClick={() => navigate('/pricing')}
          className="bg-[#16324f] text-white px-8 py-3 rounded-full font-bold hover:bg-[#0f2438] transition flex items-center gap-2"
        >
          View Pricing Plans <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const hasAdvancedFeatures = report?.career_strategy || report?.cross_feature_gaps?.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 bg-white rounded-[28px] border border-stone-200 p-8 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8a5d2f] mb-3">
            <Brain className="w-4 h-4" />
            {isAdvanced ? "Full Agentic Career Audit" : "AI Career Intelligence"}
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
            Your personalized career analysis
          </h1>
          <p className="text-slate-600 max-w-xl">
            {isAdvanced 
              ? "An in-depth cross-feature analysis merging your resume, ATS, coding, and interview data into a definitive career strategy."
              : "Generate an agentic analysis of your readiness for your target role based on your available data."}
          </p>
        </div>
        <form onSubmit={generateReport} className="flex items-center gap-3 w-full md:w-auto">
          <input 
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
            className="flex-1 md:w-64 bg-stone-50 border border-stone-200 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-[#16324f]"
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#16324f] text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-[#0f2438] transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? 'Analyzing...' : (report ? 'Re-Analyze' : 'Analyze')}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl flex items-center gap-3 border border-rose-200">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Loading State */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[28px] border border-stone-200 p-12 text-center shadow-sm"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-stone-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#16324f] border-t-transparent animate-spin"></div>
              <Brain className="absolute inset-0 m-auto w-8 h-8 text-[#16324f]" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Agentic Analysis in Progress</h3>
            <p className="text-sm font-medium text-[#8a5d2f] tracking-wide uppercase transition-all duration-300">
              {LOADING_STEPS[loadingStep]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report View */}
      {!loading && report && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Executive Summary / Career Readiness & Data Sources */}
          <div className="grid md:grid-cols-[2fr,1fr] gap-6">
            <div className="bg-white rounded-[24px] border border-stone-200 p-6 sm:p-8 relative overflow-hidden">
              {hasAdvancedFeatures && (
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
              )}
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                <Target className="w-4 h-4" /> Executive Career Summary
              </div>
              <div className="flex items-baseline gap-4 mb-4">
                <h2 className="text-4xl font-display font-bold text-slate-900">{report.target_role}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${readinessColor}`}>
                  {report.insights?.readiness || "Unknown"}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed text-sm">
                {report.insights?.observations}
              </p>
            </div>
            
            <div className="bg-[#f8f4ec] rounded-[24px] border border-stone-200 p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-[#8a5d2f] mb-4 flex items-center gap-2">
                <Map className="w-4 h-4" /> Data Sources Used
              </div>
              <ul className="space-y-3">
                {['resume', 'interview', 'coding_profile'].map(source => {
                  const available = (report.available_data_sources || []).includes(source);
                  return (
                    <li key={source} className="flex items-center gap-3 text-sm">
                      {available ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-stone-300 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-stone-300 rounded-full"></div>
                        </div>
                      )}
                      <span className={available ? "text-slate-800 font-medium capitalize" : "text-slate-400 capitalize"}>
                        {source.replace('_', ' ')}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {/* Confidence Score for Advanced */}
              {hasAdvancedFeatures && (
                <div className="mt-6 pt-4 border-t border-[#8a5d2f]/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#8a5d2f] mb-2 flex items-center gap-2">
                    Analysis Confidence
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full" 
                        style={{ width: `${Math.round((report.confidence || 0) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{Math.round((report.confidence || 0) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advanced: Career Strategy Focus (if available) */}
          {hasAdvancedFeatures && report.career_strategy && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[24px] border border-indigo-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 mb-4">
                  <Rocket className="w-4 h-4" /> Top Strengths
                </div>
                <ul className="space-y-3">
                  {report.career_strategy.top_strengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-indigo-900 leading-relaxed font-medium">{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-[24px] border border-rose-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700 mb-4">
                  <AlertCircle className="w-4 h-4" /> Biggest Risks
                </div>
                <ul className="space-y-3">
                  {report.career_strategy.biggest_risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-rose-900 leading-relaxed font-medium">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Advanced: Cross-Feature Gaps (if available) */}
          {hasAdvancedFeatures && report.cross_feature_gaps && report.cross_feature_gaps.length > 0 && (
            <div className="bg-white rounded-[24px] border border-stone-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
                <GitMerge className="w-4 h-4" /> Cross-Feature Discrepancies
              </div>
              <div className="space-y-4">
                {report.cross_feature_gaps.map((gap, i) => (
                  <div key={i} className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-bold text-slate-800">{gap.skill}</h4>
                      <span className={`text-xs px-2 py-1 rounded font-bold border ${gap.priority === 'Critical' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {gap.priority} Priority
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{gap.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>Sources Compared:</span>
                      <div className="flex gap-1">
                        {gap.sources_compared.map((src, j) => (
                          <span key={j} className="bg-white px-1.5 py-0.5 rounded border border-stone-200">{src}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standard Pro Features (Strengths, Gaps, Actions) - Shown if not advanced */}
          {!hasAdvancedFeatures && (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-[24px] border border-stone-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-5">
                    <Rocket className="w-4 h-4" /> Skill Strengths
                  </div>
                  <ul className="space-y-3">
                    {(report.insights?.strengths || []).map((strength, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 leading-relaxed">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-white rounded-[24px] border border-stone-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700 mb-5">
                    <ShieldAlert className="w-4 h-4" /> Skill Gaps
                  </div>
                  <div className="space-y-4">
                    {(report.insights?.skill_gaps || report.insights?.gaps || []).map((gapObj, i) => {
                      const skill = typeof gapObj === 'string' ? gapObj : gapObj.skill;
                      const severity = typeof gapObj === 'string' ? 'Medium' : gapObj.gap;
                      return (
                        <div key={i} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-stone-50 border border-stone-100">
                          <div className="text-sm font-medium text-slate-800">{skill}</div>
                          <div className="text-xs px-2 py-1 rounded bg-white border border-stone-200 text-slate-600 shadow-sm whitespace-nowrap">
                            Severity: <span className="font-bold text-slate-900">{severity}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[24px] border border-stone-200 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#16324f] mb-6">
                  <Sparkles className="w-4 h-4" /> Recommended Skills & Actions
                </div>
                <div className="space-y-4">
                  {(report.recommendations || []).map((rec, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#16324f]/10 text-[#16324f] flex items-center justify-center font-bold text-sm">
                        {rec.priority || i + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{rec.skill}</h4>
                        <p className="text-sm text-slate-600 mt-1">{rec.reason}</p>
                        <div className="mt-2 text-sm bg-blue-50 text-blue-800 px-3 py-2 rounded-lg border border-blue-100 inline-block">
                          <span className="font-semibold">Action:</span> {rec.action}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid md:grid-cols-[1fr,2fr] gap-6">
            {/* ATS / Resume Improvements */}
            <div className="bg-white rounded-[24px] border border-stone-200 p-6 sm:p-8 shadow-sm h-fit">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-5">
                <FileCode className="w-4 h-4" /> ATS / Resume Improvements
              </div>
              <ul className="space-y-4">
                {(report.insights?.ats_improvements || []).map((imp, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <ListChecks className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
                {(!report.insights?.ats_improvements || report.insights.ats_improvements.length === 0) && (
                  <div className="text-sm text-slate-500 italic">No critical ATS improvements identified.</div>
                )}
              </ul>
            </div>

            {/* Career Roadmap */}
            <div className="bg-white rounded-[24px] border border-stone-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-5">
                <Map className="w-4 h-4" /> {hasAdvancedFeatures ? "90-Day Priority Roadmap" : "Career Roadmap"}
              </div>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 before:to-transparent">
                {[
                  { phase: 'Immediate (7 Days)', color: 'bg-rose-500', items: report.roadmap?.immediate },
                  { phase: 'Short Term (30 Days)', color: 'bg-amber-500', items: report.roadmap?.short_term },
                  { phase: 'Long Term (60 Days)', color: 'bg-emerald-500', items: report.roadmap?.long_term },
                  ...(hasAdvancedFeatures && report.roadmap?.ninety_day ? [{ phase: '90-Day Readiness', color: 'bg-indigo-500', items: report.roadmap?.ninety_day }] : []),
                ].map((step, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 border-white ${step.color} shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10`}></div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-2xl bg-stone-50 border border-stone-100 shadow-sm">
                      <div className="font-bold text-slate-800 text-sm mb-2">{step.phase}</div>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                        {(step.items || []).map((item, j) => <li key={j}>{item}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Agentic Audit Lock (for Pro users) */}
          {isPro && (
            <div className="mt-8 rounded-[24px] border-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">
                  <Lock className="w-3.5 h-3.5" /> Full Agentic Career Audit
                </div>
                <h3 className="font-display font-bold text-xl text-slate-900 mb-1">
                  Unlock cross-feature career analysis
                </h3>
                <p className="text-sm text-slate-600 max-w-xl">
                  Upgrade to Advanced to let our agent parallel-analyze your coding profile against your interview history to find hidden cross-feature skill gaps and build a 90-day roadmap.
                </p>
              </div>
              <button 
                onClick={() => navigate('/upgrade?plan=advanced')}
                className="shrink-0 bg-indigo-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-md hover:bg-indigo-700 transition"
              >
                Upgrade to Advanced
              </button>
            </div>
          )}

          {/* Explainability Block (for Advanced Users) */}
          {hasAdvancedFeatures && (
            <details className="mt-8 bg-white border border-stone-200 rounded-[24px] group">
              <summary className="p-6 font-bold text-slate-800 cursor-pointer list-none flex items-center justify-between">
                <span className="flex items-center gap-2"><Workflow className="w-4 h-4 text-indigo-600" /> How this audit was generated</span>
                <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="p-6 pt-0 border-t border-stone-100 text-sm text-slate-600 space-y-4">
                <p>
                  This audit was produced using a multi-step <strong>LangGraph Orchestration</strong> workflow combining several AI models.
                </p>
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 font-mono text-xs">
                  <div>Candidate Data Collection</div>
                  <div className="text-stone-400">↓</div>
                  <div>Parallel Analysis (Resume / ATS / Coding / Interview)</div>
                  <div className="text-stone-400">↓</div>
                  <div>Cross-Feature Discrepancy Detection</div>
                  <div className="text-stone-400">↓</div>
                  <div>LangChain Semantic RAG Retrieval (FAISS)</div>
                  <div className="text-stone-400">↓</div>
                  <div>Career Strategy & 90-Day Roadmap Generation</div>
                  <div className="text-stone-400">↓</div>
                  <div>Final Audit</div>
                </div>
              </div>
            </details>
          )}

          {/* Grounding Evidence Details */}
          <details className="mt-4 bg-white border border-stone-200 rounded-[24px] group">
            <summary className="p-6 font-bold text-slate-800 cursor-pointer list-none flex items-center justify-between">
              <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-slate-400" /> View RAG Evidence Grounding</span>
              <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
            </summary>
            <div className="p-6 pt-0 border-t border-stone-100">
              <p className="text-xs text-slate-500 mb-4">
                The technical recommendations in this report are grounded in the following knowledge base snippets retrieved specifically for your skill gaps:
              </p>
              <div className="space-y-3">
                {(report.evidence || ["Knowledge grounding active but evidence payload truncated."]).map((ev, i) => (
                  <div key={i} className="text-xs text-slate-700 bg-stone-50 p-3 rounded-lg border border-stone-200 font-mono">
                    {ev}
                  </div>
                ))}
              </div>
            </div>
          </details>

        </motion.div>
      )}
    </div>
  );
}
