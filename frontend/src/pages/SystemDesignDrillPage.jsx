import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../utils/apiConfig';
import { useAuth } from '../context/AuthContext';

const SystemDesignDrillPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, entitlements, token } = useAuth();
  const isAdvanced = entitlements?.plan_id === 'advanced';
  
  const [session, setSession] = useState(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  useEffect(() => {
    if (!user) return navigate('/login');
    if (!isAdvanced) return navigate('/system-design');
    
    if (sessionId && token) {
      fetch(buildApiUrl(`/api/system-design/session/${sessionId}`), {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(async res => {
        if (!res.ok) throw new Error("Failed to fetch session");
        return res.json();
      })
      .then(data => {
        setSession(data);
      })
      .catch(err => {
        console.error(err);
        alert("Failed to load drill session.");
        navigate('/system-design');
      });
    }
  }, [user, isAdvanced, sessionId, navigate, token]);

  const handleSubmit = async () => {
    if (!response.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/system-design/evaluate'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          session_id: sessionId,
          candidate_response: response
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Request failed");
      }
      const data = await res.json();
      setFeedback(data.feedback);
    } catch (error) {
      alert("Evaluation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId || !session) return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading architectural challenge...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <button onClick={() => navigate('/system-design')} className="text-slate-500 hover:text-slate-800 font-medium mb-6 text-sm flex items-center gap-1">
        ← Back to Dashboard
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Architectural Challenge</h1>
        <p className="text-slate-600 text-lg mb-6">{session.scenario}</p>
        
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6 shadow-inner">
          <h3 className="font-bold text-[#16324f] mb-2">Requirements</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 font-medium">
            {session.requirements?.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
        
        {!feedback && (
          <div>
            <h3 className="font-bold mb-3 text-slate-800">Your Architecture Design</h3>
            <textarea
              className="w-full bg-white border border-slate-300 rounded-xl p-5 h-64 text-slate-900 focus:outline-none focus:border-[#16324f] focus:ring-2 focus:ring-[#16324f]/10 mb-4 shadow-sm resize-y"
              placeholder="Describe your high-level architecture, data schema, caching strategy, and how you will scale..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={loading}
            ></textarea>
            
            <div className="flex justify-end">
              <button 
                onClick={handleSubmit} 
                disabled={loading || !response.trim()}
                className="px-8 py-3.5 bg-[#16324f] hover:bg-[#0f2438] text-white rounded-full font-bold disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
              >
                {loading ? <span className="animate-spin text-xl">⚙️</span> : "Submit for Agentic Review"}
              </button>
            </div>
            
            {loading && (
              <div className="mt-4 text-center text-sm font-semibold text-slate-600 animate-pulse">
                LangGraph orchestration running... extracting components and cross-referencing RAG evidence...
              </div>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 flex justify-between items-center shadow-sm">
            <div>
              <h2 className="text-3xl font-extrabold text-indigo-900 mb-1">Evaluation Complete</h2>
              <p className="text-indigo-700">Grounded in verified RAG knowledge base.</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-emerald-600">
                {feedback.overall_score}
              </div>
              <div className="text-xs uppercase font-bold tracking-widest text-indigo-500 mt-1">Overall Score</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(feedback.dimension_scores).map(([dim, score]) => (
              <div key={dim} className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className={`text-2xl font-bold ${score > 80 ? 'text-emerald-600' : score > 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {score}
                </div>
                <div className="text-xs text-slate-500 font-bold mt-1 uppercase truncate">{dim}</div>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-emerald-700 mb-4 flex items-center gap-2">✓ What You Did Well</h3>
              <ul className="space-y-2">
                {feedback.what_you_did_well.map((s, i) => <li key={i} className="text-sm text-slate-700 flex gap-2"><span>•</span> {s}</li>)}
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-rose-600 mb-4 flex items-center gap-2">✗ Missing Concepts</h3>
              <ul className="space-y-2">
                {feedback.missing_concepts.map((s, i) => <li key={i} className="text-sm text-slate-700 flex gap-2"><span>•</span> {s}</li>)}
              </ul>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-[#16324f] mb-4">Improvement Suggestions</h3>
            <ul className="list-disc pl-5 space-y-2 text-slate-700 font-medium">
              {feedback.improvement_suggestions.map((s, i) => <li key={i} className="text-sm">{s}</li>)}
            </ul>
          </div>
          
        </div>
      )}
    </div>
  );
};

export default SystemDesignDrillPage;
