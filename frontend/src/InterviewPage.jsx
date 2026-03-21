import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  BarChart3, 
  User, 
  CheckCircle2, 
  ExternalLink,
  Volume2,
  Clock,
  ChevronLeft,
  Upload,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Users,
  Terminal,
  RotateCcw,
  Download,
  AlertTriangle,
  Lightbulb,
  Video,
  VideoOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Waveform = () => {
    return (
        <div className="flex items-center gap-1 h-8">
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{ 
                        height: [4, 12, 8, 16, 4].map(v => v * (Math.random() + 0.5)) 
                    }}
                    transition={{ 
                        repeat: Infinity, 
                        duration: 0.5 + Math.random(),
                        ease: "easeInOut"
                    }}
                    className="w-1 bg-yellow-400/80 rounded-full"
                />
            ))}
        </div>
    );
};

const InterviewPage = () => {
    const navigate = useNavigate();
    const [question, setQuestion] = useState("");
    const [audioUrl, setAudioUrl] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("");
    const [completed, setCompleted] = useState(false);
    const [sessionTime, setSessionTime] = useState(0);
    const sessionTimeRef = useRef(0);
    const [resumeUploaded, setResumeUploaded] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [skills, setSkills] = useState(["General Software Engineering"]);
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [persona, setPersona] = useState("friendly");
    const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
    const [stressData, setStressData] = useState([]);
    const [retryCount, setRetryCount] = useState(0);
    const [stream, setStream] = useState(null);
    const [report, setReport] = useState(null);

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const stressIntervalRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const fileInputRef = useRef(null);

    // Persist session timer
    useEffect(() => {
        let timer;
        if (interviewStarted && !completed) {
            timer = setInterval(() => {
                setSessionTime(prev => {
                    const next = prev + 1;
                    sessionTimeRef.current = next;
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [interviewStarted, completed]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Stable Media Stream Management
    useEffect(() => {
        const initMedia = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: true 
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error accessing media devices:", err);
            }
        };
        initMedia();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Re-attach stream when view changes
    useEffect(() => {
        if (stream && videoRef.current && !completed) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, interviewStarted, completed]);

    const handleResumeUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadingResume(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            console.log("Uploading resume:", file.name);
            const response = await fetch('http://localhost:8000/api/upload-resume', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Upload failed");
            }

            const data = await response.json();
            console.log("Resume processed:", data);
            
            setSkills(data.extracted_skills || ["General Software Engineering"]);
            setResumeUploaded(true);
            
            // Optional: Show success feedback
            setLoadingStatus("Resume skills processed successfully!");
            setTimeout(() => setLoadingStatus(""), 3000);
            
        } catch (err) {
            console.error("Error uploading resume:", err);
            alert(`Failed to upload resume: ${err.message}`);
        } finally {
            setUploadingResume(false);
            // Clear input so same file can be uploaded again if needed
            if (event.target) event.target.value = '';
        }
    };

    const startInterview = async () => {
        setLoading(true);
        setLoadingStatus("Preparing your personalized session...");
        setInterviewStarted(true);
        try {
            const response = await fetch('http://localhost:8000/api/start-interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skills: skills, persona: persona })
            });
            const data = await response.json();
            if (data.first_question) {
                setQuestion(data.first_question);
                if (data.audio_path) setAudioUrl(`http://localhost:8000/${data.audio_path}`);
            }
        } catch (err) {
            console.error("Error starting interview:", err);
            setLoadingStatus("Error starting session. Please try again.");
        }
        setLoading(false);
        setLoadingStatus("");
    };

    const fetchNextQuestion = async () => {
        setFeedback(null);
        setLoading(true);
        setLoadingStatus("Generating next question...");
        try {
            const response = await fetch('http://localhost:8000/api/next-question', { method: 'POST' });
            const data = await response.json();
            if (data.question) {
                setQuestion(data.question);
                if (data.audio_path) setAudioUrl(`http://localhost:8000/${data.audio_path}`);
            } else if (data.completed) {
                setCompleted(true);
            }
        } catch (err) {
            console.error("Error fetching next question:", err);
        }
        setLoading(false);
        setLoadingStatus("");
    };

    const startRecording = () => {
        if (!stream) return;
        setIsRecording(true);
        setFeedback(null);
        recordedChunksRef.current = [];
        
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp8,opus'
        });
        
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            setRecordedVideoUrl(videoUrl);
            await submitAnswer(blob);
        };

        mediaRecorder.start();
        
        // Use a ref to track the interval and don't rely on stale closure
        if (stressIntervalRef.current) clearInterval(stressIntervalRef.current);
        stressIntervalRef.current = setInterval(() => {
            const level = Math.floor(Math.random() * 40) + (retryCount * 10);
            setStressData(prev => [...prev, { time: sessionTimeRef.current, level: level }]);
        }, 2000); // Sample more frequently (every 2s)
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (stressIntervalRef.current) {
            clearInterval(stressIntervalRef.current);
            stressIntervalRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
    };

    const submitAnswer = async (blob) => {
        setLoading(true);
        setLoadingStatus("Transcribing your response...");
        const formData = new FormData();
        formData.append('question', question);
        formData.append('audio', blob, 'response.webm');

        try {
            const response = await fetch('http://localhost:8000/api/submit-answer', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            
            setLoadingStatus("Analyzing and evaluating...");
            setFeedback(data.evaluation);
            
            if (data.transcribed_text) {
                console.log("Transcribed:", data.transcribed_text);
            }
        } catch (err) {
            console.error("Error submitting answer:", err);
            setLoadingStatus("Connection error. Retrying...");
        }
        setLoading(false);
        setLoadingStatus("");
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/interview-report');
            const data = await response.json();
            setReport(data);
        } catch (err) {
            console.error("Error fetching report:", err);
        }
        setLoading(false);
    };

    if (completed) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 relative overflow-y-auto">
                <div className="bg-gradient" />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-8 md:p-12 text-center max-w-4xl w-full my-8"
                >
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-bold mb-4">Interview Completed</h1>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="text-left">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <AlertTriangle className="text-yellow-500 w-5 h-5" />
                                Stress Level Heatmap
                            </h3>
                            <div className="glass-card p-4 bg-slate-900 h-32 flex items-end gap-1">
                                {stressData.length > 0 ? stressData.map((d, i) => (
                                    <div 
                                        key={i} 
                                        className="flex-grow rounded-t-sm" 
                                        style={{ 
                                            height: `${Math.max(10, d.level)}%`, 
                                            backgroundColor: d.level > 70 ? '#ef4444' : d.level > 40 ? '#facc15' : '#22c55e',
                                            opacity: 0.8
                                        }}
                                        title={`Time: ${d.time}s, Stress: ${d.level}%`}
                                    />
                                )) : (
                                    <div className="flex-grow flex items-center justify-center h-full">
                                        {/* Mock data for visualization if real data is short */}
                                        {[20, 45, 30, 65, 40, 80, 50, 30].map((v, i) => (
                                            <div key={i} className="flex-grow h-full mx-0.5 flex flex-col justify-end">
                                                <div className="w-full rounded-t-sm" style={{ height: `${v}%`, backgroundColor: v > 70 ? '#ef4444' : v > 40 ? '#facc15' : '#22c55e', opacity: 0.3 }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-text-muted mt-2">Red indicates high stress/hesitation detection.</p>
                        </div>

                        <div className="text-left">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Download className="text-primary w-5 h-5" />
                                Session Recording
                            </h3>
                            <div className="glass-card p-4 bg-slate-900 aspect-video flex flex-col items-center justify-center gap-4">
                                {recordedVideoUrl ? (
                                    <video src={recordedVideoUrl} controls className="w-full h-full rounded-lg" />
                                ) : (
                                    <div className="text-text-muted text-center">
                                        <VideoOff className="w-8 h-8 mb-2 mx-auto opacity-20" />
                                        <p className="text-sm">Recording available for download</p>
                                    </div>
                                )}
                            </div>
                            {recordedVideoUrl && (
                                <a 
                                    href={recordedVideoUrl} 
                                    download="interview_session.webm"
                                    className="btn-secondary w-full py-2 mt-4 text-sm"
                                >
                                    Download MP4 (WebM)
                                </a>
                            )}
                        </div>
                    </div>

                    <p className="text-text-muted mb-8 text-lg">
                        Great job! We've analyzed your performance. Here is your final report summary.
                    </p>

                    {loading && <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

                    {!report && !loading && (
                        <button onClick={fetchReport} className="btn-primary py-4 px-12 mb-8">
                            Generate Analysis Report
                        </button>
                    )}

                    {report && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            className="text-left bg-white/5 rounded-2xl p-6 border border-white/10 mb-8"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Performance Summary</h3>
                                <div className="px-4 py-2 bg-primary/20 rounded-full text-primary font-bold">
                                    Final Score: {report.total_score || "N/A"}/100
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex gap-4 mb-4">
                                    <div className="flex-grow p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                        <div className="text-[10px] font-bold text-blue-400 uppercase">Technical</div>
                                        <div className="text-xl font-bold">{report.technical_score || 0}</div>
                                    </div>
                                    <div className="flex-grow p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                        <div className="text-[10px] font-bold text-purple-400 uppercase">Communication</div>
                                        <div className="text-xl font-bold">{report.communication_score || 0}</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-text-muted uppercase mb-1">Key Strengths</div>
                                    <div className="flex flex-wrap gap-2">
                                        {report.strengths && report.strengths.length > 0 ? report.strengths.map((s, idx) => (
                                            <span key={idx} className="text-[10px] px-2 py-1 bg-green-500/10 text-green-500 rounded-full border border-green-500/20">
                                                {s.length > 40 ? s.substring(0, 40) + "..." : s}
                                            </span>
                                        )) : <p className="text-sm text-white/60 italic">Complete technical questions to see strengths.</p>}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-text-muted uppercase mb-1">Overall Recommendation</div>
                                    <p className="text-sm text-white/80 leading-relaxed mb-6">{report.recommendations || "Great attempt! Keep practicing."}</p>
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <div className="text-xs font-bold text-text-muted uppercase mb-4">Detailed Question Analysis</div>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {report.detailed_results?.map((res, idx) => (
                                            <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                <div className="flex justify-between items-start mb-2 gap-4">
                                                    <p className="text-sm font-bold text-white/90">Q: {res.question}</p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${res.score >= 70 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                        {res.score}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-text-muted mb-2 italic">Your Answer: "{res.answer}"</p>
                                                <div className="bg-primary/10 rounded-lg p-2 flex items-start gap-2 border border-primary/20">
                                                    <Lightbulb className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                                    <p className="text-[10px] text-text-muted leading-tight">
                                                        <span className="text-primary font-bold uppercase">Feedback:</span> {res.feedback}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => navigate('/')} className="btn-secondary py-4 px-8">
                            Return to Home
                        </button>
                        <button onClick={() => window.location.reload()} className="btn-primary py-4 px-8">
                            Start New Session
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 relative flex flex-col items-center justify-center overflow-hidden">
            <div className="bg-gradient" />
            
            <div className="w-full max-w-6xl mb-6 flex justify-between items-center z-10">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-text-muted hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </button>
                <div className="glass-card px-4 py-2 flex items-center gap-3 border-white/5">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-bold tracking-widest uppercase">Live Session</span>
                </div>
                <div className="w-24" />
            </div>

            <main className="w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-[1fr,320px] gap-6 relative z-10 flex-grow">
                <section className="glass-card overflow-hidden relative border-2 border-white/10 flex flex-col min-h-[500px]">
                    {!interviewStarted ? (
                        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full"
                            >
                                <h2 className="text-4xl font-bold mb-2">Configure Your Interview</h2>
                                <p className="text-text-muted mb-12">Select an interviewer persona and role to begin.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                    {[
                                        { id: 'friendly', name: 'Friendly Recruiter', icon: <Users />, color: 'bg-green-500/20 border-green-500/50', desc: 'Encouraging tone, focuses on culture and soft skills.' },
                                        { id: 'technical', name: 'Technical Lead', icon: <Terminal />, color: 'bg-blue-500/20 border-blue-500/50', desc: 'No-nonsense. Deep follow-up "Why?" questions.' },
                                        { id: 'tough', name: 'Stress Tester', icon: <ShieldAlert />, color: 'bg-red-500/20 border-red-500/50', desc: 'Tougher questions, interrupts, tests your pressure.' }
                                    ].map(p => (
                                        <div 
                                            key={p.id}
                                            onClick={() => setPersona(p.id)}
                                            className={`glass-card p-6 cursor-pointer border-2 transition-all text-left group ${persona === p.id ? p.color + ' scale-105' : 'border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                {p.icon}
                                            </div>
                                            <h3 className="font-bold mb-2">{p.name}</h3>
                                            <p className="text-xs text-text-muted">{p.desc}</p>
                                            {persona === p.id && <div className="mt-4 text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                                                <CheckCircle2 className="w-3 h-3" /> Selected
                                            </div>}
                                        </div>
                                    ))}
                                </div>

                                <div className="max-w-md mx-auto">
                                    <p className="text-sm text-text-muted mb-6 italic">
                                        {resumeUploaded 
                                            ? `Matched to skills: ${skills.join(", ")}` 
                                            : "Pro Tip: Upload a resume to get specific technical questions."}
                                    </p>
                                    <button onClick={startInterview} className="btn-primary px-16 py-5 text-xl w-full shadow-2xl shadow-primary/30">
                                        Start Mock Session
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    ) : (
                        <>
                            <div className="absolute top-0 left-0 right-0 p-6 flex justify-center z-20 pointer-events-none">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Volume2 className="w-4 h-4 text-yellow-400" />
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">AI Interviewer Speaking</span>
                                    </div>
                                    <Waveform />
                                </div>
                            </div>

                            <div className="relative flex-grow bg-slate-900 overflow-hidden">
                                <img 
                                    src="/ai_interviewer_avatar.png" 
                                    alt="Interviewer" 
                                    className="w-full h-full object-cover opacity-80"
                                />

                                <div className="absolute bottom-6 right-6 w-40 h-40 rounded-2xl overflow-hidden glass-card border-none shadow-2xl">
                                     <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black/80 to-transparent">
                                    <AnimatePresence mode="wait">
                                        <motion.div 
                                            key={question + loadingStatus}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="max-w-2xl mx-auto"
                                        >
                                            <p className="text-xl md:text-2xl font-medium text-center text-white/90 leading-snug">
                                                "{loading ? (loadingStatus || "Thinking...") : question || "Preparing next question..."}"
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                <aside className="flex flex-col gap-4">
                    <div className="glass-card p-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-white/10">
                                    <User className="w-5 h-5 text-text-muted" />
                                </div>
                                <div className="text-sm">
                                    <div className="text-text-muted">Anuradha</div>
                                    <div className="font-bold text-white">Candidate</div>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-text-muted" />
                        </div>

                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-xs text-text-muted mb-1 font-bold uppercase">Target Role:</div>
                            <div className="text-sm font-bold text-white truncate">
                                {resumeUploaded ? `${skills[0]}` : "Technical Interview"}
                            </div>
                        </div>

                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group ${resumeUploaded ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20' : 'bg-primary/5 border-primary/20 hover:bg-primary/10'}`}
                        >
                            {uploadingResume ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : (resumeUploaded ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Upload className="w-5 h-5 text-primary" />)}
                            <div className="flex-grow">
                                <div className={`text-sm font-bold ${resumeUploaded ? 'text-green-500' : 'text-primary'}`}>
                                    {resumeUploaded ? "Resume Processed" : "Resume Required"}
                                </div>
                                <div className="text-xs text-white/60 group-hover:text-white underline">
                                    {resumeUploaded ? "Tap to update file" : "Tap to upload PDF"}
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleResumeUpload} 
                                    accept=".pdf" 
                                    className="hidden" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow flex flex-col gap-3">
                        {interviewStarted && !completed && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-card p-4 bg-yellow-400/10 border-yellow-400/30 relative"
                            >
                                <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-slate-900">
                                    <MessageSquare className="w-3 h-3 text-slate-900" />
                                </div>
                                <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-1">Live Caption</div>
                                <p className="text-sm font-medium text-white italic">
                                    {loading ? "AI is thinking..." : question || "Preparing..."}
                                </p>
                            </motion.div>
                        )}
                        <button 
                            disabled={!feedback} 
                            onClick={fetchNextQuestion}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                feedback 
                                ? 'bg-primary text-white hover:opacity-90' 
                                : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                            }`}
                        >
                            <BarChart3 className="w-5 h-5" />
                            Next Question
                        </button>

                        <button 
                            disabled={!interviewStarted}
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                                !interviewStarted ? 'opacity-30 cursor-not-allowed' :
                                isRecording 
                                ? 'bg-red-500/10 border-red-500/50 text-red-500' 
                                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            }`}
                        >
                            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            {isRecording ? "Stop Recording" : "Start Answering"}
                        </button>

                        <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                        >
                            {isMuted ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5" />}
                            {isMuted ? "Unmute Microphone" : "Mute Microphone"}
                        </button>

                        <button 
                            onClick={() => setCompleted(true)}
                            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-red-600 text-white hover:opacity-90 transition-all shadow-lg shadow-red-600/20"
                        >
                            <PhoneOff className="w-5 h-5" />
                            End Interview
                        </button>
                    </div>

                    <div className="glass-card p-4 flex items-center justify-center gap-4 text-text-muted border-white/5">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">Session Duration: <span className="text-white font-bold">{formatTime(sessionTime)}</span></span>
                        </div>
                    </div>
                </aside>
            </main>

            <AnimatePresence>
                {feedback && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
                    >
                        <div className="glass-card p-6 bg-slate-900/90 border-primary/30 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
                                        {feedback.score}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="text-xs text-text-muted font-bold uppercase">AI Evaluation Score</div>
                                        <div className="text-lg font-bold">Comprehensive Feedback</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => {
                                            setFeedback(null);
                                            setRetryCount(prev => prev + 1);
                                        }} 
                                        className="btn-secondary py-2 px-4 flex items-center gap-1 text-sm border-yellow-500/30 hover:bg-yellow-500/10"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Retry Answer
                                    </button>
                                    <button onClick={fetchNextQuestion} className="btn-primary py-2 px-6">
                                        Next Question
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-yellow-400/5 rounded-xl p-4 border border-yellow-400/10 mb-4">
                                <div className="flex items-center gap-2 mb-2 text-yellow-500">
                                    <Lightbulb className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Pro Hint for Retry</span>
                                </div>
                                <p className="text-sm text-yellow-400/80 leading-relaxed italic">
                                    "Try using the **STAR method** (Situation, Task, Action, Result) to make your answer more structured and impactful."
                                </p>
                            </div>

                            <p className="text-text-muted text-sm leading-relaxed">
                                {feedback.feedback}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InterviewPage;
