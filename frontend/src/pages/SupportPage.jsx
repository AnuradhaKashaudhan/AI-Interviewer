import React, { useState } from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';

const faqs = [
  {
    question: 'How do I start a mock interview?',
    answer: 'Open Interview Setup, choose a role and difficulty, then launch the live session.',
  },
  {
    question: 'Can I use ATS Checker without signing in?',
    answer: 'Yes. The UI is functional as a demo flow and can analyze resumes immediately.',
  },
  {
    question: 'Where do I get support?',
    answer: 'Use the contact form below or email support@neuralinterview.ai.',
  },
];

const SupportPage = () => {
  const [activeFaq, setActiveFaq] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const submitForm = (event) => {
    event.preventDefault();
    setSubmitted(true);
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
      <div className="space-y-6">
        <div className="rounded-[28px] border border-stone-200 bg-white p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Help & Support</div>
          <h2 className="mt-2 font-display text-4xl font-semibold text-slate-900">FAQ, contact, and a direct path to support.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">This page is meant to feel like a working product support surface, not a dead brochure link.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="mailto:support@neuralinterview.ai" className="inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
              <Mail className="h-4 w-4" />
              Email support
            </a>
            <a href="#contact-form" className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-stone-50">
              <MessageSquare className="h-4 w-4" />
              Contact form
            </a>
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">FAQ</div>
          <div className="mt-4 space-y-3">
            {faqs.map((item, index) => (
              <button key={item.question} type="button" onClick={() => setActiveFaq(index)} className={`w-full rounded-2xl border px-4 py-4 text-left transition ${activeFaq === index ? 'border-[#16324f] bg-[#16324f]/5' : 'border-stone-200 hover:bg-stone-50'}`}>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-900">{item.question}</span>
                  <span className="text-slate-400">{activeFaq === index ? '−' : '+'}</span>
                </div>
                {activeFaq === index && <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id="contact-form" className="rounded-[28px] border border-stone-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Contact form</div>
        <h3 className="mt-2 font-display text-3xl font-semibold text-slate-900">Send a note to the team</h3>
        <form onSubmit={submitForm} className="mt-6 space-y-4">
          <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-[#16324f]" />
          <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-[#16324f]" />
          <textarea required rows="6" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Tell us what you need help with..." className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-[#16324f]" />
          <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
            <Send className="h-4 w-4" />
            Submit request
          </button>
        </form>

        {submitted && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Your message was queued. A support reply will be mocked in the next step.</div>}
      </div>
    </div>
  );
};

export default SupportPage;
