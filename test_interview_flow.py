import requests
import time
import uuid

BASE_URL = "http://127.0.0.1:8000"

def run_test():
    session = requests.Session()
    
    # 1. Signup / Login
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "Password123!"
    
    print(f"Creating test user {email}...")
    signup_res = session.post(f"{BASE_URL}/api/auth/signup", json={
        "fullName": "Test User",
        "email": email,
        "password": password
    })
    
    if signup_res.status_code != 200 and "already exists" not in signup_res.text:
        print(f"Signup failed: {signup_res.text}")
        return
        
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.text}")
        return
        
    token = login_res.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    # 2. Start Interview
    print("Starting interview...")
    t0 = time.time()
    start_res = session.post(f"{BASE_URL}/api/start-interview", json={
        "skills": ["Python", "FastAPI"],
        "persona": "friendly",
        "role": "Backend Engineer",
        "resume_text": "Experienced Backend Engineer with 5 years of Python and FastAPI."
    })
    t1 = time.time()
    print(f"Start Interview completed in {(t1-t0)*1000:.0f} ms")
    
    if start_res.status_code != 200:
        print(f"Start Interview failed: {start_res.text}")
        return
        
    data = start_res.json()
    session_id = data.get("session_id")
    print(f"First Question: {data.get('first_question')}")
    
    # 3. Next Question
    print("\nFetching Next Question...")
    t2 = time.time()
    next_res = session.post(f"{BASE_URL}/api/next-question", json={
        "session_id": session_id
    })
    t3 = time.time()
    print(f"Next Question completed in {(t3-t2)*1000:.0f} ms")
    
    if next_res.status_code != 200:
        print(f"Next Question failed: {next_res.text}")
        return
        
    print(f"Next Question: {next_res.json().get('question')}")

if __name__ == "__main__":
    run_test()
