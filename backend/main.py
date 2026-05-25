from fastapi import FastAPI, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

# Import modules
from modules.resume_parser import extract_text_from_pdf
from modules.skill_extractor import extract_skills
from modules.question_generator import generate_questions
from modules.answer_evaluator import evaluate_answer
from modules.interview_manager import start_interview, next_question, store_answer, generate_final_report
from modules.speech_to_text import transcribe_audio
from modules.text_to_speech import speak_question
from modules.ats_checker import check_ats_score

app = FastAPI(title="AI Mock Interviewer API", description="API for the AI Personalized Mock Interview Coach")

class AnswerRequest(BaseModel):
    question: str
    answer: str

class StartInterviewRequest(BaseModel):
    skills: list[str]
    persona: Optional[str] = "friendly"

class ATSRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None

# Allow CORS for main frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
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
    print(f"DEBUG: {request.method} {request.url}")
    if request.method == "OPTIONS":
        # Let CORSMiddleware handle it.
        # But if it reaches here, we can see if it was blocked.
        print(f"DEBUG: Handling OPTIONS for {request.url}")
        
    try:
        response = await call_next(request)
        print(f"DEBUG: Result {response.status_code} for {request.url}")
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
os.makedirs("data/audio_questions", exist_ok=True)
os.makedirs("data/recordings", exist_ok=True)
app.mount("/data", StaticFiles(directory="data"), name="data")

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Mock Interviewer API"}

@app.post("/api/upload-resume")
def upload_resume(file: UploadFile = File(...)):
    print(f"Received resume upload: {file.filename}")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    # Save file temporarily
    temp_dir = "data/resumes"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        print(f"DEBUG: Starting file read for {file.filename}")
        content = file.file.read()
        print(f"DEBUG: File read complete. Size: {len(content)} bytes")
        with open(temp_file_path, "wb") as buffer:
            buffer.write(content)
            
        print(f"DEBUG: File saved to {temp_file_path}. Processing with parser...")
        # 1. Parse Resume
        text = extract_text_from_pdf(temp_file_path)
        if not text:
            print("PDF parsing failed: No text extracted.")
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")
            
        # 2. Extract Skills
        skills = extract_skills(text)
        print(f"Skills extracted: {skills}")
        
        # 3. Generate Questions
        questions = generate_questions(skills)
        print("Questions generated.")
        
        return {
            "message": "Resume processed successfully",
            "extracted_skills": skills,
            "extracted_text": text,
            "generated_questions": questions
        }
    except Exception as e:
        print(f"Error in upload-resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@app.post("/api/evaluate-answer")
def analyze_answer(request: AnswerRequest):
    try:
        result = evaluate_answer(request.question, request.answer)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during evaluation: {str(e)}")

# --- Live Interview Endpoints ---

@app.post("/api/start-interview")
def api_start_interview(request: StartInterviewRequest, background_tasks: BackgroundTasks):
    try:
        questions = start_interview(request.skills, request.persona)
        if questions:
            first_q = questions[0]
            # Generate first audio immediately for the user
            audio_path = speak_question(first_q)
            
            # Pre-generate the rest in background
            def pre_gen_rest():
                for q in questions[1:]:
                    speak_question(q)
            
            background_tasks.add_task(pre_gen_rest)
            
            return {
                "first_question": first_q, 
                "audio_path": audio_path,
                "total_questions": len(questions)
            }
        return {"message": "No questions generated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting interview: {str(e)}")

@app.post("/api/next-question")
def api_next_question():
    try:
        question = next_question()
        if question:
            audio_path = speak_question(question)
            return {
                "question": question,
                "audio_path": audio_path
            }
        return {"message": "No more questions.", "completed": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching next question: {str(e)}")

@app.post("/api/submit-answer")
def api_submit_answer(
    question: str = Form(...),
    answer: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None)
):
    try:
        final_answer = answer
        
        # If audio is provided, transcribe it
        if audio:
            temp_audio_dir = "data/recordings"
            os.makedirs(temp_audio_dir, exist_ok=True)
            temp_audio_path = os.path.join(temp_audio_dir, audio.filename)
            
            with open(temp_audio_path, "wb") as buffer:
                buffer.write(audio.file.read())
            
            transcript = transcribe_audio(temp_audio_path)
            if transcript.startswith("Error:"):
                 raise HTTPException(status_code=500, detail=transcript)
            
            final_answer = transcript
            
        if not final_answer:
            raise HTTPException(status_code=400, detail="Answer or audio must be provided.")
            
        result = store_answer(question, final_answer)
        return {
            "evaluation": result,
            "transcribed_text": final_answer if audio else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting answer: {str(e)}")

@app.get("/api/interview-report")
async def api_interview_report():
    try:
        report = generate_final_report()
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@app.post("/api/check-ats")
def api_check_ats(request: ATSRequest):
    try:
        result = check_ats_score(request.resume_text, request.job_description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking ATS: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
