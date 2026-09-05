import React, { useState, useEffect } from 'react';
import { CreditCard, Receipt, ShieldCheck, Sparkles, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAuthToken } from '../services/authApi.js';
import { buildApiUrl } from '../utils/apiConfig.js';

const BillingPage = () => {
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch entitlements & payment history
        const [entRes, histRes] = await Promise.all([
          fetch(buildApiUrl('/api/user/entitlements'), { headers }),
          fetch(buildApiUrl('/api/payments/history'), { headers }),
        ]);

        if (entRes.ok) {
          const entData = await entRes.json();
          setEntitlements(entData);
        }

        if (histRes.ok) {
          const histData = await histRes.json();
          setHistory(histData.history || []);
        }
      } catch (err) {
        console.error('Failed to load billing history:', err);
        setError('Unable to load billing history.');
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
        <span className="ml-3 text-sm font-medium text-slate-600">Loading billing history...</span>
      </div>
    );
  }

  const currentPlanName = entitlements?.plan_name || 'Free Plan';
  const isFree = entitlements?.plan_id === 'free';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[28px] border border-stone-200 bg-white p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8a5d2f]">
          <Receipt className="h-3.5 w-3.5" />
          Subscription & Transactions
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-slate-900">
          Billing & Order History
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Manage your subscription entitlements, inspect Razorpay transaction IDs, and download order receipts.
        </p>
      </div>

      {/* Current Plan Overview Card */}
      <div className="rounded-[28px] border border-stone-200 bg-white p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Active Plan</div>
            <div className="mt-1 flex items-center gap-3">
              <h3 className="font-display text-2xl font-bold text-slate-900">{currentPlanName}</h3>
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isFree ? 'bg-stone-100 text-slate-700 border border-stone-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {entitlements?.status || 'Active'}
              </span>
            </div>
          </div>

          {isFree ? (
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2438]"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl">
              <CheckCircle2 className="h-4 w-4" />
              Unlimited Sessions Unlocked
            </div>
          )}
        </div>

        {/* Feature Capabilities Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-stone-200 bg-[#f8f4ec] p-4 text-center">
            <div className="text-[11px] font-bold uppercase text-slate-500">Mock Interviews</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">
              {entitlements?.unlimited_interviews ? 'Unlimited' : `${entitlements?.sessions_remaining || 0} left`}
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-[#f8f4ec] p-4 text-center">
            <div className="text-[11px] font-bold uppercase text-slate-500">ATS Analysis</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">
              {entitlements?.advanced_ats ? 'Advanced Fix-It' : 'Basic Check'}
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-[#f8f4ec] p-4 text-center">
            <div className="text-[11px] font-bold uppercase text-slate-500">Career Intelligence</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">
              {entitlements?.career_intelligence ? 'Active Agent' : 'Disabled'}
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-[#f8f4ec] p-4 text-center">
            <div className="text-[11px] font-bold uppercase text-slate-500">System Design Drills</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">
              {entitlements?.custom_prep_packs ? 'Unlocked' : 'Pro Only'}
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#16324f]" />
            Transaction History
          </h3>
          <span className="text-xs text-slate-500">{history.length} Order Record(s)</span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No paid orders found yet. Select a plan from the pricing page to view payment history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Razorpay Order ID</th>
                  <th className="px-6 py-3.5">Plan</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Payment ID</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {history.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-4 font-mono text-slate-900 font-semibold">{tx.razorpay_order_id}</td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{tx.plan_name}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">₹{tx.amount_inr} {tx.currency}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{tx.razorpay_payment_id || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                        tx.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        tx.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Recent'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;
