# 🚀 AI Interviewer & ATS Optimization Platform

An end-to-end, full-stack AI-powered ecosystem designed to empower job seekers through **intelligent resume parsing, interactive ATS score optimization, competitive coding profile tracking, and real-time AI-simulated interviews** featuring computer vision, automatic speech recognition (ASR), and natural language processing (NLP).

---

## 🌟 Key Features

### 📄 1. ATS Resume Analyzer & Live "Fix-It" Editor
- **Multi-Format Extraction**: Parses PDF and text resumes using `pdfplumber` and `spacy` to extract skills, work history, and keywords.
- **ATS Scoring Engine**: Evaluates keyword density, formatting compliance, contact info completeness, and role relevance against custom job descriptions.
- **Interactive Fix-It Editor**: Live side-by-side markdown/text editor with real-time heuristic re-scoring, instant keyword suggestions, and missing term detection.

### 🎤 2. AI-Powered Mock Interview Engine
- **CV-Driven Question Generation**: Dynamically crafts tailored technical, behavioral, and architectural questions based on extracted resume skills.
- **Voice Synthesis & Recognition**: Spoken interviewer prompts via Text-to-Speech (PyTTSX3) and seamless candidate audio answer transcription powered by OpenAI Whisper / Faster-Whisper.
- **Adaptive Difficulty Engine**: Pivots to fundamental conceptual questions if scores drop, or escalates to advanced follow-ups when candidates excel.

### 💻 3. Live Coding Sandbox & Adaptive Technical Round
- **Monaco Code Editor**: Integrated multi-language code editor in the interview interface for live technical problem solving.
- **Live Code Execution**: Secure execution of candidate code submissions via the Piston API runner with stdout/stderr reporting.

### 🏆 4. Competitive Coding Profile Dashboard
- **Unified Analytics**: Multi-platform aggregator for **LeetCode**, **CodeChef**, and **GeeksforGeeks**.
- **Metrics Tracked**: Total problems solved (Easy, Medium, Hard breakdown), global rank, contest ratings, badges, and candidate technical competency index.

### 📊 5. Deep Multi-Dimensional Feedback & Analytics
- **6 Evaluation Dimensions**: Overall Score, Relevance, Technical Accuracy, Depth, Clarity, and Confidence.
- **Qualitative Insights**: Pinpoints strengths, actionable weaknesses, missing domain terms, and model reference answers powered by Google Gemini API.

### 🔐 6. Authentication & Session Management
- **Secure JWT Auth**: Access tokens stored in-memory with HTTP-only refresh token cookies.
- **Password Protection**: Encrypted password storage using `Bcrypt` and `Passlib`.
- **OTP Verification Flow**: Modular Express/Node.js auth microservice support for OTP verification and password reset workflows.

---

## 🧠 Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion, Monaco Editor (`@monaco-editor/react`), Lucide Icons, Axios |
| **Backend API** | Python 3.10+, FastAPI, Uvicorn (ASGI), Pydantic, SQLAlchemy ORM, Alembic Migrations |
| **Auth Microservice** | Node.js, Express, MongoDB/Mongoose (Optional Auth Server) |
| **AI / NLP Models** | Google Gemini API (`gemini-1.5-flash`), OpenAI Whisper / Faster-Whisper, SpaCy NLP, PyTTSX3 |
| **Database** | SQLite (Default for local dev `ai_interviewer.db`), PostgreSQL compatible |
| **Utilities & Runners** | PDFPlumber, OpenCV, Piston API Execution Engine, Docker Compose |

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
      ┌───────────────────┬─────────────┼─────────────┬──────────────────┐
      ▼                   ▼             ▼             ▼                  ▼
┌───────────┐     ┌──────────────┐ ┌─────────┐ ┌─────────────┐   ┌────────────────┐
│ PDFPlumber│     │ OpenAI       │ │ PyTTSX3 │ │ SQLAlchemy  │   │  Google Gemini │
│ & SpaCy   │     │ Whisper ASR  │ │ TTS     │ │ SQLite DB   │   │  Evaluation    │
└───────────┘     └──────────────┘ └─────────┘ └─────────────┘   └────────────────┘
```

---

## 📁 Repository Structure

```
AI-Interviewer/
├── backend/                  # FastAPI Python backend
│   ├── alembic/              # Database migration scripts
│   ├── modules/              # Core modules (ATS, Resume Parser, Evaluator, Audio)
│   │   ├── answer_evaluator.py
│   │   ├── ats_checker.py
│   │   ├── interview_manager.py
│   │   ├── question_generator.py
│   │   ├── resume_parser.py
│   │   ├── skill_extractor.py
│   │   ├── speech_to_text.py
│   │   └── text_to_speech.py
│   ├── routers/              # API route definitions (coding_profile, auth, etc.)
│   ├── services/             # External integration services (LeetCode, GFG APIs)
│   ├── database.py           # SQLAlchemy database setup
│   ├── models.py             # User & Session database models
│   └── main.py               # FastAPI entry point
├── frontend/                 # React + Vite frontend application
│   ├── public/               # Static web assets
│   ├── src/
│   │   ├── components/       # UI components (ATS, Auth, Coding cards, Layout)
│   │   ├── context/          # React Context (AuthContext)
│   │   ├── pages/            # Page components (Dashboard, Interview, ATS, Profiles)
│   │   ├── services/         # API client & Voice services
│   │   ├── utils/            # Helper utilities & ATS heuristics
│   │   ├── App.jsx           # Main routing & state controller
│   │   └── main.jsx          # React app entry point
│   ├── package.json
│   └── vite.config.js        # Vite dev server & proxy settings
├── auth-server/              # Express/Node.js authentication service (Optional)
├── docker-compose.yml        # Docker setup for multi-container deployment
├── package.json              # Root script runner for frontend & backend
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
   Create a `.env` file in the root directory (or `backend/` directory):
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   SECRET_KEY=your_jwt_secret_key_here
   DATABASE_URL=sqlite:///./backend/ai_interviewer.db
   ```

4. **Start Backend Server**:
   ```bash
   python backend/main.py
   # Or using uvicorn directly:
   # uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
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

### 💡 Single Command Execution (Root `package.json`)
You can install and run all components directly from the repository root:

```bash
# Install all dependencies (Frontend, Backend, Auth)
npm run install-all

# Start Frontend
npm run dev

# Start Backend
npm run backend
```

---

### 🐳 Docker Setup (Optional)
To run the entire platform with Docker Compose:

```bash
docker-compose up --build
```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate user & return JWT tokens |
| `POST` | `/api/auth/refresh` | Silent refresh for access token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/upload-resume` | Parse PDF resume & return extracted skills & questions |
| `POST` | `/api/check-ats` | Analyze resume text against job description |
| `POST` | `/api/ats-recheck` | Fast heuristic re-check for live ATS editor |
| `POST` | `/api/start-interview` | Initialize a new mock interview session |
| `POST` | `/api/next-question` | Fetch next generated interview question |
| `POST` | `/api/submit-answer` | Submit text or audio response for evaluation |
| `POST` | `/api/execute-code` | Execute candidate code via Piston runner |
| `GET` | `/api/interview-report` | Generate comprehensive performance evaluation report |
| `GET` | `/api/coding-profile/{platform}/{username}` | Fetch stats for LeetCode, CodeChef, or GeeksforGeeks |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/AnuradhaKashaudhan/AI-Interviewer/issues).

---

## 📜 License

Distributed under the **ISC License**. See `LICENSE` for more information.
