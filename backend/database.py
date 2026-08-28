import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

import urllib.parse

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("MIGRATION_DATABASE_URL") or "sqlite:///./ai_interviewer.db"

def create_db_engine():
    if "sqlite" in SQLALCHEMY_DATABASE_URL:
        connect_args = {"check_same_thread": False}
        return create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
    
    connect_args = {"options": "-c search_path=app,public"}
    raw_url = SQLALCHEMY_DATABASE_URL
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)
        
    # Test primary PostgreSQL connection with 1s timeout
    try:
        test_engine = create_engine(raw_url, connect_args={**connect_args, "connect_timeout": 1})
        with test_engine.connect() as conn:
            print("Connected successfully to Supabase PostgreSQL database.")
            return test_engine
    except Exception as e:
        print(f"Warning: Primary PostgreSQL connection failed ({e}). Trying backup/fallback...")

    # Test parsed/encoded password URL with 1s timeout
    try:
        clean_raw = raw_url.replace("postgresql://", "", 1)
        query_str = clean_raw.split("?", 1)[1] if "?" in clean_raw else ""
        clean_raw = clean_raw.split("?", 1)[0]
        
        last_at = clean_raw.rfind("@")
        if last_at != -1:
            user_pass = clean_raw[:last_at]
            host_db = clean_raw[last_at + 1:]
            
            user, password = user_pass.split(":", 1) if ":" in user_pass else (user_pass, "")
            host_port, dbname = host_db.split("/", 1) if "/" in host_db else (host_db, "postgres")
            host, port = host_port.split(":", 1) if ":" in host_port else (host_port, 5432)
            
            encoded_password = urllib.parse.quote_plus(password)
            safe_url = f"postgresql://{user}:{encoded_password}@{host}:{port}/{dbname}"
            if query_str:
                safe_url += f"?{query_str}"
            test_engine = create_engine(safe_url, connect_args={**connect_args, "connect_timeout": 1})
            with test_engine.connect() as conn:
                print("Connected successfully to Supabase PostgreSQL database (encoded URL).")
                return test_engine
    except Exception as e:
        print(f"Warning: Secondary PostgreSQL connection failed ({e}).")

    # Fallback to local SQLite database if PostgreSQL unreachable
    print("Falling back to local SQLite database (ai_interviewer.db)...")
    return create_engine("sqlite:///./ai_interviewer.db", connect_args={"check_same_thread": False})

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
