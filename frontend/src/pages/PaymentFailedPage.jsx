import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, ArrowLeft, ShieldAlert } from 'lucide-react';

const PaymentFailedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const reason = state.reason || 'Payment declined or cancelled by user.';

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="rounded-[32px] border border-rose-200 bg-white p-8 text-center shadow-xl space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600">
          <AlertTriangle className="h-10 w-10" />
        </div>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3.5 py-1 text-xs font-bold text-rose-800 uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4" />
            Payment Incomplete
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-slate-900">
            Payment Was Not Completed
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Your transaction could not be processed. No charges were made to your account.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-left text-xs text-rose-800 space-y-1">
          <div className="font-bold">Possible Reasons:</div>
          <p>• {reason}</p>
          <p>• User dismissed Razorpay Checkout modal.</p>
          <p>• Card declined or bank gateway timeout.</p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#16324f] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#0f2438]"
          >
            <RotateCcw className="h-4 w-4" />
            Retry Payment
          </button>

          <Link
            to="/pricing"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pricing
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailedPage;
