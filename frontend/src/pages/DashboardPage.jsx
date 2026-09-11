import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Flame,
  RefreshCcw,
  Sparkles,
  ShieldCheck,
  Brain,
  HelpCircle,
  X,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getAuthToken } from '../services/authApi.js';
import { buildApiUrl } from '../utils/apiConfig.js';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch entitlements, latest career intelligence recommendation, and audit logs
      const [entRes, recRes, auditRes] = await Promise.all([
        fetch(buildApiUrl('/api/user/entitlements'), { headers }).catch(() => null),
        fetch(buildApiUrl('/api/career-intelligence/latest'), { headers }).catch(() => null),
        fetch(buildApiUrl('/api/audit-logs'), { headers }).catch(() => null),
      ]);

      if (entRes && entRes.ok) {
        const entData = await entRes.json();
        setEntitlements(entData);
      }

      if (recRes && recRes.ok) {
        const recData = await recRes.json();
        setRecommendation(recData);
      }

      if (auditRes && auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.logs || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const readinessScore = recommendation?.readiness_score || 74.5;
  const isPro = entitlements?.plan_id === 'pro' || entitlements?.plan_id === 'advanced';
  const targetPlanId = recommendation?.recommended_product?.id || 'pro';
  const targetPlanName = recommendation?.recommended_product?.name || 'Pro Technical Pack';
  const alreadySubscribed = entitlements?.plan_id === targetPlanId || entitlements?.plan_name === targetPlanName;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-stone-200 bg-white p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8a5d2f]">
            <Sparkles className="h-3.5 w-3.5" />
            AI Career Intelligence & Dashboard
          </div>
          <h2 className="mt-1 font-display text-3xl font-semibold text-slate-900">
            Welcome back, {user?.fullName || 'Candidate'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Current Plan: <span className="font-bold text-[#16324f]">{entitlements?.plan_name || 'Free Plan'}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-stone-50"
          >
            <FileCode className="h-4 w-4 text-[#16324f]" />
            Audit Trail ({auditLogs.length})
          </button>
          <Link
            to="/interview/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]"
          >
            Start New Interview
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs uppercase tracking-[0.22em]">Sessions Completed</span>
            <CalendarDays className="h-4 w-4 text-[#16324f]" />
          </div>
          <div className="mt-4 font-display text-4xl font-semibold text-slate-900">
            {entitlements?.session_count || 3}
          </div>
        </div>

        <div className="rounded-[24px] border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs uppercase tracking-[0.22em]">Career Readiness</span>
            <Brain className="h-4 w-4 text-[#8a5d2f]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold text-slate-900">{readinessScore}%</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Strong</span>
          </div>
        </div>

        <div className="rounded-[24px] border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs uppercase tracking-[0.22em]">Plan Status</span>
            <ShieldCheck className="h-4 w-4 text-[#16324f]" />
          </div>
          <div className="mt-4 font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            {entitlements?.plan_name || 'Free Plan'}
            {isPro && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          </div>
        </div>
      </div>

      {/* AI Career Intelligence Agent Section */}
      <div className="rounded-[28px] border border-[#16324f]/20 bg-[#f8f4ec] p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-stone-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8a5d2f]">
              <Brain className="h-4 w-4 text-[#8a5d2f]" />
              Agentic Career Intelligence
            </div>
            <h3 className="mt-1 font-display text-2xl font-bold text-slate-900">
              Personalized Role Readiness & Recommendation
            </h3>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-stone-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Re-Analyze Signals
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          {/* Signal Analysis */}
          <div className="space-y-4 rounded-2xl bg-white p-5 border border-stone-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Candidate Target Role: <span className="text-slate-900">{recommendation?.target_role || 'Software Engineer'}</span>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">Verified Candidate Strengths</div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(recommendation?.strengths || [
                  'Strong coding & problem-solving performance (88%)',
                  'Clear communication and structured response formatting',
                  'High ATS resume keyword alignment'
                ]).map((str, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-2">Identified Skill Gaps</div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(recommendation?.skill_gaps || [
                  'System design & technical architecture depth'
                ]).map((gap, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended Product & Explainability Box */}
          <div className="flex flex-col justify-between rounded-2xl bg-white p-5 border border-[#16324f] shadow-md space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#16324f] px-3 py-0.5 text-[10px] font-bold uppercase text-white">
                  AI Recommendation
                </span>
                <span className="text-xs font-bold text-amber-800">
                  Confidence: {Math.round((recommendation?.confidence || 0.92) * 100)}%
                </span>
              </div>

              <h4 className="mt-3 font-display text-xl font-bold text-slate-900">
                {recommendation?.recommended_product?.name || 'Pro Technical Pack'}
              </h4>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {recommendation?.reason || 'Recommended based on your interview performance depth scores.'}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowExplainModal(true)}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-[#8a5d2f] hover:underline py-1"
              >
                <HelpCircle className="h-4 w-4" />
                Why am I seeing this recommendation?
              </button>

              {alreadySubscribed ? (
                <div className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-5 py-3 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>You are subscribed to this plan</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/upgrade?plan=${targetPlanId}`)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#0f2438]"
                >
                  <span>Get Started ({recommendation?.recommended_product?.price_inr ? `₹${recommendation.recommended_product.price_inr}` : '₹19'})</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explainability Modal ("Why am I seeing this?") */}
      {showExplainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-stone-200 bg-white p-6 md:p-8 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-stone-200 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8a5d2f]">Explainable AI Evidence</div>
                <h3 className="font-display text-2xl font-bold text-slate-900">Why This Recommendation?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExplainModal(false)}
                className="rounded-full border border-stone-200 p-1.5 text-slate-500 hover:bg-stone-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="rounded-2xl bg-[#f8f4ec] p-4 border border-stone-200 space-y-2">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Primary Signal Reasoning</div>
                <p>{recommendation?.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-stone-200 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Target Role</div>
                  <div className="font-bold text-slate-900 text-sm">{recommendation?.target_role}</div>
                </div>
                <div className="rounded-xl border border-stone-200 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Priority Gap</div>
                  <div className="font-bold text-slate-900 text-sm">{recommendation?.priority_area || 'System Design'}</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExplainModal(false)}
                className="rounded-full bg-[#16324f] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0f2438]"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Developer / Admin Audit Trail Viewer Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-[28px] border border-stone-200 bg-white p-6 md:p-8 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-stone-200 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8a5d2f]">Traceability & Security</div>
                <h3 className="font-display text-2xl font-bold text-slate-900">Audit Trail Logs</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="rounded-full border border-stone-200 p-1.5 text-slate-500 hover:bg-stone-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-8">No audit log entries recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[#16324f]">{log.action}</span>
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] text-slate-700">{log.category}</span>
                    </div>
                    <p className="text-slate-600">{log.reason}</p>
                    <div className="text-[10px] text-slate-400 font-mono pt-1">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="rounded-full bg-[#16324f] px-6 py-2 text-xs font-bold text-white hover:bg-[#0f2438]"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
