import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For quick practice and first-time users.',
    features: ['3 mock interviews', 'Basic ATS checker', 'Resume upload'],
    cta: 'Choose Free',
  },
  {
    name: 'Pro',
    price: '$19',
    description: 'For consistent preparation with stronger feedback loops.',
    features: ['Unlimited sessions', 'Adaptive follow-ups', 'Detailed feedback'],
    cta: 'Choose Pro',
    featured: true,
  },
  {
    name: 'Team',
    price: '$49',
    description: 'For hiring managers and cohorts running interview drills.',
    features: ['Shared workspace', 'Reporting exports', 'Team coaching flows'],
    cta: 'Choose Team',
  },
];

const PricingPage = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-white p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Pricing</div>
        <h2 className="mt-2 font-display text-4xl font-semibold text-slate-900">Simple tiers with no glitter or fake scarcity.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">The buttons below are real route actions, so each plan takes the user into the working app flow.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className={`rounded-[28px] border bg-white p-6 ${plan.featured ? 'border-[#16324f] shadow-[0_20px_60px_-35px_rgba(22,50,79,0.35)]' : 'border-stone-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{plan.name}</div>
                <div className="mt-2 font-display text-4xl font-semibold text-slate-900">{plan.price}</div>
              </div>
              {plan.featured && <div className="rounded-full bg-[#16324f] px-3 py-1 text-xs font-semibold text-white">Popular</div>}
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
            <Link
              to={plan.name === 'Free' ? '/interview/new' : '/signup'}
              className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${plan.featured ? 'bg-[#16324f] text-white hover:bg-[#0f2438]' : 'border border-stone-300 bg-white text-slate-800 hover:bg-stone-50'}`}
            >
              {plan.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-6 py-4">
          <h3 className="font-display text-2xl font-semibold text-slate-900">Feature comparison</h3>
        </div>
        <div className="grid grid-cols-4 border-b border-stone-200 bg-stone-50 px-6 py-4 text-sm font-semibold text-slate-600">
          <div>Capability</div><div>Free</div><div>Pro</div><div>Team</div>
        </div>
        {[
          ['Mock interviews', '3', 'Unlimited', 'Unlimited'],
          ['ATS checker', 'Basic', 'Advanced', 'Advanced'],
          ['Saved history', 'No', 'Yes', 'Yes'],
          ['Team access', 'No', 'No', 'Yes'],
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
