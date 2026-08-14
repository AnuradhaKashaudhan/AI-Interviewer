import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Github,
  Code,
  BookOpenCheck,
  ChefHat,
  Sparkles,
  Award,
  Layers,
  CheckCircle2
} from 'lucide-react';

import CodingProfileCard from '../components/CodingProfileCard.jsx';
import LeetCodeCard from '../components/LeetCodeCard.jsx';
import GeeksforGeeksCard from '../components/GeeksforGeeksCard.jsx';
import CodeChefCard from '../components/CodeChefCard.jsx';

const TABS = [
  { id: 'github', label: 'GitHub', icon: Github, color: 'text-slate-900', badgeBg: 'bg-stone-900' },
  { id: 'leetcode', label: 'LeetCode', icon: Code, color: 'text-amber-600', badgeBg: 'bg-amber-600' },
  { id: 'geeksforgeeks', label: 'GeeksforGeeks', icon: BookOpenCheck, color: 'text-emerald-700', badgeBg: 'bg-emerald-700' },
  { id: 'codechef', label: 'CodeChef', icon: ChefHat, color: 'text-purple-700', badgeBg: 'bg-purple-700' },
];

const CodingProfilePage = () => {
  const [activeTab, setActiveTab] = useState('github');

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[32px] border border-stone-200 bg-gradient-to-br from-[#16324f] via-[#1a3b5c] to-[#0f2438] p-8 text-white shadow-lg"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Multi-Platform Developer Analytics
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Coding Profile Dashboard
            </h1>
            <p className="text-sm leading-relaxed text-stone-200 sm:text-base">
              Link your developer profiles across GitHub, LeetCode, GeeksforGeeks, and CodeChef.
              Track your real-world contributions, algorithmic problem-solving accuracy, contest ratings, and global rankings in one unified workspace.
            </p>
          </div>

          {/* Pillar Weightage Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md lg:w-72 shrink-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-300">
              Platform Rating Formula
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-300">
                <span>Mock Interview</span>
                <span className="font-bold text-white">55%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-amber-400" style={{ width: '55%' }} />
              </div>

              <div className="flex items-center justify-between text-stone-300 pt-1">
                <span>ATS Resume Match</span>
                <span className="font-bold text-white">25%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: '25%' }} />
              </div>

              <div className="flex items-center justify-between text-stone-300 pt-1">
                <span>Coding Profiles</span>
                <span className="font-bold text-amber-300">20%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-amber-300" style={{ width: '20%' }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-100/80 p-1.5 backdrop-blur-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all focus:outline-none ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? tab.color : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-xl border border-stone-300/80 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'github' && <CodingProfileCard />}
          {activeTab === 'leetcode' && <LeetCodeCard />}
          {activeTab === 'geeksforgeeks' && <GeeksforGeeksCard />}
          {activeTab === 'codechef' && <CodeChefCard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CodingProfilePage;
