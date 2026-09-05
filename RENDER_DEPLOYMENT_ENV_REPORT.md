# Render Deployment Audit & Configuration Report
**Project Name**: CareerPilot AI (formerly AI Mock Interviewer)  
**Target Platform**: Render (Web Service + Static Site)  
**Audit Date**: September 5, 2026  

---

## 1. PROJECT ARCHITECTURE

### Components Summary

- **Frontend Framework**: React 18 with Vite 7, TailwindCSS 3, Framer Motion, and Monaco Editor.
- **Backend Framework**: Python FastAPI served via Uvicorn (ASGI web server).
- **Frontend Directory**: `frontend/` (contains React application, components, pages, and Vite build configuration).
- **Backend Directory**: `backend/` (FastAPI application code, ML modules, RAG pipeline, database models, and API routers).
- **Backend Entry Point**: `backend/main.py` (Exposes FastAPI application instance `app`).
- **Frontend Build System**: Vite (`npm run build` executed in `frontend/`, producing static output in `frontend/dist/`).
- **Database**: Supabase PostgreSQL in production via SQLAlchemy ORM & `psycopg2-binary`, with fallback to local SQLite (`ai_interviewer.db`).
- **Authentication**: FastAPI backend implementation using JWT access tokens (in-memory) and httpOnly refresh cookies (`pyjwt` & `passlib` with Bcrypt password hashing).  
  *Note on `auth-server/`*: The codebase contains a legacy Node.js Express/MongoDB server in `auth-server/`. However, the active React application uses FastAPI backend endpoints (`/api/auth/*`) directly.
- **External APIs & Services**:
  - **Google Gemini API**: Dynamic question generation, qualitative answer evaluation, and career intelligence.
  - **Supabase Storage**: Private `resumes` bucket for PDF candidate resume hosting (`resumes/{user_id}/{unique_id}.pdf`).
  - **Razorpay Orders & Webhooks API**: Payment processing, HMAC SHA256 verification, and webhook event processing.
  - **GitHub REST API**: Aggregation of candidate GitHub repositories, contributions, and stats.
  - **Piston Runner API** (`https://emkc.org/api/v2/piston/execute`): Live multi-language code execution.
  - **OpenAI Whisper ASR / SpaCy**: Audio answer transcription and NLP keyword extraction.

---

### Service Deployment Architecture on Render

To deploy this project on Render, you must create **TWO separate services**:

1. **Render Web Service (Backend API)**:
   - Hosts the Python FastAPI backend.
   - Handles database connections, machine learning models, RAG vector search, auth, and external integrations.
2. **Render Static Site (Frontend UI)**:
   - Hosts the compiled React single-page application (`dist/` directory).
   - Communicates with the Backend Render Web Service over HTTP/HTTPS.

---

## 2. BACKEND ENVIRONMENT VARIABLES

The table below lists **EVERY** environment variable read by the Python backend code across all modules:

| Variable | File / Location Used | Required? | Purpose | Render Service |
| :--- | :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | `backend/modules/answer_evaluator.py`, `backend/modules/question_generator.py`, `backend/modules/career_intelligence.py` | **Yes** | Authenticates Google Gemini API for answer evaluation, question generation, and career readiness recommendations. | Backend Web Service |
| `DATABASE_URL` | `backend/database.py` | **Yes** | Primary PostgreSQL connection string (e.g. Supabase Postgres) for database persistence. | Backend Web Service |
| `MIGRATION_DATABASE_URL` | `backend/database.py` | **No** | Secondary connection URL fallback in `database.py` if `DATABASE_URL` is not defined. | Backend Web Service |
| `SUPABASE_URL` | `backend/main.py` | **Yes** | HTTPS URL of your Supabase project used for cloud resume uploads. | Backend Web Service |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/main.py` | **Yes** | Service role secret key used to upload files directly to private Supabase Storage `resumes` bucket. | Backend Web Service |
| `RAZORPAY_KEY_ID` | `backend/services/payment_service.py` | **Yes** | Razorpay Key ID used for order creation and sending to client payment checkout. | Backend Web Service |
| `RAZORPAY_KEY_SECRET` | `backend/services/payment_service.py` | **Yes** | Razorpay Key Secret used for server-side HMAC SHA256 payment signature verification. | Backend Web Service |
| `RAZORPAY_WEBHOOK_SECRET` | `backend/services/payment_service.py` | **Yes** | Secret key to verify incoming Razorpay webhook signature header (`X-Razorpay-Signature`). | Backend Web Service |
| `GITHUB_TOKEN` | `backend/services/coding_profile_service.py` | **No** | Optional GitHub Personal Access Token to bypass GitHub REST API rate limits (60 req/hr). | Backend Web Service |
| `JWT_SECRET_KEY` | `backend/auth.py` | **Yes** | Secret key for signing JWT access tokens (falls back to hardcoded string if missing). | Backend Web Service |
| `JWT_REFRESH_SECRET_KEY` | `backend/auth.py` | **Yes** | Secret key for signing httpOnly JWT refresh tokens (falls back to hardcoded string if missing). | Backend Web Service |
| `RAG_ENABLED` | `backend/rag/config.py` | **No** | Set to `"true"` or `"false"` (default: `"true"`). Toggles RAG vector context search. | Backend Web Service |
| `RAG_EMBEDDING_MODEL` | `backend/rag/config.py` | **No** | HuggingFace model name for RAG embeddings (default: `sentence-transformers/all-MiniLM-L6-v2`). | Backend Web Service |
| `RAG_TOP_K` | `backend/rag/config.py` | **No** | Maximum vector context chunks to retrieve (default: `5`). | Backend Web Service |
| `RAG_SIMILARITY_THRESHOLD` | `backend/rag/config.py` | **No** | Minimum cosine similarity score threshold (default: `0.35`). | Backend Web Service |
| `RAG_CHUNK_SIZE` | `backend/rag/config.py` | **No** | Character chunk length for text splitting (default: `800`). | Backend Web Service |
| `RAG_CHUNK_OVERLAP` | `backend/rag/config.py` | **No** | Character overlap between chunks (default: `120`). | Backend Web Service |
| `RAG_STORAGE_DIR` | `backend/rag/config.py` | **No** | Custom path for FAISS index storage directory. | Backend Web Service |
| `RAG_INDEX_PATH` | `backend/rag/config.py` | **No** | Path to FAISS index binary file. | Backend Web Service |
| `RAG_METADATA_PATH` | `backend/rag/config.py` | **No** | Path to FAISS metadata JSON store. | Backend Web Service |
| `KNOWLEDGE_BASE_DIR` | `backend/rag/config.py` | **No** | Path to directory containing source domain markdown/text documents. | Backend Web Service |
| `PORT` | Render Runtime / `backend/main.py` | **Yes** | Automatically injected by Render. Used by Uvicorn to bind the backend server port. | Backend Web Service |

---

## 3. FRONTEND ENVIRONMENT VARIABLES

The table below lists **EVERY** environment variable read by the React frontend code:

| Variable | File / Location Used | Required? | Purpose | Render Service |
| :--- | :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | `frontend/src/InterviewPage.jsx`, `frontend/src/pages/ATSFixItPage.jsx`, `frontend/src/ATSCheckerSection.jsx`, `frontend/src/components/interview/CodingRoundCard.jsx` | **Yes** | Base URL of the deployed FastAPI backend on Render (e.g. `https://careerpilot-backend.onrender.com`). | Frontend Static Site |
| `VITE_AUTH_API_BASE_URL` | `frontend/src/services/authApi.js` | **Yes** | Base URL for FastAPI authentication API routes (`/api/auth/*`). | Frontend Static Site |

### Exposure Security Analysis
- In Vite applications, environment variables prefixed with `VITE_` are statically replaced into browser bundle JavaScript during `npm run build`.
- `VITE_API_BASE_URL` and `VITE_AUTH_API_BASE_URL` only contain public backend domain URLs and are **safe** for public exposure.
- **NEVER** prefix private secrets (API keys, database URLs, webhook secrets) with `VITE_`.

---

## 4. ENVIRONMENT VARIABLES THAT MUST NEVER BE IN FRONTEND

The following secrets **MUST REMAIN EXCLUSIVELY ON THE BACKEND** and must never be exposed to the client or placed in frontend configuration:

1. `RAZORPAY_KEY_SECRET`
2. `RAZORPAY_WEBHOOK_SECRET`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `GEMINI_API_KEY`
5. `GITHUB_TOKEN`
6. `DATABASE_URL` / `MIGRATION_DATABASE_URL`
7. `JWT_SECRET_KEY`
8. `JWT_REFRESH_SECRET_KEY`

---

## 5. RAZORPAY CONFIGURATION

### Integration Workflow
- **Order Creation Endpoint**: `POST /api/payments/create-order`
  - Client sends `{ plan_id: "pro" | "advanced" }`.
  - Server maintains strict pricing authority (`plan_service.py`):
    - `free`: ₹0
    - `pro`: ₹19 (1,900 paise)
    - `advanced`: ₹99 (9,900 paise)
  - Backend creates a formal order via Razorpay API (`razorpay_client.order.create`).
- **Payment Verification Endpoint**: `POST /api/payments/verify`
  - Accepts `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
  - Computes HMAC SHA256 signature over `${razorpay_order_id}|${razorpay_payment_id}` using `RAZORPAY_KEY_SECRET`.
  - Grants plan entitlement in database (`app.user_entitlements` / `PaymentOrder`).
- **Webhook Endpoint**: `POST /api/webhooks/razorpay`
  - Reads raw request body and verifies `X-Razorpay-Signature` using `RAZORPAY_WEBHOOK_SECRET`.
  - Processes `payment.captured` & `order.paid` events idempotently.
- **Environment Variables**:
  - `RAZORPAY_KEY_ID`: Sent to frontend Razorpay SDK to open payment checkout modal.
  - `RAZORPAY_KEY_SECRET`: Used exclusively on backend for HMAC SHA256 signature verification.
  - `RAZORPAY_WEBHOOK_SECRET`: Used exclusively on backend for webhook header verification.
- **Test Mode Status**:
  - The repository is configured for Razorpay **Test Mode** (`rzp_test_...`).
- **Fallback / Mock Logic**:
  - If Razorpay API credentials are invalid or missing, `payment_service.py` generates a fallback mock order ID (`order_mock_...`). However, for production deployment, real Razorpay Test/Live keys must be configured in Render environment variables.

---

## 6. DATABASE CONFIGURATION

- **Database Engine**: PostgreSQL (Production) / SQLite (`ai_interviewer.db` local fallback).
- **ORM / Driver**: SQLAlchemy ORM + `psycopg2-binary`.
- **Database Variables**:
  - `DATABASE_URL`: Primary PostgreSQL connection string.
  - `MIGRATION_DATABASE_URL`: Secondary connection string checked as fallback in `backend/database.py`.
- **Migrations & Initialization**:
  - `backend/main.py` executes `Base.metadata.create_all(bind=engine)` at backend startup to auto-create missing tables.
- **SQLite Warning for Production**:
  - **CRITICAL**: SQLite (`ai_interviewer.db`) MUST NOT be used on Render! Render Web Services use ephemeral disks. Any SQLite database file written locally will be deleted every time the service restarts, deploys, or sleeps.
  - You **must** provide a external PostgreSQL connection string (`DATABASE_URL`) from Supabase Postgres or Render PostgreSQL.

---

## 7. RENDER BACKEND CONFIGURATION

Based on actual repository code:

- **Service Type**: Web Service
- **Environment**: Python 3
- **Root Directory**: `.` (leave empty or set to repository root)
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  uvicorn backend.main:app --host 0.0.0.0 --port $PORT
  ```
- **Python Version**: Python 3.10+ (Specify `PYTHON_VERSION` = `3.10.12` or `3.11.8` in Render Environment).

---

## 8. RENDER FRONTEND CONFIGURATION

Based on actual repository code:

- **Service Type**: Static Site
- **Root Directory**: `frontend`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Publish Directory**: `dist`
- **Frontend Environment Variables (Build-Time)**:
  - `VITE_API_BASE_URL`: `https://<YOUR-RENDER-BACKEND-NAME>.onrender.com`
  - `VITE_AUTH_API_BASE_URL`: `https://<YOUR-RENDER-BACKEND-NAME>.onrender.com`

---

## 9. LOCAL .ENV → RENDER MAPPING

| Local `.env` Variable | Value Source / Placeholder | Used By | Destination on Render |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | `<YOUR_GEMINI_API_KEY>` | Backend (Gemini API) | Backend Web Service Env |
| `DATABASE_URL` | `<YOUR_SUPABASE_POSTGRES_URL>` | Backend (SQLAlchemy) | Backend Web Service Env |
| `SUPABASE_URL` | `<YOUR_SUPABASE_PROJECT_URL>` | Backend (Supabase Client) | Backend Web Service Env |
| `SUPABASE_SERVICE_ROLE_KEY` | `<YOUR_SUPABASE_SERVICE_ROLE_SECRET>`| Backend (Supabase Storage) | Backend Web Service Env |
| `RAZORPAY_KEY_ID` | `<YOUR_RAZORPAY_KEY_ID>` | Backend & Payment API | Backend Web Service Env |
| `RAZORPAY_KEY_SECRET` | `<YOUR_RAZORPAY_KEY_SECRET>` | Backend (HMAC Signature) | Backend Web Service Env |
| `RAZORPAY_WEBHOOK_SECRET` | `<YOUR_RAZORPAY_WEBHOOK_SECRET>`| Backend (Webhook Verification)| Backend Web Service Env |
| `GITHUB_TOKEN` | `<YOUR_GITHUB_ACCESS_TOKEN>` | Backend (GitHub API) | Backend Web Service Env |
| `JWT_SECRET_KEY` | `<YOUR_RANDOM_JWT_SECRET>` | Backend (Access Token) | Backend Web Service Env |
| `JWT_REFRESH_SECRET_KEY` | `<YOUR_RANDOM_REFRESH_SECRET>` | Backend (Refresh Cookie) | Backend Web Service Env |
| `VITE_API_BASE_URL` | `https://<BACKEND-NAME>.onrender.com` | Frontend (React HTTP Fetch)| Frontend Static Site Env |
| `VITE_AUTH_API_BASE_URL` | `https://<BACKEND-NAME>.onrender.com` | Frontend (Auth HTTP Fetch) | Frontend Static Site Env |

---

## 10. DEPLOYMENT ORDER

1. **Step 1: Database Setup**:
   - Obtain external PostgreSQL connection string (`DATABASE_URL`) from Supabase or Render Postgres.
2. **Step 2: Deploy Backend Web Service**:
   - Create Render Web Service connected to your GitHub repository.
   - Set Build Command: `pip install -r requirements.txt`.
   - Set Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.
3. **Step 3: Configure Backend Environment Variables**:
   - Add `DATABASE_URL`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY`.
4. **Step 4: Verify Backend Health**:
   - Confirm backend deployment succeeds and responds at `https://<backend-name>.onrender.com/` and `/docs`.
5. **Step 5: Deploy Frontend Static Site**:
   - Create Render Static Site with Root Directory `frontend`, Build Command `npm install && npm run build`, Publish Directory `dist`.
6. **Step 6: Configure Frontend Environment Variables**:
   - Set `VITE_API_BASE_URL` and `VITE_AUTH_API_BASE_URL` to `https://<backend-name>.onrender.com`. Trigger frontend rebuild.
7. **Step 7: Configure CORS & Cookies**:
   - Ensure backend allowed CORS origins accept the deployed frontend URL.
8. **Step 8: Configure Razorpay Webhook**:
   - Set Razorpay webhook URL to `https://<backend-name>.onrender.com/api/webhooks/razorpay` with secret `RAZORPAY_WEBHOOK_SECRET`.
9. **Step 9: End-to-End Testing**:
   - Test sign-up/login, resume upload, interview generation, and payment flow.

---

## 11. POSSIBLE DEPLOYMENT PROBLEMS

### 1. Hardcoded CORS Origins in Backend
- **Problem**: In `backend/main.py` lines 152–157, `origins` array only includes `http://localhost:5173`, `http://localhost:5174`, `http://127.0.0.1:5173`, `http://127.0.0.1:5174`.
- **Why**: Browser requests from the deployed Render frontend URL (`https://<frontend-name>.onrender.com`) will be blocked by CORS error.
- **Recommended Fix**: Add production frontend Render URL to `origins` list or read allowed origins from environment variable `ALLOWED_ORIGINS`.

### 2. Hardcoded Uvicorn Host in `main.py`
- **Problem**: `backend/main.py` line 754 contains `uvicorn.run(app, host="127.0.0.1", port=8000)`.
- **Why**: `127.0.0.1` binds only to loopback interface inside Render container, preventing external traffic from reaching FastAPI.
- **Recommended Fix**: Use Render start command CLI parameter: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.

### 3. Vite Build-Time Environment Variable Mismatch
- **Problem**: Components like `ATSFixItPage.jsx` and `ATSCheckerSection.jsx` fallback to `http://127.0.0.1:8000` if `VITE_API_BASE_URL` is empty.
- **Why**: Vite bakes environment variables into production assets at build time. If `VITE_API_BASE_URL` is missing during `npm run build`, production API calls will attempt to connect to `http://127.0.0.1:8000` on the candidate's local machine.
- **Recommended Fix**: Ensure `VITE_API_BASE_URL` is set in Render Static Site settings BEFORE triggering build.

### 4. SQLite Ephemeral Disk Data Loss
- **Problem**: `backend/database.py` falls back to `sqlite:///./ai_interviewer.db`.
- **Why**: Render Web Services run on ephemeral containers. Local SQLite databases are destroyed whenever the instance restarts or redeploys.
- **Recommended Fix**: Always provide a valid PostgreSQL `DATABASE_URL`.

### 5. Cross-Site HTTP-Only Cookie SameSite Settings
- **Problem**: In `backend/main.py` lines 245 & 277, `response.set_cookie` sets `secure=False` and `samesite="lax"`.
- **Why**: Cross-domain requests between frontend (`https://frontend.onrender.com`) and backend (`https://backend.onrender.com`) require `samesite="none"` and `secure=True` for browser cookie acceptance.
- **Recommended Fix**: Update cookie attributes to `secure=True` and `samesite="none"` when running in production environment (`NODE_ENV=production` or `ENVIRONMENT=production`).

### 6. Large Machine Learning & PyTorch Dependencies
- **Problem**: `requirements.txt` includes `torch`, `transformers`, `sentence-transformers`, `faiss-cpu`, `spacy`, `opencv-python`, `openai-whisper`.
- **Why**: Heavy ML packages increase container memory usage and may exceed free tier Render RAM limits (512MB RAM).
- **Recommended Fix**: Allocate adequate RAM on Render Web Service (Standard or Starter plan recommended).

### 7. Local Audio & Temp Disk Directories
- **Problem**: `backend/main.py` mounts local directories `BASE_DIR / "data" / "audio_questions"` and `BASE_DIR / "data" / "recordings"`.
- **Why**: Disk storage is ephemeral. Temporary audio files are correctly cleaned up after transcription, but persistent directories must be initialized gracefully on startup.
- **Recommended Fix**: Preserve `os.makedirs(..., exist_ok=True)` in `main.py` before mounting `StaticFiles`.

---

## 12. FINAL CHECKLIST

### BACKEND
- [ ] Render Web Service created with root directory `.`
- [ ] Build Command set to `pip install -r requirements.txt`
- [ ] Start Command set to `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- [ ] `GEMINI_API_KEY` configured
- [ ] `DATABASE_URL` PostgreSQL string configured
- [ ] `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] `JWT_SECRET_KEY` & `JWT_REFRESH_SECRET_KEY` set to strong random strings

### FRONTEND
- [ ] Render Static Site created with root directory `frontend`
- [ ] Build Command set to `npm install && npm run build`
- [ ] Publish Directory set to `dist`
- [ ] `VITE_API_BASE_URL` set to `https://<backend-name>.onrender.com`
- [ ] `VITE_AUTH_API_BASE_URL` set to `https://<backend-name>.onrender.com`

### DATABASE
- [ ] PostgreSQL database provisioned (Supabase / Render Postgres)
- [ ] `DATABASE_URL` environment variable verified
- [ ] Production schema auto-initialized on first backend launch

### RAZORPAY
- [ ] `RAZORPAY_KEY_ID` configured
- [ ] `RAZORPAY_KEY_SECRET` configured on backend
- [ ] `RAZORPAY_WEBHOOK_SECRET` configured on backend
- [ ] Webhook URL `https://<backend-name>.onrender.com/api/webhooks/razorpay` configured in Razorpay dashboard

### SECURITY
- [ ] Zero secret keys (`*_SECRET`, `SERVICE_ROLE_KEY`) exposed in frontend
- [ ] CORS origins updated in `backend/main.py` to allow production frontend domain
- [ ] HTTP-only cookie security flags (`secure=True`, `samesite="none"`) configured for cross-origin HTTPS deployment

---

## WHAT I NEED TO ENTER IN RENDER

### A. Backend Environment Variables (Web Service)
Enter these under **Environment Variables** in your Render Backend Web Service:

```env
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
DATABASE_URL=<YOUR_POSTGRESQL_CONNECTION_STRING>
SUPABASE_URL=<YOUR_SUPABASE_PROJECT_URL>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
RAZORPAY_KEY_ID=<YOUR_RAZORPAY_KEY_ID>
RAZORPAY_KEY_SECRET=<YOUR_RAZORPAY_KEY_SECRET>
RAZORPAY_WEBHOOK_SECRET=<YOUR_RAZORPAY_WEBHOOK_SECRET>
GITHUB_TOKEN=<YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>
JWT_SECRET_KEY=<YOUR_RANDOM_LONG_SECRET_KEY>
JWT_REFRESH_SECRET_KEY=<YOUR_RANDOM_LONG_REFRESH_KEY>
PYTHON_VERSION=3.10.12
```

---

### B. Frontend Environment Variables (Static Site)
Enter these under **Environment Variables** in your Render Frontend Static Site:

```env
VITE_API_BASE_URL=https://<YOUR-BACKEND-SERVICE-NAME>.onrender.com
VITE_AUTH_API_BASE_URL=https://<YOUR-BACKEND-SERVICE-NAME>.onrender.com
```

---

### C. Backend Build / Start Configuration (Render Web Service)
- **Name**: `careerpilot-backend` (or your choice)
- **Environment**: `Python 3`
- **Region**: Select nearest region (e.g., `Singapore` or `Oregon`)
- **Branch**: `main`
- **Root Directory**: `.`
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  uvicorn backend.main:app --host 0.0.0.0 --port $PORT
  ```

---

### D. Frontend Build Configuration (Render Static Site)
- **Name**: `careerpilot-frontend` (or your choice)
- **Branch**: `main`
- **Root Directory**: `frontend`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Publish Directory**: `dist`

---

### E. Things You Must Configure After Deployment
1. **Update Backend CORS**: Update `origins` in `backend/main.py` to allow `https://<YOUR-FRONTEND-NAME>.onrender.com`.
2. **Setup Razorpay Webhook**: Add `https://<YOUR-BACKEND-NAME>.onrender.com/api/webhooks/razorpay` in your Razorpay Dashboard under **Settings -> Webhooks**.
3. **Verify Database Connection**: Ensure Supabase PostgreSQL allows connection requests from Render IP addresses.
4. **Trigger Frontend Rebuild**: Rebuild the frontend after setting `VITE_API_BASE_URL` so build-time static replacement takes effect.
