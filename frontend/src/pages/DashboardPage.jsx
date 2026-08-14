import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CalendarDays, Flame, RefreshCcw, Sparkles } from 'lucide-react';

const loadDashboardData = () => new Promise((resolve, reject) => {
  window.setTimeout(() => {
    if (Math.random() < 0.18) {
      reject(new Error('Dashboard stats could not be loaded right now.'));
      return;
    }

    resolve({
      sessionsCompleted: 18,
      avgScore: 84,
      streak: 6,
      recentActivity: [
        { title: 'Frontend mock interview', detail: '2 hours ago · 82 score' },
        { title: 'ATS resume scan', detail: 'Yesterday · 76% match' },
        { title: 'Leadership round prep', detail: '3 days ago · 89 score' },
      ],
    });
  }, 700);
});

const DashboardPage = () => {
  const [state, setState] = useState({ loading: true, error: null, data: null, empty: false });

  const refresh = () => {
    setState({ loading: true, error: null, data: null, empty: false });
    loadDashboardData()
      .then((data) => setState({ loading: false, error: null, data, empty: false }))
      .catch((error) => setState({ loading: false, error: error.message, data: null, empty: false }));
  };

  useEffect(() => {
    refresh();
  }, []);

  if (state.loading) {
    return (
      <div className="grid gap-6">
        <div className="h-32 animate-pulse rounded-[28px] border border-stone-200 bg-white" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-[24px] border border-stone-200 bg-white" />
          <div className="h-28 animate-pulse rounded-[24px] border border-stone-200 bg-white" />
          <div className="h-28 animate-pulse rounded-[24px] border border-stone-200 bg-white" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-white p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">Dashboard unavailable</div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-slate-900">We could not load your stats.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">This is a mocked async source, so the UI shows an error state too. Click retry to fetch fresh demo data.</p>
        <button onClick={refresh} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
          <RefreshCcw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (state.empty) {
    return (
      <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-[#16324f]" />
        <h2 className="mt-4 font-display text-3xl font-semibold text-slate-900">Your dashboard is empty.</h2>
        <p className="mt-3 text-sm text-slate-600">Start a few sessions to populate your score trends and activity feed.</p>
        <Link to="/interview/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
          Start New Interview
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-stone-200 bg-white p-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Dashboard overview</div>
          <h2 className="mt-1 font-display text-3xl font-semibold text-slate-900">Your interview practice snapshot</h2>
          <p className="mt-2 text-sm text-slate-600">Track repeat sessions, identify weak spots, and pick up where you left off.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setState((current) => ({ ...current, empty: !current.empty }))} className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-stone-50">
            Toggle empty state
          </button>
          <Link to="/interview/new" className="inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
            Start New Interview
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Sessions completed', value: state.data.sessionsCompleted, icon: CalendarDays },
          { label: 'Average score', value: state.data.avgScore, icon: BarChart3 },
          { label: 'Current streak', value: `${state.data.streak} days`, icon: Flame },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[24px] border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs uppercase tracking-[0.22em]">{item.label}</span>
                <Icon className="h-4 w-4 text-[#16324f]" />
              </div>
              <div className="mt-4 font-display text-4xl font-semibold text-slate-900">{item.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-[28px] border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Recent activity</div>
              <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">Latest sessions</h3>
            </div>
            <button onClick={refresh} className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-stone-50">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {state.data.recentActivity.map((item) => (
              <div key={item.title} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                <div className="font-semibold text-slate-900">{item.title}</div>
                <div className="text-sm text-slate-600">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-[#f8f4ec] p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Suggested next step</div>
          <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">Run one more mock interview today.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">Your average score is steady, but the next session can focus on deeper follow-ups and tighter answer structure.</p>
          <Link to="/interview/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
            Begin Setup
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
