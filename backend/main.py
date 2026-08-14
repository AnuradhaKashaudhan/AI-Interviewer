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
from sqlalchemy.orm import Session
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

# Import routers
from routers.coding_profile import router as coding_profile_router

BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="AI Mock Interviewer API", description="API for the AI Personalized Mock Interview Coach")

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

# Allow CORS for main frontend
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    return {"message": "Welcome to the AI Mock Interviewer API"}

# --- Auth Endpoints ---

@app.post("/api/auth/signup")
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(request.password)
    new_user = User(
        email=request.email,
        fullName=request.fullName,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

@app.post("/api/auth/login")
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False, # Set to False for local HTTP dev, True for production HTTPS
        samesite="lax",
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
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
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
        secure=False,
        samesite="lax"
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
            headers={"Content-Type": "application/json"},
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
