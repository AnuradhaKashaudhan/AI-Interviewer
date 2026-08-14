import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSearch, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Sparkles,
  TrendingUp,
  FileText,
  Target,
  Zap,
  PenTool
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ATSParsingSequence from './components/ats/ATSParsingSequence.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const ATSCheckerSection = () => {
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeText, setResumeText] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [phase, setPhase] = useState("idle"); // 'idle', 'parsing', 'results'
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.pdf')) {
            setError("Please upload a PDF file.");
            return;
        }

        setResumeFile(file);
        setError(null);
        
        // Use existing endpoint to extract text
        setIsAnalyzing(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload-resume`, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) throw new Error("Failed to parse PDF");
            
            const data = await response.json();
            // We'll need the text for the ATS check
            // For now, let's assume the upload-resume endpoint can be modified or we use the skills it returns
            // Actually, let's modify main.py to return the full text in upload-resume if we need it
            // Or just use the skills. But ATS needs full text for better scoring.
            
            if (!data.extracted_text) {
                setError("Could not extract any text from the PDF. Is it a scanned image?");
                setResumeText("");
            } else {
                setResumeText(data.extracted_text);
                setError(null); // Clear previous errors on success
            }
            
        } catch (err) {
            setError("Error connecting to the backend. Please ensure the server is running.");
            console.error(err);
            setResumeFile(null); // Reset file so they can retry
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runATSCheck = async () => {
        if (!resumeText) {
            setError("Please upload a resume first.");
            return;
        }

        setIsAnalyzing(true);
        setResults(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/check-ats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resume_text: resumeText,
                    job_description: jobDescription
                })
            });
            
            if (!response.ok) throw new Error("ATS Check failed");
            
            const data = await response.json();
            setResults(data);
            setPhase("parsing");
        } catch (err) {
            setError("ATS Analysis failed. Please try again.");
            console.error(err);
            setPhase("idle");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <section id="ats-checker" className="container pt-24 pb-32">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
                    ATS <span className="text-gradient">Resume Analysis</span>
                </h2>
                <p className="text-text-muted max-w-2xl mx-auto">Get detailed feedback on how well your resume matches automated screening systems.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Input Column */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="card p-8 border-white/5 h-full flex flex-col">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                             <Upload className="w-5 h-5 text-indigo-400" />
                             Analyze Your Resume
                        </h3>
                        
                        {/* File Upload Area */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex-grow border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group ${resumeFile ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-white/5 hover:border-primary/30 hover:bg-primary/5'}`}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                accept=".pdf" 
                                className="hidden" 
                            />
                            
                            {isAnalyzing && !results ? (
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            ) : resumeFile ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-green-500" />
                                    </div>
                                    <p className="font-bold text-white mb-1">{resumeFile.name}</p>
                                    <p className="text-xs text-text-muted underline">Change file</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                                        <Upload className="w-8 h-8 text-text-muted group-hover:text-primary transition-colors" />
                                    </div>
                                    <p className="font-bold text-white mb-2">Upload Resume (PDF)</p>
                                    <p className="text-xs text-text-muted">Drag & drop or click to browse</p>
                                </div>
                            )}
                        </div>

                        {/* Job Description Area */}
                        <div className="mt-8">
                            <label className="block text-sm font-bold mb-2 text-text-muted flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Target Job Description (Optional)
                            </label>
                            <textarea 
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all min-h-[150px]"
                                placeholder="Paste the job description here for a tailored match analysis..."
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-500 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button 
                            onClick={runATSCheck}
                            disabled={!resumeText || isAnalyzing}
                            className={`btn-primary w-full py-4 mt-8 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 ${(!resumeText || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-white" />}
                            Check ATS Score
                        </button>
                    </div>
                </div>

                {/* Results Column */}
                <div className="lg:col-span-7">
                    <div className="card p-8 border-white/5 h-full relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {phase === "idle" ? (
                                <motion.div 
                                    key="placeholder"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full flex flex-col items-center justify-center text-center p-12"
                                >
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                                        <FileSearch className="w-10 h-10 text-text-muted opacity-20" />
                                    </div>
                                    <h4 className="text-xl font-bold mb-2 text-white/40">No Analysis Yet</h4>
                                    <p className="text-text-muted max-w-xs">Upload your resume and click "Check ATS Score" to see your compatibility results.</p>
                                </motion.div>
                            ) : phase === "parsing" ? (
                                <motion.div 
                                    key="parsing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full relative overflow-hidden bg-white/40 rounded-2xl"
                                >
                                    {/* Shimmer pulse effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                    <ATSParsingSequence 
                                        results={results} 
                                        onComplete={() => setPhase("results")} 
                                    />
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="results"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div>
                                            <h3 className="display-title text-2xl mb-1">ATS Match Report</h3>
                                            <p className="muted-copy text-sm">Generated by AI Resume Optimizer</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="section-eyebrow">Overall Score</div>
                                                <div className={`text-4xl font-black ${results.score >= 80 ? 'text-emerald-700' : results.score >= 60 ? 'text-amber-800' : 'text-rose-700'}`}>
                                                    {results.score}%
                                                </div>
                                            </div>
                                            <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center relative overflow-hidden">
                                                 <motion.div 
                                                    initial={{ height: 0 }} 
                                                    animate={{ height: `${results.score}%` }} 
                                                    className={`absolute bottom-0 left-0 right-0 ${results.score >= 80 ? 'bg-emerald-100' : results.score >= 60 ? 'bg-amber-100' : 'bg-rose-100'}`}
                                                 />
                                                 <TrendingUp className={`w-8 h-8 relative z-10 ${results.score >= 80 ? 'text-emerald-700' : results.score >= 60 ? 'text-amber-800' : 'text-rose-700'}`} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <div className="section-eyebrow flex items-center gap-2">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Key Strengths
                                            </div>
                                            <div className="space-y-2">
                                                {results.strengths.map((s, i) => (
                                                    <div key={i} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                                                        <div className="w-1 h-1 bg-emerald-700 rounded-full mt-1.5 flex-shrink-0" />
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="section-eyebrow flex items-center gap-2">
                                                <AlertCircle className="w-3 h-3 text-amber-800" /> Missing Keywords
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {results.missing_keywords.length > 0 ? results.missing_keywords.map((k, i) => (
                                                    <span key={i} className="px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs text-slate-600">
                                                        {k}
                                                    </span>
                                                )) : (
                                                    <p className="text-xs text-slate-500 italic">No critical keywords missing.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Improvement Suggestions */}
                                    <div className="space-y-4">
                                        <div className="section-eyebrow">Recommended Improvements</div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {results.improvement_suggestions.map((inv, i) => (
                                                <div key={i} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between group hover:border-stone-300 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#16324f] border border-stone-200 group-hover:scale-110 transition-transform">
                                                            <Sparkles className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">{inv}</span>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-[#16324f] opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                                                </div>
                                            ))}
                                            {results.feedback.map((f, i) => (
                                                <div key={`f-${i}`} className="p-4 bg-white border border-stone-200 rounded-2xl text-xs text-slate-600">
                                                    {f}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <button 
                                            onClick={() => navigate('/ats-checker/fix', { state: { resumeText, jobDescription, atsResults: results } })}
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#16324f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2438]"
                                        >
                                            <PenTool className="w-4 h-4" />
                                            Fix My Resume
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </button>
                                        <div className="flex items-center gap-4">
                                            <p className="text-xs text-slate-500 italic hidden md:block">Want a full rewrite? <span className="text-[#16324f] font-bold cursor-pointer hover:underline">Upgrade to Pro</span></p>
                                            <button onClick={() => { setResults(null); setPhase("idle"); }} className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap">Reset Analysis</button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ATSCheckerSection;
