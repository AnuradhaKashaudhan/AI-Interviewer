# 🚀 AI Interviewer & ATS Optimization Platform

An end-to-end, full-stack AI-powered ecosystem designed to empower job seekers through **intelligent resume parsing, Sentence-BERT semantic resume-job matching, interactive ATS score optimization, competitive coding profile tracking, cloud file storage, and real-time AI-simulated interviews** featuring computer vision, automatic speech recognition (ASR), and natural language processing (NLP).

---

## 🌟 Key Features

### 🧠 1. Sentence-BERT Semantic Resume–Job Matching Engine (ML v2.1)
- **Production Champion Model**: Powered by **Sentence-BERT (`all-MiniLM-L6-v2`) + Logistic Regression** trained on 37,740 resume–job pairs (`0xnbk/resume-domain-classifier-v1-en`).
- **Dense Feature Engineering**: Extracts 384-dimensional dense sentence embeddings and constructs engineered semantic features $[u; v; |u - v|; u \odot v; \text{cosine\_sim}]$.
- **Unbiased 70/15/15 Held-Out Evaluation**: Achieved **81.36% F1-Score** and **0.8756 ROC-AUC** on unbiased held-out test data with **~4.5ms CPU latency**.
- **Transparent Explainability**: Returns semantic similarity scores, skill term overlaps, and lexical N-gram contributions via `POST /api/ml/resume-job-match`.

### 📄 2. ATS Resume Analyzer & Cloud Resume Management
- **Supabase Storage Integration**: PDF resumes stream directly to private Supabase Storage (`resumes` bucket) with user-isolated UUID pathing (`resumes/{user_id}/{unique_id}.pdf`).
- **In-Memory Text Extraction**: Parses PDF and text resumes in-memory using `pdfplumber` and `spacy` to extract technical skills and domain keywords without retaining duplicate local disk files.
- **Normalized ATS Scoring Engine**: Evaluates scores using a 4-component weighted formula: $30\%$ ML Similarity + $30\%$ Skill Match + $20\%$ Keyword Coverage + $20\%$ Section Completeness.
- **Interactive Fix-It Editor**: Live side-by-side markdown/text editor with real-time heuristic re-scoring, instant keyword suggestions, and line-by-line metric feedback.

### 🎤 3. AI-Powered Mock Interview Engine
- **CV-Driven Question Generation**: Dynamically crafts tailored technical, behavioral, and architectural questions based on candidate resume skills and target role.
- **Voice Synthesis & Recognition**: Spoken interviewer prompts via Text-to-Speech (PyTTSX3) and seamless candidate audio answer transcription powered by OpenAI Whisper ASR.
- **Temporary Answer Audio Lifecycle**: Incoming audio streams are transcribed via Whisper and guaranteed to be deleted immediately post-processing (`try...finally` cleanup).
- **Browser-Only Webcam Video**: Recorded candidate video stays strictly in browser RAM (`MediaRecorder` + `URL.createObjectURL`), allowing post-session preview and local download without server storage.
- **Adaptive Difficulty Engine**: Pivots to fundamental conceptual questions if candidate scores drop, or escalates to advanced follow-ups when candidates excel.

### 💻 4. Live Coding Sandbox & Technical Round
- **Monaco Code Editor**: Integrated multi-language code editor in the interview interface for live technical problem solving.
- **Live Code Execution**: Secure execution of candidate code submissions via the Piston API runner with stdout/stderr reporting.

### 🏆 5. Competitive Coding Profile Dashboard
- **Unified Analytics**: Multi-platform aggregator for **LeetCode**, **CodeChef**, **GeeksforGeeks**, and **GitHub**.
- **Smart URL Normalization**: Automatically strips full profile URLs (e.g. `https://www.geeksforgeeks.org/profile/anuradhaka4050`) to extract clean usernames.
- **Metrics Tracked**: Total problems solved (Easy, Medium, Hard breakdown), global rank, contest ratings, badges, and candidate technical competency index.

### 📊 6. Deep Multi-Dimensional Feedback & Analytics
- **6 Evaluation Dimensions**: Overall Score, Relevance, Technical Accuracy, Depth, Clarity, and Confidence.
- **Qualitative Insights**: Pinpoints strengths, actionable weaknesses, missing domain terms, and model reference answers powered by Google Gemini API.

### 🔐 7. Supabase PostgreSQL Database Architecture
- **Production Database**: Running on **Supabase PostgreSQL** (`app` schema: `app.users`, `app.coding_profiles`, `app.sessions`, `app.questions`, `app.answers`, `app.evaluations`).
- **SQLite Fallback**: Local SQLite database (`ai_interviewer.db`) preserved for offline development and local rollback safety.
- **Secure JWT Auth**: Access tokens stored in-memory with HTTP-only refresh token cookies and Bcrypt password hashing.

---

## 🧠 Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion, Monaco Editor (`@monaco-editor/react`), Lucide Icons |
| **Backend API** | Python 3.10+, FastAPI, Uvicorn (ASGI), Pydantic, SQLAlchemy ORM, psycopg2 |
| **Machine Learning** | **Sentence-Transformers (`all-MiniLM-L6-v2`)**, Scikit-Learn, Joblib, PyTorch, SpaCy |
| **Cloud Storage & DB** | **Supabase Storage** (Private `resumes` bucket), **Supabase PostgreSQL** (`app` schema), SQLite (Fallback) |
| **AI / NLP Models** | Google Gemini API (`gemini-1.5-flash`), OpenAI Whisper ASR, SpaCy NLP, PyTTSX3 |
| **Utilities & Runners** | PDFPlumber, OpenCV, Piston API Execution Engine, Docker Compose |

---

## 📊 Machine Learning Model Benchmarks

Empirical performance on 5,661 unbiased held-out test samples (`0xnbk/resume-domain-classifier-v1-en`):

| Model Architecture | Accuracy | Precision | Recall | F1-Score | ROC-AUC | CPU Latency | Production Role |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Sentence-BERT (`all-MiniLM-L6-v2`)** | **0.8240** | **0.7742** | **0.8571** | **0.8136** | **0.8756** | **~4.5 ms** | **Production Champion (v2.1)** |
| **Hybrid Ensemble (TF-IDF + SBERT)** | 0.8120 | 0.7680 | 0.8420 | 0.8000 | 0.8641 | ~5.0 ms | Experimental |
| **TF-IDF + Logistic Regression (Baseline)** | 0.6711 | 0.6189 | 0.8920 | 0.7308 | 0.7470 | < 1 ms | Fallback Baseline |
| **TF-IDF + Linear SVM (5-Fold CV)** | 0.6422 | 0.6417 | 0.6458 | 0.6435 | 0.6918 | < 1 ms | Candidate Benchmark |
| **TF-IDF + Multinomial Naive Bayes** | 0.6274 | 0.6391 | 0.5858 | 0.6110 | 0.6667 | < 1 ms | Candidate Benchmark |
| **Fine-Tuned DistilBERT (Historical)** | 0.5000 | 0.5000 | 1.0000 | 0.6667 | 0.5400 | ~45 ms | *Deprecated* |

---

## 🏗️ System Architecture & Workflow

```
                        ┌───────────────────────────┐
                        │   Candidate / User UI     │
                        │   (React + Vite + Tailwind)│
                        └─────────────┬─────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
  ┌─────────────────┐       ┌──────────────────┐       ┌──────────────────┐
  │   ATS Checker   │       │  AI Interviewer  │       │  Coding Profiles │
  │  & Fix-It Editor│       │  & Audio/Speech  │       │ (LeetCode/GFG/CC)│
  └────────┬────────┘       └─────────┬────────┘       └─────────┬────────┘
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                      │ (HTTP / REST API)
                                      ▼
                        ┌───────────────────────────┐
                        │   FastAPI Backend Server  │
                        │      (Port 8000)          │
                        └─────────────┬─────────────┘
                                      │
     ┌─────────────────┬──────────────┼──────────────┬──────────────────┬─────────────────┐
     ▼                 ▼              ▼              ▼                  ▼                 ▼
┌───────────┐   ┌─────────────┐ ┌───────────┐ ┌─────────────┐   ┌────────────────┐ ┌─────────────┐
│ SBERT &   │   │ OpenAI      │ │ PyTTSX3   │ │ SQLAlchemy  │   │  Google Gemini │ │ Supabase    │
│ PDFPlumber│   │ Whisper ASR │ │ TTS       │ │ Postgres DB │   │  Evaluation    │ │ Storage     │
└───────────┘   └─────────────┘ └───────────┘ └─────────────┘   └────────────────┘ └─────────────┘
```

---

## 📁 Repository Structure

```
AI-Interviewer/
├── backend/                  # FastAPI Python backend
│   ├── ml/                   # Machine Learning pipeline
│   │   ├── dataset_loader.py # 70/15/15 dataset partitioning & pair extraction
│   │   ├── train_sbert.py    # Sentence-BERT all-MiniLM-L6-v2 training script
│   │   ├── train_baseline.py # TF-IDF baseline cross-validation script
│   │   ├── predictor.py      # Production singleton predictor & explainability engine
│   │   ├── evaluator.py      # Comparative multi-model evaluator script
│   │   └── models/           # Trained model artifacts (SBERT & TF-IDF)
│   ├── modules/              # Core business modules (ATS, Resume Parser, Evaluator, Speech)
│   │   ├── answer_evaluator.py
│   │   ├── ats_checker.py    # 4-component weighted ATS scoring engine
│   │   ├── interview_manager.py
│   │   ├── question_generator.py
│   │   ├── resume_parser.py
│   │   ├── skill_extractor.py
│   │   ├── speech_to_text.py
│   │   └── text_to_speech.py
│   ├── routers/              # API route definitions
│   ├── services/             # External integration services (LeetCode, GFG, Supabase)
│   ├── database.py           # SQLAlchemy database setup (PostgreSQL app schema + SQLite fallback)
│   ├── models.py             # User & Session database models
│   └── main.py               # FastAPI entry point
├── frontend/                 # React + Vite frontend application
│   ├── src/
│   │   ├── components/       # UI components (ATS, Auth, Coding cards, Layout)
│   │   ├── pages/            # Page components (Dashboard, Interview, ATS Fix-It, Profiles)
│   │   ├── services/         # API client & Voice services
│   │   └── utils/            # Helper utilities & ATS heuristics
│   ├── package.json
│   └── vite.config.js
├── tests/                    # Automated test suite
│   └── test_ml_pipeline.py   # Standalone ML & API unit tests
├── ML_README.md              # Detailed Machine Learning architecture documentation
├── ML_RESULTS.md             # Comparative ML benchmark report
├── ML_DATASET_REPORT.md      # Dataset integrity & statistics report
├── requirements.txt          # Python dependencies
└── README.md
```

---

## ⚙️ Installation & Setup

### 📋 Prerequisites
- **Python**: `v3.10+`
- **Node.js**: `v18.0+` & `npm`
- **Git**

---

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/AnuradhaKashaudhan/AI-Interviewer.git
cd AI-Interviewer
```

---

### 2️⃣ Backend Setup (FastAPI)

1. **Create and Activate Virtual Environment**:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   SECRET_KEY=your_jwt_secret_key_here
   GITHUB_TOKEN=your_github_personal_access_token
   SUPABASE_URL=https://your-supabase-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   DATABASE_URL=postgresql://postgres:password@db.your-supabase-project-ref.supabase.co:5432/postgres?options=-csearch_path%3Dapp,public
   ```

4. **Start Backend Server**:
   ```bash
   python backend/main.py
   ```
   The backend API will run on `http://localhost:8000`.

---

### 3️⃣ Frontend Setup (React + Vite)

1. **Navigate to Frontend & Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment Variables**:
   Create `.env.development` inside the `frontend/` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   VITE_AUTH_API_BASE_URL=http://localhost:8000
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application UI will run on `http://localhost:5173/`.

---

## 🧪 Machine Learning Training & Test Suite

### Run Machine Learning Unit Tests
```bash
python tests/test_ml_pipeline.py
```

### Retrain Sentence-BERT (`all-MiniLM-L6-v2`) Champion Model
```bash
python backend/ml/train_sbert.py
```

### Generate Comparative Benchmark Report (`ML_RESULTS.md`)
```bash
python backend/ml/evaluator.py
```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate user & return JWT tokens |
| `POST` | `/api/auth/refresh` | Silent refresh for access token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/upload-resume` | Upload PDF resume to Supabase Storage & extract skills |
| `POST` | `/api/check-ats` | Analyze resume text against job description |
| `POST` | `/api/ats-recheck` | Live heuristic re-check for live ATS editor |
| `POST` | `/api/ml/resume-job-match` | **Sentence-BERT ML domain matching prediction (`v2.1`)** |
| `POST` | `/api/start-interview` | Initialize a new mock interview session |
| `POST` | `/api/next-question` | Fetch next generated interview question |
| `POST` | `/api/submit-answer` | Submit text/audio response for Whisper transcription & Gemini evaluation |
| `POST` | `/api/execute-code` | Execute candidate code via Piston runner |
| `GET` | `/api/interview-report` | Generate dynamic performance evaluation report from PostgreSQL |
| `GET` | `/api/coding-profile/{platform}/{username}` | Fetch stats for LeetCode, CodeChef, GeeksforGeeks, or GitHub |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/AnuradhaKashaudhan/AI-Interviewer/issues).

---

## 📜 License

Distributed under the **ISC License**. See `LICENSE` for more information.
