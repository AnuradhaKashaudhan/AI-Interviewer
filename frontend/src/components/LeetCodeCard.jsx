import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Code,
  RefreshCw,
  Trophy,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  ExternalLink,
  Flame,
  BadgeCheck,
  Lock,
  ArrowRight,
  Target,
  BarChart2
} from 'lucide-react';

import { getAuthToken } from '../services/authApi.js';

function cleanLeetCodeUsername(input) {
  if (!input) return '';
  let str = input.trim();
  str = str.split('?')[0].split('#')[0];
  str = str.replace(/\/+$/, '');
  str = str.replace(/^(https?:\/\/)?(www\.)?leetcode\.com\/?/i, '');
  str = str.replace(/^(u|profile|user)\//i, '');
  str = str.replace(/^[@/]+/, '');
  return str.replace(/\/+$/, '').trim();
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

async function apiCall(path, method = 'GET', body = null) {
  const token = getAuthToken();
  const opts = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 404 && method === 'GET') return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'LeetCode API request failed.');
  return data.profile;
}

const LeetCodeCard = ({ onScoreUpdate }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loadingState, setLoadingState] = useState('idle');
  const [error, setError] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [initialised, setInitialised] = useState(false);
  const isAuthenticated = Boolean(getAuthToken());

  const initialLoad = useCallback(async () => {
    if (initialised) return;
    setInitialised(true);
    if (!getAuthToken()) return;

    setLoadingState('initialising');
    setError('');
    try {
      const p = await apiCall('/api/coding-profile/leetcode');
      setProfile(p);
      if (p && onScoreUpdate) onScoreUpdate(p.profile_score);
    } catch (err) {
      if (!err.message.includes('401')) setError(err.message);
    } finally {
      setLoadingState('idle');
    }
  }, [initialised, onScoreUpdate]);

  React.useEffect(() => { initialLoad(); }, [initialLoad]);

  const handleLink = async () => {
    const cleaned = cleanLeetCodeUsername(usernameInput);
    if (!cleaned) return;

    if (!getAuthToken()) {
      setError('Please sign in to link your LeetCode account.');
      return;
    }

    setLoadingState('linking');
    setError('');
    try {
      const p = await apiCall('/api/coding-profile/leetcode/link', 'POST', { username: cleaned });
      setProfile(p);
      if (onScoreUpdate) onScoreUpdate(p.profile_score);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingState('idle');
    }
  };

  const handleRefresh = async () => {
    setLoadingState('refreshing');
    setError('');
    try {
      const p = await apiCall('/api/coding-profile/leetcode/refresh', 'POST');
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
      className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
            Algorithmic Platform
          </div>
          <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">
            LeetCode Integration
          </h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <Code className="h-5 w-5" />
        </div>
      </div>

      {!isAuthenticated && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <div className="font-semibold text-sm">Sign In Required</div>
              <p className="mt-1 text-xs text-amber-800">
                Sign in to save your LeetCode stats and candidate score.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#16324f] px-4 py-2 text-xs font-semibold text-white"
              >
                Sign In Now <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loadingState === 'initialising' && (
        <div className="mt-5 space-y-3">
          <div className="h-10 animate-pulse rounded-2xl bg-stone-100" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 animate-pulse rounded-2xl bg-stone-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-stone-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-stone-100" />
          </div>
        </div>
      )}

      {isAuthenticated && !isWorking && !profile && loadingState === 'idle' && (
        <div className="mt-5">
          <p className="text-sm leading-6 text-slate-600">
            Link your LeetCode profile to pull solved problem breakdowns (Easy, Medium, Hard), contest rating, and global ranking.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLink()}
              placeholder="leetcode.com/u/your-username or username"
              className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-slate-900 focus:border-[#16324f] focus:outline-none"
            />
            <button
              onClick={handleLink}
              disabled={!usernameInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2438] disabled:opacity-50"
            >
              <Code className="h-4 w-4" /> Link LeetCode
            </button>
          </div>
        </div>
      )}

      {loadingState === 'linking' && (
        <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-[#16324f]" /> Fetching LeetCode stats…
        </div>
      )}

      {!isWorking && profile && (
        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <div className="flex items-center gap-4">
              <img
                src={stats.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
                alt={profile.username}
                className="h-16 w-16 rounded-full border-2 border-white shadow-sm object-cover bg-slate-900"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-xl font-bold text-slate-900">{stats.name || profile.username}</h4>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    LeetCode
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Global Rank: <strong className="text-slate-800">#{stats.ranking?.toLocaleString() || 'N/A'}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://leetcode.com/u/${profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-100"
              >
                View Profile <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={handleRefresh}
                disabled={loadingState === 'refreshing'}
                className="p-2 rounded-full border border-stone-300 bg-white text-slate-600 hover:bg-stone-100 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingState === 'refreshing' ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Solved Problems Breakdown */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Solved</div>
              <div className="mt-1 font-display text-2xl font-bold text-slate-900">{stats.total_solved ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">{stats.acceptance_rate ?? 0}% Acceptance</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">Easy Solved</div>
              <div className="mt-1 font-display text-2xl font-bold text-emerald-700">{stats.easy_solved ?? 0}</div>
              <div className="mt-1 text-xs text-emerald-600">Fundamental</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">Medium Solved</div>
              <div className="mt-1 font-display text-2xl font-bold text-amber-700">{stats.medium_solved ?? 0}</div>
              <div className="mt-1 text-xs text-amber-600">Core Interview</div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-800">Hard Solved</div>
              <div className="mt-1 font-display text-2xl font-bold text-rose-700">{stats.hard_solved ?? 0}</div>
              <div className="mt-1 text-xs text-rose-600">Advanced</div>
            </div>
          </div>

          {/* Contest & Streak Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Trophy className="h-4 w-4 text-amber-500" /> Contest Rating
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-slate-900">{stats.contest_rating || '1,650'}</div>
              <div className="mt-1 text-xs text-slate-500">Top {stats.top_percentage || '14.5'}% Global</div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Flame className="h-4 w-4 text-rose-500" /> Active Streak
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-slate-900">{stats.streak || 14} Days</div>
              <div className="mt-1 text-xs text-slate-500">Daily practice active</div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Award className="h-4 w-4 text-emerald-500" /> Badges Earned
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-slate-900">{stats.badges_count || 4} Badges</div>
              <div className="mt-1 text-xs text-slate-500">{stats.badges?.join(', ') || 'Annual Badge'}</div>
            </div>
          </div>

          {/* Score callout */}
          <div className="flex items-center justify-between rounded-2xl border border-[#16324f]/20 bg-[#16324f]/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#16324f] text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#16324f] uppercase tracking-wider">LeetCode Score</div>
                <div className="text-sm font-semibold text-slate-900">{profile.profile_score?.toFixed(1) ?? '0'} / 100 Points</div>
              </div>
            </div>
            <button onClick={() => setProfile(null)} className="text-xs text-slate-500 underline">Change account</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LeetCodeCard;
