import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import CareerPilotLogo from './CareerPilotLogo';
import {
  ArrowRight,
  ChevronDown,
  Code2,
  CreditCard,
  LayoutDashboard,
  Menu,
  MicVocal,
  MonitorUp,
  Network,
  PlayCircle,
  Receipt,
  Settings2,
  ShieldQuestion,
  Sparkles,
  SquarePen,
  Brain,
  UserCircle2,
  UserRound,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import LoginRequiredModal from './LoginRequiredModal.jsx';
import LimitReachedModal from './LimitReachedModal.jsx';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Features', to: '/features', icon: Sparkles },
  { label: 'ATS Checker', to: '/ats-checker', icon: SquarePen, protected: true },
  { label: 'Coding Profile', to: '/coding-profile', icon: Code2, protected: true },
  { label: 'Career Intelligence', to: '/career-intelligence', icon: Brain, protected: true },
  { label: 'System Design Drills', to: '/system-design', icon: Network, protected: true },
  { label: 'Pricing', to: '/pricing', icon: CreditCard },
  { label: 'Billing & History', to: '/billing', icon: Receipt },
  { label: 'Help & Support', to: '/support', icon: ShieldQuestion },
];

const titleByPath = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/features': 'Features',
  '/ats-checker': 'ATS Checker',
  '/ats-checker/fix': 'Fix My Resume',
  '/coding-profile': 'Coding Profile',
  '/career-intelligence': 'Career Intelligence',
  '/pricing': 'Pricing',
  '/upgrade': 'Upgrade Plan',
  '/payment/success': 'Payment Receipt',
  '/payment/failed': 'Payment Status',
  '/billing': 'Billing & Transactions',
  '/support': 'Help & Support',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/signup': 'Sign Up',
  '/interview/new': 'Interview Setup',
};

const ShellButton = ({ children, variant = 'primary', ...props }) => (
  <button
    {...props}
    className={variant === 'primary'
      ? 'inline-flex items-center justify-center rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438] focus:outline-none focus:ring-2 focus:ring-[#16324f]/30'
      : 'inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-300'}
  >
    {children}
  </button>
);

const AppShell = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, entitlements } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginRequiredFeature, setLoginRequiredFeature] = useState(null);
  const [limitReachedFeature, setLimitReachedFeature] = useState(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });

  const pageTitle = useMemo(() => titleByPath[location.pathname] || 'CareerPilot AI', [location.pathname]);

  const closePanels = () => {
    setMobileOpen(false);
    setDemoOpen(false);
    setSignInOpen(false);
    setUserMenuOpen(false);
  };

  const signIn = (event) => {
    event.preventDefault();
    setAuthForm({ name: '', email: '', password: '' });
    setSignInOpen(false);
  };

  const isPaidPlan = user && entitlements?.plan_id && entitlements.plan_id !== 'free';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff9ef_0%,_#f7f1e7_44%,_#f0eadf_100%)] text-slate-900">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-80 lg:flex-col lg:border-r lg:border-stone-200 lg:bg-[#fcf8f0]/96 lg:backdrop-blur-md">
        <div className="flex h-full flex-col px-5 py-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center rounded-2xl px-2 py-2 text-left transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#16324f]/20"
          >
            <CareerPilotLogo textSize="text-lg" />
          </button>

          <div className="mt-8">
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace</div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={(e) => {
                      if (item.protected && !user) {
                        e.preventDefault();
                        setLoginRequiredFeature(item.label);
                        setMobileOpen(false);
                        return;
                      }
                      if (item.label === 'ATS Checker' && entitlements?.ats_remaining === 0) {
                        e.preventDefault();
                        setLimitReachedFeature({ name: 'ATS checks', limit: entitlements.ats_checks });
                        setMobileOpen(false);
                        return;
                      }
                      setMobileOpen(false);
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl border-l-2 px-3 py-3 transition focus:outline-none ${isActive
                        ? 'border-[#16324f] bg-[#16324f]/6 text-[#16324f]'
                        : 'border-transparent text-slate-600 hover:border-stone-300 hover:bg-stone-100 hover:text-slate-900'}`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto space-y-3 border-t border-stone-200 pt-5">
            <button
              type="button"
              onClick={() => {
                if (user) {
                  setUserMenuOpen((current) => !current);
                  return;
                }
                navigate('/login');
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-left transition hover:border-stone-300 hover:bg-stone-50"
            >
              <img
                src={user ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}` : 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest-user'}
                alt="user avatar"
                className="h-10 w-10 rounded-full border border-stone-200 bg-stone-100"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                  <span className="truncate">{user?.fullName || 'Guest User'}</span>
                </div>
                <div className="truncate text-xs text-slate-500">{user ? user.email : 'Sign in to save progress'}</div>
                {isPaidPlan && (
                  <div className="mt-0.5 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    ✦ {entitlements.plan_name}
                  </div>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>


            {user && userMenuOpen && (
              <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                {[
                  { label: 'Profile', icon: UserCircle2, to: '/profile' },
                  { label: 'Settings', icon: Settings2, to: '/settings' },
                  { label: 'Log out', icon: LogOut, action: 'logout' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (item.action === 'logout') {
                          logout();
                          setUserMenuOpen(false);
                          navigate('/');
                          return;
                        }
                        if (item.to) {
                          navigate(item.to);
                        }
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-stone-100"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (!user) {
                  setLoginRequiredFeature('Mock Interview');
                  return;
                }
                if (entitlements?.sessions_remaining === 0) {
                  setLimitReachedFeature({ name: 'mock interviews', limit: entitlements.mock_interviews });
                  return;
                }
                navigate('/interview/new');
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]"
            >
              Start Now
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#fcf8f0]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-slate-700 transition hover:border-stone-300 hover:bg-stone-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {isPaidPlan ? (
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                  <span>✦ {entitlements.plan_name} Active</span>
                </div>
              ) : (
                <ShellButton variant="secondary" onClick={() => navigate('/pricing')}>Upgrade Plan</ShellButton>
              )}
              <ShellButton onClick={() => setDemoOpen(true)}>Watch Demo</ShellButton>
            </div>

          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet context={{ user, openSignIn: () => navigate('/login') }} />
        </main>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
            className="fixed inset-y-0 left-0 z-50 w-80 border-r border-stone-200 bg-[#fcf8f0] lg:hidden"
          >
            <div className="flex h-full flex-col px-5 py-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex items-center justify-between rounded-2xl px-2 py-2 text-left"
                >
                  <CareerPilotLogo textSize="text-lg" />
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-8 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={(e) => {
                        if (item.protected && !user) {
                          e.preventDefault();
                          setLoginRequiredFeature(item.label);
                          setMobileOpen(false);
                          return;
                        }
                        if (item.label === 'ATS Checker' && entitlements?.ats_remaining === 0) {
                          e.preventDefault();
                          setLimitReachedFeature({ name: 'ATS checks', limit: entitlements.ats_checks });
                          setMobileOpen(false);
                          return;
                        }
                        setMobileOpen(false);
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl border-l-2 px-3 py-3 transition ${isActive
                          ? 'border-[#16324f] bg-[#16324f]/6 text-[#16324f]'
                          : 'border-transparent text-slate-600 hover:border-stone-300 hover:bg-stone-100 hover:text-slate-900'}`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>

              <div className="mt-auto space-y-3 border-t border-stone-200 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    if (user) {
                      setUserMenuOpen((current) => !current);
                      return;
                    }
                    navigate('/login');
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-left transition hover:border-stone-300 hover:bg-stone-50"
                >
                  <img
                    src={user ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}` : 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest-user'}
                    alt="user avatar"
                    className="h-10 w-10 rounded-full border border-stone-200 bg-stone-100"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{user?.fullName || 'Guest User'}</div>
                    <div className="text-xs text-slate-500">{user ? user.email : 'Sign in to save progress'}</div>
                  </div>
                </button>
                {user && userMenuOpen && (
                  <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                    {[
                      { label: 'Profile', icon: UserCircle2, to: '/profile' },
                      { label: 'Settings', icon: Settings2, to: '/settings' },
                      { label: 'Log out', icon: LogOut, action: 'logout' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            if (item.action === 'logout') {
                              logout();
                              setUserMenuOpen(false);
                              navigate('/');
                              return;
                            }
                            if (item.to) {
                              navigate(item.to);
                            }
                            setUserMenuOpen(false);
                            setMobileOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-stone-100"
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      setLoginRequiredFeature('Mock Interview');
                      setMobileOpen(false);
                      return;
                    }
                    if (entitlements?.sessions_remaining === 0) {
                      setLimitReachedFeature({ name: 'mock interviews', limit: entitlements.mock_interviews });
                      setMobileOpen(false);
                      return;
                    }
                    setMobileOpen(false);
                    navigate('/interview/new');
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]"
                >
                  Start Now
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {demoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4"
            onClick={() => setDemoOpen(false)}
          >
            <motion.div
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.98 }}
              className="w-full max-w-3xl rounded-[28px] border border-stone-200 bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a5d2f]">Product Demo</div>
                  <h2 className="font-display text-2xl font-semibold text-slate-900">A quick look at the interview flow</h2>
                </div>
                <button type="button" onClick={() => setDemoOpen(false)} className="rounded-full border border-stone-200 p-2 text-slate-500 transition hover:bg-stone-50">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr,0.65fr]">
                <div className="rounded-[24px] border border-stone-200 bg-[#f8f4ec] p-5">
                  <div className="flex aspect-video items-center justify-center rounded-[20px] border border-dashed border-stone-300 bg-white text-center text-slate-500">
                    <div>
                      <PlayCircle className="mx-auto mb-3 h-12 w-12 text-[#16324f]" />
                      <div className="text-sm font-medium">Embedded demo video placeholder</div>
                      <div className="mt-1 text-xs text-slate-400">Swap in a real MP4 when ready.</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-[24px] border border-stone-200 bg-white p-5">
                  {[
                    'Role setup and skill targeting',
                    'Live interview prompt generation',
                    'Transcript feedback and ATS analysis',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-slate-700">
                      <MonitorUp className="h-4 w-4 text-[#16324f]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {signInOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 px-4"
            onClick={() => setSignInOpen(false)}
          >
            <motion.form
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.98 }}
              onSubmit={signIn}
              className="w-full max-w-lg rounded-[28px] border border-stone-200 bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a5d2f]">Account Access</div>
                  <h2 className="font-display text-2xl font-semibold text-slate-900">Sign in to your workspace</h2>
                </div>
                <button type="button" onClick={() => setSignInOpen(false)} className="rounded-full border border-stone-200 p-2 text-slate-500 transition hover:bg-stone-50">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <button type="button" className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-stone-100">
                  Continue with Google
                </button>
                <div className="text-center text-xs uppercase tracking-[0.24em] text-slate-400">or</div>
                <div className="grid gap-3">
                  <input value={authForm.name} onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#16324f]" />
                  <input required value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" type="email" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#16324f]" />
                  <input required value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" type="password" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#16324f]" />
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <button type="button" className="hover:text-slate-800">Forgot password?</button>
                  <button type="button" onClick={() => navigate('/signup')} className="hover:text-slate-800">Create account</button>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button type="button" onClick={() => setSignInOpen(false)} className="flex-1 rounded-full border border-stone-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-stone-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">Sign in</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loginRequiredFeature && (
          <LoginRequiredModal 
            featureName={loginRequiredFeature} 
            onClose={() => setLoginRequiredFeature(null)} 
          />
        )}
        {limitReachedFeature && (
          <LimitReachedModal
            featureName={limitReachedFeature.name}
            limit={limitReachedFeature.limit}
            onClose={() => setLimitReachedFeature(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppShell;
