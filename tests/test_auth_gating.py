import requests

BASE_URL = "http://127.0.0.1:8000"

def test_unauthenticated_access():
    endpoints = [
        ("POST", "/api/execute-code", {}),
        ("POST", "/api/check-ats", {}),
        ("POST", "/api/ats-recheck", {}),
        ("POST", "/api/ml/resume-job-match", {}),
        ("GET", "/api/interview/test-session-123/coding-question", None),
        ("POST", "/api/interview/test-session-123/run-code", {}),
    ]

    all_passed = True
    for method, path, data in endpoints:
        url = BASE_URL + path
        try:
            if method == "POST":
                res = requests.post(url, json=data)
            else:
                res = requests.get(url)
            
            if res.status_code == 401:
                print(f"✅ {path} returned 401 Unauthorized")
            else:
                print(f"❌ {path} returned {res.status_code} instead of 401")
                all_passed = False
        except Exception as e:
            print(f"Error testing {path}: {e}")
            all_passed = False
            
    return all_passed

if __name__ == "__main__":
    test_unauthenticated_access()
