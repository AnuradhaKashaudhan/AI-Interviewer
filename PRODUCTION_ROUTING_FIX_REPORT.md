# Production SPA Routing & Direct URL Fix Report

**Project Name**: CareerPilot AI  
**Deployment URLs**:
- Frontend: `https://careerpilot-frontend-ei74.onrender.com`
- Backend API: `https://careerpilot-api-8z6c.onrender.com`  
**Date**: September 5, 2026  

---

## Executive Summary
This report documents the root cause, configuration fixes, build verification, and deployment instructions for resolving direct URL `"Not Found"` (HTTP 404) errors on the **CareerPilot AI** deployed static site.

---

## 1. Root Cause Analysis

### Why Direct URLs Returned 404 "Not Found"
- The frontend application is a single-page React application using React Router's `BrowserRouter` (`history.pushState` HTML5 routing).
- When navigating *inside* the application (e.g. clicking links), React Router manages page views dynamically without triggering a server request.
- However, when a candidate directly enters a URL like `https://careerpilot-frontend-ei74.onrender.com/login` or refreshes `https://careerpilot-frontend-ei74.onrender.com/dashboard` in their browser, the browser sends an HTTP GET request to Render's web server for the path `/login` or `/dashboard`.
- Render's default static web server looked for physical files at `dist/login` or `dist/dashboard`. Because single-page applications only produce a single `dist/index.html` file, Render returned its default `404 Not Found` response.

---

## 2. Solution & SPA Rewrite Configuration

To ensure all frontend route requests fall back to `/index.html` with an HTTP 200 status code (allowing React Router to intercept the URL and mount the corresponding view), three complementary SPA rewrite rules were implemented:

### A. Render `_redirects` Publish Rule (`frontend/public/_redirects`)
Created `frontend/public/_redirects` containing:
```text
/*   /index.html   200
```
Updated `frontend/package.json` build script so that `_redirects` is copied to `frontend/dist/_redirects` during `npm run build`. Render Static Sites automatically parse `_redirects` in the publish directory.

### B. Render Blueprint File (`render.yaml`)
Created `render.yaml` at repository root defining SPA rewrite routes:
```yaml
services:
  - type: static
    name: careerpilot-frontend
    rootDir: frontend
    buildCommand: npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html

  - type: web
    name: careerpilot-api
    env: python
    rootDir: .
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

### C. Render Dashboard UI Setting (Manual Step for Instant Effect)
In the Render Dashboard for **careerpilot-frontend** (Static Site) -> **Redirects / Rewrites**:
- **Type**: `Rewrite`
- **Source**: `/*`
- **Destination**: `/index.html`

---

## 3. Application Routes Verified

The frontend uses `BrowserRouter` in `frontend/src/App.jsx`. All defined application routes are supported:

| Route Path | View Component | Access Type | Fallback Target |
| :--- | :--- | :---: | :---: |
| `/` | `HomePage` | Public | `/index.html` |
| `/login` | `LoginPage` | Public | `/index.html` |
| `/signup` | `SignupPage` | Public | `/index.html` |
| `/dashboard` | `DashboardPage` | Protected | `/index.html` |
| `/features` | `FeaturesPage` | Public | `/index.html` |
| `/ats-checker` | `ATSCheckerPage` | Public | `/index.html` |
| `/ats-checker/fix` | `ATSFixItPage` | Public | `/index.html` |
| `/coding-profile` | `CodingProfilePage` | Public | `/index.html` |
| `/pricing` | `PricingPage` | Public | `/index.html` |
| `/support` | `SupportPage` | Public | `/index.html` |
| `/profile` | `ProfilePage` | Public | `/index.html` |
| `/settings` | `SettingsPage` | Public | `/index.html` |
| `/interview` | `InterviewPage` | Protected | `/index.html` |
| `/interview/new` | `InterviewSetupPage` | Protected | `/index.html` |
| `/upgrade` | `UpgradePage` | Protected | `/index.html` |
| `/payment/success` | `PaymentSuccessPage` | Protected | `/index.html` |
| `/payment/failed` | `PaymentFailedPage` | Protected | `/index.html` |
| `/billing` | `BillingPage` | Protected | `/index.html` |

---

## 4. Files Created / Modified

1. `frontend/public/_redirects` (New): SPA rewrite rule `/* /index.html 200`.
2. `render.yaml` (New): Blueprint specification for static site rewrites.
3. `frontend/package.json` (Modified): Updated build script to copy `_redirects` to `dist/_redirects`.
4. `PRODUCTION_ROUTING_FIX_REPORT.md` (New): Full audit and verification report.

---

## 5. Verification & Build Results

### Frontend Vite Production Build
- Command: `npm run build` in `frontend/`
- Output: `dist/index.html` (1.02 kB) and `dist/_redirects` (23 B) generated cleanly without build errors.

### Backend API Isolation
- Backend API domain (`https://careerpilot-api-8z6c.onrender.com`) remains entirely decoupled on a separate Render Web Service instance.
- Frontend API calls continue to target `https://careerpilot-api-8z6c.onrender.com/api/*`.
