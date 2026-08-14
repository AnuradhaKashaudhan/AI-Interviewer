import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
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
  VideoOff,
  Star,
  Award,
  Sparkles,
  Search,
  BookOpen,
    Briefcase,
    Edit2,
    Eye,
    ShieldCheck,
    ShieldX
} from 'lucide-react';
import { getPreferredVoice } from "./services/voiceService";
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken } from './services/authApi.js';

// Use relative URL so Vite dev proxy forwards /api/* to FastAPI on port 8000.
// In production, set VITE_API_BASE_URL to your deployed backend URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const MONITORING_CONSENT_KEY = 'ai-interviewer-monitoring-consent-v1';
const MONITORING_ENABLED_KEY = 'ai-interviewer-monitoring-enabled';

const getSessionTimestampLabel = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getInterviewSettings = () => {
    try {
        const stored = window.localStorage.getItem('ai-interviewer-settings');
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        return {};
    }
};

const getCodingStarterTemplate = (language) => {
    switch (language) {
        case 'cpp':
            return '#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}\n';
        case 'java':
            return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n';
        case 'c':
            return '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, world!\\n");\n    return 0;\n}\n';
        default:
            return 'def solve():\n    print("Hello, world!")\n\n\nif __name__ == "__main__":\n    solve()\n';
    }
};

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
    const apiFetch = async (url, options = {}) => {
        const token = getAuthToken();
        const headers = { ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            navigate('/login', { state: { notice: 'Session expired. Please log in again.' } });
            throw new Error('Unauthorized');
        }
        return response;
    };
    const location = useLocation();
    const interviewSetup = location.state?.setup;
    const [sessionId, setSessionId] = useState(null);
    const [question, setQuestion] = useState("");
  const activeQuestion = question;
    const [audioUrl, setAudioUrl] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceLoading, setVoiceLoading] = useState(false);
    const [availableVoices, setAvailableVoices] = useState([]);

    // Load available voices on mount
    useEffect(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        setVoiceLoading(true);
        const loadVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          setAvailableVoices(voices);
          setVoiceLoading(false);
        };
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        loadVoices();
      }
    }, []);

    const [loading, setLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("");
    const [completed, setCompleted] = useState(false);
    
    const [sessionTime, setSessionTime] = useState(0);
    const sessionTimeRef = useRef(0);
    const [resumeUploaded, setResumeUploaded] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [skills, setSkills] = useState([]);
    
    // Role selection state variables
    const [targetRole, setTargetRole] = useState(""); // empty initially to force selection
    const [customRoleText, setCustomRoleText] = useState("");
    const [roleSelected, setRoleSelected] = useState(false); // validation gate
    const [profileText, setProfileText] = useState("");
    
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [persona, setPersona] = useState("friendly");
    const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
    const [stressData, setStressData] = useState([]);
    const [retryCount, setRetryCount] = useState(0);
    const [stream, setStream] = useState(null);
    const [screenShareActive, setScreenShareActive] = useState(false);
    const [report, setReport] = useState(null);
    const [spokenAnswerText, setSpokenAnswerText] = useState("");
    const [monitoringEnabled, setMonitoringEnabled] = useState(() => {
        if (typeof window === 'undefined') return true;
        const stored = window.localStorage.getItem(MONITORING_ENABLED_KEY);
        return stored === null ? true : stored === 'true';
    });
    const [monitoringStatus, setMonitoringStatus] = useState('off');
    const [monitoringNotice, setMonitoringNotice] = useState('Monitoring is disabled for this session.');
    const [monitoringEvents, setMonitoringEvents] = useState([]);
    const [monitoringToasts, setMonitoringToasts] = useState([]);
    const [firmReminderShown, setFirmReminderShown] = useState(false);
    const [codingRoundEnabled, setCodingRoundEnabled] = useState(false);
    const [codingRoundNote, setCodingRoundNote] = useState('');
    const [currentQuestionType, setCurrentQuestionType] = useState('behavioral');
    const [codingLanguage, setCodingLanguage] = useState('python');
    const [codingCode, setCodingCode] = useState('');
    const [codingProblem, setCodingProblem] = useState('');
    const [codingOutput, setCodingOutput] = useState('');
    const [codingExecutionLoading, setCodingExecutionLoading] = useState(false);
    const [codingSubmitLoading, setCodingSubmitLoading] = useState(false);

    useEffect(() => {
        if (!interviewSetup) return;

        if (interviewSetup.role) {
            setTargetRole(interviewSetup.role);
        }

        if (interviewSetup.industry) {
            setSkills((current) => current.length > 0 ? current : [interviewSetup.industry]);
        }

        if (interviewSetup.role || interviewSetup.industry || interviewSetup.difficulty) {
            setProfileText(
                `Setup preset: ${interviewSetup.role || 'Interview'} for ${interviewSetup.industry || 'technology'} at ${interviewSetup.difficulty || 'medium'} difficulty.`
            );
        }
    }, [interviewSetup]);

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const stressIntervalRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const fileInputRef = useRef(null);
    const screenStreamRef = useRef(null);
    const speechRecognitionRef = useRef(null);
    const spokenAnswerTextRef = useRef("");
    const monitoringIntervalRef = useRef(null);
    const monitoringModelsRef = useRef({ cocoModel: null, faceDetector: null });
    const monitoringCanvasRef = useRef(null);
    const noFaceStartRef = useRef(null);
    const attentionAwayStartRef = useRef(null);
    const monitoringCooldownRef = useRef({});

    const pushMonitoringToast = (message, severity = 'amber') => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setMonitoringToasts((prev) => [...prev, { id, message, severity }]);
        window.setTimeout(() => {
            setMonitoringToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 4200);
    };

    const recordMonitoringEvent = (type, message, severity = 'amber', source = 'video') => {
        const nowSeconds = sessionTimeRef.current;
        const nextEvent = {
            id: `${type}-${Date.now()}`,
            type,
            message,
            severity,
            source,
            atSecond: nowSeconds,
            atLabel: getSessionTimestampLabel(nowSeconds),
        };
        setMonitoringEvents((prev) => [...prev, nextEvent]);
        pushMonitoringToast(message, severity);
    };

    const maybeRecordMonitoringEvent = (type, message, severity, cooldownMs = 10000, source = 'video') => {
        const now = Date.now();
        const last = monitoringCooldownRef.current[type] || 0;
        if (now - last < cooldownMs) return;
        monitoringCooldownRef.current[type] = now;
        recordMonitoringEvent(type, message, severity, source);
    };

    const resetMonitoringTrackerRefs = () => {
        noFaceStartRef.current = null;
        attentionAwayStartRef.current = null;
        monitoringCooldownRef.current = {};
    };

    const stopMonitoringLoop = () => {
        if (monitoringIntervalRef.current) {
            clearInterval(monitoringIntervalRef.current);
            monitoringIntervalRef.current = null;
        }
    };

    const ensureMonitoringConsent = () => {
        if (typeof window === 'undefined' || !monitoringEnabled) return true;
        const consented = window.localStorage.getItem(MONITORING_CONSENT_KEY) === 'true';
        if (consented) return true;

        const accepted = window.confirm(
            "Enable focus and integrity monitoring?\n\nThis session checks face presence, multiple faces, and possible phone visibility using on-device models in your browser. No video frames are uploaded or stored. You can turn this off anytime in session setup."
        );
        if (accepted) {
            window.localStorage.setItem(MONITORING_CONSENT_KEY, 'true');
            return true;
        }
        return false;
    };

    const stopCameraAndMicrophone = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }

        if (speechRecognitionRef.current) {
            speechRecognitionRef.current.onend = null;
            speechRecognitionRef.current.abort();
            speechRecognitionRef.current = null;
        }

        if (stressIntervalRef.current) {
            clearInterval(stressIntervalRef.current);
            stressIntervalRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setIsRecording(false);

        setStream((currentStream) => {
            if (currentStream) {
                currentStream.getTracks().forEach((track) => track.stop());
            }
            return null;
        });
    };

    const speakQuestion = (text) => {
        if (isMuted || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = getPreferredVoice(availableVoices);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const PRESET_ROLES = [
        "ML Engineer",
        "Frontend Developer",
        "Backend Developer",
        "Full Stack Developer",
        "Data Analyst",
        "AI Engineer",
        "Java Developer",
        "Cyber Security Analyst",
        "Custom Role"
    ];

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

    // Auto‑speak when the active question changes
  useEffect(() => {
    if (activeQuestion && currentQuestionType !== 'coding') {
            if (getInterviewSettings().autoSpeakQuestions !== false) {
                speakQuestion(activeQuestion);
            }
    }
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, [activeQuestion, currentQuestionType, isMuted, availableVoices]);

    // Voice control UI component
    const VoiceControls = () => (
      <div className="flex items-center gap-2 mt-2">
        <button onClick={() => speakQuestion(question)} className="voice-controls" title="Replay Question">🔁</button>
        <button onClick={() => window.speechSynthesis.pause()} className="voice-controls" title="Pause Speech">⏸️</button>
        <button onClick={() => setIsMuted(!isMuted)} className="voice-controls" title={isMuted ? 'Unmute Voice' : 'Mute Voice'}>
          {isMuted ? '🔇' : '🔊'}
        </button>
        {isSpeaking && <span className="voice-badge speaking">AI Speaking...</span>}
        {isMuted && !isSpeaking && <span className="voice-badge muted">Voice Muted</span>}
        {!isSpeaking && !isMuted && <span className="voice-badge ready">Ready</span>}
      </div>
    );

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
            stopCameraAndMicrophone();
        };
    }, []);

    // Re-attach stream when view changes
    useEffect(() => {
        if (stream && videoRef.current && !completed) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, interviewStarted, completed]);

    useEffect(() => {
        return () => {
            if (speechRecognitionRef.current) {
                speechRecognitionRef.current.onend = null;
                speechRecognitionRef.current.abort();
                speechRecognitionRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        spokenAnswerTextRef.current = spokenAnswerText;
    }, [spokenAnswerText]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(MONITORING_ENABLED_KEY, String(monitoringEnabled));
        }
    }, [monitoringEnabled]);

    useEffect(() => {
        if (!interviewStarted || completed || currentQuestionType !== 'coding') return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                recordMonitoringEvent(
                    'tab_hidden',
                    'You left the interview tab or minimized the window. Keep the session visible while working through the prompt.',
                    'amber',
                    'coding'
                );
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [interviewStarted, completed, currentQuestionType]);

    useEffect(() => {
        if (!firmReminderShown && monitoringEvents.length >= 3) {
            setFirmReminderShown(true);
            pushMonitoringToast(
                'Focus reminder: repeated integrity flags detected. For best practice quality, stay centered and interview solo.',
                'red'
            );
        }
    }, [monitoringEvents, firmReminderShown]);

    useEffect(() => {
        if (completed) {
            stopScreenShare();
            stopCameraAndMicrophone();
            stopMonitoringLoop();
            setMonitoringStatus((prev) => (prev === 'unavailable' ? prev : 'off'));
            setMonitoringNotice((prev) => (prev.includes('unavailable') ? prev : 'Monitoring ended with your session.'));
        }
    }, [completed]);

    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }
        setScreenShareActive(false);
    };

    useEffect(() => {
        return () => {
            stopScreenShare();
        };
    }, []);

    const requestScreenShare = async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
            return false;
        }

        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
            });

            screenStreamRef.current = displayStream;
            setScreenShareActive(true);

            displayStream.getVideoTracks().forEach(track => {
                track.onended = () => {
                    stopScreenShare();
                };
            });

            return true;
        } catch (err) {
            console.warn('Screen share permission was denied or dismissed:', err);
            stopScreenShare();
            return false;
        }
    };

    const initializeMonitoringModels = async () => {
        try {
            setMonitoringStatus('preparing');
            setMonitoringNotice('Preparing monitoring...');

            const tf = await import('@tensorflow/tfjs');
            await tf.ready();

            const cocoSsd = await import('@tensorflow-models/coco-ssd');
            const cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });

            const vision = await import('@mediapipe/tasks-vision');
            const filesetResolver = await vision.FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
            );
            const faceDetector = await vision.FaceDetector.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath:
                        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                },
                runningMode: 'IMAGE',
                minDetectionConfidence: 0.5,
            });

            monitoringModelsRef.current = { cocoModel, faceDetector };
            setMonitoringStatus('on');
            setMonitoringNotice('Monitoring active (on-device only).');
            return true;
        } catch (error) {
            console.warn('Monitoring model initialization failed:', error);
            monitoringModelsRef.current = { cocoModel: null, faceDetector: null };
            setMonitoringStatus('unavailable');
            setMonitoringNotice('Monitoring unavailable on this browser/session. Interview continues normally.');
            return false;
        }
    };

    const runMonitoringCheck = async () => {
        if (!videoRef.current) return;
        const { cocoModel, faceDetector } = monitoringModelsRef.current;
        if (!cocoModel || !faceDetector) return;

        const video = videoRef.current;
        if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

        if (!monitoringCanvasRef.current) {
            monitoringCanvasRef.current = document.createElement('canvas');
        }

        const canvas = monitoringCanvasRef.current;
        const maxWidth = 320;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = Math.max(1, Math.floor(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.floor(video.videoHeight * scale));

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        let faceDetections = [];
        try {
            const faceResult = faceDetector.detect(canvas);
            faceDetections = faceResult?.detections || [];
        } catch (error) {
            console.warn('Face detection failed for this interval:', error);
        }

        const now = Date.now();

        if (faceDetections.length === 0) {
            if (!noFaceStartRef.current) noFaceStartRef.current = now;
            if (now - noFaceStartRef.current > 5000) {
                maybeRecordMonitoringEvent(
                    'out_of_frame',
                    "We noticed you're not in frame - come on back!",
                    'amber',
                    12000
                );
            }
        } else {
            noFaceStartRef.current = null;
        }

        if (faceDetections.length > 1) {
            maybeRecordMonitoringEvent(
                'multiple_faces',
                'Looks like someone else is nearby. For accurate results, try to interview solo.',
                'amber',
                12000
            );
        }

        const primaryFace = faceDetections[0];
        if (primaryFace?.boundingBox) {
            const { originX, width } = primaryFace.boundingBox;
            const faceCenterX = (originX + width / 2) / canvas.width;
            const appearsDistracted = faceCenterX < 0.2 || faceCenterX > 0.8;

            if (appearsDistracted) {
                if (!attentionAwayStartRef.current) attentionAwayStartRef.current = now;
                if (now - attentionAwayStartRef.current > 5000) {
                    maybeRecordMonitoringEvent(
                        'looking_away',
                        'Focus check: your face appears turned away for a while. Try to stay interview-facing.',
                        'amber',
                        15000
                    );
                }
            } else {
                attentionAwayStartRef.current = null;
            }
        } else {
            attentionAwayStartRef.current = null;
        }

        try {
            const predictions = await cocoModel.detect(canvas);
            const phoneDetected = predictions.some((p) => p.class === 'cell phone' && p.score >= 0.45);
            if (phoneDetected) {
                maybeRecordMonitoringEvent(
                    'phone_detected',
                    'Is that a phone? Consider setting it aside during the session.',
                    'red',
                    15000
                );
            }
        } catch (error) {
            console.warn('Phone detection failed for this interval:', error);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const startMonitoring = async () => {
            stopMonitoringLoop();
            resetMonitoringTrackerRefs();

            if (!interviewStarted || completed) return;

            if (!monitoringEnabled) {
                setMonitoringStatus('off');
                setMonitoringNotice('Monitoring is turned off for this session.');
                return;
            }

            if (!stream) {
                setMonitoringStatus('unavailable');
                setMonitoringNotice('Monitoring unavailable because camera stream is not active.');
                return;
            }

            const ready = await initializeMonitoringModels();
            if (!ready || cancelled) return;

            monitoringIntervalRef.current = setInterval(() => {
                runMonitoringCheck();
            }, 1600);
        };

        startMonitoring();

        return () => {
            cancelled = true;
            stopMonitoringLoop();
        };
    }, [interviewStarted, completed, monitoringEnabled, stream]);

const handleResumeUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setUploadingResume(true);
  const formData = new FormData();
  formData.append('file', file);

  try {
    const uploadUrl = "http://127.0.0.1:8000/api/upload-resume";
  console.log("FINAL Resume upload URL:", uploadUrl);
  const response = await apiFetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const rawText = await response.text();
    console.log('Resume upload status:', response.status);
    console.log('Resume upload raw response:', rawText);

    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (parseError) {
      console.error('Failed to parse backend response:', parseError);
      throw new Error(`Backend returned invalid JSON: ${rawText || 'empty response'}`);
    }

    if (!response.ok) {
      throw new Error(data.detail || data.error || data.message || `Upload failed with status ${response.status}`);
    }

    setSkills(data.extracted_skills || []);
    if (data.extracted_text) {
      setProfileText(data.extracted_text);
    }
    const recommendation = data.coding_round_recommendation || {};
    setCodingRoundEnabled(Boolean(recommendation.enabled));
    setCodingRoundNote(recommendation.reason || '');
    setResumeUploaded(true);
    setLoadingStatus('Resume parsed successfully!');
    setTimeout(() => setLoadingStatus(''), 3000);
  } catch (err) {
    console.error('Error uploading resume:', err);
    if (err.message === 'Failed to fetch') {
      alert('Failed to connect to the backend server. Please ensure the FastAPI server is running.');
    } else {
      alert(`Failed to upload resume: ${err.message}`);
    }
  } finally {
    setUploadingResume(false);
    if (event.target) event.target.value = '';
  }
};

    const startInterview = async () => {
        const finalRole = targetRole === "Custom Role" ? customRoleText : targetRole;
        if (!finalRole || finalRole.trim() === "") {
            alert("Please select or type an Interview Role before starting.");
            return;
        }

        if (monitoringEnabled) {
            const consentGranted = ensureMonitoringConsent();
            if (!consentGranted) {
                setMonitoringEnabled(false);
                setMonitoringStatus('off');
                setMonitoringNotice('Monitoring stayed off because consent was not accepted.');
            }
        }

        const interviewSettings = getInterviewSettings();

        setLoading(true);
        setLoadingStatus(interviewSettings.requestScreenShare === false ? "Preparing interview session..." : "Requesting screen share permission...");
        try {
            if (interviewSettings.requestScreenShare !== false) {
                await requestScreenShare();
            }
            setLoadingStatus("Analyzing profile and generating dynamic questions...");
            setInterviewStarted(true);
            const response = await apiFetch(`${API_BASE_URL}/api/start-interview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    skills: skills.length > 0 ? skills : [finalRole], 
                    persona: persona,
                    role: finalRole,
                    resume_text: profileText
                })
            });
            const data = await response.json();
            if (data.session_id) {
                setSessionId(data.session_id);
            }
            if (data.first_question) {
                setQuestion(data.first_question);
                setCurrentQuestionType('behavioral');
                setCodingRoundEnabled(Boolean(data.coding_round_enabled));
                setCodingRoundNote(data.coding_round_note || '');
                if (data.audio_path) setAudioUrl(`${API_BASE_URL}/${data.audio_path}`);
            }
        } catch (err) {
            console.error("Error starting interview:", err);
            setLoadingStatus("Error starting session. Please try again.");
            stopScreenShare();
        }
        setLoading(false);
        setLoadingStatus("");
    };

    const fetchNextQuestion = async () => {
        setFeedback(null);
        setLoading(true);
        setLoadingStatus("Analyzing context & generating next adaptive question...");
        try {
            const response = await apiFetch(`${API_BASE_URL}/api/next-question`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
            const data = await response.json();
            if (data.question) {
                setQuestion(data.question);
                setCurrentQuestionType(data.question_type || 'behavioral');
                if (data.question_type === 'coding') {
                    setCodingProblem(data.question);
                    setCodingCode(getCodingStarterTemplate(codingLanguage));
                    setCodingOutput('');
                }
                if (data.audio_path) setAudioUrl(`${API_BASE_URL}/${data.audio_path}`);
            } else if (data.completed || !data.question) {
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
        setSpokenAnswerText("");
        recordedChunksRef.current = [];

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            try {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event) => {
                    const transcript = Array.from(event.results)
                        .map((result) => result[0].transcript)
                        .join(' ')
                        .trim();
                    spokenAnswerTextRef.current = transcript;
                    setSpokenAnswerText(transcript);
                };

                recognition.onerror = (event) => {
                    console.warn('Speech recognition error:', event.error);
                };

                speechRecognitionRef.current = recognition;
                recognition.start();
            } catch (error) {
                console.warn('Unable to start browser speech recognition:', error);
            }
        }
        
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
        
        if (stressIntervalRef.current) clearInterval(stressIntervalRef.current);
        stressIntervalRef.current = setInterval(() => {
            const level = Math.floor(Math.random() * 40) + (retryCount * 10);
            setStressData(prev => [...prev, { time: sessionTimeRef.current, level: level }]);
        }, 2000);
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (stressIntervalRef.current) {
            clearInterval(stressIntervalRef.current);
            stressIntervalRef.current = null;
        }
        if (speechRecognitionRef.current) {
            const recognition = speechRecognitionRef.current;
            recognition.onend = () => {
                speechRecognitionRef.current = null;
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                    mediaRecorderRef.current.stop();
                }
            };
            recognition.stop();
            return;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
    };

    const handleRunCode = async () => {
        setCodingExecutionLoading(true);
        setCodingOutput('Running code...');
        try {
            const res = await fetch(`${API_BASE_URL}/api/execute-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: codingLanguage,
                    source: codingCode,
                }),
            });
            const data = await res.json();
            const stdout = data.run?.stdout || data.compile?.stdout || '';
            const stderr = data.run?.stderr || data.compile?.stderr || '';
            const output = [stdout, stderr].filter(Boolean).join('\n') || 'No output.';
            setCodingOutput(output);
        } catch (err) {
            console.error('Code execution error:', err);
            setCodingOutput('Execution failed. Please try again.');
        } finally {
            setCodingExecutionLoading(false);
        }
    };

    const submitAnswer = async (blob) => {
        console.log("--- SUBMITTED ANSWER ---");
        console.log("Question asked:", question);
        console.log("Audio blob size:", blob.size, "bytes");

        setLoading(true);
        setLoadingStatus("Transcribing response...");
        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('question', question);
        formData.append('audio', blob, 'response.webm');
        const browserTranscript = spokenAnswerTextRef.current.trim();
        if (browserTranscript) {
            formData.append('answer_text', browserTranscript);
        }

        console.log("API Request Payload: Sending question and audio multipart form-data");

        try {
            const response = await apiFetch(`${API_BASE_URL}/api/submit-answer`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            
            console.log("API Response Received:", data);
            console.log("Parsed Evaluation JSON:", data.evaluation);
            
            setLoadingStatus("Evaluating answer details...");
            setFeedback(data.evaluation);
            
            if (data.transcribed_text) {
                console.log("Transcribed text of answer:", data.transcribed_text);
            }
            console.log("------------------------");
        } catch (err) {
            console.error("Error submitting answer:", err);
            setLoadingStatus("Connection error. Retrying...");
        }
        setLoading(false);
        setLoadingStatus("");
    };

    const submitCodingAnswer = async () => {
        setCodingSubmitLoading(true);
        setCodingOutput('Submitting your solution...');
        try {
            const formData = new FormData();
            formData.append('session_id', sessionId);
            formData.append('question', question || codingProblem);
            formData.append('answer_text', codingCode);
            formData.append('language', codingLanguage);
            const response = await apiFetch(`${API_BASE_URL}/api/submit-answer`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            setFeedback(data.evaluation);
            setCodingOutput(`Submitted in ${codingLanguage}. ${data.evaluation?.feedback || 'Your solution was recorded.'}`);
        } catch (err) {
            console.error('Error submitting coding answer:', err);
            setCodingOutput('Submission failed. Please try again.');
        } finally {
            setCodingSubmitLoading(false);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await apiFetch(`${API_BASE_URL}/api/interview-report?session_id=${sessionId}`);
            const data = await response.json();
            setReport(data);
        } catch (err) {
            console.error("Error fetching report:", err);
        }
        setLoading(false);
    };

    const selectedRoleDisplay = targetRole === "Custom Role" ? customRoleText : targetRole;
    const outOfFrameCount = monitoringEvents.filter((e) => e.type === 'out_of_frame').length;
    const lookingAwayCount = monitoringEvents.filter((e) => e.type === 'looking_away').length;
    const multipleFacesCount = monitoringEvents.filter((e) => e.type === 'multiple_faces').length;
    const phoneDetectedEvents = monitoringEvents.filter((e) => e.type === 'phone_detected');
    const latestPhoneEvent = phoneDetectedEvents[phoneDetectedEvents.length - 1];
    const monitoringBadgeTone =
        monitoringStatus === 'on' ? 'text-emerald-800 border-emerald-200 bg-emerald-50' :
        monitoringStatus === 'preparing' ? 'text-amber-800 border-amber-200 bg-amber-50' :
        monitoringStatus === 'unavailable' ? 'text-rose-700 border-rose-200 bg-rose-50' :
        'text-slate-700 border-stone-200 bg-white';

    if (completed) {
        return (
            <div className="page-canvas flex items-center justify-center p-6 relative overflow-y-auto text-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(138,93,47,0.08)_0%,_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(16,26,46,0.05)_0%,_transparent_35%)]" />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="surface-card p-8 md:p-12 text-center max-w-5xl w-full my-8 relative z-10"
                >
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200">
                        <CheckCircle2 className="w-10 h-10 text-emerald-700" />
                    </div>
                    <h1 className="display-title text-4xl md:text-5xl mb-2">Interview Completed</h1>
                    <p className="muted-copy mb-8 max-w-xl mx-auto">
                        Your personalized session for <span className="text-[#8a5d2f] font-semibold">{selectedRoleDisplay || "General Software Engineering"}</span> is finished. Click below to view your analysis report.
                    </p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="text-left surface-card-soft p-6">
                            <h3 className="section-eyebrow mb-4 flex items-center gap-2 text-[#8a5d2f]">
                                <AlertTriangle className="w-5 h-5" />
                                Stress Level & Hesitation Heatmap
                            </h3>
                            <div className="h-32 flex items-end gap-1 bg-white p-4 rounded-2xl border border-stone-200">
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
                                        {[20, 45, 30, 65, 40, 80, 50, 30].map((v, i) => (
                                            <div key={i} className="flex-grow h-full mx-0.5 flex flex-col justify-end">
                                                <div className="w-full rounded-t-sm" style={{ height: `${v}%`, backgroundColor: v > 70 ? '#ef4444' : v > 40 ? '#facc15' : '#22c55e', opacity: 0.3 }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Biometric markers indicating cognitive load and speed of articulation.</p>
                        </div>

                        <div className="text-left surface-card-soft p-6">
                            <h3 className="section-eyebrow mb-4 flex items-center gap-2 text-[#16324f]">
                                <Download className="w-5 h-5" />
                                Session Recording
                            </h3>
                            <div className="p-4 bg-white aspect-video rounded-2xl border border-stone-200 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                                {recordedVideoUrl ? (
                                    <video src={recordedVideoUrl} controls className="w-full h-full rounded-lg" />
                                ) : (
                                    <div className="text-slate-500 text-center">
                                        <VideoOff className="w-8 h-8 mb-2 mx-auto opacity-30" />
                                        <p className="text-sm">Recording ready for review</p>
                                    </div>
                                )}
                            </div>
                            {recordedVideoUrl && (
                                <a 
                                    href={recordedVideoUrl} 
                                    download="interview_session.webm"
                                    className="secondary-action w-full py-2 mt-4 text-sm text-center block rounded-full"
                                >
                                    Download Video (WebM)
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="text-left surface-card-soft p-6 mb-8">
                        <h3 className="section-eyebrow mb-4 flex items-center gap-2 text-[#16324f]">
                            <Eye className="w-4 h-4" />
                            Integrity Notes (Coaching)
                        </h3>
                        <p className="text-xs text-slate-600 mb-4">
                            These notes are generated from optional on-device monitoring to help you simulate interview focus. No video was uploaded.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="bg-white border border-stone-200 rounded-xl p-3">
                                <div className="section-eyebrow">Out of Frame</div>
                                <div className="font-bold text-slate-900">{outOfFrameCount} instance(s)</div>
                            </div>
                            <div className="bg-white border border-stone-200 rounded-xl p-3">
                                <div className="section-eyebrow">Looked Away</div>
                                <div className="font-bold text-slate-900">{lookingAwayCount} instance(s)</div>
                            </div>
                            <div className="bg-white border border-stone-200 rounded-xl p-3">
                                <div className="section-eyebrow">Additional Face Nearby</div>
                                <div className="font-bold text-slate-900">{multipleFacesCount} instance(s)</div>
                            </div>
                            <div className="bg-white border border-stone-200 rounded-xl p-3">
                                <div className="section-eyebrow">Phone Visibility</div>
                                <div className="font-bold text-slate-900">
                                    {phoneDetectedEvents.length} instance(s)
                                    {latestPhoneEvent ? `, latest at ${latestPhoneEvent.atLabel}` : ''}
                                </div>
                            </div>
                        </div>
                        {monitoringEvents.length > 0 && (
                            <div className="mt-4 max-h-40 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                                {monitoringEvents.map((event) => (
                                    <div key={event.id} className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-slate-700 flex items-center justify-between gap-2">
                                        <span>{event.message}</span>
                                        <span className="font-bold text-slate-500">{event.atLabel}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {loading && (
                        <div className="flex flex-col items-center justify-center p-12">
                            <Loader2 className="w-12 h-12 animate-spin text-[#8a5d2f] mb-4" />
                            <p className="muted-copy font-medium">Generating detailed performance report...</p>
                        </div>
                    )}

                    {!report && !loading && (
                        <button onClick={fetchReport} className="primary-action py-4 px-12 mb-8 rounded-full transition-all">
                            Generate Analysis Report
                        </button>
                    )}

                    {report && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-left surface-card p-6 md:p-8 mb-8"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <div>
                                    <h3 className="display-title text-2xl flex items-center gap-2">
                                        <Award className="text-[#16324f] w-6 h-6" /> Performance Scorecard
                                    </h3>
                                    <p className="muted-copy text-sm mt-1">Structured dynamic evaluation report</p>
                                </div>
                                <div className="px-6 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-[#8a5d2f] font-extrabold text-xl">
                                    Overall: {report.total_score || "N/A"}/100
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="p-4 bg-white rounded-2xl border border-stone-200">
                                        <div className="section-eyebrow">Technical</div>
                                        <div className="text-2xl font-extrabold text-slate-900 mt-1">{report.technical_score || 0}%</div>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-stone-200">
                                        <div className="section-eyebrow">Communication</div>
                                        <div className="text-2xl font-extrabold text-slate-900 mt-1">{report.communication_score || 0}%</div>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-stone-200">
                                        <div className="section-eyebrow">Relevance</div>
                                        <div className="text-2xl font-extrabold text-slate-900 mt-1">{report.relevance_score || 0}%</div>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-stone-200">
                                        <div className="section-eyebrow">Confidence</div>
                                        <div className="text-2xl font-extrabold text-slate-900 mt-1">{report.confidence_score || 0}%</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <div className="section-eyebrow mb-2">Key Strengths</div>
                                        <div className="flex flex-wrap gap-2">
                                            {report.strengths && report.strengths.length > 0 ? report.strengths.map((s, idx) => (
                                                <span key={idx} className="text-xs px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                                                    {s}
                                                </span>
                                            )) : <p className="text-sm text-slate-500 italic">Complete technical questions to see strengths.</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="section-eyebrow mb-2">Areas for Improvement</div>
                                        <div className="flex flex-wrap gap-2">
                                            {report.weaknesses && report.weaknesses.length > 0 ? report.weaknesses.map((w, idx) => (
                                                <span key={idx} className="text-xs px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
                                                    {w}
                                                </span>
                                            )) : <p className="text-sm text-slate-500 italic">No major weaknesses detected.</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-[#f8f4ec] rounded-2xl border border-stone-200">
                                    <div className="section-eyebrow mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-[#8a5d2f]" /> Overall Coaching Recommendation
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed">{report.recommendations || "Great attempt! Keep practicing."}</p>
                                </div>

                                <div className="pt-6 border-t border-stone-200">
                                    <div className="section-eyebrow mb-4">Detailed Question-by-Question Analysis</div>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {report.detailed_results?.map((res, idx) => (
                                            <div key={idx} className="bg-white rounded-2xl p-5 border border-stone-200">
                                                <div className="flex justify-between items-start mb-3 gap-4">
                                                    <p className="text-sm font-bold text-slate-900">Q{idx+1}: {res.question}</p>
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${res.score >= 75 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : res.score >= 50 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                        {res.score}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-3 italic">Your Answer: "{res.answer}"</p>
                                                
                                                <div className="space-y-2 bg-[#f8f4ec] p-4 rounded-2xl border border-stone-200">
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] uppercase font-bold text-[#8a5d2f] flex-shrink-0 mt-0.5">Feedback:</span>
                                                        <p className="text-xs text-slate-700 leading-relaxed">{res.feedback}</p>
                                                    </div>
                                                    {res.missing_keywords && res.missing_keywords.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-200">
                                                            <span className="text-[10px] uppercase font-bold text-amber-800 flex-shrink-0 mt-0.5 mr-2">Missing Keywords:</span>
                                                            {res.missing_keywords.map((kw, i) => (
                                                                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                                                                    {kw}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => navigate('/')} className="secondary-action py-4 px-8 rounded-full transition-all font-semibold">
                            Return to Home
                        </button>
                        <button onClick={() => window.location.reload()} className="primary-action py-4 px-8 rounded-full transition-all font-bold">
                            Start New Session
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="page-canvas p-4 md:p-8 relative flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(138,93,47,0.08)_0%,_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(16,26,46,0.05)_0%,_transparent_35%)]" />
            
            <div className="w-full max-w-6xl mb-6 flex justify-between items-center z-10">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </button>
                <div className="flex items-center gap-2">
                    <div className="status-pill px-4 py-2">
                        <div className="status-dot animate-pulse" />
                        <span>Live Dynamic Session</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 ${monitoringBadgeTone}`}>
                        {monitoringStatus === 'on' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldX className="w-3.5 h-3.5" />}
                        <span>
                            Monitoring: {monitoringStatus === 'on' ? 'On' : monitoringStatus === 'preparing' ? 'Preparing' : monitoringStatus === 'unavailable' ? 'Unavailable' : 'Off'}
                        </span>
                    </div>
                </div>
                <div className="w-24" />
            </div>

            {interviewStarted && (
                <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 w-[330px]">
                    <AnimatePresence>
                        {monitoringToasts.map((toast) => (
                            <motion.div
                                key={toast.id}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className={`rounded-2xl border bg-white px-4 py-3 shadow-sm ${toast.severity === 'red' ? 'border-rose-200' : 'border-amber-200'}`}
                            >
                                <p className={`text-sm font-medium ${toast.severity === 'red' ? 'text-rose-800' : 'text-amber-900'}`}>{toast.message}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <main className="w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-[1fr,320px] gap-6 relative z-10 flex-grow">
                <section className="surface-card overflow-hidden relative flex flex-col min-h-[550px]">
                    {!interviewStarted ? (
                        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto w-full">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full"
                            >
                                <h2 className="display-title text-4xl md:text-5xl mb-2">Configure Your Session</h2>
                                <p className="muted-copy mb-8 text-sm">Select your interview role and optional resume profile to start.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left max-w-2xl mx-auto">
                                    <div>
                                        <label className="field-label">Select Interview Role *</label>
                                        <select 
                                            value={targetRole}
                                            onChange={(e) => {
                                                setTargetRole(e.target.value);
                                                setRoleSelected(e.target.value !== "");
                                            }}
                                            className="field-control"
                                        >
                                            <option value="" disabled>-- Select a role --</option>
                                            {PRESET_ROLES.map((r, i) => (
                                                <option key={i} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="field-label">Core Skills / Keywords</label>
                                        <input 
                                            type="text" 
                                            value={skills.join(", ")}
                                            onChange={(e) => setSkills(e.target.value.split(",").map(s => s.trim()))}
                                            placeholder="Auto-filled from resume or enter manually..."
                                            className="field-control"
                                        />
                                    </div>
                                </div>

                                {targetRole === "Custom Role" && (
                                    <div className="max-w-2xl mx-auto text-left mb-8">
                                        <label className="field-label">Enter Custom Role Title *</label>
                                        <input 
                                            type="text" 
                                            value={customRoleText}
                                            onChange={(e) => setCustomRoleText(e.target.value)}
                                            placeholder="e.g. NLP Engineer, React Architect"
                                            className="field-control"
                                        />
                                    </div>
                                )}

                                <div className="max-w-2xl mx-auto text-left mb-8">
                                    <label className="field-label">Professional Profile / Resume Details</label>
                                    <textarea 
                                        rows="3"
                                        value={profileText}
                                        onChange={(e) => setProfileText(e.target.value)}
                                        placeholder="Paste your CV highlights, job description, or summary here..."
                                        className="field-control resize-none min-h-[120px]"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left max-w-3xl mx-auto">
                                    {[
                                        { id: 'friendly', name: 'Friendly Recruiter', icon: <Users className="text-emerald-700 w-5 h-5" />, color: 'border-emerald-200 bg-emerald-50 text-emerald-800', desc: 'Encouraging tone, focuses on culture and soft skills.' },
                                        { id: 'technical', name: 'Technical Lead', icon: <Terminal className="text-[#16324f] w-5 h-5" />, color: 'border-[#16324f] bg-[#16324f]/5 text-[#16324f]', desc: 'No-nonsense. Deep follow-up "Why?" questions.' },
                                        { id: 'tough', name: 'Stress Tester', icon: <ShieldAlert className="text-amber-800 w-5 h-5" />, color: 'border-amber-200 bg-amber-50 text-amber-900', desc: 'Tougher questions, interrupts, tests your pressure.' }
                                    ].map(p => (
                                        <div 
                                            key={p.id}
                                            onClick={() => setPersona(p.id)}
                                            className={`p-4 cursor-pointer border rounded-2xl transition-all group surface-card-soft ${persona === p.id ? p.color : 'border-stone-200 hover:border-stone-300 bg-white'}`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-3 border border-stone-200">
                                                {p.icon}
                                            </div>
                                            <h3 className="font-bold mb-1 text-sm text-slate-900">{p.name}</h3>
                                            <p className="text-[11px] text-slate-600 leading-normal">{p.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                {codingRoundEnabled && (
                                    <div className="max-w-2xl mx-auto mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                                        <div className="font-semibold">Coding round recommended</div>
                                        <p>{codingRoundNote || 'Based on your resume, this session will include a coding round.'}</p>
                                    </div>
                                )}

                                <div className="max-w-md mx-auto flex flex-col gap-2">
                                    <label className="p-4 surface-card-soft rounded-2xl border border-stone-200 text-left flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={monitoringEnabled}
                                            onChange={(e) => setMonitoringEnabled(e.target.checked)}
                                            className="mt-1"
                                        />
                                        <div>
                                            <div className="section-eyebrow text-[#16324f]">Enable focus & integrity monitoring (uses your camera)</div>
                                            <p className="text-xs text-slate-600 mt-1">
                                                Runs in your browser only. Detects if you leave frame, another person appears, or a phone is visible. Never uploads video.
                                            </p>
                                        </div>
                                    </label>
                                    <p className="text-xs text-slate-500 text-left">Status: {monitoringNotice}</p>
                                    {(() => {
                                        const isDisabled = !targetRole || (targetRole === "Custom Role" && customRoleText.trim() === "");
                                        return (
                                            <button 
                                                disabled={isDisabled}
                                                onClick={startInterview} 
                                                className={`primary-action px-16 py-4 text-lg w-full rounded-full transition-all ${isDisabled ? 'opacity-45 cursor-not-allowed' : ''}`}
                                            >
                                                Start Mock Session
                                            </button>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        </div>
                    ) : (
                        <>
                            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none w-full">
                                <div className="flex flex-col items-start surface-card-soft px-6 py-2 pointer-events-auto">
                                    <div className="flex items-center gap-3">
                                        <Volume2 className="w-4 h-4 text-[#16324f]" />
                                        <span className="section-eyebrow">AI Interviewer Speaking</span>
                                    </div>
                                    <Waveform />
                                </div>
                                <button 
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to change your role? This will restart the interview session.")) {
                                            setInterviewStarted(false);
                                            setRoleSelected(false);
                                            setTargetRole("");
                                            stopScreenShare();
                                        }
                                    }}
                                    className="secondary-action px-4 py-2 rounded-full text-xs pointer-events-auto transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Change Role
                                </button>
                            </div>

                            <div className="relative flex-grow overflow-hidden flex items-center justify-center bg-[linear-gradient(180deg,_rgba(255,255,255,0.7)_0%,_rgba(247,241,231,0.95)_100%)]">
                                <img 
                                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop"
                                    alt="Interviewer" 
                                    className="w-full h-full object-cover opacity-10 absolute inset-0"
                                />

                                {/* Camera preview positioned at the top left, out of way of bottom question caption card */}
                <div className="absolute top-6 left-6 w-40 h-40 rounded-2xl overflow-hidden surface-card z-20 bg-white">
                     <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                </div>

                <div className="absolute top-6 right-6 w-52 rounded-2xl surface-card-soft z-20 p-4">
                    <div className="section-eyebrow mb-2">Screen Share</div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {screenShareActive
                            ? 'Sharing is active for this session.'
                            : 'Permission is requested when you start the interview.'}
                    </p>
                </div>

                {/* Beautiful readable question caption card at the bottom center with dark blur background, larger font and padding */}
                <div className="absolute bottom-6 left-6 right-6 p-8 rounded-3xl surface-card max-w-4xl mx-auto z-10 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3 text-[#16324f]">
                        <MessageSquare className="w-4 h-4" />
                        <span className="section-eyebrow">{currentQuestionType === 'coding' ? 'Live Coding Round' : 'Question Caption'}</span>
                    </div>
                    {currentQuestionType === 'coding' ? (
                        <div className="text-left space-y-4">
                            <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <p className="text-sm font-semibold text-slate-800">{question || 'Code the solution to the prompt below.'}</p>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Language</label>
                                        <select
                                            value={codingLanguage}
                                            onChange={(event) => {
                                                const nextLanguage = event.target.value;
                                                setCodingLanguage(nextLanguage);
                                                setCodingCode(getCodingStarterTemplate(nextLanguage));
                                                setCodingOutput('');
                                            }}
                                            className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm"
                                        >
                                            <option value="python">Python</option>
                                            <option value="cpp">C++</option>
                                            <option value="java">Java</option>
                                            <option value="c">C</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-stone-200 overflow-hidden">
                                    <Editor
                                        height="260px"
                                        theme="vs-light"
                                        language={codingLanguage === 'cpp' ? 'cpp' : codingLanguage === 'java' ? 'java' : codingLanguage === 'c' ? 'c' : 'python'}
                                        path={`${codingLanguage}-solution.${codingLanguage === 'cpp' ? 'cpp' : codingLanguage === 'java' ? 'java' : codingLanguage === 'c' ? 'c' : 'py'}`}
                                        value={codingCode}
                                        onChange={(value) => setCodingCode(value || '')}
                                        onPaste={(event) => {
                                            const pastedText = event.clipboardData?.getData('text') || '';
                                            if (pastedText.length > 50) {
                                                recordMonitoringEvent(
                                                    'large_paste',
                                                    'A large paste was detected in the coding editor. Keep external content use minimal and transparent.',
                                                    'amber',
                                                    'coding'
                                                );
                                            }
                                        }}
                                        options={{ minimap: { enabled: false }, fontSize: 14 }}
                                    />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button onClick={handleRunCode} disabled={codingExecutionLoading} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                                        {codingExecutionLoading ? 'Running...' : 'Run'}
                                    </button>
                                    <button onClick={submitCodingAnswer} disabled={codingSubmitLoading} className="rounded-full bg-[#16324f] px-4 py-2 text-sm font-semibold text-white">
                                        {codingSubmitLoading ? 'Submitting...' : 'Submit'}
                                    </button>
                                </div>
                                {codingOutput && (
                                    <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-900 p-3 text-left text-xs text-slate-100">{codingOutput}</pre>
                                )}
                                <div className="mt-3 text-[11px] uppercase tracking-wide text-slate-500">Monitoring remains active during this round.</div>
                            </div>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={question + loadingStatus}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="max-h-[180px] overflow-y-auto pr-1"
                            >
                                <p className="display-title text-lg md:text-2xl leading-relaxed tracking-wide">
                                    {loading ? (loadingStatus || "Evaluating response...") : (question || "Thinking...")}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
                            </div>
                        </>
                    )}
                </section>

                <aside className="flex flex-col gap-4">
                    <div className="surface-card p-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-stone-200">
                                    <User className="w-5 h-5 text-[#16324f]" />
                                </div>
                                <div className="text-sm">
                                    <div className="section-eyebrow">Candidate</div>
                                    <div className="font-bold text-slate-900">Anuradha</div>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                        </div>

                        <div className="p-4 surface-card-soft">
                            <div className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-[#16324f]" /> Interview Role:
                            </div>
                            <div className="text-sm font-extrabold text-slate-900 truncate">
                                {selectedRoleDisplay || "Not Selected"}
                            </div>
                        </div>

                        <div 
                            onClick={() => {
                                if (interviewStarted) return;
                                fileInputRef.current?.click();
                            }}
                            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 group ${interviewStarted ? 'opacity-40 cursor-not-allowed border-stone-200 bg-white/70' : (resumeUploaded ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 cursor-pointer' : 'bg-white border-stone-200 hover:bg-stone-50 cursor-pointer')}`}
                        >
                            {uploadingResume ? <Loader2 className="w-5 h-5 text-[#8a5d2f] animate-spin" /> : (resumeUploaded ? <CheckCircle2 className="w-5 h-5 text-emerald-700" /> : <Upload className="w-5 h-5 text-[#16324f]" />)}
                            <div className="flex-grow">
                                <div className={`text-xs font-bold ${resumeUploaded ? 'text-emerald-700' : 'text-[#16324f]'}`}>
                                    {resumeUploaded ? "Resume Loaded" : "Upload Resume"}
                                </div>
                                <div className="text-[10px] text-slate-500 underline">
                                    {resumeUploaded ? "Tap to update resume PDF" : "Highly Recommended"}
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleResumeUpload} 
                                    disabled={interviewStarted}
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
                                className="p-4 surface-card-soft relative"
                            >
                                <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200 shadow-sm">
                                    <MessageSquare className="w-3 h-3 text-[#8a5d2f] font-bold" />
                                </div>
                                <div className="section-eyebrow mb-1 pl-2">Live Status</div>
                                <p className="text-xs font-medium text-slate-600 leading-relaxed italic pl-2">
                                    {loading ? "Interviewer evaluating..." : "Ready to hear your answer. Click Start Answering below."}
                                </p>
                            </motion.div>
                        )}
                        
                        <button 
                            disabled={!feedback} 
                            onClick={fetchNextQuestion}
                            className={`w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${
                                feedback 
                                ? 'secondary-action' 
                                : 'bg-white text-slate-400 cursor-not-allowed border border-stone-200'
                            }`}
                        >
                            <BarChart3 className="w-5 h-5" />
                            Next Question
                        </button>

                        <button 
                            disabled={!interviewStarted}
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 border transition-all ${
                                !interviewStarted ? 'opacity-30 cursor-not-allowed text-slate-400 border-stone-200 bg-white' :
                                isRecording 
                                ? 'secondary-action border-amber-200 bg-amber-50 text-amber-900' 
                                : 'primary-action'
                            }`}
                        >
                            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            {isRecording ? "Stop Recording" : "Start Answering"}
                        </button>

                        <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className="w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 secondary-action transition-all"
                        >
                            {isMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
                            {isMuted ? "Unmute Microphone" : "Mute Microphone"}
                        </button>

                        <button 
                            onClick={() => setCompleted(true)}
                            className="w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 danger-action transition-all"
                        >
                            <PhoneOff className="w-5 h-5" />
                            End Interview
                        </button>
                    </div>

                    <div className="p-4 flex items-center justify-center gap-4 text-slate-500 border border-stone-200 rounded-2xl bg-white">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Duration: <span className="text-white font-bold">{formatTime(sessionTime)}</span></span>
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
                        className="fixed inset-x-4 bottom-6 md:bottom-10 lg:bottom-12 md:left-1/2 md:-translate-x-1/2 z-50 w-auto md:w-[700px] max-h-[85vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="surface-card p-6 md:p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#8a5d2f] text-2xl font-extrabold">
                                        {feedback.score}
                                    </div>
                                    <div>
                                        <div className="section-eyebrow">AI Evaluation Score</div>
                                        <div className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                            {feedback.answer_quality === "weak" ? "Needs Attention" : feedback.answer_quality === "average" ? "Good Effort" : "Outstanding Answer!"}
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${feedback.difficulty === "hard" ? 'bg-rose-50 text-rose-700 border border-rose-200' : feedback.difficulty === "medium" ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                                                {feedback.difficulty}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <button 
                                        onClick={() => {
                                            setFeedback(null);
                                            setRetryCount(prev => prev + 1);
                                        }} 
                                        className="secondary-action flex-1 md:flex-initial py-2.5 px-4 text-xs rounded-full"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Retry
                                    </button>
                                    <button onClick={fetchNextQuestion} className="primary-action flex-1 md:flex-initial py-2.5 px-6 text-xs rounded-full font-bold">
                                        Next Question
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 gap-2.5 mb-6 text-center">
                                {[
                                    { label: 'Relevance', value: feedback.relevance_score },
                                    { label: 'Accuracy', value: feedback.technical_accuracy_score },
                                    { label: 'Depth', value: feedback.depth_score },
                                    { label: 'Clarity', value: feedback.clarity_score },
                                    { label: 'Confidence', value: feedback.confidence_score }
                                ].map((sub, i) => (
                                    <div key={i} className="p-2 bg-white rounded-xl border border-stone-200">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider truncate">{sub.label}</div>
                                        <div className="text-sm font-extrabold text-slate-900 mt-0.5">{sub.value || 0}%</div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-[#f8f4ec] p-4 rounded-2xl border border-stone-200">
                                    <div className="text-[10px] font-bold text-[#8a5d2f] uppercase tracking-wider mb-1">Feedback Summary</div>
                                    <p className="text-xs text-slate-700 leading-relaxed">
                                        {feedback.feedback}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-stone-200">
                                        <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Strengths</div>
                                        <ul className="space-y-1.5">
                                            {feedback.strengths && feedback.strengths.length > 0 ? feedback.strengths.map((str, idx) => (
                                                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                                                        <span className="text-emerald-700 font-bold mt-0.5">•</span> {str}
                                                </li>
                                            )) : <span className="text-xs text-slate-500 italic">No specific strengths listed.</span>}
                                        </ul>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-stone-200">
                                        <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-2">Gaps / Weaknesses</div>
                                        <ul className="space-y-1.5">
                                            {feedback.weaknesses && feedback.weaknesses.length > 0 ? feedback.weaknesses.map((weak, idx) => (
                                                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                                                        <span className="text-rose-700 font-bold mt-0.5">•</span> {weak}
                                                </li>
                                            )) : <span className="text-xs text-slate-500 italic">No gaps detected. Excellent answer.</span>}
                                        </ul>
                                    </div>
                                </div>

                                {feedback.missing_keywords && feedback.missing_keywords.length > 0 && (
                                    <div className="bg-white p-4 rounded-2xl border border-stone-200">
                                        <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-2">Expected / Missing Keywords</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {feedback.missing_keywords.map((kw, idx) => (
                                                <span key={idx} className="text-[10px] px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {feedback.suggested_answer && (
                                    <div className="bg-white p-4 rounded-2xl border border-stone-200">
                                        <div className="text-[10px] font-bold text-[#16324f] uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <BookOpen className="w-3.5 h-3.5" /> Model Suggested Answer
                                        </div>
                                        <p className="text-xs text-slate-700 leading-relaxed italic">
                                            "{feedback.suggested_answer}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InterviewPage;
