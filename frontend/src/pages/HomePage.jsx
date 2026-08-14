import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, FileText, MessageSquareMore, ShieldCheck, Sparkles } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-800">
            <Sparkles className="h-4 w-4" />
            NeuralInterview workspace
          </div>
          <div className="max-w-2xl space-y-4">
            <h2 className="font-display text-5xl leading-tight text-slate-900 md:text-6xl">A calmer way to practice interviews and tune your resume.</h2>
            <p className="max-w-xl text-base leading-7 text-slate-600 md:text-lg">
              Run mock interviews, review ATS match quality, and move through each step of the process with a clean product UI instead of a generic AI landing page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/interview/new" className="inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
              Start New Interview
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-stone-400 hover:bg-stone-50">
              View Dashboard
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Sessions completed', value: '18' },
              { label: 'Average score', value: '84' },
              { label: 'Weekly streak', value: '6 days' },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-stone-200 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                <div className="mt-2 font-display text-3xl font-semibold text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Live interview preview</div>
              <div className="font-display text-2xl font-semibold text-slate-900">Frontend Engineer mock session</div>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Recording on</div>
          </div>
          <div className="mt-5 space-y-3 rounded-[26px] bg-[#f8f4ec] p-4">
            <div className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm">
              Tell me about a time you improved a slow UI without changing the product scope.
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl bg-[#16324f] p-4 text-sm text-white shadow-sm">
              I profiled the render path, memoized the expensive list, and moved non-critical work behind a transition.
            </div>
            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-3 text-center text-xs text-slate-600">
                <BarChart3 className="mx-auto mb-2 h-4 w-4 text-[#16324f]" />
                Score: 82
              </div>
              <div className="rounded-2xl bg-white p-3 text-center text-xs text-slate-600">
                <MessageSquareMore className="mx-auto mb-2 h-4 w-4 text-[#16324f]" />
                Feedback ready
              </div>
              <div className="rounded-2xl bg-white p-3 text-center text-xs text-slate-600">
                <ShieldCheck className="mx-auto mb-2 h-4 w-4 text-[#16324f]" />
                ATS match 76%
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <FileText className="mb-3 h-5 w-5 text-[#16324f]" />
              <div className="text-sm font-semibold text-slate-900">Resume intelligence</div>
              <div className="mt-1 text-sm text-slate-600">Extract keywords, surface gaps, and compare your CV to the role.</div>
            </div>
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <Sparkles className="mb-3 h-5 w-5 text-[#16324f]" />
              <div className="text-sm font-semibold text-slate-900">Adaptive prompts</div>
              <div className="mt-1 text-sm text-slate-600">Each follow-up changes based on your answer quality and role.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
