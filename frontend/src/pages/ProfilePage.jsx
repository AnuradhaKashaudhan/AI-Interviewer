import React, { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, PencilLine, RefreshCcw, Shield, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    collegeName: user?.collegeName || '',
    userType: user?.userType || 'professional',
    year: user?.year || '',
    course: user?.course || '',
    github: user?.github || '',
    linkedin: user?.linkedin || '',
    leetcode: user?.leetcode || '',
  });
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (user) {
      setForm((current) => ({
        ...current,
        collegeName: user.collegeName || current.collegeName,
        userType: user.userType || current.userType,
        year: user.year || current.year,
        course: user.course || current.course,
        github: user.github || current.github,
        linkedin: user.linkedin || current.linkedin,
        leetcode: user.leetcode || current.leetcode,
      }));
    }
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    setSubmitting(true);

    try {
      await updateProfile(form);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (error) {
      setServerError(error.message || 'Unable to save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    const defaults = {
      collegeName: '',
      userType: 'professional',
      year: '',
      course: '',
      github: '',
      linkedin: '',
      leetcode: '',
    };
    setForm(defaults);
  };

  if (!user) {
    return (
      <div className="surface-card p-8 sm:p-10">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Profile</div>
          <h2 className="mt-2 font-display text-4xl font-semibold text-slate-900">Complete your profile.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">Add your college or professional details, and link your GitHub, LinkedIn, and LeetCode profiles.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
              <UserRound className="h-4 w-4" />
              Sign in
            </Link>
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-stone-50">
              Back to dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
      <div className="space-y-6">
        <div className="surface-card p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Profile overview</div>
          <h2 className="mt-2 font-display text-4xl font-semibold text-slate-900">Your account is active and ready to complete.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">Your login details are already saved. Fill in the optional academic or professional profile to personalize your workspace.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</div>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-700"><BadgeCheck className="h-4 w-4" />Signed in</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Account</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{user?.fullName}</div>
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Profile tips</div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">If you are a student, college name, year, and course are required.</div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">If you are a professional, those student fields stay optional.</div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">Add GitHub, LinkedIn, and LeetCode links so your dashboard can show your public profiles later.</div>
          </div>
        </div>
      </div>

      <div className="surface-card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Complete profile</div>
            <h3 className="mt-2 font-display text-3xl font-semibold text-slate-900">Fill in your background and public links</h3>
          </div>
          <div className="rounded-full bg-[#16324f]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#16324f]">Saved to backend</div>
        </div>

        {serverError && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{serverError}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="field-label">Account name</span>
            <input value={user?.fullName || ''} disabled className="field-control w-full bg-stone-100 text-slate-500" />
          </label>
          <label className="block">
            <span className="field-label">Email</span>
            <input value={user?.email || ''} disabled className="field-control w-full bg-stone-100 text-slate-500" />
          </label>
          <label className="block">
            <span className="field-label">Phone number</span>
            <input value={user?.phoneNumber || ''} disabled className="field-control w-full bg-stone-100 text-slate-500" />
          </label>

          <label className="block">
            <span className="field-label">I am a</span>
            <select value={form.userType} onChange={(event) => setForm((current) => ({ ...current, userType: event.target.value }))} className="field-control w-full">
              <option value="student">Student</option>
              <option value="professional">Professional</option>
            </select>
          </label>

          {form.userType === 'student' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">College name</span>
                <input value={form.collegeName} onChange={(event) => setForm((current) => ({ ...current, collegeName: event.target.value }))} className="field-control w-full" />
              </label>
              <label className="block">
                <span className="field-label">Year</span>
                <input value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} className="field-control w-full" placeholder="1st year, 2nd year..." />
              </label>
              <label className="block sm:col-span-2">
                <span className="field-label">Course</span>
                <input value={form.course} onChange={(event) => setForm((current) => ({ ...current, course: event.target.value }))} className="field-control w-full" placeholder="BCA, B.Tech, MCA..." />
              </label>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="field-label">GitHub</span>
              <input value={form.github} onChange={(event) => setForm((current) => ({ ...current, github: event.target.value }))} className="field-control w-full" placeholder="https://github.com/..." />
            </label>
            <label className="block">
              <span className="field-label">LinkedIn</span>
              <input value={form.linkedin} onChange={(event) => setForm((current) => ({ ...current, linkedin: event.target.value }))} className="field-control w-full" placeholder="https://linkedin.com/in/..." />
            </label>
            <label className="block">
              <span className="field-label">LeetCode</span>
              <input value={form.leetcode} onChange={(event) => setForm((current) => ({ ...current, leetcode: event.target.value }))} className="field-control w-full" placeholder="https://leetcode.com/u/..." />
            </label>
          </div>

          <div className="rounded-[24px] border border-stone-200 bg-[#f8f4ec] px-4 py-4 text-sm leading-6 text-slate-600">
            These details are optional for professionals and required for students. Your profile is saved to the backend session store.
          </div>

          <label className="block">
            <span className="field-label">Profile status</span>
            <div className="text-sm text-slate-600">{user?.profileCompleted ? 'Completed' : 'Incomplete'}</div>
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438] disabled:opacity-70">
              <PencilLine className="h-4 w-4" />
              {submitting ? 'Saving...' : 'Save profile'}
            </button>
            <button type="button" onClick={handleReset} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-stone-50">
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </form>

        {saved && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Profile updated and synced to your account.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
