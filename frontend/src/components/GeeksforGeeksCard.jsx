import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  RefreshCw,
  AlertCircle,
  Loader2,
  TrendingUp,
  ExternalLink,
  Lock,
  ArrowRight,
  Users,
  FileText,
  MessageSquare,
  Info,
  UserCheck
} from 'lucide-react';
import { getAuthToken } from '../services/authApi.js';

function cleanGFGUsername(input) {
  if (!input) return '';
  let str = input.trim();
  str = str.split('?')[0].split('#')[0];
  str = str.replace(/\/+$/, '');
  str = str.replace(/^(https?:\/\/)?(www\.)?geeksforgeeks\.org\/?/i, '');
  str = str.replace(/^(user|profile|u)\//i, '');
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
  if (!res.ok) throw new Error(data.detail || 'GeeksforGeeks API request failed.');
  return data.profile;
}

const StatCard = ({ label, value, color = 'stone', note }) => {
  const isUnavailable = value === null || value === undefined;
  const colorMap = {
    stone:   'border-stone-200 bg-stone-50 text-stone-900',
    emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
    amber:   'border-amber-200 bg-amber-50/50 text-amber-700',
    rose:    'border-rose-200 bg-rose-50/50 text-rose-700',
    indigo:  'border-indigo-200 bg-indigo-50/50 text-indigo-700',
    violet:  'border-violet-200 bg-violet-50/50 text-violet-700',
  };
  const cls = colorMap[color] || colorMap.stone;

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
      {isUnavailable ? (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-400 italic">Unavailable</span>
          <Info className="h-3.5 w-3.5 text-slate-300" />
        </div>
      ) : (
        <>
          <div className="mt-1 font-display text-2xl font-bold">{value}</div>
          {note && <div className="mt-0.5 text-[10px] opacity-60">{note}</div>}
        </>
      )}
    </div>
  );
};

const GeeksforGeeksCard = ({ onScoreUpdate }) => {
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
      const p = await apiCall('/api/coding-profile/geeksforgeeks');
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
    const cleaned = cleanGFGUsername(usernameInput);
    if (!cleaned) return;
    if (!getAuthToken()) {
      setError('Please sign in to link your GeeksforGeeks profile.');
      return;
    }
    setLoadingState('linking');
    setError('');
    try {
      const p = await apiCall('/api/coding-profile/geeksforgeeks/link', 'POST', { username: cleaned });
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
      const p = await apiCall('/api/coding-profile/geeksforgeeks/refresh', 'POST');
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
            DSA & Article Platform
          </div>
          <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">
            GeeksforGeeks Integration
          </h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700">
          <BookOpenCheck className="h-5 w-5" />
        </div>
      </div>

      {/* Auth guard */}
      {!isAuthenticated && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <div className="font-semibold text-sm">Sign In Required</div>
              <p className="mt-1 text-xs text-amber-800">
                Sign in to link and save your GeeksforGeeks profile.
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

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
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

      {/* Link form */}
      {isAuthenticated && !isWorking && !profile && loadingState === 'idle' && (
        <div className="mt-5">
          <p className="text-sm leading-6 text-slate-600">
            Link your GeeksforGeeks profile to display your public profile info including name, avatar, article count, and community stats.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLink()}
              placeholder="geeksforgeeks.org/user/your-username or username"
              className="flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-slate-900 focus:border-[#16324f] focus:outline-none"
            />
            <button
              onClick={handleLink}
              disabled={!usernameInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16324f] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2438] disabled:opacity-50"
            >
              <BookOpenCheck className="h-4 w-4" /> Link GeeksforGeeks
            </button>
          </div>
        </div>
      )}

      {loadingState === 'linking' && (
        <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-[#16324f]" /> Fetching GFG profile…
        </div>
      )}

      {/* Profile data */}
      {!isWorking && profile && (
        <div className="mt-6 space-y-6">

          {/* Profile header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <div className="flex items-center gap-4">
              <img
                src={stats.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`}
                alt={profile.username}
                className="h-16 w-16 rounded-full border-2 border-white shadow-sm object-cover bg-emerald-900"
                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`; }}
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-display text-xl font-bold text-slate-900">{stats.name || profile.username}</h4>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    GeeksforGeeks
                  </span>
                </div>
                {stats.headline && (
                  <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{stats.headline}</div>
                )}
                <div className="text-xs text-slate-400 mt-0.5">@{profile.username}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://www.geeksforgeeks.org/user/${profile.username}`}
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

          {/* Live community stats (actually available) */}
          <div className="grid gap-3 grid-cols-3">
            <StatCard
              label="Followers"
              value={stats.follower_count ?? 0}
              color="emerald"
              note="GFG community"
            />
            <StatCard
              label="Following"
              value={stats.following_count ?? 0}
              color="stone"
              note="GFG community"
            />
            <StatCard
              label="Posts"
              value={stats.post_count ?? 0}
              color="indigo"
              note="Community posts"
            />
          </div>

          {/* Articles (from RSC scrape — available when public) */}
          <div className="grid gap-3 grid-cols-1">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <FileText className="h-4 w-4 text-emerald-600" /> Articles Published
              </div>
              {stats.articles_count !== null && stats.articles_count !== undefined ? (
                <div className="mt-2 font-display text-2xl font-bold text-slate-900">{stats.articles_count}</div>
              ) : (
                <div className="mt-2 text-sm text-slate-400 italic flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Unavailable from public page
                </div>
              )}
            </div>
          </div>

          {/* Unavailability notice for coding stats */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <div className="font-semibold text-sm text-amber-900">Coding Stats Unavailable</div>
                <p className="mt-1 text-xs text-amber-800 leading-5">
                  GeeksforGeeks removed all public APIs for coding score, problems solved,
                  institute rank, and streak. These metrics are now only loaded after
                  authenticated browser sessions and <strong>cannot be fetched server-side</strong> without
                  your GFG login session. Only publicly accessible profile data is shown above.
                </p>
                <a
                  href={`https://www.geeksforgeeks.org/user/${profile.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
                >
                  View full stats on GFG <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Score callout */}
          <div className="flex items-center justify-between rounded-2xl border border-[#16324f]/20 bg-[#16324f]/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#16324f] text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#16324f] uppercase tracking-wider">GFG Score</div>
                <div className="text-sm font-semibold text-slate-900">
                  {profile.profile_score?.toFixed(1) ?? '0'} / 100 Points
                </div>
                <div className="text-xs text-slate-400">Based on public community data</div>
              </div>
            </div>
            <button onClick={() => setProfile(null)} className="text-xs text-slate-500 underline">
              Change account
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default GeeksforGeeksCard;
