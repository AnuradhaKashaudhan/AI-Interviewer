import json
import urllib.request
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends, BackgroundTasks, Request, Response, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

from sqlalchemy.orm import Session
from sqlalchemy import func
import jwt


import uuid
from supabase import create_client, Client

# Import database
from database import engine, Base, get_db
from models import User

# Import auth
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    create_refresh_token, 
    get_current_user,
    normalize_email,
    REFRESH_SECRET_KEY,
    SECRET_KEY,
    ALGORITHM
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_supabase_client() -> Optional[Client]:
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL.startswith("http"):
        try:
            return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        except Exception as e:
            print(f"Error initializing Supabase client: {e}")
    return None

def get_optional_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id:
            return db.query(User).filter(User.id == user_id).first()
    except Exception:
        pass
    return None


# Create tables if they don't exist (useful since Docker/Alembic might not run)
Base.metadata.create_all(bind=engine)

# Import modules
from modules.resume_parser import extract_text_from_pdf, detect_coding_round_recommendation
from modules.skill_extractor import extract_skills
from modules.question_generator import generate_questions
from modules.answer_evaluator import evaluate_answer
from modules.interview_manager import start_interview, next_question, store_answer, generate_final_report
from modules.speech_to_text import transcribe_audio
from modules.text_to_speech import speak_question
from modules.ats_checker import check_ats_score
from modules.career_intelligence import analyze_candidate_career_intelligence, get_latest_candidate_recommendation

# Import services
from services.plan_service import get_all_plans, resolve_plan
from services.payment_service import create_order, verify_payment_signature, process_webhook_payload, get_user_payment_history
from services.entitlement_service import get_user_entitlements
from services.audit_service import get_user_audit_logs

# Import routers
from routers.coding_profile import router as coding_profile_router
from ml.predictor import get_predictor

BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="CareerPilot AI API", description="API for CareerPilot AI — AI Mock Interviewer & ATS Optimization Coach")

class SignupRequest(BaseModel):
    fullName: str
    email: str
    phoneNumber: Optional[str] = None
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AnswerRequest(BaseModel):
    session_id: str
    question: str
    answer: str

class StartInterviewRequest(BaseModel):
    skills: list[str]
    persona: Optional[str] = "friendly"
    role: Optional[str] = None
    resume_text: Optional[str] = None

class SessionRequest(BaseModel):
    session_id: str

class ATSRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None

class MLMatchRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None

class RunCodeRequest(BaseModel):
    code: str
    language: str
    question_id: Optional[str] = None

class SubmitCodeRequest(BaseModel):
    code: str
    language: str
    question_id: Optional[str] = None

class CreateOrderRequest(BaseModel):
    plan_id: Optional[str] = None
    plan: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class CareerAnalysisRequest(BaseModel):
    target_role: Optional[str] = None

# Allow CORS for main frontend
frontend_url = os.getenv("FRONTEND_URL", "https://careerpilot-frontend-ei74.onrender.com")

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://careerpilot-frontend-ei74.onrender.com",
    frontend_url
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
        
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(e)}"}
        )

# Mount static files to serve audio recordings and questions
os.makedirs(BASE_DIR / "data" / "audio_questions", exist_ok=True)
os.makedirs(BASE_DIR / "data" / "recordings", exist_ok=True)
app.mount("/data", StaticFiles(directory=BASE_DIR / "data"), name="data")

# Register routers
app.include_router(coding_profile_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the CareerPilot AI API"}

@app.get("/api/rag/health")
def rag_health():
    """Returns status and index stats for the RAG knowledge system."""
    try:
        from rag import get_rag_service
        rag_service = get_rag_service()
        return rag_service.health_check()
    except Exception as e:
        return {
            "enabled": False,
            "vector_store": "faiss",
            "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
            "index_loaded": False,
            "document_count": 0,
            "chunk_count": 0,
            "error": str(e)
        }

# --- Auth Endpoints ---

# --- Auth Endpoints ---

IS_PROD = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod") or "onrender.com" in os.getenv("RENDER_EXTERNAL_URL", "") or "onrender.com" in os.getenv("FRONTEND_URL", "https://careerpilot-frontend-ei74.onrender.com")
COOKIE_SECURE = IS_PROD
COOKIE_SAMESITE = "none" if IS_PROD else "lax"

@app.post("/api/auth/signup")
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    normalized_email = normalize_email(request.email)
    if not normalized_email:
        raise HTTPException(status_code=400, detail="A valid email is required.")
        
    try:
        existing_user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    except Exception as e:
        print(f"Database error during signup email check: {e}")
        raise HTTPException(status_code=500, detail="Unable to process request right now. Please try again.")

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account already exists with this email. Please sign in instead."
        )
    
    hashed_password = get_password_hash(request.password)
    new_user = User(
        email=normalized_email,
        fullName=request.fullName.strip() if request.fullName else "",
        hashed_password=hashed_password
    )
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        print(f"Database error during user creation: {e}")
        raise HTTPException(status_code=500, detail="Unable to create account right now. Please try again.")

    return {"message": "User created successfully"}

@app.post("/api/auth/login")
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    normalized_email = normalize_email(request.email)
    if not normalized_email or not request.password:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    try:
        user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    except Exception as e:
        print(f"Database error during login user query: {e}")
        raise HTTPException(
            status_code=500,
            detail="Unable to sign in right now. Please try again."
        )

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=7 * 24 * 60 * 60
    )
    
    return {"access_token": access_token, "user": {"id": user.id, "email": user.email, "fullName": user.fullName}}

@app.post("/api/auth/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    try:
        payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    try:
        user = db.query(User).filter(User.id == user_id).first()
    except Exception as e:
        print(f"Database error during refresh token query: {e}")
        raise HTTPException(status_code=500, detail="Database unavailable. Please try again.")

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=7 * 24 * 60 * 60
    )
    
    return {"access_token": access_token, "user": {"id": user.id, "email": user.email, "fullName": user.fullName}}

@app.get("/api/auth/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {"user": {"id": current_user.id, "email": current_user.email, "fullName": current_user.fullName}}

@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE
    )
    return {"message": "Successfully logged out"}


@app.post("/api/upload-resume")
def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    print(f"Received resume upload: {file.filename}")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    current_user = get_optional_current_user(request, db)
    user_id = current_user.id if current_user else "anonymous"
    
    try:
        content = file.file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # 1. Upload original PDF to private Supabase Storage 'resumes' bucket
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase Storage client is not configured.")
        
        unique_resume_id = uuid.uuid4().hex
        storage_path = f"{user_id}/{unique_resume_id}.pdf"
        
        try:
            supabase.storage.from_("resumes").upload(
                path=storage_path,
                file=content,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
            print(f"Successfully uploaded resume to Supabase Storage: resumes/{storage_path}")
        except Exception as upload_err:
            print(f"Supabase Storage upload failed: {str(upload_err)}")
            raise HTTPException(status_code=500, detail=f"Failed to upload resume to Supabase Storage: {str(upload_err)}")

        # 2. Extract text from in-memory PDF bytes
        text = extract_text_from_pdf(content)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")
            
        # 3. Extract skills & generate questions
        skills = extract_skills(text)
        questions = generate_questions(skills)
        coding_recommendation = detect_coding_round_recommendation(resume_text=text, role=None, skills=skills)
        
        return {
            "message": "Resume processed successfully",
            "extracted_skills": skills,
            "extracted_text": text,
            "generated_questions": questions,
            "coding_round_recommendation": coding_recommendation,
            "storage_path": f"resumes/{storage_path}"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in upload-resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@app.post("/api/evaluate-answer")
def analyze_answer(request: AnswerRequest, db: Session = Depends(get_db)):
    try:
        result = evaluate_answer(request.question, request.answer)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during evaluation: {str(e)}")

# --- Live Interview Endpoints (Protected) ---

@app.post("/api/start-interview")
def api_start_interview(request: StartInterviewRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        coding_recommendation = detect_coding_round_recommendation(
            resume_text=request.resume_text,
            role=request.role,
            skills=request.skills,
        )
        session_id, questions = start_interview(
            db=db,
            user_id=current_user.id,
            resume_skills=request.skills,
            persona=request.persona,
            role=request.role,
            resume_text=request.resume_text
        )
        if questions:
            first_q = questions[0]
            audio_path = speak_question(first_q)
            
            return {
                "session_id": session_id,
                "first_question": first_q, 
                "audio_path": audio_path,
                "total_questions": 5,
                "coding_round_enabled": coding_recommendation.get("enabled", False),
                "coding_round_note": coding_recommendation.get("reason", ""),
            }
        return {"message": "No questions generated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting interview: {str(e)}")

@app.post("/api/next-question")
def api_next_question(request: SessionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        question = next_question(db, request.session_id, current_user.id)
        if question:
            audio_path = speak_question(question)
            return {
                "question": question,
                "audio_path": audio_path,
                "question_type": "coding" if question.startswith("CODING ROUND:") else "behavioral",
            }
        return {"message": "No more questions.", "completed": True}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching next question: {str(e)}")

@app.post("/api/submit-answer")
def api_submit_answer(
    session_id: str = Form(...),
    question: str = Form(...),
    answer: Optional[str] = Form(None),
    answer_text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        final_answer = answer or answer_text
        transcribed_text = answer_text
        
        if audio and not final_answer:
            temp_audio_dir = "data/recordings"
            os.makedirs(temp_audio_dir, exist_ok=True)
            temp_filename = f"temp_{uuid.uuid4().hex}_{audio.filename}"
            temp_audio_path = os.path.join(temp_audio_dir, temp_filename)
            
            try:
                with open(temp_audio_path, "wb") as buffer:
                    buffer.write(audio.file.read())
                
                transcript = transcribe_audio(temp_audio_path)
                if transcript.startswith("Error:"):
                    raise HTTPException(status_code=500, detail=transcript)
                
                final_answer = transcript
                transcribed_text = transcript
            finally:
                if temp_audio_path and os.path.exists(temp_audio_path):
                    try:
                        os.remove(temp_audio_path)
                        print(f"Cleaned up temporary audio file: {temp_audio_path}")
                    except Exception as clean_err:
                        print(f"Error removing temp audio file {temp_audio_path}: {clean_err}")
            
        if not final_answer:
            raise HTTPException(status_code=400, detail="Answer or audio must be provided.")
            
        result = store_answer(db, session_id, current_user.id, question, final_answer)
        return {
            "evaluation": result,
            "transcribed_text": transcribed_text if transcribed_text else None
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting answer: {str(e)}")

@app.post("/api/execute-code")
async def api_execute_code(request: Request):
    try:
        payload = await request.json()
        req = urllib.request.Request(
            "https://emkc.org/api/v2/piston/execute",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Code execution failed: {str(e)}")

@app.get("/api/interview-report")
async def api_interview_report(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = generate_final_report(db, session_id, current_user.id)
        return report
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@app.post("/api/check-ats")
def api_check_ats(request: ATSRequest):
    try:
        result = check_ats_score(request.resume_text, request.job_description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking ATS: {str(e)}")

@app.post("/api/ats-recheck")
def api_ats_recheck(request: ATSRequest):
    """Lighter weight recheck for the live editor."""
    try:
        result = check_ats_score(request.resume_text, request.job_description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rechecking ATS: {str(e)}")

@app.post("/api/ml/resume-job-match")
def api_ml_resume_job_match(request: MLMatchRequest):
    """
    ML Resume-Job Domain Matching prediction endpoint using fine-tuned DistilBERT / baseline model.
    Predicts whether resume and job description belong to the same professional domain.
    """
    try:
        predictor = get_predictor()
        result = predictor.predict(request.resume_text, request.job_description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in ML resume-job match model: {str(e)}")

@app.get("/api/interview/{session_id}/coding-question")
def get_session_coding_question_endpoint(session_id: str, db: Session = Depends(get_db)):
    from modules.coding_question_service import select_coding_question, get_question_by_id
    from models import InterviewSession, Question
    import re

    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()

    coding_q = None
    if session:
        coding_q = db.query(Question).filter(
            Question.session_id == session_id,
            Question.category == "coding"
        ).first()

    question_data = None
    if coding_q and coding_q.question_text:
        match = re.search(r"\[([a-zA-Z0-9_]+)\]", coding_q.question_text)
        if match:
            q_id = match.group(1)
            question_data = get_question_by_id(q_id)

    if not question_data:
        role = session.role if (session and session.role) else "Software Developer"
        skills = session.skills if (session and session.skills) else []
        question_data = select_coding_question(session_id, role, skills)

    return {
        "id": question_data["id"],
        "title": question_data["title"],
        "difficulty": question_data["difficulty"],
        "category": question_data.get("category", "Coding"),
        "question_text": question_data["question_text"],
        "starter_code": question_data["starter_code"],
        "sample_test_cases": question_data["sample_test_cases"]
    }

@app.post("/api/interview/{session_id}/run-code")
def run_code_endpoint(session_id: str, request: RunCodeRequest):
    from modules.coding_question_service import get_question_by_id
    from modules.code_evaluator import execute_test_cases

    q_id = request.question_id or "first_unique_char"
    q_data = get_question_by_id(q_id)
    sample_tests = q_data.get("sample_test_cases", [])

    results = execute_test_cases(request.language, request.code, sample_tests)
    return {
        "passed_tests": results["passed_count"],
        "total_tests": results["total_count"],
        "pass_rate": results["pass_rate"],
        "test_details": results["details"]
    }

@app.post("/api/interview/{session_id}/submit-code")
def submit_code_endpoint(
    session_id: str, 
    request: SubmitCodeRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    from modules.coding_question_service import get_question_by_id
    from modules.code_evaluator import evaluate_coding_submission
    from models import InterviewSession, Question, Answer, Evaluation
    import re

    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Session not found or forbidden.")

    coding_q_record = db.query(Question).filter(
        Question.session_id == session_id,
        Question.category == "coding"
    ).first()

    q_id = request.question_id
    if not q_id and coding_q_record:
        match = re.search(r"\[([a-zA-Z0-9_]+)\]", coding_q_record.question_text)
        if match:
            q_id = match.group(1)

    if not q_id:
        q_id = "first_unique_char"

    q_data = get_question_by_id(q_id)
    hidden_tests = q_data.get("hidden_test_cases", [])

    eval_result = evaluate_coding_submission(
        question_text=q_data["question_text"],
        code=request.code,
        language=request.language,
        hidden_test_cases=hidden_tests
    )

    if coding_q_record:
        new_answer = db.query(Answer).filter(Answer.question_id == coding_q_record.id).first()
        if not new_answer:
            new_answer = Answer(
                question_id=coding_q_record.id,
                transcript_text=f"Submitted in {request.language}:\n\n{request.code}"
            )
            db.add(new_answer)
            db.flush()
        else:
            new_answer.transcript_text = f"Submitted in {request.language}:\n\n{request.code}"

        from modules.interview_manager import _pick_question, _topic_pool, _candidate_topics
        asked_q_texts = {q.question_text for q in db.query(Question).filter(Question.session_id == session_id).all()}
        next_q_prompt = _pick_question(_topic_pool(_candidate_topics(session.role, session.skills)), asked_q_texts)
        if not next_q_prompt:
            next_q_prompt = f"What design patterns or architectural tradeoffs do you prioritize when building scalable systems as a {session.role or 'developer'}?"

        new_eval = db.query(Evaluation).filter(Evaluation.answer_id == new_answer.id).first()
        if not new_eval:
            new_eval = Evaluation(
                answer_id=new_answer.id,
                score=eval_result["score"],
                relevance_score=eval_result["relevance_score"],
                technical_accuracy_score=eval_result["technical_accuracy_score"],
                depth_score=eval_result["depth_score"],
                clarity_score=eval_result["clarity_score"],
                confidence_score=eval_result["confidence_score"],
                feedback=eval_result["feedback"],
                strengths=eval_result["strengths"],
                weaknesses=eval_result["weaknesses"],
                suggested_answer=eval_result["suggested_answer"],
                next_question_suggestion=next_q_prompt,
                answer_quality=eval_result["answer_quality"]
            )
            db.add(new_eval)
        else:
            new_eval.score = eval_result["score"]
            new_eval.feedback = eval_result["feedback"]
            new_eval.strengths = eval_result["strengths"]
            new_eval.weaknesses = eval_result["weaknesses"]
            new_eval.suggested_answer = eval_result["suggested_answer"]
        db.commit()

    return {
        "passed_tests": eval_result["passed_tests"],
        "total_tests": eval_result["total_tests"],
        "score": eval_result["score"],
        "feedback": eval_result["feedback"],
        "suggested_improvement": eval_result["suggested_answer"],
        "complexity": {
            "time": eval_result["time_complexity"],
            "space": eval_result["space_complexity"]
        },
        "test_details": eval_result["test_details"],
        "evaluation": eval_result
    }


# --- PLAN CATALOG & SUBSCRIPTION ENDPOINTS ---
@app.get("/api/plans")
def get_plans_endpoint():
    return {"plans": get_all_plans()}

@app.get("/api/user/entitlements")
def get_entitlements_endpoint(current_user: Optional[User] = Depends(get_optional_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id if current_user else None
    return get_user_entitlements(db, user_id)

# --- RAZORPAY PAYMENT ENDPOINTS ---
@app.post("/api/payments/create-order")
def create_payment_order_endpoint(request: CreateOrderRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        target_plan = request.plan_id or request.plan or "pro"
        order_details = create_order(current_user.id, target_plan, db)
        return order_details
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Razorpay order: {str(e)}")


@app.post("/api/payments/verify")
def verify_payment_endpoint(request: VerifyPaymentRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = verify_payment_signature(
            user_id=current_user.id,
            razorpay_order_id=request.razorpay_order_id,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_signature=request.razorpay_signature,
            db=db
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification process error: {str(e)}")

@app.get("/api/payments/history")
def get_payment_history_endpoint(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"history": get_user_payment_history(current_user.id, db)}

@app.post("/api/webhooks/razorpay")
async def razorpay_webhook_endpoint(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()
    sig_header = request.headers.get("X-Razorpay-Signature") or request.headers.get("x-razorpay-signature") or ""
    try:
        result = process_webhook_payload(raw_body, sig_header, db)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing error: {str(e)}")

# --- CAREER INTELLIGENCE & AUDIT TRAIL ENDPOINTS ---
@app.post("/api/career-intelligence/analyze")
def analyze_career_intelligence_endpoint(request: CareerAnalysisRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = analyze_candidate_career_intelligence(db, current_user.id, request.target_role)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Career Intelligence analysis failed: {str(e)}")

@app.get("/api/career-intelligence/latest")
def get_latest_recommendation_endpoint(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = get_latest_candidate_recommendation(db, current_user.id)
    if not rec:
        rec = analyze_candidate_career_intelligence(db, current_user.id)
    return rec

@app.get("/api/audit-logs")
def get_audit_logs_endpoint(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"logs": get_user_audit_logs(db, current_user.id)}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
