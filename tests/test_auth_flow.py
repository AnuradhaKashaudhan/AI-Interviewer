import pytest
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import jwt

from main import app
from database import get_db, Base, engine, SessionLocal
from models import User
from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    SECRET_KEY,
    ALGORITHM,
    normalize_email,
    get_password_hash,
    verify_password
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Clean test accounts before each test
        db.query(User).filter(User.email.like("%@example.com")).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    yield

def test_email_normalization_utility():
    assert normalize_email("  Anuradha@Gmail.COM  ") == "anuradha@gmail.com"
    assert normalize_email("TEST@Domain.Org ") == "test@domain.org"
    assert normalize_email("") == ""
    assert normalize_email(None) == ""

def test_access_token_lifetime_at_least_60_minutes():
    assert ACCESS_TOKEN_EXPIRE_MINUTES >= 60

def test_signup_and_existing_account_detection():
    test_email = "auth_test_user_unique@example.com"
    
    # 1. Signup with new account
    res1 = client.post("/api/auth/signup", json={
        "fullName": "Auth Test User",
        "email": f"  {test_email.upper()}  ",
        "phoneNumber": "+91 9999999999",
        "password": "Password123!"
    })
    assert res1.status_code == 200
    assert res1.json()["message"] == "User created successfully"
    
    # 2. Try to signup again with same email (lowercase)
    res2 = client.post("/api/auth/signup", json={
        "fullName": "Auth Test User Duplicate",
        "email": test_email,
        "phoneNumber": "+91 9999999999",
        "password": "Password123!"
    })
    assert res2.status_code == 400
    detail = res2.json()["detail"]
    assert "already exists" in detail.lower() or "please sign in" in detail.lower()

def test_login_flow_and_case_insensitivity():
    email = "case_sensitive_user@example.com"
    password = "SecurePassword123"
    
    # Create user
    signup_res = client.post("/api/auth/signup", json={
        "fullName": "Case User",
        "email": email,
        "phoneNumber": "+91 9876543210",
        "password": password
    })
    assert signup_res.status_code == 200
    
    # Login with uppercase email and spaces
    login_res = client.post("/api/auth/login", json={
        "email": f"  {email.upper()}  ",
        "password": password
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == email
    
    # Verify JWT expiration >= 60 minutes
    payload = jwt.decode(data["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    exp = payload.get("exp")
    iat = payload.get("iat", datetime.utcnow().timestamp())
    assert (exp - iat) >= 3500  # at least ~60 minutes

def test_login_incorrect_password():
    email = "wrong_pass_user@example.com"
    password = "CorrectPassword123"
    
    client.post("/api/auth/signup", json={
        "fullName": "Wrong Pass User",
        "email": email,
        "phoneNumber": "+91 9876543210",
        "password": password
    })
    
    res = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword123"
    })
    assert res.status_code == 400
    assert res.json()["detail"] == "Incorrect email or password"

def test_refresh_token_and_logout():
    email = "refresh_test_user@example.com"
    password = "RefreshPassword123"
    
    client.post("/api/auth/signup", json={
        "fullName": "Refresh User",
        "email": email,
        "phoneNumber": "+91 9876543210",
        "password": password
    })
    
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200
    refresh_cookie_val = login_res.cookies.get("refresh_token")
    assert refresh_cookie_val is not None
    
    # Refresh token call
    refresh_res = client.post("/api/auth/refresh", cookies={"refresh_token": refresh_cookie_val})
    assert refresh_res.status_code == 200
    refreshed_data = refresh_res.json()
    assert "access_token" in refreshed_data
    
    # Logout call
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
