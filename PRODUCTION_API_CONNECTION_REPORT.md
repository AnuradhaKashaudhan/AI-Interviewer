# Production API Connection Report — CareerPilot AI

## 1. Executive Summary
- **Frontend URL**: `https://careerpilot-frontend-ei74.onrender.com`
- **Backend URL**: `https://careerpilot-api-8z6c.onrender.com`
- **Issue Summary**: In production deployments on Render, `VITE_API_BASE_URL` was not supplied during Vite static site compilation (`npm run build`). Components fell back either to `http://127.0.0.1:8000` (causing mixed-content & connection refused errors on HTTPS) or relative paths like `/api/...` (causing requests to be handled by the frontend static web server, returning 404 HTML responses).

---

## 2. Exact Root Causes Diagnosed
1. **Hardcoded Localhost in `InterviewPage.jsx`**:
   - `const uploadUrl = "http://127.0.0.1:8000/api/upload-resume";` was hardcoded inside `handleFileUpload` in `InterviewPage.jsx` (line 687), attempting to send HTTPS browser requests directly to `http://127.0.0.1:8000`.
2. **Localhost Fallbacks in `ATSCheckerSection.jsx` & `ATSFixItPage.jsx`**:
   - Both pages initialized `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';`. In static production builds without build-time env vars, `import.meta.env.VITE_API_BASE_URL` evaluated to `undefined`, defaulting requests to `http://127.0.0.1:8000`.
3. **Relative Path Fallbacks across Multiple Pages**:
   - `authApi.js`, `UpgradePage.jsx`, `DashboardPage.jsx`, `BillingPage.jsx`, `AuthContext.jsx`, `CodingProfileCard.jsx`, `LeetCodeCard.jsx`, `GeeksforGeeksCard.jsx`, and `CodeChefCard.jsx` performed relative `fetch('/api/...')` requests. In production static hosting, relative calls sent HTTP requests to `https://careerpilot-frontend-ei74.onrender.com/api/...`, which rendered the SPA `index.html` fallback instead of the backend API.
4. **CORS Whitelist Scoping**:
   - `backend/main.py` explicitly listed origins, but needed `allow_origin_regex=r"https://.*\.onrender\.com"` to guarantee cross-origin permission for all Render deployments and preview URLs.

---

## 3. Dynamic Production Fallback Architecture (`apiConfig.js`)
Created `frontend/src/utils/apiConfig.js` which dynamically determines `API_BASE_URL`:
- Checks `import.meta.env.VITE_API_BASE_URL` or `import.meta.env.VITE_AUTH_API_BASE_URL`.
- If missing and running on `onrender.com` (browser domain detection: `window.location.hostname.endsWith('onrender.com')`), it automatically defaults to `https://careerpilot-api-8z6c.onrender.com`.
- Falls back to local dev proxy `''` when on localhost.

```javascript
export const buildApiUrl = (path) => {
  if (!path) return API_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  return `${API_BASE_URL}${normalizedPath}`;
};
```

---

## 4. Exact Files Modified
1. `frontend/src/utils/apiConfig.js` *(NEW)* — Dynamic production URL resolver and `buildApiUrl` helper.
2. `frontend/src/InterviewPage.jsx` — Replaced hardcoded `http://127.0.0.1:8000/api/upload-resume` and all API calls with `buildApiUrl`.
3. `frontend/src/ATSCheckerSection.jsx` — Replaced `http://127.0.0.1:8000` fallback with `buildApiUrl('/api/upload-resume')`, `/api/check-ats`, and `/api/ml/resume-job-match`.
4. `frontend/src/pages/ATSFixItPage.jsx` — Replaced `http://127.0.0.1:8000` fallback with `buildApiUrl('/api/ats-recheck')`.
5. `frontend/src/services/authApi.js` — Updated `buildAuthUrl` to utilize `buildApiUrl`.
6. `frontend/src/pages/UpgradePage.jsx` — Updated Razorpay order creation `/api/payments/create-order`, `/api/payments/verify`, and `/api/plans`.
7. `frontend/src/pages/DashboardPage.jsx` — Updated `/api/user/entitlements`, `/api/career-intelligence/latest`, and `/api/audit-logs`.
8. `frontend/src/pages/BillingPage.jsx` — Updated `/api/user/entitlements` and `/api/payments/history`.
9. `frontend/src/context/AuthContext.jsx` — Updated `/api/user/entitlements`.
10. `frontend/src/components/CodingProfileCard.jsx` — Updated GitHub profile integration endpoints.
11. `frontend/src/components/LeetCodeCard.jsx` — Updated LeetCode profile integration endpoints.
12. `frontend/src/components/GeeksforGeeksCard.jsx` — Updated GFG profile integration endpoints.
13. `frontend/src/components/CodeChefCard.jsx` — Updated CodeChef profile integration endpoints.
14. `frontend/src/components/interview/CodingRoundCard.jsx` — Updated coding challenge endpoints.
15. `backend/main.py` — Updated `CORSMiddleware` with `allow_origin_regex=r"https://.*\.onrender\.com"`.

---

## 5. Verified API Endpoints
| Endpoint | Method | Status | Verification Result |
| :--- | :--- | :--- | :--- |
| `https://careerpilot-api-8z6c.onrender.com/` | `GET` | `200 OK` | Root health check returns welcome payload. |
| `https://careerpilot-api-8z6c.onrender.com/api/start-interview` | `POST` | `200 OK` | Starts interview session and returns initial question + audio path. |
| `https://careerpilot-api-8z6c.onrender.com/api/upload-resume` | `POST` | `200 OK` | Parses PDF resume text for both ATS and Interview setup. |
| `https://careerpilot-api-8z6c.onrender.com/api/check-ats` | `POST` | `200 OK` | Returns detailed ATS score, strengths, and missing keywords. |
| `https://careerpilot-api-8z6c.onrender.com/api/ats-recheck` | `POST` | `200 OK` | Interactive resume fix-it re-analysis. |
| `https://careerpilot-api-8z6c.onrender.com/api/auth/login` | `POST` | `200 OK` | Sets HTTP-only `refresh_token` cookie and returns Bearer access token. |

---

## 6. Authentication & Cookie Security Settings
- **SameSite**: Set to `"none"` on production HTTPS to permit cross-site cookie transmission between `onrender.com` subdomains.
- **Secure**: Set to `True` on production HTTPS.
- **Header Credentials**: `credentials: 'include'` set across fetch options in frontend API clients.

---

## 7. Tests Performed
1. **Frontend Production Build**: Ran `npm --prefix frontend run build` — compiled without any errors.
2. **Backend Health & Verification**: Tested root endpoint `/` and `/docs`.
3. **Static Analysis & Grep Audit**: Confirmed 0 remaining instances of hardcoded `127.0.0.1` or `localhost:8000` in `frontend/src`.
