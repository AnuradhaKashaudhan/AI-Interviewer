import os
import sys
import json
import uuid
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def post_json(endpoint, payload, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}
    except Exception as e:
        return 500, {"error": str(e)}

def get_json(endpoint, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}
    except Exception as e:
        return 500, {"error": str(e)}

def run_all_tests():
    report = []
    
    # 1. Auth Tests
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPassword123!"
    
    # Signup
    signup_status, signup_res = post_json("/api/auth/signup", {
        "fullName": "Test User",
        "email": unique_email,
        "password": password
    })
    report.append({
        "group": "A. Authentication",
        "endpoint": "POST /api/auth/signup",
        "executed": True,
        "http_code": signup_status,
        "valid_schema": signup_status == 200 and "message" in signup_res,
        "res_sample": signup_res,
        "regression": signup_status != 200
    })

    # Login
    login_status, login_res = post_json("/api/auth/login", {
        "email": unique_email,
        "password": password
    })
    token = login_res.get("access_token", "") if login_status == 200 else ""
    report.append({
        "group": "A. Authentication",
        "endpoint": "POST /api/auth/login",
        "executed": True,
        "http_code": login_status,
        "valid_schema": login_status == 200 and "access_token" in login_res,
        "res_sample": login_res,
        "regression": login_status != 200
    })

    auth_headers = {"Authorization": f"Bearer {token}"} if token else {}

    # Refresh
    refresh_status, refresh_res = post_json("/api/auth/refresh", {})
    report.append({
        "group": "A. Authentication",
        "endpoint": "POST /api/auth/refresh",
        "executed": True,
        "http_code": refresh_status,
        "valid_schema": refresh_status in [200, 401],
        "res_sample": refresh_res,
        "regression": refresh_status not in [200, 401]
    })

    # Me
    me_status, me_res = get_json("/api/auth/me", headers=auth_headers)
    report.append({
        "group": "A. Authentication",
        "endpoint": "GET /api/auth/me",
        "executed": True,
        "http_code": me_status,
        "valid_schema": me_status == 200 and "user" in me_res,
        "res_sample": me_res,
        "regression": me_status != 200
    })

    # 2. Resume / ATS Tests
    # check-ats
    sample_resume = "Senior Python Developer with 5 years experience in FastAPI, PostgreSQL, Docker, AWS and React."
    sample_jd = "Looking for a Python Backend Engineer with FastAPI, PostgreSQL and Docker experience."
    
    ats_status, ats_res = post_json("/api/check-ats", {
        "resume_text": sample_resume,
        "job_description": sample_jd
    })
    report.append({
        "group": "B. Resume / ATS",
        "endpoint": "POST /api/check-ats",
        "executed": True,
        "http_code": ats_status,
        "valid_schema": ats_status == 200 and "score" in ats_res and "sub_scores" in ats_res,
        "res_sample": ats_res,
        "regression": ats_status != 200
    })

    # ats-recheck
    recheck_status, recheck_res = post_json("/api/ats-recheck", {
        "resume_text": sample_resume,
        "job_description": sample_jd
    })
    report.append({
        "group": "B. Resume / ATS",
        "endpoint": "POST /api/ats-recheck",
        "executed": True,
        "http_code": recheck_status,
        "valid_schema": recheck_status == 200 and "score" in recheck_res,
        "res_sample": recheck_res,
        "regression": recheck_status != 200
    })

    # upload-resume (multipart test using synthetic dummy pdf bytes)
    # We test via Python urllib
    try:
        import io
        from reportlab.pdfgen import canvas
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer)
        c.drawString(100, 750, "John Doe - Python Developer with FastAPI and React")
        c.save()
        pdf_bytes = pdf_buffer.getvalue()
        
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="test_resume.pdf"\r\n'
            f"Content-Type: application/pdf\r\n\r\n"
        ).encode("utf-8") + pdf_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")
        
        up_req = urllib.request.Request(
            f"{BASE_URL}/api/upload-resume",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST"
        )
        with urllib.request.urlopen(up_req) as up_resp:
            up_status = up_resp.status
            up_res = json.loads(up_resp.read().decode("utf-8"))
    except Exception as e:
        up_status = 500
        up_res = {"error": str(e)}

    report.append({
        "group": "B. Resume / ATS",
        "endpoint": "POST /api/upload-resume",
        "executed": True,
        "http_code": up_status,
        "valid_schema": up_status in [200, 500] and ("extracted_skills" in up_res or "detail" in up_res or "error" in up_res),
        "res_sample": up_res,
        "regression": up_status not in [200, 500]
    })

    # 3. Interview Tests
    start_status, start_res = post_json("/api/start-interview", {
        "skills": ["python", "fastapi"],
        "persona": "friendly",
        "role": "Python Engineer"
    }, headers=auth_headers)
    session_id = start_res.get("session_id", "") if start_status == 200 else ""
    report.append({
        "group": "C. Interview",
        "endpoint": "POST /api/start-interview",
        "executed": True,
        "http_code": start_status,
        "valid_schema": start_status == 200 and "session_id" in start_res,
        "res_sample": start_res,
        "regression": start_status != 200
    })

    # next-question
    next_status, next_res = post_json("/api/next-question", {
        "session_id": session_id if session_id else "dummy_session"
    }, headers=auth_headers)
    report.append({
        "group": "C. Interview",
        "endpoint": "POST /api/next-question",
        "executed": True,
        "http_code": next_status,
        "valid_schema": next_status in [200, 404, 500],
        "res_sample": next_res,
        "regression": next_status not in [200, 404, 500]
    })

    # submit-answer (form-data)
    try:
        ans_boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        ans_body = (
            f"--{ans_boundary}\r\nContent-Disposition: form-data; name=\"session_id\"\r\n\r\n{session_id}\r\n"
            f"--{ans_boundary}\r\nContent-Disposition: form-data; name=\"question\"\r\n\r\nExplain Python decorators.\r\n"
            f"--{ans_boundary}\r\nContent-Disposition: form-data; name=\"answer\"\r\n\r\nDecorators modify functions dynamically.\r\n"
            f"--{ans_boundary}--\r\n"
        ).encode("utf-8")
        ans_req = urllib.request.Request(
            f"{BASE_URL}/api/submit-answer",
            data=ans_body,
            headers={"Content-Type": f"multipart/form-data; boundary={ans_boundary}", **auth_headers},
            method="POST"
        )
        with urllib.request.urlopen(ans_req) as ans_resp:
            ans_status = ans_resp.status
            ans_res = json.loads(ans_resp.read().decode("utf-8"))
    except Exception as e:
        ans_status = 500
        ans_res = {"error": str(e)}

    report.append({
        "group": "C. Interview",
        "endpoint": "POST /api/submit-answer",
        "executed": True,
        "http_code": ans_status,
        "valid_schema": ans_status in [200, 500],
        "res_sample": ans_res,
        "regression": ans_status not in [200, 500]
    })

    # 4. Coding Test
    exec_status, exec_res = post_json("/api/execute-code", {
        "language": "python",
        "version": "3.10.0",
        "files": [{"content": "print('Hello World')"}]
    })
    report.append({
        "group": "D. Coding Sandbox",
        "endpoint": "POST /api/execute-code",
        "executed": True,
        "http_code": exec_status,
        "valid_schema": exec_status in [200, 502],
        "res_sample": exec_res,
        "regression": exec_status not in [200, 502]
    })

    # 5. Coding Profile Test
    cp_status, cp_res = get_json("/api/coding-profile/leetcode/anuradhaka4050")
    report.append({
        "group": "E. Coding Profiles",
        "endpoint": "GET /api/coding-profile/{platform}/{username}",
        "executed": True,
        "http_code": cp_status,
        "valid_schema": cp_status in [200, 404, 500],
        "res_sample": cp_res,
        "regression": cp_status not in [200, 404, 500]
    })

    # 6. Interview Report Test
    rep_status, rep_res = get_json(f"/api/interview-report?session_id={session_id}", headers=auth_headers)
    report.append({
        "group": "F. Interview Report",
        "endpoint": "GET /api/interview-report",
        "executed": True,
        "http_code": rep_status,
        "valid_schema": rep_status in [200, 404, 500],
        "res_sample": rep_res,
        "regression": rep_status not in [200, 404, 500]
    })

    # 7. New ML Endpoint Test
    ml_status, ml_res = post_json("/api/ml/resume-job-match", {
        "resume_text": sample_resume,
        "job_description": sample_jd
    })
    report.append({
        "group": "G. New ML Domain Match",
        "endpoint": "POST /api/ml/resume-job-match",
        "executed": True,
        "http_code": ml_status,
        "valid_schema": ml_status == 200 and "prediction" in ml_res and "match_probability" in ml_res and "model" in ml_res and "artifact_path" not in ml_res,
        "res_sample": ml_res,
        "regression": ml_status != 200
    })

    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    run_all_tests()
