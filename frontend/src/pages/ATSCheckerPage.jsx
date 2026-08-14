import React from 'react';
import ATSCheckerSection from '../ATSCheckerSection.jsx';

const ATSCheckerPage = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-white p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">ATS checker</div>
        <h2 className="mt-2 font-display text-4xl font-semibold text-slate-900">Upload a resume and compare it against a target job.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">This page uses the existing resume parsing and ATS scoring endpoint, but now it sits inside the new app shell and route structure.</p>
      </div>
      <ATSCheckerSection />
    </div>
  );
};

export default ATSCheckerPage;
