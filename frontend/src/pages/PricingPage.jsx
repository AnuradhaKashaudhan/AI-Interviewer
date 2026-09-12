import React from 'react';
import { Check, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    billing: 'Forever Free',
    description: 'For quick practice and first-time users.',
    features: ['1 mock interview session', '2 ATS checks'],
    cta: 'Choose Free',
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price: '₹199',
    billing: 'Monthly',
    description: 'For consistent preparation with stronger feedback loops and adaptive follow-ups.',
    features: [
      '5 mock interview sessions',
      '10 ATS checks',
      'Basic AI Career Intelligence',
      'Basic Audit Trail Logs',
    ],
    cta: 'Choose Pro',
    featured: true,
  },
  {
    id: 'advanced',
    name: 'Advanced Plan',
    price: '₹499',
    billing: 'Monthly',
    description: 'For candidates targeting senior AI, System Design, and Lead Engineering roles.',
    features: [
      'Unlimited mock interview sessions',
      'Unlimited ATS checks',
      'Full Agentic AI Career Audit',
      'Unlimited System Design Drills',
      'Full Explainability (Audit Logs)',
      'All Premium Features',
    ],
    cta: 'Choose Advanced',
  },
];

const PricingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePlanClick = (plan) => {
    if (plan.id === 'free') {
      navigate('/interview/new');
      return;
    }
    const targetPath = `/upgrade?plan=${plan.id}`;
    if (user) {
      navigate(targetPath);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(targetPath)}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-white p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8a5d2f]">
          <Sparkles className="h-3.5 w-3.5" />
          Transparent Pricing
        </div>
        <h2 className="mt-2 font-display text-4xl font-semibold text-slate-900">Simple tiers with no glitter or fake scarcity.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Select a plan to unlock adaptive mock interviews, AI Career Intelligence insights, and secure Razorpay payment processing.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col justify-between rounded-[28px] border bg-white p-6 ${
              plan.featured
                ? 'border-[#16324f] shadow-[0_20px_60px_-35px_rgba(22,50,79,0.35)]'
                : 'border-stone-200'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{plan.name}</div>
                  <div className="mt-2 font-display text-4xl font-semibold text-slate-900">
                    {plan.price}
                    <span className="text-xs font-medium text-slate-500"> / {plan.billing}</span>
                  </div>
                </div>
                {plan.featured && (
                  <div className="rounded-full bg-[#16324f] px-3 py-1 text-xs font-semibold text-white">Popular</div>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
              <div className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-[#16324f]" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handlePlanClick(plan)}
              className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                plan.featured
                  ? 'bg-[#16324f] text-white hover:bg-[#0f2438]'
                  : 'border border-stone-300 bg-white text-slate-800 hover:bg-stone-50'
              }`}
            >
              {plan.cta}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h3 className="font-display text-2xl font-semibold text-slate-900">Feature comparison</h3>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Razorpay Test Mode Verified
          </div>
        </div>
        <div className="grid grid-cols-4 border-b border-stone-200 bg-stone-50 px-6 py-4 text-sm font-semibold text-slate-600">
          <div>Capability</div><div>Free</div><div>Pro</div><div>Advanced</div>
        </div>
        {[
          ['Mock interviews', '1 session', '5 sessions', 'Unlimited'],
          ['ATS checker', '2 checks', '10 checks', 'Unlimited'],
          ['AI Career Intelligence', 'No', 'Basic', 'Full Agentic Audit'],
          ['System Design Drills', 'No', 'No', 'Included'],
          ['Audit Trail Logs', 'No', 'Basic', 'Full Explainability'],
        ].map((row) => (
          <div key={row[0]} className="grid grid-cols-4 px-6 py-4 text-sm text-slate-700 odd:bg-white even:bg-stone-50/60">
            {row.map((cell) => <div key={cell}>{cell}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
