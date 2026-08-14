from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    fullName = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete")
    coding_profiles = relationship("CodingProfile", back_populates="user", cascade="all, delete")

class CodingProfile(Base):
    __tablename__ = "coding_profiles"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    platform = Column(String, default="github", index=True)
    username = Column(String, nullable=False)
    raw_stats = Column(JSON, nullable=True)
    profile_score = Column(Float, default=0.0)
    last_synced = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_verified = Column(Integer, default=1)
    
    user = relationship("User", back_populates="coding_profiles")


class InterviewSession(Base):
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    candidate_id = Column(String, nullable=True) # Optional for future auth integration
    user_id = Column(String, ForeignKey("users.id"), nullable=True) # Linking to User
    resume_text = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True)
    role = Column(String, nullable=True)
    persona = Column(String, nullable=True, default="friendly")
    status = Column(String, default="in_progress") # in_progress, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="sessions")
    questions = relationship("Question", back_populates="session", cascade="all, delete")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("sessions.id"))
    question_text = Column(Text, nullable=False)
    difficulty = Column(String, nullable=True)
    category = Column(String, nullable=True) # behavioral, technical, coding
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("InterviewSession", back_populates="questions")
    answer = relationship("Answer", back_populates="question", uselist=False, cascade="all, delete")

class Answer(Base):
    __tablename__ = "answers"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    question_id = Column(String, ForeignKey("questions.id"), unique=True)
    transcript_text = Column(Text, nullable=False)
    audio_reference = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    question = relationship("Question", back_populates="answer")
    evaluation = relationship("Evaluation", back_populates="answer", uselist=False, cascade="all, delete")

class Evaluation(Base):
    __tablename__ = "evaluations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    answer_id = Column(String, ForeignKey("answers.id"), unique=True)
    
    # Scores
    score = Column(Float, nullable=False, default=0.0)
    relevance_score = Column(Float, nullable=False, default=0.0)
    technical_accuracy_score = Column(Float, nullable=False, default=0.0)
    depth_score = Column(Float, nullable=False, default=0.0)
    clarity_score = Column(Float, nullable=False, default=0.0)
    confidence_score = Column(Float, nullable=False, default=0.0)
    
    # Qualitative feedback
    feedback = Column(Text, nullable=True)
    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    missing_keywords = Column(JSON, nullable=True)
    suggested_answer = Column(Text, nullable=True)
    
    # Adaptive
    next_question_suggestion = Column(Text, nullable=True)
    answer_quality = Column(String, nullable=True) # weak, average, strong
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    answer = relationship("Answer", back_populates="evaluation")
