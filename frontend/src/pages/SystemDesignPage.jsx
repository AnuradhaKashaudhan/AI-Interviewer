import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SystemDesignPage = () => {
  const { user, entitlements, token } = useAuth();
  const isAdvanced = entitlements?.plan_id === 'advanced';
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      axios.get('/api/system-design/progress', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setProgress(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user]);

  const topics = [
    { id: 'url_shortener', title: 'URL Shortener', diff: 'Intermediate', icon: '🔗' },
    { id: 'chat_system', title: 'Global Chat System', diff: 'Advanced', icon: '💬' },
    { id: 'rate_limiter', title: 'API Rate Limiter', diff: 'Beginner', icon: '🚦' }
  ];

  const handleStart = async (topicId) => {
    if (!isAdvanced) return;
    
    try {
      const res = await axios.post('/api/system-design/start', 
        { topic: topicId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/system-design/drill/${res.data.session_id}`);
    } catch (error) {
      alert("Failed to start drill: " + (error.response?.data?.detail || error.message));
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">System Design Drills</h2>
        <p className="text-gray-400">Please log in to access this feature.</p>
        <button onClick={() => navigate('/login')} className="mt-4 px-6 py-2 bg-blue-600 rounded">Log In</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
            System Design Drills
          </h1>
          <p className="text-slate-500 mt-2">Agentic playgrounds for architectural mastery.</p>
        </div>
        {progress && (
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
              <div className="text-3xl font-bold text-[#16324f]">{progress.completed}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Drills</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
              <div className="text-3xl font-bold text-emerald-600">{progress.average_score}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Avg Score</div>
            </div>
          </div>
        )}
      </div>

      {!isAdvanced && (
        <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-2xl text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2 text-indigo-900">
            <span>🔒</span> Advanced Feature
          </h2>
          <p className="text-indigo-700 mb-6 max-w-2xl mx-auto">
            System Design Drills with LangGraph orchestration, dynamic RAG knowledge grounding, and ML-based multi-dimensional scoring are exclusive to the Advanced plan.
          </p>
          <button onClick={() => navigate('/pricing')} className="px-8 py-3 bg-[#16324f] hover:bg-[#0f2438] text-white font-bold rounded-lg transition-colors shadow-sm">
            Upgrade to Advanced (₹499)
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topics.map(t => (
          <div key={t.id} className={`p-6 rounded-2xl border transition-all ${isAdvanced ? 'bg-white border-slate-200 hover:border-[#16324f] hover:shadow-lg hover:-translate-y-1 cursor-pointer' : 'bg-slate-50 border-slate-200 opacity-60 grayscale'}`} onClick={() => handleStart(t.id)}>
            <div className="text-4xl mb-4">{t.icon}</div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-slate-900">{t.title}</h3>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.diff === 'Beginner' ? 'bg-emerald-100 text-emerald-700' : t.diff === 'Intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
              {t.diff}
            </span>
            <div className="mt-6 flex justify-end">
              <button disabled={!isAdvanced} className="text-sm font-bold text-[#16324f] hover:text-[#0f2438]">Start Drill →</button>
            </div>
          </div>
        ))}
      </div>
      
      {progress && progress.history.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-4 text-slate-900">Past Sessions</h3>
          <div className="space-y-3">
            {progress.history.map(h => (
              <div key={h.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div>
                  <div className="font-medium text-slate-900">{h.topic.replace('_', ' ').toUpperCase()}</div>
                  <div className="text-sm text-slate-500">{new Date(h.date).toLocaleDateString()}</div>
                </div>
                <div className="font-bold text-[#16324f] text-xl">{h.score}/100</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemDesignPage;
