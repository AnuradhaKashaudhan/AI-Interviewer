# 🚀 AI Interviewer & ATS Optimization Platform - Project Documentation

## 🌟 1. Project Overview
The **AI Interviewer & ATS Optimization Platform** is an end-to-end AI-powered ecosystem designed to help candidates prepare for job interviews. The platform combines advanced Artificial Intelligence (AI), Machine Learning (ML), Natural Language Processing (NLP), and Computer Vision to analyze resumes, improve ATS (Applicant Tracking System) scores, and simulate highly realistic interview experiences.

### Key Features:
- **Secure Authentication**: Safe registration and login with JWT access/refresh tokens and encrypted password storage.
- **ATS Resume Analyzer**: Parses resumes (PDF/Image) to calculate ATS scores and provide keyword optimization suggestions.
- **AI Mock Interview**: Conducts technical, behavioral, and mixed interviews dynamically generated based on the candidate's CV/Skills.
- **Live Interview + Recording**: Activates camera and microphone for a real-time interview simulation and records the session.
- **Performance Evaluation**: Provides rich feedback, including communication analysis, confidence scores, and technical accuracy.

---

## 🧠 2. Technology Stack
The platform leverages a modern, robust, and scalable tech stack:

### Frontend
- **React.js & Vite**: For a fast, responsive, and dynamic user interface.
- **TailwindCSS**: For modern, utility-first styling and layout.
- **Framer Motion**: For smooth and dynamic UI micro-animations.
- **Lucide React**: For scalable vector icons.
- **Monaco Editor**: For embedded code editing during technical questions.

### Backend
- **Python & FastAPI**: A high-performance web framework used for building the core APIs.
- **Uvicorn**: An ASGI web server implementation for FastAPI.
- **Python-Multipart**: For handling file uploads (e.g., CVs, audio).
- **SQLAlchemy & SQLite**: For ORM database mapping and persistent local storage.
- **PyJWT & Bcrypt**: For secure JWT-based authentication (access/refresh tokens) and password hashing.

### Artificial Intelligence & Machine Learning Models
- **Google Gemini API**: Uses `gemini-1.5-flash`, `gemini-pro`, and `gemini-1.5-pro` for deep, context-aware evaluation of candidate answers and generating personalized feedback.
- **OpenAI Whisper & Faster-Whisper**: State-of-the-art Automatic Speech Recognition (ASR) models for transcribing candidate audio to text.
- **Sentence-Transformers & SpaCy**: For Natural Language Processing tasks, text embeddings, and semantic similarity checking.
- **CTranslate2**: A fast inference engine for Transformer models used in conjunction with Whisper.
- **PyTTSX3**: For offline Text-to-Speech (TTS) capabilities, giving the AI interviewer a voice.

### Computer Vision (Frontend & Backend)
- **OpenCV**: Used for video stream processing and camera integrations.
- **MediaPipe Tasks Vision**: For real-time facial landmark detection and pose estimation directly in the browser.
- **TensorFlow COCO-SSD**: A pre-trained object detection model to monitor the interview environment (e.g., detecting if multiple people are in the frame).

### Utilities
- **PDFPlumber**: For robust extraction of text and skills from uploaded PDF resumes.

---

## ⚙️ 3. How It Works (System Workflow)

1. **Upload CV & Profile Setup**: 
   The user starts by uploading their resume. `pdfplumber` extracts the text, and NLP models (`spacy`) identify key technical skills (e.g., Python, React, Machine Learning).
   
2. **Dynamic Question Generation**: 
   The system's `question_generator.py` uses the extracted skills to pull relevant technical and behavioral questions. Questions are categorized by difficulty (easy, medium, hard) and feature adaptive follow-ups based on the candidate's responses.

3. **Live Interview Simulation**: 
   The platform activates the user's webcam and microphone (monitored by MediaPipe and COCO-SSD for proctoring). The AI asks questions using text-to-speech, and the candidate responds verbally.

4. **Speech-to-Text Conversion**: 
   The user's spoken answers are captured and converted into text using the `whisper` models.

5. **AI Evaluation (Gemini Integration)**:
   The transcribed answer is sent to the `answer_evaluator.py` module. The system constructs a rich prompt containing the candidate's resume, the current question, the answer, and the interview history. This is processed by the **Google Gemini** model.

6. **Feedback & Reporting**: 
   The candidate receives a comprehensive, structured JSON report detailing their performance on that specific question and the interview as a whole.

---

## 📊 4. Evaluation Metrics & Accuracy

The AI evaluator doesn't just provide a generic "good" or "bad" rating. Instead, it analyzes the candidate's answer across multiple dimensions, providing scores from **0 to 100**:

- **Overall Score**: The composite average of all sub-scores.
- **Relevance Score**: How accurately the candidate addressed the core of the question asked.
- **Technical Accuracy Score**: The factual correctness of the technical concepts mentioned.
- **Depth Score**: The level of detail, use of examples, and explanation depth.
- **Clarity Score**: The logical flow and ease of understanding of the spoken answer.
- **Confidence Score**: Measures assertiveness, penalizing excessive filler words or hesitation.

### Qualitative Feedback & Adaptation
Alongside numerical scores, the Gemini model generates:
- **Strengths**: Specific, positive callouts from the candidate's answer.
- **Weaknesses**: Specific gaps or areas of improvement.
- **Missing Keywords**: Important industry terminology that should have been used (e.g., "STAR method", "Garbage Collection").
- **Suggested Answer**: A concise, model answer for the candidate to learn from.
- **Adaptive Next Question**: If the candidate struggles (score < 50), the AI pivots to an easier fundamental question. If they excel (score >= 75), the AI asks a deeper, more complex follow-up.

### Fallback Mechanism
If the AI API is unavailable, the system intelligently falls back to a rule-based evaluation algorithm that estimates scores based on answer length, keyword usage (like "because", "example"), and basic semantic checks, ensuring the platform never breaks during a live interview.

---

## 💾 5. Data & Storage Management
The platform handles data generation, storage, and persistence using local file systems, secure sessions, and an SQL database:

### Authentication & Sessions
- **Secure Authentication**: User credentials and password hashes (encrypted via `bcrypt`) are stored in the database.
- **JWT tokens**: Access tokens are stored in-memory, while HTTP-only refresh cookies are used to securely manage silent token refreshing and user sessions.

### Resumes & Uploads
- **Temporary Storage**: Uploaded resumes (PDF/Images) are processed using `python-multipart` and stored temporarily on the server for text extraction via `pdfplumber`. After the data is parsed and skills are extracted, the raw files can be safely discarded or archived based on configuration.

### Video & Audio Recordings
- **Local File System**: During the live interview, OpenCV and WebRTC capture the video and audio streams. The recordings are compiled and saved locally (e.g., in `.mp4` or `.webm` formats) allowing candidates to download their interview sessions immediately after completion for personal review.
- **Audio Processing**: Temporary audio chunks are saved locally for transcription by the Whisper model and deleted post-transcription to optimize storage space.

### Persistent SQL Database
- **SQLAlchemy ORM**: Tracks schemas for Users, Interview Sessions, Questions, Answers, and Evaluations.
- **SQLite Database**: Stores database records in a local `ai_interviewer.db` file for easy development.
- **PostgreSQL Compatibility**: Easily configurable for production deployments using the `DATABASE_URL` environment variable.
