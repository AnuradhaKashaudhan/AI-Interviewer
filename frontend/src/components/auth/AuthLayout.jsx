import React from 'react';
import { ArrowRight, BadgeCheck, Clock3, Mail, Phone, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = [
  { icon: UserRound, title: 'Full name, email, and phone', copy: 'Store the right account details from day one.' },
  { icon: Mail, title: 'Email OTP verification', copy: 'First-time sign-up stays blocked until the code is confirmed.' },
  { icon: ShieldCheck, title: 'httpOnly session cookie', copy: 'Auth state stays off localStorage and follows the browser session.' },
];

const AuthLayout = ({ eyebrow, title, description, children, actionLink }) => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff9ef_0%,_#f7f1e7_44%,_#efe7d8_100%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[0.92fr,1.08fr]">
        <aside className="hidden flex-col justify-between border-r border-stone-200 bg-[#fcf8f0]/95 px-10 py-10 lg:flex">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-stone-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16324f] text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a5d2f]">NeuralInterview</div>
                <div className="font-display text-xl font-semibold text-slate-900">AI Interviewer</div>
              </div>
            </Link>

            <div className="mt-12 max-w-lg">
              <div className="section-eyebrow">Secure account access</div>
              <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-slate-900">{title}</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
            </div>

            <div className="mt-10 space-y-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_10px_26px_-22px_rgba(16,26,46,0.35)]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#16324f]/6 text-[#16324f]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">{item.copy}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-[#f8f4ec] p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a5d2f]">
              <Clock3 className="h-4 w-4" />
              OTP window
            </div>
            <div className="mt-2 font-display text-2xl font-semibold text-slate-900">Codes expire quickly and are rate limited.</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use the resend flow only when the timer allows it. That keeps the login surface quieter and harder to brute force.</p>
          </div>
        </aside>

        <main className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl">
            {actionLink && (
              <div className="mb-4 flex justify-end lg:hidden">
                <Link to={actionLink.to} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-stone-50">
                  {actionLink.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            <div className="surface-card p-6 sm:p-8">
              <div className="lg:hidden">
                <div className="section-eyebrow">NeuralInterview</div>
                <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
              <div className="hidden lg:block">
                <div className="section-eyebrow">{eyebrow}</div>
              </div>
              <div className="mt-6">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;