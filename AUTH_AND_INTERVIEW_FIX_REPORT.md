# Auth Session Expiry & Interview Next Question Fix Report

## Overview
This report documents the root causes, exact file changes, verification tests, and final outcome for the two critical production issues in **CareerPilot AI**:
1. **Issue 1 — Login Session Expiring Too Quickly**
2. **Issue 2 — Next Question Button Not Working After Coding Round**

---

## 1. Issue 1 — Login Session Expiry

### Root Cause
1. **Short JWT Lifetime**: The backend `ACCESS_TOKEN_EXPIRE_MINUTES` constant in `backend/auth.py` was hardcoded to `15` minutes.
2. **Immediate Logout on 401 Interception**: In `frontend/src/InterviewPage.jsx`, the custom `apiFetch` function intercepted any `401 Unauthorized` HTTP status and immediately executed `navigate('/login')`, clearing state and logging the candidate out mid-session instead of attempting an automatic background token refresh via `/api/auth/refresh`.
3. **Lack of Single-Flight Refresh**: Concurrent API calls receiving 401 simultaneously would make redundant refresh requests.

### Exact Authentication Files Changed
1. `backend/auth.py`
2. `frontend/src/services/authApi.js`
3. `frontend/src/context/AuthContext.jsx`
4. `frontend/src/InterviewPage.jsx`

### Access Token Expiry Before / After
- **Before**: 15 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES = 15`)
- **After**: 60 minutes minimum (`ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))`)

### Refresh Token Behavior Before / After
- **Before**: 
  - Refresh token stored in HTTP-Only cookie with 7-day expiration.
  - Background silent refresh interval in `AuthContext` was hardcoded to 14 minutes.
  - Active API requests receiving 401 were NOT auto-refreshed and immediately redirected the candidate to `/login`.
- **After**:
  - Refresh token remains securely stored in HTTP-Only cookie (`httponly=True`, `secure=COOKIE_SECURE`, `samesite=COOKIE_SAMESITE`).
  - Added single-flight `refreshAuthToken()` and centralized `apiFetch` interceptor in `authApi.js`.
  - When an access token expires while using the app, `apiFetch` automatically calls `/api/auth/refresh`, receives a new 60-minute access token, notifies `AuthContext` subscribers via `onTokenRefresh`, and retries the original failed API request once.
  - Concurrent 401s are deduplicated via a single shared refresh promise so only one refresh call is made to the backend.
  - Silent refresh interval in `AuthContext` is set to 50 minutes (matching the 60-minute token lifetime).
  - Candidates are never redirected to `/login` unless token refresh itself fails.

---

## 2. Issue 2 — Next Question Button After Coding

### Root Causes
1. **Invalid `next_question_suggestion` in Backend**: In `backend/main.py`'s `submit_code_endpoint`, successful code evaluation hardcoded `next_question_suggestion = "Great work completing the live coding round!"`. When the user subsequently clicked "Next Question", `next_question` in `backend/modules/interview_manager.py` retrieved this string and returned it as Question 3 (`"Great work completing the live coding round!"`), which broke question flow and prompt evaluation.
2. **Missing State Notification in Frontend**: When a candidate completed the coding task in `CodingRoundCard.jsx`, submission updated `CodingRoundCard`'s local state but did NOT notify `InterviewPage.jsx`. As a result, `InterviewPage`'s `feedback` state remained `null`, leaving the right sidebar "Next Question" button disabled (`disabled={!feedback}`).
3. **401 Session Expiry During Coding**: Solving a coding problem easily exceeded 15 minutes, triggering 401 token expiry on submission or next question calls, which previously logged out the user.
4. **Silent Error Swallowing**: `fetchNextQuestion` caught errors silently in console without alerting the candidate when network or API requests failed.

### Exact Files Changed
1. `backend/main.py`
2. `backend/modules/interview_manager.py`
3. `frontend/src/components/interview/CodingRoundCard.jsx`
4. `frontend/src/InterviewPage.jsx`

### API Endpoints Involved
- `/api/auth/refresh` (POST)
- `/api/start-interview` (POST)
- `/api/interview/{session_id}/coding-question` (GET)
- `/api/interview/{session_id}/run-code` (POST)
- `/api/interview/{session_id}/submit-code` (POST)
- `/api/next-question` (POST)

### How Next Question Flow Operates Now
1. Candidate works on coding problem in `CodingRoundCard`.
2. Candidate submits solution -> `submit_code_endpoint` evaluates submission and generates a valid next interview question in the DB evaluation record.
3. `CodingRoundCard` invokes `onCodeSubmitted(evalData)` callback -> `InterviewPage` sets `feedback` and `hasSubmittedCoding = true`.
4. Right sidebar "Next Question" button and `CodingRoundCard` CTA button both become enabled.
5. Clicking "Next Question" displays loading spinner ("Fetching Next Question..."), calls `api_next_question`, retrieves the valid next technical/behavioral question from backend, resets submission states, unmounts coding view, and renders Question 3 smoothly.
6. If any request receives a 401, single-flight token refresh auto-renews the access token and retries seamlessly.
7. If an API request fails, a dismissible error notification banner is rendered in the UI.

---

## 3. Tests Performed & Results

### Automated Backend Tests
- **Suite 1 (`tests/test_coding_round.py`)**: 3/3 Passed OK.
- **Suite 2 (`tests/test_coding_api_integration.py`)**: 3/3 Passed OK.
- **Suite 3 (`tests/test_auth_and_interview_fixes.py`)**: 2/2 Passed OK.
  - Verified `ACCESS_TOKEN_EXPIRE_MINUTES` constant >= 60.
  - Verified JWT decoded `exp` timestamp delta >= 60 minutes.
  - Verified post-coding `/api/next-question` endpoint returns a valid interview question (and not `"Great work completing..."`).
- **Full Backend Test Discovery (`tests/`)**: 28/28 Passed OK.

### Frontend Build
- **Vite Production Build (`npm run build`)**: Completed with 0 errors, output written to `frontend/dist`.

---

## 4. Final Result
Both critical production issues have been completely fixed, verified by automated unit tests and production build verification, preserving all existing architecture, security constraints, and UI design without breaking changes.
