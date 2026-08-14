import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Github,
  RefreshCw,
  Star,
  Users,
  GitFork,
  BookOpen,
  CalendarDays,
  BadgeCheck,
  AlertCircle,
  Loader2,
  TrendingUp,
  Code2,
  ExternalLink,
  MapPin,
  Building2,
  Link2,
  Twitter,
  UserCheck,
  FolderGit2,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

import { getAuthToken } from '../services/authApi.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanUsername(input) {
  if (!input) return '';
  let str = input.trim();
  // Strip trailing slashes
  str = str.replace(/\/+$/, '');
  // Strip https://github.com/ or github.com/
  str = str.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
  // Strip @ prefix
  str = str.replace(/^@/, '');
  return str;
}

function timeAgo(isoString) {
  if (!isoString) return 'never';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiLinkGithub(username) {
  const token = getAuthToken();
  const res = await fetch('/api/coding-profile/github/link', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to link GitHub account.');
  return data.profile;
}

async function apiGetGithub() {
  const token = getAuthToken();
  const res = await fetch('/api/coding-profile/github', {
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to load profile.');
  return data.profile;
}

async function apiRefreshGithub() {
  const token = getAuthToken();
  const res = await fetch('/api/coding-profile/github/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to refresh profile.');
  return data.profile;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Ruby: '#701516',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  PHP: '#4F5D95',
  Shell: '#89e051',
  Vue: '#41b883',
  React: '#61dafb',
  default: '#8b949e',
};

function LangDot({ lang }) {
  const color = LANG_COLORS[lang] || LANG_COLORS.default;
  return <span style={{ background: color }} className="inline-block h-2.5 w-2.5 rounded-full shrink-0" />;
}

function StatTile({ icon: Icon, label, value, color = 'text-[#16324f]' }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="mt-1 font-display text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CodingProfileCard = ({ onScoreUpdate }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loadingState, setLoadingState] = useState('idle'); // 'idle' | 'initialising' | 'linking' | 'refreshing'
  const [error, setError] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [initialised, setInitialised] = useState(false);
  const isAuthenticated = Boolean(getAuthToken());

  // Fetch profile on first render
  const initialLoad = useCallback(async () => {
    if (initialised) return;
    setInitialised(true);

    if (!getAuthToken()) {
      setLoadingState('idle');
      return;
    }

    setLoadingState('initialising');
    setError('');
    try {
      const p = await apiGetGithub();
      setProfile(p);
      if (p && onScoreUpdate) onScoreUpdate(p.profile_score);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('Not authenticated')) {
        setError('');
      } else {
        setError(err.message);
      }
    } finally {
      setLoadingState('idle');
    }
  }, [initialised, onScoreUpdate]);

  React.useEffect(() => { initialLoad(); }, [initialLoad]);

  const handleLink = async () => {
    const cleaned = cleanUsername(usernameInput);
    if (!cleaned) return;

    if (!getAuthToken()) {
      setError('You are currently signed out. Please sign in to link your GitHub profile.');
      return;
    }

    setLoadingState('linking');
    setError('');
    try {
      const p = await apiLinkGithub(cleaned);
      setProfile(p);
      if (onScoreUpdate) onScoreUpdate(p.profile_score);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingState('idle');
    }
  };

  const handleRefresh = async () => {
    if (!getAuthToken()) {
      setError('Please sign in to refresh your profile.');
      return;
    }

    setLoadingState('refreshing');
    setError('');
    try {
      const p = await apiRefreshGithub();
      setProfile(p);
      if (onScoreUpdate) onScoreUpdate(p.profile_score);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingState('idle');
    }
  };

  const isWorking = loadingState !== 'idle';
  const stats = profile?.raw_stats || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Primary Card */}
      <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
              Verified Developer Profile
            </div>
            <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">
              GitHub Integration & Activity
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#16324f]/6">
            <Github className="h-5 w-5 text-[#16324f]" />
          </div>
        </div>

        {/* Not authenticated warning banner */}
        {!isAuthenticated && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Workspace Sign In Required</div>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  Sign in to your platform account to save your GitHub coding score and blend it with your overall candidate rating.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0f2438]"
                >
                  Sign In Now
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex items-start gap-2 overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Initialising skeleton */}
        {loadingState === 'initialising' && (
          <div className="mt-5 space-y-3">
            <div className="h-10 animate-pulse rounded-2xl bg-stone-100" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-100" />
              ))}
            </div>
          </div>
        )}

        {/* Not linked — show link form */}
        {isAuthenticated && !isWorking && !profile && loadingState === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5"
          >
            <p className="text-sm leading-6 text-slate-600">
              Enter your GitHub username or profile link below to automatically fetch public repositories, star achievements, yearly commit contributions, and programming language statistics.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                id="github-username-input"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLink()}
                placeholder="github.com/your-username or username"
                className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#16324f] focus:outline-none focus:ring-2 focus:ring-[#16324f]/20"
              />
              <button
                id="link-github-btn"
                onClick={handleLink}
                disabled={!usernameInput.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2438] disabled:opacity-50"
              >
                <Github className="h-4 w-4" />
                Link GitHub
              </button>
            </div>
          </motion.div>
        )}

        {/* Linking in progress */}
        {loadingState === 'linking' && (
          <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-[#16324f]" />
            Fetching GitHub repositories and contribution history…
          </div>
        )}

        {/* Linked profile view */}
        {!isWorking && profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 space-y-6"
          >
            {/* Rich Profile Header */}
            <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <img
                  src={stats.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`}
                  alt={profile.username}
                  className="h-16 w-16 rounded-full border-2 border-white shadow-sm object-cover"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display text-xl font-bold text-slate-900">
                      {stats.name || profile.username}
                    </h4>
                    <span className="text-sm font-medium text-slate-500">@{profile.username}</span>
                    {profile.is_verified === 1 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        <BadgeCheck className="h-3 w-3" />
                        Verified Account
                      </span>
                    )}
                  </div>

                  {stats.bio && (
                    <p className="text-xs text-slate-600 max-w-xl leading-relaxed">{stats.bio}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                    {stats.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {stats.location}
                      </span>
                    )}
                    {stats.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {stats.company}
                      </span>
                    )}
                    {stats.blog && (
                      <a
                        href={stats.blog.startsWith('http') ? stats.blog : `https://${stats.blog}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[#16324f] hover:underline"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                <a
                  href={`https://github.com/${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-stone-100"
                >
                  <Github className="h-3.5 w-3.5" />
                  View GitHub
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
                <button
                  id="refresh-github-btn"
                  onClick={handleRefresh}
                  disabled={loadingState === 'refreshing'}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingState === 'refreshing' ? 'animate-spin' : ''}`} />
                  Synced {timeAgo(profile.last_synced)}
                </button>
              </div>
            </div>

            {/* Stat tiles grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile icon={BookOpen} label="Repos" value={stats.public_repos ?? '—'} />
              <StatTile icon={Star} label="Total Stars" value={stats.total_stars ?? '—'} color="text-amber-500" />
              <StatTile icon={Users} label="Followers" value={stats.followers ?? '—'} />
              <StatTile icon={TrendingUp} label="Contributions" value={stats.contributions_last_year ?? '—'} color="text-emerald-600" />
              <StatTile
                icon={CalendarDays}
                label="Account Age"
                value={stats.account_age_days != null ? `${(stats.account_age_days / 365).toFixed(1)} yr` : '—'}
              />
              <StatTile icon={GitFork} label="Total Forks" value={stats.total_forks ?? '—'} />
            </div>

            {/* Language Distribution Progress Bars */}
            {stats.language_breakdown && stats.language_breakdown.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    <Code2 className="h-4 w-4 text-[#16324f]" />
                    Language Distribution Across Repositories
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  {stats.language_breakdown.map((item) => (
                    <div key={item.language} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <LangDot lang={item.language} />
                          {item.language}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {item.count} repos ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: LANG_COLORS[item.language] || LANG_COLORS.default,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Repositories Grid */}
            {stats.featured_repos && stats.featured_repos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                    <FolderGit2 className="h-4 w-4 text-[#16324f]" />
                    Top Public Repositories ({stats.featured_repos.length})
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.featured_repos.map((repo) => (
                    <div
                      key={repo.name}
                      className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-300 transition hover:shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-slate-900 hover:text-[#16324f] hover:underline truncate"
                          >
                            {repo.name}
                          </a>
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-slate-600 shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {repo.description}
                        </p>
                      </div>

                      <div className="mt-4 space-y-2 pt-2 border-t border-stone-100">
                        {repo.topics && repo.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {repo.topics.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <LangDot lang={repo.language} />
                            {repo.language}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {repo.stars}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <GitFork className="h-3 w-3" />
                              {repo.forks}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform Rating Contribution Summary Callout */}
            <div className="flex items-center justify-between rounded-2xl border border-[#16324f]/20 bg-[#16324f]/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#16324f] text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#16324f] uppercase tracking-wider">
                    Calculated Coding Score
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {profile.profile_score?.toFixed(1) ?? '0'} / 100 Points
                  </div>
                </div>
              </div>

              <button
                id="change-github-account-btn"
                onClick={() => setProfile(null)}
                className="text-xs text-slate-500 hover:text-slate-900 underline"
              >
                Change account
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CodingProfileCard;
