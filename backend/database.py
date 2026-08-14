import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# We use SQLite as a fallback since Docker is not installed/running locally.
# Set DATABASE_URL=postgresql://ai_user:ai_password@localhost:5432/ai_interviewer to use Postgres.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ai_interviewer.db")

connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
