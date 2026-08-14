import React, { useState } from 'react';
import { ArrowRight, Loader2, Mail, Phone, UserRound, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!form.email.trim() || !emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!form.phoneNumber.trim()) nextErrors.phoneNumber = 'Phone number is required.';
    if (form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await signup({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      navigate('/login', { state: { notice: response.message || 'Account created. Please log in.' } });
    } catch (error) {
      setServerError(error.message || 'Unable to create the account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Create your account."
      description="Register with your full name, email, phone number, and a secure password. After signup you can complete your profile."
      actionLink={{ to: '/login', label: 'Sign in' }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{serverError}</div>}

        <label className="block">
          <span className="field-label">Full name</span>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              className="field-control w-full pl-11"
              placeholder="Your full name"
            />
          </div>
          {errors.fullName && <div className="mt-2 text-sm text-rose-700">{errors.fullName}</div>}
        </label>

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
          <span className="field-label">Phone number</span>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={form.phoneNumber}
              onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
              className="field-control w-full pl-11"
              placeholder="+1 555 123 4567"
            />
          </div>
          {errors.phoneNumber && <div className="mt-2 text-sm text-rose-700">{errors.phoneNumber}</div>}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="field-control w-full pl-11"
                placeholder="Minimum 8 characters"
              />
            </div>
            {errors.password && <div className="mt-2 text-sm text-rose-700">{errors.password}</div>}
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
                placeholder="Repeat your password"
              />
            </div>
            {errors.confirmPassword && <div className="mt-2 text-sm text-rose-700">{errors.confirmPassword}</div>}
          </label>
        </div>

        <div className="rounded-[24px] border border-stone-200 bg-[#f8f4ec] px-4 py-4 text-sm leading-6 text-slate-600">
          Your password is hashed before storage. After signup, you can fill in college, course, year, and portfolio links.
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-70">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#16324f] transition hover:text-[#0f2438]">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default SignupPage;
