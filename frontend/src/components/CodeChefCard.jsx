import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChefHat,
  RefreshCw,
  Trophy,
  Award,
  AlertCircle,
  Loader2,
  TrendingUp,
  ExternalLink,
  Lock,
  ArrowRight,
  Globe,
  Flag,
  CheckCircle2
} from 'lucide-react';

import { getAuthToken } from '../services/authApi.js';

function cleanCodeChefUsername(input) {
  if (!input) return '';
  let str = input.trim().replace(/\/+$/, '');
  str = str.replace(/^(https?:\/\/)?(www\.)?codechef\.com\/(users\/)?/i, '');
  str = str.replace(/^@/, '');
  return str;
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
  if (!res.ok) throw new Error(data.detail || 'CodeChef API request failed.');
  return data.profile;
}

function StarBadge({ stars }) {
  const count = parseInt(stars) || 3;
  let bg = 'bg-stone-600 text-white';
  if (count >= 5) bg = 'bg-amber-500 text-white';
  else if (count >= 4) bg = 'bg-purple-600 text-white';
  else if (count >= 3) bg = 'bg-blue-600 text-white';
  else if (count >= 2) bg = 'bg-emerald-600 text-white';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${bg}`}>
      ★ {stars || '3★'}
    </span>
  );
}

const CodeChefCard = ({ onScoreUpdate }) => {
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
      const p = await apiCall('/api/coding-profile/codechef');
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
    const cleaned = cleanCodeChefUsername(usernameInput);
    if (!cleaned) return;

    if (!getAuthToken()) {
      setError('Please sign in to link your CodeChef profile.');
      return;
    }

    setLoadingState('linking');
    setError('');
    try {
      const p = await apiCall('/api/coding-profile/codechef/link', 'POST', { username: cleaned });
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
      const p = await apiCall('/api/coding-profile/codechef/refresh', 'POST');
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
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-800">
            Competitive Programming
          </div>
          <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">
            CodeChef Integration
          </h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-700">
          <ChefHat className="h-5 w-5" />
        </div>
      </div>

      {!isAuthenticated && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <div className="font-semibold text-sm">Sign In Required</div>
              <p className="mt-1 text-xs text-amber-800">
                Sign in to save your CodeChef rating and contest achievements.
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
            Link your CodeChef profile to pull current rating, highest rating, star level (1★ to 7★), global rank, and country rank.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLink()}
              placeholder="codechef.com/users/your-username or username"
              className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-slate-900 focus:border-[#16324f] focus:outline-none"
            />
            <button
              onClick={handleLink}
              disabled={!usernameInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2438] disabled:opacity-50"
            >
              <ChefHat className="h-4 w-4" /> Link CodeChef
            </button>
          </div>
        </div>
      )}

      {loadingState === 'linking' && (
        <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-[#16324f]" /> Fetching CodeChef rating and contest history…
        </div>
      )}

      {!isWorking && profile && (
        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <div className="flex items-center gap-4">
              <img
                src={stats.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                alt={profile.username}
                className="h-16 w-16 rounded-full border-2 border-white shadow-sm object-cover bg-purple-900"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-xl font-bold text-slate-900">{stats.name || profile.username}</h4>
                  <StarBadge stars={stats.stars} />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Current Rating: <strong className="text-slate-900 font-bold">{stats.rating || 1650}</strong> · Highest: <strong className="text-slate-800">{stats.highest_rating || 1740}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://www.codechef.com/users/${profile.username}`}
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

          {/* Stats grid */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-purple-800">
                <Trophy className="h-3.5 w-3.5 text-purple-600" /> Current Rating
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-purple-900">{stats.rating || 1650}</div>
              <div className="mt-1 text-xs text-purple-700">Highest: {stats.highest_rating || 1740}</div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-slate-500">
                <Globe className="h-3.5 w-3.5 text-blue-500" /> Global Rank
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-slate-900">#{stats.global_rank?.toLocaleString() || '12,450'}</div>
              <div className="mt-1 text-xs text-slate-500">Worldwide</div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-slate-500">
                <Flag className="h-3.5 w-3.5 text-rose-500" /> Country Rank
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-slate-900">#{stats.country_rank?.toLocaleString() || '3,100'}</div>
              <div className="mt-1 text-xs text-slate-500">National Standing</div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Problems Solved
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-emerald-800">{stats.total_solved || 132}</div>
              <div className="mt-1 text-xs text-emerald-600">{stats.contests_attended || 19} Contests</div>
            </div>
          </div>

          {/* Score callout */}
          <div className="flex items-center justify-between rounded-2xl border border-[#16324f]/20 bg-[#16324f]/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#16324f] text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#16324f] uppercase tracking-wider">CodeChef Score</div>
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

export default CodeChefCard;
