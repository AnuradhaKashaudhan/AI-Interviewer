import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import urllib.parse

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SQLITE_PATH = BASE_DIR / "ai_interviewer.db"
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"

raw_env_url = os.getenv("DATABASE_URL") or os.getenv("MIGRATION_DATABASE_URL")
SQLALCHEMY_DATABASE_URL = raw_env_url if raw_env_url else DEFAULT_SQLITE_URL

IS_PROD = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod") or "onrender.com" in os.getenv("RENDER_EXTERNAL_URL", "")

def create_db_engine():
    if "sqlite" in SQLALCHEMY_DATABASE_URL:
        connect_args = {"check_same_thread": False}
        return create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
    
    connect_args = {"options": "-c search_path=app,public"}
    raw_url = SQLALCHEMY_DATABASE_URL
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)
        
    # Test primary PostgreSQL connection with 10s timeout
    try:
        test_engine = create_engine(raw_url, connect_args={**connect_args, "connect_timeout": 10}, pool_pre_ping=True)
        with test_engine.connect() as conn:
            print("Connected successfully to Supabase PostgreSQL database.")
            return test_engine
    except Exception as e:
        print(f"Warning: Primary PostgreSQL connection failed ({e}). Trying backup/fallback...")

    # Test parsed/encoded password URL with 10s timeout
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
            test_engine = create_engine(safe_url, connect_args={**connect_args, "connect_timeout": 10}, pool_pre_ping=True)
            with test_engine.connect() as conn:
                print("Connected successfully to Supabase PostgreSQL database (encoded URL).")
                return test_engine
    except Exception as e:
        print(f"Warning: Secondary PostgreSQL connection failed ({e}).")

    if IS_PROD:
        print("CRITICAL ERROR: Production PostgreSQL connection failed and SQLite fallback is disabled in production!")
        raise RuntimeError("Production PostgreSQL database unreachable.")

    # Fallback to local SQLite database if PostgreSQL unreachable in local development
    print(f"Falling back to local SQLite database ({DEFAULT_SQLITE_PATH})...")
    return create_engine(DEFAULT_SQLITE_URL, connect_args={"check_same_thread": False})

engine = create_db_engine()

def ensure_rag_columns(target_engine):
    """Safely adds missing RAG traceability columns to existing questions and evaluations tables."""
    try:
        from sqlalchemy import text
        with target_engine.connect() as conn:
            q_cols = [
                ("topic", "VARCHAR"),
                ("evidence_ids", "TEXT"),
                ("retrieval_scores", "TEXT"),
                ("grounding_score", "FLOAT")
            ]
            for col_name, col_type in q_cols:
                try:
                    conn.execute(text(f"ALTER TABLE questions ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                except Exception:
                    pass

            e_cols = [
                ("evidence_ids", "TEXT"),
                ("retrieval_scores", "TEXT"),
                ("semantic_similarity", "FLOAT"),
                ("missing_concepts", "TEXT"),
                ("technical_errors", "TEXT"),
                ("evidence_coverage", "FLOAT"),
                ("qa_relevance", "FLOAT"),
                ("evaluation_confidence", "FLOAT"),
                ("scoring_version", "VARCHAR")
            ]
            for col_name, col_type in e_cols:
                try:
                    conn.execute(text(f"ALTER TABLE evaluations ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                except Exception:
                    pass
    except Exception as e:
        print(f"Warning ensuring RAG columns: {e}")

ensure_rag_columns(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


