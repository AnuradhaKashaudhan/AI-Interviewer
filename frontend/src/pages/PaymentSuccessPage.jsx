import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, LayoutDashboard, Sparkles, Receipt } from 'lucide-react';

const PaymentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const orderId = state.orderId || 'ord_verified_demo';
  const paymentId = state.paymentId || 'pay_verified_demo';
  const planName = state.planName || 'Pro Technical Pack';
  const amount = state.amount || 19;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="rounded-[32px] border border-emerald-200 bg-white p-8 md:p-10 text-center shadow-xl space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Signature Verified Server-Side
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold text-slate-900">
            Payment Successful!
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your plan subscription <span className="font-bold text-[#16324f]">{planName}</span> is now active.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-[#f8f4ec] p-6 text-left space-y-3 text-xs md:text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Order ID:</span>
            <span className="font-mono font-bold text-slate-900">{orderId}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Payment Transaction ID:</span>
            <span className="font-mono font-bold text-slate-900">{paymentId}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Amount Paid:</span>
            <span className="font-bold text-emerald-700">₹{amount} INR</span>
          </div>
          <div className="flex justify-between text-slate-600 border-t border-stone-200 pt-3">
            <span>Entitlement Status:</span>
            <span className="font-bold text-emerald-700">ACTIVE & UNLOCKED</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            to="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#16324f] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#0f2438]"
          >
            <LayoutDashboard className="h-4 w-4" />
            Go to Career Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            to="/billing"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-stone-50"
          >
            <Receipt className="h-4 w-4" />
            View Billing & Order History
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
