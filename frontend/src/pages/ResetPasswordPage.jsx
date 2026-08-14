import React, { useMemo, useState } from 'react';
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import OtpInput from '../components/auth/OtpInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, resendOtp } = useAuth();
  const initialEmail = useMemo(() => location.state?.email || '', [location.state]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState(location.state?.notice || 'Enter the reset code and a new password.');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  React.useEffect(() => {
    if (resendTimer <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendTimer((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendTimer]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    if (otp.length !== 6) {
      setError('Enter the 6-digit reset code.');
      return;
    }

    if (!form.newPassword || form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({
        email: email.trim(),
        otp,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      navigate('/login', { state: { notice: 'Password updated. Sign in with your new password.' } });
    } catch (submitError) {
      setError(submitError.message || 'Unable to reset the password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resendTimer > 0) {
      return;
    }

    setError('');
    setResending(true);
    try {
      const response = await resendOtp({ email: email.trim(), purpose: 'reset' });
      setMessage(response.message || 'A new reset code has been sent.');
      setResendTimer(60);
    } catch (resendError) {
      setError(resendError.message || 'Unable to resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Verify the reset code and choose a new password."
      description="Reuse the same OTP pattern used for sign-up verification, then update your password once the code matches."
      actionLink={{ to: '/login', label: 'Sign in' }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-[24px] border border-stone-200 bg-[#f8f4ec] px-4 py-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a5d2f]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Password recovery
          </div>
          <div className="mt-1 text-sm text-slate-600">The OTP route is shared with account verification. Use the resend link after the timer finishes.</div>
        </div>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
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

        <label className="block">
          <span className="field-label">Reset code</span>
          <OtpInput value={otp} onChange={setOtp} disabled={submitting} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">New password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                className="field-control w-full pl-11"
                placeholder="Minimum 8 characters"
              />
            </div>
          </label>

          <label className="block">
            <span className="field-label">Confirm password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                className="field-control w-full pl-11"
                placeholder="Repeat the new password"
              />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={handleResend} disabled={resending || resendTimer > 0} className="font-semibold text-[#16324f] transition hover:text-[#0f2438] disabled:cursor-not-allowed disabled:text-slate-400">
            {resending ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
          </button>
          <Link to="/forgot-password" className="font-semibold text-slate-500 transition hover:text-slate-800">
            Start over
          </Link>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-70">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;