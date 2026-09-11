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
  ShieldX,
  Cpu,
  Layers,
  Zap,
  Activity,
  Check
} from 'lucide-react';
import { getPreferredVoice } from "./services/voiceService";
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken, apiFetch } from './services/authApi.js';
import CodingRoundCard from './components/interview/CodingRoundCard';
import DraggableWebcam from './components/interview/DraggableWebcam';
import RAGEvidencePanel from './components/interview/RAGEvidencePanel';
import ExplainableMLEvaluation from './components/interview/ExplainableMLEvaluation';
import EvidenceAlignmentVisualization from './components/interview/EvidenceAlignmentVisualization';
import DemoPipelineModal from './components/interview/DemoPipelineModal';
import { API_BASE_URL, buildApiUrl } from './utils/apiConfig.js';

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
    const location = useLocation();
    const interviewSetup = location.state?.setup;
    const [sessionId, setSessionId] = useState(null);
    const [question, setQuestion] = useState("");
    const activeQuestion = question;
    const [audioUrl, setAudioUrl] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [hasSubmittedCoding, setHasSubmittedCoding] = useState(false);
    const [nextQuestionError, setNextQuestionError] = useState("");

    // Extended ML-RAG Metadata State
    const [questionNumber, setQuestionNumber] = useState(1);
    const [questionMeta, setQuestionMeta] = useState({
        topic: 'General',
        difficulty: 'Medium',
        question_type: 'Conceptual',
        estimated_skill: 'Software Engineering',
        knowledge_grounded: true,
        grounding_score: 0.88,
        evidence_details: [],
        adaptive_reason: ''
    });
    const [showDemoModal, setShowDemoModal] = useState(false);

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
    const [targetRole, setTargetRole] = useState("");
    const [customRoleText, setCustomRoleText] = useState("");
    const [roleSelected, setRoleSelected] = useState(false);
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

    // Auto-speak when the active question changes
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
        {isSpeaking && <span className="voice-badge speaking">Interviewer Speaking...</span>}
        {isMuted && !isSpeaking && <span className="voice-badge muted">Voice Muted</span>}
        {!isSpeaking && !isMuted && <span className="voice-badge ready">Ready</span>}
      </div>
    );

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Media Stream Management
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
            }, 3500);
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
        const uploadUrl = buildApiUrl('/api/upload-resume');
        const response = await apiFetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        const rawText = await response.text();
        let data = rawText ? JSON.parse(rawText) : {};

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
        alert(`Failed to upload resume: ${err.message}`);
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
            setLoadingStatus("Preparing your interview question...");
            setInterviewStarted(true);
            setQuestionNumber(1);
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

                setQuestionMeta({
                    topic: data.topic || (skills[0] || finalRole),
                    difficulty: data.difficulty || 'Medium',
                    question_type: data.question_type || 'Conceptual',
                    estimated_skill: data.estimated_skill || (skills[0] || finalRole),
                    knowledge_grounded: data.knowledge_grounded !== false,
                    grounding_score: data.grounding_score || 0.88,
                    evidence_details: data.evidence_details || [],
                    adaptive_reason: ''
                });
            }
        } catch (err) {
            console.error("Error starting interview:", err);
            setLoadingStatus("Error starting session. Please try again.");
            stopScreenShare();
        }
        setLoading(false);
        setLoadingStatus("");
    };

    const fetchNextQuestion = async (retryCount = 0) => {
        setFeedback(null);
        setHasSubmittedCoding(false);
        setNextQuestionError('');
        setLoading(true);
        setLoadingStatus("Preparing your next interview question...");
        try {
            const response = await apiFetch(`${API_BASE_URL}/api/next-question`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || errData.message || `Failed to fetch next question (status ${response.status})`);
            }
            const data = await response.json();
            if (data.question) {
                setQuestion(data.question);
                setQuestionNumber(prev => prev + 1);
                setCurrentQuestionType(data.question_type || 'behavioral');
                if (data.question_type === 'coding') {
                    setCodingProblem(data.question);
                    setCodingCode(getCodingStarterTemplate(codingLanguage));
                    setCodingOutput('');
                }
                if (data.audio_path) setAudioUrl(`${API_BASE_URL}/${data.audio_path}`);

                setQuestionMeta({
                    topic: data.topic || 'Technical',
                    difficulty: data.difficulty || 'Adaptive',
                    question_type: data.question_type || 'Technical',
                    estimated_skill: data.estimated_skill || data.topic || 'Technical',
                    knowledge_grounded: data.knowledge_grounded !== false,
                    grounding_score: data.grounding_score || 0.88,
                    evidence_details: data.evidence_details || [],
                    adaptive_reason: data.adaptive_reason || ''
                });
            } else if (data.completed || !data.question) {
                setCompleted(true);
            }
        } catch (err) {
            console.error("Error fetching next question:", err);
            if (retryCount < 1) {
                setLoadingStatus("Unable to prepare the next question. Retrying...");
                setTimeout(() => fetchNextQuestion(retryCount + 1), 1000);
                return;
            } else {
                setNextQuestionError(err.message || 'Unable to fetch next question. Please check connection and try again.');
            }
        } finally {
            if (retryCount === 0 || (retryCount > 0 && nextQuestionError)) {
                setLoading(false);
                setLoadingStatus("");
            }
        }
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

    const submitAnswer = async (blob) => {
        setLoading(true);
        setLoadingStatus("Analyzing your answer...");
        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('question', question);
        formData.append('audio', blob, 'response.webm');
        const browserTranscript = spokenAnswerTextRef.current.trim();
        if (browserTranscript) {
            formData.append('answer_text', browserTranscript);
        }

        try {
            setLoadingStatus("Retrieving relevant technical knowledge...");
            const response = await apiFetch(`${API_BASE_URL}/api/submit-answer`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            
            setLoadingStatus("Evaluating semantic and conceptual alignment...");
            setFeedback(data.evaluation);
        } catch (err) {
            console.error("Error submitting answer:", err);
            setLoadingStatus("Connection error. Retrying...");
        }
        setLoading(false);
        setLoadingStatus("");
    };

    const fetchReport = async () => {
        setLoading(true);
        setLoadingStatus("Aggregating ML-RAG intelligence signals & computing report...");
        try {
            const response = await apiFetch(`${API_BASE_URL}/api/interview-report?session_id=${sessionId}`);
            const data = await response.json();
            setReport(data);
        } catch (err) {
            console.error("Error fetching report:", err);
        }
        setLoading(false);
        setLoadingStatus("");
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

    // Finished / Final Report View
    if (completed) {
        return (
            <div className="page-canvas flex items-center justify-center p-6 relative overflow-y-auto text-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(138,93,47,0.08)_0%,_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(16,26,46,0.05)_0%,_transparent_35%)]" />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="surface-card p-6 md:p-10 text-center max-w-6xl w-full my-8 relative z-10"
                >
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                        <CheckCircle2 className="w-8 h-8 text-emerald-700" />
                    </div>
                    <h1 className="display-title text-3xl md:text-4xl mb-2">Interview Completed</h1>
                    <p className="muted-copy mb-6 max-w-xl mx-auto text-sm">
                        Your personalized session for <span className="text-[#8a5d2f] font-semibold">{selectedRoleDisplay || "General Software Engineering"}</span> is complete.
                    </p>
                    
                    {!report && !loading && (
                        <button onClick={fetchReport} className="primary-action py-4 px-12 mb-8 rounded-full transition-all font-bold">
                            Generate Knowledge-Grounded Analysis Report
                        </button>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center p-12">
                            <Loader2 className="w-12 h-12 animate-spin text-[#8a5d2f] mb-4" />
                            <p className="muted-copy font-medium text-sm">{loadingStatus || "Generating detailed performance report..."}</p>
                        </div>
                    )}

                    {/* ENHANCED 6-SECTION FINAL REPORT VIEW */}
                    {report && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-left surface-card p-6 md:p-8 mb-8 space-y-8 bg-slate-950 text-slate-100 border border-slate-800"
                        >
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
                                <div>
                                    <h3 className="display-title text-2xl font-bold flex items-center gap-2 text-white">
                                        <Award className="text-amber-400 w-6 h-6" /> Knowledge-Grounded ML Interview Report
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Empirical candidate analysis powered by SBERT Alignment & FAISS Retrieval
                                    </p>
                                </div>
                                <div className="px-6 py-3 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl text-cyan-300 font-extrabold text-2xl font-mono">
                                    Overall: {report.total_score || "N/A"} / 100
                                </div>
                            </div>
                            
                            {/* SECTION 1: Overall Performance Cards */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    1. Overall Performance Breakdown
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                    {[
                                        { label: 'Overall Score', val: report.total_score, color: 'text-white' },
                                        { label: 'Tech Accuracy', val: report.technical_score, color: 'text-cyan-400' },
                                        { label: 'Relevance', val: report.relevance_score, color: 'text-indigo-300' },
                                        { label: 'Communication', val: report.communication_score, color: 'text-emerald-400' },
                                        { label: 'Confidence', val: report.confidence_score, color: 'text-amber-300' },
                                        { label: 'Eval Confidence', val: Math.round((report.knowledge_grounding_stats?.evaluation_confidence || 0.88) * 100), color: 'text-purple-300' },
                                    ].map((card, i) => (
                                        <div key={i} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-center">
                                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{card.label}</div>
                                            <div className={`text-xl font-bold font-mono mt-1 ${card.color}`}>{card.val || 0}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SECTION 2: Skill Analysis */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20">
                                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4" /> 2A. Demonstrated Strong Areas
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(report.skill_analysis?.strong_areas || report.strengths || []).map((area, idx) => (
                                            <span key={idx} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
                                                ✓ {area}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/20">
                                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4" /> 2B. Technical Gaps & Needs Improvement
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(report.skill_analysis?.needs_improvement || report.weaknesses || []).map((area, idx) => (
                                            <span key={idx} className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 font-medium">
                                                ! {area}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: Aggregated Concept Coverage */}
                            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                                    3. Aggregated Technical Concept Coverage
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="font-semibold text-emerald-400 block mb-1.5">Frequently Covered Concepts:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(report.concept_coverage_summary?.frequently_demonstrated || report.strengths || []).map((c, i) => (
                                                <span key={i} className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-amber-400 block mb-1.5">Frequently Missed Concepts:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(report.concept_coverage_summary?.frequently_missed || report.weaknesses || []).map((c, i) => (
                                                <span key={i} className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: Technical Error Analysis */}
                            <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/20">
                                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                                    <span>4. Technical Error Classification Taxonomy</span>
                                    <span className="text-slate-400 font-normal">
                                        Total Issues Detected: {report.error_analysis_summary?.total_errors || 0}
                                    </span>
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                                    {Object.entries(report.error_analysis_summary?.error_categories || {}).map(([cat, count]) => (
                                        <div key={cat} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                                            <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
                                                {cat.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-base font-bold text-slate-200 font-mono mt-0.5 block">
                                                {count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SECTION 5: Knowledge Grounding Statistics */}
                            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
                                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <BookOpen className="w-4 h-4 text-cyan-400" /> 5. Knowledge-Grounded Evaluation Grounding Stats
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Evidence Coverage</span>
                                        <span className="text-lg font-bold text-cyan-300 font-mono">
                                            {Math.round((report.knowledge_grounding_stats?.evidence_coverage || 0.85) * 100)}%
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Evidence Quality</span>
                                        <span className="text-lg font-bold text-indigo-300 font-mono">
                                            {Math.round((report.knowledge_grounding_stats?.evidence_quality || 0.88) * 100)}%
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Evaluation Confidence</span>
                                        <span className="text-lg font-bold text-emerald-300 font-mono">
                                            {Math.round((report.knowledge_grounding_stats?.evaluation_confidence || 0.88) * 100)}%
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Grounded Questions</span>
                                        <span className="text-lg font-bold text-white font-mono">
                                            {report.knowledge_grounding_stats?.grounded_evaluations_count || report.detailed_results?.length || 5} / 5
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 6: Interview Adaptation & Score Trajectory */}
                            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                                    <span>6. Adaptive Interview Trajectory & Score History</span>
                                    <span className="text-xs font-normal text-indigo-300">
                                        Difficulty: {report.adaptation_summary?.initial_difficulty || 'Medium'} → {report.adaptation_summary?.final_difficulty || 'Advanced'}
                                    </span>
                                </h4>
                                <div className="space-y-2">
                                    {(report.score_history || []).map((item) => (
                                        <div key={item.question_num} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold font-mono">
                                                    Q{item.question_num}
                                                </span>
                                                <span className="font-semibold text-slate-200">Topic: {item.topic}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-slate-400">Tech Accuracy: <strong className="text-cyan-300">{item.technical_accuracy}%</strong></span>
                                                <span className="font-bold text-white px-2.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30">
                                                    Score: {item.overall_score}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations Footer */}
                            <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs">
                                <span className="font-bold text-amber-400 block mb-1">Overall Coaching Recommendation:</span>
                                <p className="text-slate-300 leading-relaxed">{report.recommendations}</p>
                            </div>
                        </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => navigate('/')} className="secondary-action py-4 px-8 rounded-full transition-all font-semibold">
                            Return to Dashboard
                        </button>
                        <button onClick={() => window.location.reload()} className="primary-action py-4 px-8 rounded-full transition-all font-bold">
                            Start New Session
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // MAIN LIVE INTERVIEW EXPERIENCE
    return (
        <div className="h-screen w-screen max-w-full bg-[#f8f4ec] text-slate-900 overflow-hidden flex flex-col relative select-none">
            {/* Top Fixed Status Header Row */}
            <header className="h-16 w-full px-6 bg-white/90 backdrop-blur-md border-b border-stone-200 flex items-center justify-between flex-shrink-0 z-20">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium text-sm">
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </button>
                
                <div className="flex items-center gap-3">
                    <div className="status-pill px-4 py-1.5 flex items-center gap-2 bg-stone-100 rounded-full border border-stone-200 text-xs font-bold">
                        <div className="status-dot animate-pulse w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Knowledge-Grounded Session</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 ${monitoringBadgeTone}`}>
                        {monitoringStatus === 'on' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldX className="w-3.5 h-3.5" />}
                        <span>
                            Monitoring: {monitoringStatus === 'on' ? 'On' : monitoringStatus === 'preparing' ? 'Preparing' : monitoringStatus === 'unavailable' ? 'Unavailable' : 'Off'}
                        </span>
                    </div>
                </div>

                {interviewStarted ? (
                    <button 
                        onClick={() => {
                            if (window.confirm("Are you sure you want to change your role? This will restart the interview session.")) {
                                setInterviewStarted(false);
                                setRoleSelected(false);
                                setTargetRole("");
                                stopScreenShare();
                            }
                        }}
                        className="secondary-action px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        Change Role
                    </button>
                ) : <div className="w-24" />}
            </header>

            {/* Monitoring Toasts */}
            {interviewStarted && (
                <div className="fixed top-20 right-6 z-50 flex flex-col gap-2 w-[320px] pointer-events-none">
                    <AnimatePresence>
                        {monitoringToasts.map((toast) => (
                            <motion.div
                                key={toast.id}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className={`rounded-2xl border bg-white px-4 py-3 shadow-md pointer-events-auto ${toast.severity === 'red' ? 'border-rose-200' : 'border-amber-200'}`}
                            >
                                <p className={`text-xs font-semibold ${toast.severity === 'red' ? 'text-rose-800' : 'text-amber-900'}`}>{toast.message}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Draggable PiP Webcam Widget */}
            {interviewStarted && (
                <DraggableWebcam
                    videoRef={videoRef}
                    isSpeaking={isSpeaking}
                    monitoringStatus={monitoringStatus}
                    stream={stream}
                />
            )}

            {/* Main Full-Screen Grid Workspace */}
            <main className="flex-1 w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-6 overflow-hidden min-h-0 relative z-10">
                {/* Left Workspace Panel */}
                <section className="flex-1 h-full min-h-0 flex flex-col overflow-y-auto custom-scrollbar">
                    {!interviewStarted ? (
                        <div className="surface-card p-8 md:p-12 text-center max-w-4xl mx-auto w-full my-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full"
                            >
                                <h2 className="display-title text-3xl md:text-4xl mb-2">Configure Your Session</h2>
                                <p className="muted-copy mb-8 text-sm">Select your target role and optional resume profile to start.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left max-w-2xl mx-auto">
                                    <div>
                                        <label className="field-label">Select Interview Role *</label>
                                        <select 
                                            value={targetRole}
                                            onChange={(e) => {
                                                setTargetRole(e.target.value);
                                                setRoleSelected(e.target.value !== "");
                                            }}
                                            className="field-control text-slate-900 font-semibold bg-white border border-stone-300 shadow-sm"
                                        >
                                            <option value="" disabled className="text-slate-500">-- Select a role --</option>
                                            {PRESET_ROLES.map((r, i) => (
                                                <option key={i} value={r} className="text-slate-900 bg-white font-medium">{r}</option>
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
                                            className="field-control text-slate-900 font-medium bg-white border border-stone-300 shadow-sm placeholder:text-slate-400"
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
                                            className="field-control text-slate-900 font-medium bg-white border border-stone-300 shadow-sm placeholder:text-slate-400"
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
                                        className="field-control resize-none min-h-[100px]"
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
                                                Runs in your browser only. Detects if you leave frame, another person appears, or a phone is visible.
                                            </p>
                                        </div>
                                    </label>
                                    {(() => {
                                        const isDisabled = !targetRole || (targetRole === "Custom Role" && customRoleText.trim() === "");
                                        return (
                                            <button 
                                                disabled={isDisabled}
                                                onClick={startInterview} 
                                                className={`primary-action px-12 py-3.5 text-base w-full rounded-full transition-all ${isDisabled ? 'opacity-45 cursor-not-allowed' : ''}`}
                                            >
                                                Start Knowledge-Grounded Session
                                            </button>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        </div>
                    ) : (
                        <div className="w-full flex-1 flex flex-col min-h-0 space-y-4">
                            {currentQuestionType === 'coding' ? (
                                <CodingRoundCard
                                    sessionId={sessionId}
                                    apiFetch={apiFetch}
                                    onNextQuestion={fetchNextQuestion}
                                    recordMonitoringEvent={recordMonitoringEvent}
                                    onCodeSubmitted={(evalData) => {
                                        setFeedback(evalData);
                                        setHasSubmittedCoding(true);
                                    }}
                                />
                            ) : (
                                <div className="surface-card p-6 md:p-8 flex-1 flex flex-col justify-between">
                                    <div>
                                        {/* QUESTION HEADER BADGES */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200">
                                                    Question {questionNumber} of 5
                                                </span>
                                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200">
                                                    Topic: {questionMeta.topic || 'General'}
                                                </span>
                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-900 border border-cyan-200">
                                                    Type: {questionMeta.question_type || 'Conceptual'}
                                                </span>
                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200">
                                                    Difficulty: {questionMeta.difficulty || 'Medium'}
                                                </span>
                                            </div>

                                            {/* Knowledge-Grounded Badge */}
                                            {questionMeta.knowledge_grounded && (
                                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                    Knowledge-Grounded Question ({questionMeta.grounding_score?.toFixed(2) || '0.88'})
                                                </span>
                                            )}
                                        </div>

                                        {/* Adaptive Indicator Banner */}
                                        {questionMeta.adaptive_reason && (
                                            <div className="mb-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                                <span>
                                                    <strong>Adaptive Transition:</strong> {questionMeta.adaptive_reason}
                                                </span>
                                            </div>
                                        )}

                                        {/* Question Text */}
                                        <AnimatePresence mode="wait">
                                            <motion.div 
                                                key={question + loadingStatus}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="prose prose-slate max-w-none"
                                            >
                                                <p className="display-title text-2xl md:text-3xl leading-relaxed tracking-wide text-slate-900">
                                                    {loading ? (loadingStatus || "Evaluating response...") : (question || "Retrieving grounded question...")}
                                                </p>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>

                                    {/* Spoken Voice Controls inside question card */}
                                    <div className="pt-6 border-t border-stone-200 flex items-center justify-between">
                                        <VoiceControls />
                                        <div className="text-xs text-slate-500 italic">
                                            {isSpeaking ? "Interviewer speaking..." : "Click 'Start Answering' in sidebar to reply"}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Right Control Sidebar */}
                <aside className="w-full lg:w-[340px] h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-shrink-0">
                    <div className="surface-card p-6 flex flex-col gap-5">
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
                                <div className="section-eyebrow mb-1">Live Status</div>
                                <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                                    {loading ? (loadingStatus || "Evaluating response...") : "Ready to hear your answer."}
                                </p>
                            </motion.div>
                        )}
                        
                        {nextQuestionError && (
                            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
                                <span>{nextQuestionError}</span>
                                <button onClick={() => setNextQuestionError('')} className="font-bold underline text-rose-800">Dismiss</button>
                            </div>
                        )}

                        {(() => {
                            const canGoNext = Boolean(feedback || (currentQuestionType === 'coding' && hasSubmittedCoding));
                            return (
                                <button 
                                    disabled={loading || !canGoNext} 
                                    onClick={fetchNextQuestion}
                                    className={`w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 text-sm transition-all ${
                                        loading 
                                        ? 'bg-amber-50 text-amber-900 border border-amber-200 cursor-wait'
                                        : canGoNext 
                                        ? 'secondary-action' 
                                        : 'bg-white text-slate-400 cursor-not-allowed border border-stone-200'
                                    }`}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#8a5d2f]" /> : <BarChart3 className="w-4 h-4" />}
                                    {loading ? "Fetching Next Question..." : "Next Question"}
                                </button>
                            );
                        })()}

                        <button 
                            disabled={!interviewStarted}
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 border text-sm transition-all ${
                                !interviewStarted ? 'opacity-30 cursor-not-allowed text-slate-400 border-stone-200 bg-white' :
                                isRecording 
                                ? 'secondary-action border-amber-200 bg-amber-50 text-amber-900' 
                                : 'primary-action'
                            }`}
                        >
                            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            {isRecording ? "Stop Recording" : "Start Answering"}
                        </button>

                        <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className="w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 secondary-action text-sm transition-all"
                        >
                            {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
                            {isMuted ? "Unmute Microphone" : "Mute Microphone"}
                        </button>

                        <button 
                            onClick={() => setCompleted(true)}
                            className="w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 danger-action text-sm transition-all"
                        >
                            <PhoneOff className="w-4 h-4" />
                            End Interview
                        </button>
                    </div>

                    <div className="p-3.5 flex items-center justify-center gap-4 text-slate-600 border border-stone-200 rounded-2xl bg-white">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#16324f]" />
                            <span className="text-xs font-semibold">Duration: <span className="text-slate-900 font-extrabold">{formatTime(sessionTime)}</span></span>
                        </div>
                    </div>
                </aside>
            </main>

            {/* ANSWER EVALUATION RESULT MODAL & EXPLAINABLE ML PANELS */}
            <AnimatePresence>
                {feedback && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed inset-x-4 bottom-6 md:bottom-10 lg:bottom-12 md:left-1/2 md:-translate-x-1/2 z-50 w-auto md:w-[750px] max-h-[85vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="surface-card p-6 md:p-8 bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl">
                            {/* Score Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-cyan-300 text-2xl font-extrabold font-mono">
                                        {feedback.score}
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">ML-RAG Evaluation Score</div>
                                        <div className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                                            {feedback.answer_quality === "weak" ? "Needs Attention" : feedback.answer_quality === "average" ? "Good Effort" : "Outstanding Answer!"}
                                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                {feedback.scoring_version || 'v2.0-ml-rag'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <button 
                                        onClick={() => setShowDemoModal(true)}
                                        className="px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                                        Explain Pipeline (Demo)
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setFeedback(null);
                                            setRetryCount(prev => prev + 1);
                                        }} 
                                        className="secondary-action py-2 px-3 text-xs rounded-xl"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Retry
                                    </button>
                                    <button onClick={fetchNextQuestion} className="primary-action py-2 px-4 text-xs rounded-xl font-bold">
                                        Next Question
                                    </button>
                                </div>
                            </div>

                            {/* Sub-scores Grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6 text-center">
                                {[
                                    { label: 'Overall', value: feedback.score },
                                    { label: 'Tech Acc.', value: feedback.technical_accuracy_score },
                                    { label: 'Relevance', value: feedback.relevance_score },
                                    { label: 'Completeness', value: feedback.depth_score },
                                    { label: 'Clarity', value: feedback.clarity_score },
                                    { label: 'Confidence', value: feedback.confidence_score }
                                ].map((sub, i) => (
                                    <div key={i} className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                                        <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider truncate">{sub.label}</div>
                                        <div className="text-sm font-extrabold text-cyan-300 font-mono mt-0.5">{sub.value || 0}%</div>
                                    </div>
                                ))}
                            </div>

                            {/* Feedback Summary Box */}
                            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 mb-4">
                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                                    Evaluation Summary
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    {feedback.feedback}
                                </p>
                            </div>

                            {/* 1. RAG Evidence Traceability Diagram */}
                            <EvidenceAlignmentVisualization evaluation={feedback} answerText={spokenAnswerText} />

                            {/* 2. Explainable ML Evaluation Section */}
                            <ExplainableMLEvaluation evaluation={feedback} />

                            {/* 3. Knowledge Evidence Panel */}
                            <RAGEvidencePanel evidenceDetails={feedback.evidence_details} topic={questionMeta.topic} />

                            {/* Standard Model Answer Reference */}
                            {feedback.suggested_answer && (
                                <div className="mt-4 p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <BookOpen className="w-3.5 h-3.5" /> Standard Domain Answer Reference
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed italic">
                                        "{feedback.suggested_answer}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DEMO MODE PIPELINE MODAL */}
            <DemoPipelineModal
                isOpen={showDemoModal}
                onClose={() => setShowDemoModal(false)}
                currentEvaluation={feedback}
                questionText={question}
            />
        </div>
    );
};

export default InterviewPage;
