import React, { useState } from 'react';
import { ArrowRight, Loader2, Lock, Mail, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [message, setMessage] = useState(location.state?.notice || '');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const nextErrors = {};
    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    }
    if (!form.password) {
      nextErrors.password = 'Password is required.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    setMessage('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await login({ email: form.email.trim(), password: form.password });
      navigate('/dashboard');
    } catch (error) {
      setServerError(error.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Sign in"
      title="Welcome back to your interview workspace."
      description="Log in with your verified account to continue sessions, review feedback, and keep your workspace in sync."
      actionLink={{ to: '/signup', label: 'Create account' }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-[24px] border border-stone-200 bg-[#f8f4ec] px-4 py-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a5d2f]">
            <Sparkles className="h-3.5 w-3.5" />
            Existing user access
          </div>
          <div className="mt-1 text-sm text-slate-600">Only verified accounts can log in.</div>
        </div>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {serverError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{serverError}</div>}

        <label className="block">
          <span className="field-label">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="field-control w-full pl-11"
              placeholder="name@company.com"
            />
          </div>
          {errors.email && <div className="mt-2 text-sm text-rose-700">{errors.email}</div>}
        </label>

        <label className="block">
          <span className="field-label">Password</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="field-control w-full pl-11"
              placeholder="Your password"
            />
          </div>
          {errors.password && <div className="mt-2 text-sm text-rose-700">{errors.password}</div>}
        </label>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Complete your profile after signing in.</span>
          <Link to="/signup" className="font-semibold text-slate-500 transition hover:text-slate-800">
            Create account
          </Link>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-70">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;