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
  Zap
} from 'lucide-react';

const ATSCheckerSection = () => {
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeText, setResumeText] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

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
            const response = await fetch('http://localhost:8000/api/upload-resume', {
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
            const response = await fetch('http://localhost:8000/api/check-ats', {
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
        } catch (err) {
            setError("ATS Analysis failed. Please try again.");
            console.error(err);
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
                            {!results && !isAnalyzing ? (
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
                            ) : isAnalyzing ? (
                                <motion.div 
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-full flex flex-col items-center justify-center p-12"
                                >
                                    <div className="relative mb-8">
                                        <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-bold mb-2">AI is Analyzing...</h4>
                                    <p className="text-text-muted">Extracting keywords and calculating matching patterns.</p>
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
                                            <h3 className="text-2xl font-bold mb-1">ATS Match Report</h3>
                                            <p className="text-sm text-text-muted">Generated by AI Resume Optimizer</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-text-muted uppercase">Overall Score</div>
                                                <div className={`text-4xl font-black ${results.score >= 80 ? 'text-green-500' : results.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    {results.score}%
                                                </div>
                                            </div>
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                                                 <motion.div 
                                                    initial={{ height: 0 }} 
                                                    animate={{ height: `${results.score}%` }} 
                                                    className={`absolute bottom-0 left-0 right-0 ${results.score >= 80 ? 'bg-green-500/20' : results.score >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}
                                                 />
                                                 <TrendingUp className={`w-8 h-8 relative z-10 ${results.score >= 80 ? 'text-green-500' : results.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <div className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                                <CheckCircle2 className="w-3 h-3 text-green-500" /> Key Strengths
                                            </div>
                                            <div className="space-y-2">
                                                {results.strengths.map((s, i) => (
                                                    <div key={i} className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl text-xs text-green-500 flex items-start gap-2">
                                                        <div className="w-1 h-1 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                                <AlertCircle className="w-3 h-3 text-yellow-500" /> Missing Keywords
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {results.missing_keywords.length > 0 ? results.missing_keywords.map((k, i) => (
                                                    <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-text-muted">
                                                        {k}
                                                    </span>
                                                )) : (
                                                    <p className="text-xs text-text-muted italic">No critical keywords missing.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Improvement Suggestions */}
                                    <div className="space-y-4">
                                        <div className="text-xs font-bold text-text-muted uppercase tracking-widest">Recommended Improvements</div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {results.improvement_suggestions.map((inv, i) => (
                                                <div key={i} className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                            <Sparkles className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-sm font-medium text-white/90">{inv}</span>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                                                </div>
                                            ))}
                                            {results.feedback.map((f, i) => (
                                                <div key={`f-${i}`} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-text-muted">
                                                    {f}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                                        <p className="text-xs text-text-muted italic">Want a full resume rewrite? <span className="text-primary font-bold cursor-pointer hover:underline">Upgrade to Pro</span></p>
                                        <button onClick={() => setResults(null)} className="text-xs font-bold text-text-muted hover:text-white transition-colors">Reset Analysis</button>
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
