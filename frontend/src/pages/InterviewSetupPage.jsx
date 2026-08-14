import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Gauge, Sparkles } from 'lucide-react';

const InterviewSetupPage = () => {
  const navigate = useNavigate();
  const [setup, setSetup] = useState({ role: 'Frontend Engineer', industry: 'Technology', difficulty: 'Medium' });

  const startSession = (event) => {
    event.preventDefault();
    navigate('/interview', { state: { setup } });
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr,1.05fr]">
      <div className="rounded-[28px] border border-stone-200 bg-white p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Interview setup</div>
        <h2 className="mt-2 font-display text-4xl font-semibold text-slate-900">Pick a role, industry, and difficulty before starting.</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">This is the actual entry point for a new interview session, so Start Now is no longer decorative.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Role', value: setup.role, icon: BriefcaseBusiness },
            { label: 'Industry', value: setup.industry, icon: Sparkles },
            { label: 'Difficulty', value: setup.difficulty, icon: Gauge },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                <Icon className="h-5 w-5 text-[#16324f]" />
                <div className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
                <div className="mt-1 font-semibold text-slate-900">{item.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={startSession} className="rounded-[28px] border border-stone-200 bg-white p-6">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Role
            <input value={setup.role} onChange={(event) => setSetup((current) => ({ ...current, role: event.target.value }))} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-[#16324f]" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Industry
            <input value={setup.industry} onChange={(event) => setSetup((current) => ({ ...current, industry: event.target.value }))} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-[#16324f]" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Difficulty
            <select value={setup.difficulty} onChange={(event) => setSetup((current) => ({ ...current, difficulty: event.target.value }))} className="rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-[#16324f]">
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </label>
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-slate-600">
            Launching here will open the current live interview screen with this setup attached.
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
            Start Session
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default InterviewSetupPage;
