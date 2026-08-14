import React, { useState } from 'react';
import { ArrowRight, Loader2, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      navigate('/reset-password', { state: { email: email.trim(), notice: 'We sent a reset code to your email.' } });
    } catch (submitError) {
      setError(submitError.message || 'Unable to send a reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Request a reset code."
      description="We will email a one-time code if an account exists for that address."
      actionLink={{ to: '/login', label: 'Back to sign in' }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <label className="block">
          <span className="field-label">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field-control w-full pl-11"
              placeholder="name@company.com"
            />
          </div>
        </label>

        <div className="rounded-[24px] border border-stone-200 bg-[#f8f4ec] px-4 py-4 text-sm leading-6 text-slate-600">
          If your account exists, you will be taken to the reset screen after the code is requested.
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-70">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset code'}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>

        <p className="text-center text-sm text-slate-600">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-[#16324f] transition hover:text-[#0f2438]">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;