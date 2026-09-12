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
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete")
    payment_orders = relationship("PaymentOrder", back_populates="user", cascade="all, delete")
    career_recommendations = relationship("AICareerRecommendation", back_populates="user", cascade="all, delete")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete")

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
    
    # RAG Grounding & Traceability Metadata
    topic = Column(String, nullable=True)
    evidence_ids = Column(JSON, nullable=True)
    retrieval_scores = Column(JSON, nullable=True)
    grounding_score = Column(Float, nullable=True)

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

    # RAG Grounding & Traceability Metadata
    evidence_ids = Column(JSON, nullable=True)
    retrieval_scores = Column(JSON, nullable=True)
    semantic_similarity = Column(Float, nullable=True)
    missing_concepts = Column(JSON, nullable=True)
    technical_errors = Column(JSON, nullable=True)

    # Part 4 Advanced ML Scoring Signals
    evidence_coverage = Column(Float, nullable=True)
    qa_relevance = Column(Float, nullable=True)
    evaluation_confidence = Column(Float, nullable=True)
    scoring_version = Column(String, nullable=True, default="v2.0-ml-rag")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    answer = relationship("Answer", back_populates="evaluation")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    plan_id = Column(String, nullable=False, default="free")
    status = Column(String, nullable=False, default="active")  # active, expired, cancelled
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="subscriptions")


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    plan_id = Column(String, nullable=False)
    razorpay_order_id = Column(String, unique=True, index=True, nullable=False)
    amount = Column(Integer, nullable=False)  # in paise
    currency = Column(String, default="INR", nullable=False)
    status = Column(String, default="CREATED", nullable=False)  # CREATED, PAYMENT_INITIATED, VERIFIED, FAILED, CANCELLED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="payment_orders")
    payments = relationship("Payment", back_populates="order", cascade="all, delete")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("payment_orders.id"), nullable=False)
    razorpay_payment_id = Column(String, index=True, nullable=False)
    razorpay_signature = Column(String, nullable=True)
    razorpay_signature_verified = Column(Integer, default=0, nullable=False)
    status = Column(String, default="CAPTURED", nullable=False)  # CAPTURED, FAILED, REFUNDED
    captured_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("PaymentOrder", back_populates="payments")


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_type = Column(String, nullable=False)
    external_event_id = Column(String, unique=True, index=True, nullable=True)
    processed = Column(Integer, default=0, nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    payload = Column(JSON, nullable=True)


class AICareerRecommendation(Base):
    __tablename__ = "ai_career_recommendations"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    target_role = Column(String, nullable=False)
    readiness_score = Column(Float, default=0.0)
    strengths = Column(JSON, nullable=True)
    skill_gaps = Column(JSON, nullable=True)
    priority_area = Column(String, nullable=True)
    recommended_product_id = Column(String, nullable=False, default="pro")
    recommendation = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    confidence = Column(Float, default=0.90)
    user_approved = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="career_recommendations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    category = Column(String, nullable=False)  # AI, PAYMENT, AUTH, ENTITLEMENT
    reason = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")


class CareerIntelligenceReport(Base):
    __tablename__ = "career_intelligence_reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    target_role = Column(String, nullable=False)
    report_data = Column(JSON, nullable=False)
    data_sources_used = Column(JSON, nullable=True)
    confidence_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="career_intelligence_reports")

class SystemDesignSession(Base):
    __tablename__ = "system_design_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    topic = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    scenario = Column(Text, nullable=True)
    requirements = Column(JSON, nullable=True)
    overall_score = Column(Float, nullable=True)
    status = Column(String, default="in_progress")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="system_design_sessions")
    attempts = relationship("SystemDesignAttempt", back_populates="session", cascade="all, delete")

class SystemDesignAttempt(Base):
    __tablename__ = "system_design_attempts"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("system_design_sessions.id"), nullable=False)
    candidate_response = Column(Text, nullable=False)
    dimension_scores = Column(JSON, nullable=True) # Architecture, Scalability, etc.
    feedback = Column(JSON, nullable=True)
    covered_concepts = Column(JSON, nullable=True)
    missing_concepts = Column(JSON, nullable=True)
    technical_errors = Column(JSON, nullable=True)
    evidence_references = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("SystemDesignSession", back_populates="attempts")
