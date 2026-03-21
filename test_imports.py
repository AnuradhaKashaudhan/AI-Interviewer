import sys
import os

print(f"Python path: {sys.path}")
print(f"CWD: {os.getcwd()}")

try:
    from fastapi import FastAPI
    print("FastAPI imported")
    import uvicorn
    print("Uvicorn imported")
    from modules.resume_parser import extract_text_from_pdf
    print("resume_parser imported")
    from modules.skill_extractor import extract_skills
    print("skill_extractor imported")
    from modules.question_generator import generate_questions
    print("question_generator imported")
    from modules.answer_evaluator import evaluate_answer
    print("answer_evaluator imported")
    from modules.interview_manager import start_interview, next_question, store_answer, generate_final_report
    print("interview_manager imported")
    from modules.speech_to_text import transcribe_audio
    print("speech_to_text imported")
    from modules.text_to_speech import speak_question
    print("text_to_speech imported")
except Exception as e:
    print(f"FAIL: {e}")
    import traceback
    traceback.print_exc()
