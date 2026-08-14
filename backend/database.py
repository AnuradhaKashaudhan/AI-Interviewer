import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

import urllib.parse

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("MIGRATION_DATABASE_URL") or "sqlite:///./ai_interviewer.db"

if "sqlite" in SQLALCHEMY_DATABASE_URL:
    connect_args = {"check_same_thread": False}
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
else:
    connect_args = {"options": "-c search_path=app,public"}
    raw_url = SQLALCHEMY_DATABASE_URL
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)
        
    try:
        engine = create_engine(raw_url, connect_args=connect_args)
        with engine.connect() as conn:
            pass
    except Exception:
        # Fallback helper for connection strings containing unescaped special characters in password
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
            engine = create_engine(safe_url, connect_args=connect_args)
        else:
            engine = create_engine(raw_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
