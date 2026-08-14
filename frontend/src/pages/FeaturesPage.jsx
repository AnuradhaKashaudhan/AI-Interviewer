import React from 'react';
import { ArrowRight, BrainCircuit, Code2, Gauge, Mic, ShieldCheck } from 'lucide-react';

const features = [
  {
    title: 'Mock interviews',
    description: 'Role-aware question sets with adaptive follow-ups and live answer scoring.',
    preview: 'Interview prompt, transcript strip, feedback card.',
  },
  {
    title: 'Real-time feedback',
    description: 'See response quality, confidence, and clarity while the session is still live.',
    preview: 'Score meter, note panel, clarity highlights.',
  },
  {
    title: 'ATS checker',
    description: 'Upload a resume and compare it to a target job description with keywords and suggestions.',
    preview: 'Resume upload, job description, match score summary.',
  },
  {
    title: 'Coding profile (GitHub)',
    description: 'Link your GitHub account to analyze public repos, stars, and yearly contributions into a normalized Coding Score.',
    preview: 'GitHub sync, top languages, repository stats, 0-100 coding score.',
  },
  {
    title: 'Industry simulations',
    description: 'Swap in product, engineering, or leadership scenarios without rebuilding the flow.',
    preview: 'Scenario cards, role selector, difficulty chips.',
  },
];

const FeaturesPage = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-white p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Product features</div>
        <h2 className="mt-2 font-display text-4xl font-semibold text-slate-900">Built for practice, feedback, and repeatable interview prep.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Each section below shows a real product surface instead of marketing copy so the app feels like software, not a brochure.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {features.map((feature, index) => (
          <div key={feature.title} className="rounded-[28px] border border-stone-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Feature {String(index + 1).padStart(2, '0')}</div>
                <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">{feature.title}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16324f] text-white">
                {index === 0 && <Mic className="h-5 w-5" />}
                {index === 1 && <Gauge className="h-5 w-5" />}
                {index === 2 && <ShieldCheck className="h-5 w-5" />}
                {index === 3 && <Code2 className="h-5 w-5" />}
                {index === 4 && <BrainCircuit className="h-5 w-5" />}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
            <div className="mt-5 rounded-[24px] border border-stone-200 bg-[#f8f4ec] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800">Preview</div>
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-slate-600">{feature.preview}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-stone-200 bg-[#16324f] p-8 text-white">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">Next step</div>
        <h3 className="mt-2 font-display text-3xl font-semibold">Move from feature browsing to a live setup.</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">Use the interview setup flow to choose a role, industry, and difficulty, then launch the actual mock session.</p>
        <a href="/interview/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#16324f] transition hover:bg-stone-100">
          Open Interview Setup
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export default FeaturesPage;
