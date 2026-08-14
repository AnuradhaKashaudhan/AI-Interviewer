import React, { useEffect, useState } from 'react';
import { ArrowRight, BellRing, MoonStar, Save, Shield, Sparkles, Volume2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

const defaultSettings = {
  autoSpeakQuestions: true,
  requestScreenShare: true,
  preferBrowserTranscript: true,
  saveInterviewHistory: true,
  compactFeedback: false,
};

const loadSettings = () => {
  try {
    const stored = window.localStorage.getItem('ai-interviewer-settings');
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch (error) {
    return defaultSettings;
  }
};

const saveSettings = (settings) => {
  window.localStorage.setItem('ai-interviewer-settings', JSON.stringify(settings));
  window.dispatchEvent(new Event('ai-interviewer-settings-updated'));
};

const SettingsPage = () => {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const toggle = (key) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
      <div className="surface-card p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Settings</div>
        <h2 className="mt-2 font-display text-4xl font-semibold text-slate-900">Control the live interview experience.</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">These settings are stored locally and can influence how the interview page behaves, including audio prompts and transcript handling.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {[
            { key: 'autoSpeakQuestions', title: 'Auto-speak each question', desc: 'Read the question aloud when it appears.', icon: Volume2 },
            { key: 'requestScreenShare', title: 'Request screen share at start', desc: 'Ask for permission before the first question.', icon: Video },
            { key: 'preferBrowserTranscript', title: 'Prefer browser transcript', desc: 'Use live speech recognition text before audio transcription.', icon: Sparkles },
            { key: 'saveInterviewHistory', title: 'Save interview history', desc: 'Keep reports and answer history for the dashboard.', icon: Shield },
            { key: 'compactFeedback', title: 'Compact feedback cards', desc: 'Use denser report cards in the live panel.', icon: MoonStar },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <label key={item.key} className="flex cursor-pointer items-start gap-4 rounded-2xl border border-stone-200 bg-white px-4 py-4 transition hover:bg-stone-50">
                <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#16324f]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings[item.key]}
                      onChange={() => toggle(item.key)}
                      className="mt-1 h-5 w-5 rounded border-stone-300 text-[#16324f] focus:ring-[#16324f]/20"
                    />
                  </div>
                </div>
              </label>
            );
          })}

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#16324f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]">
              <Save className="h-4 w-4" />
              Save settings
            </button>
            <Link to="/interview/new" className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-stone-50">
              Test in interview
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </form>

        {saved && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Settings saved and applied locally.</div>}
      </div>

      <div className="space-y-6">
        <div className="surface-card p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">What changes</div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">Auto-speak controls whether the interviewer reads each question aloud.</div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">Browser transcript preference keeps answer reports closer to what you actually said.</div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">Screen-share permission is requested before the live interview begins.</div>
          </div>
        </div>

        <div className="surface-card bg-[#f8f4ec] p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Behavior preview</div>
          <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">These toggles are read by the live interview page.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">You can change them here and then launch a new interview session to see the effect immediately.</p>
          <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><BellRing className="h-4 w-4 text-[#16324f]" /> Session preferences are stored locally.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
