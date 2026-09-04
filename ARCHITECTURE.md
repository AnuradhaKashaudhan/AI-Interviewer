# System Architecture: AI Interviewer — AI-Powered Career Intelligence & Agentic Commerce Platform

## 1. System Overview

```
Candidate / User
        │
        ▼
React 18 + Vite Frontend (AppShell, Pricing, Upgrade, Dashboard, Billing)
        │
        ├── JWT Access Token (Memory) + httpOnly Refresh Cookie
        ▼
FastAPI Backend (Port 8000)
        │
        ├── Auth Module (JWT HS256, bcrypt)
        ├── Interview Manager & ATS Checker
        ├── Coding Evaluator (Piston API + Subprocess Fallback)
        ├── AI Career Intelligence Agent (Signal Aggregator & Readiness Scorer)
        ├── Centralized Server-Side Plan Catalog (Free, Pro, Advanced)
        ├── Razorpay Payment Service (Orders API, HMAC SHA256 Signature Verification)
        ├── Entitlement Service (Access Control & Subscription Management)
        └── Audit Service (Traceability & Security Logs)
                │
                ├── Razorpay Orders & Webhook Services
                │
                ▼
        SQLite / PostgreSQL Database
          (users, sessions, payment_orders, payments, subscriptions, 
           webhook_events, ai_career_recommendations, audit_logs)
```

---

## 2. Payment Lifecycle & Security Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User as Candidate
    participant FE as React Frontend (/upgrade)
    participant BE as FastAPI Backend (/payments/create-order)
    participant RZP as Razorpay Orders API
    participant DB as SQLAlchemy DB

    User->>FE: Click "Continue to Payment"
    FE->>BE: POST /api/payments/create-order { plan_id: "pro" }
    Note over BE: 1. Authenticate user JWT<br/>2. Resolve price server-side (₹19 -> 1900 paise)<br/>3. Create PaymentOrder (status: CREATED)
    BE->>RZP: POST /v1/orders { amount: 1900, currency: "INR" }
    RZP-->>BE: Return razorpay_order_id (order_xxx)
    BE-->>FE: Return { key_id, order_id, amount, currency }
    
    FE->>User: Launch Razorpay Web Checkout JS Modal
    User->>FE: Complete Payment (Card/UPI Test Mode)
    FE->>BE: POST /api/payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    
    Note over BE: 4. Compute HMAC SHA256 over order_id|payment_id<br/>5. Verify signature against RAZORPAY_KEY_SECRET<br/>6. Mark order status: VERIFIED<br/>7. Idempotently grant Subscription entitlement<br/>8. Write entry to AuditLog
    
    BE-->>FE: Return { verified: true, plan_id: "pro" }
    FE->>User: Redirect to /payment/success & unlock /dashboard features

    opt Async Webhook Confirmation
        RZP->>BE: POST /api/webhooks/razorpay (X-Razorpay-Signature)
        Note over BE: Verify raw body HMAC signature against WEBHOOK_SECRET.<br/>Deduplicate event ID & update order status.
    end
```

---

## 3. Security & Compliance Principles

1. **Server-Side Price Authority**: The frontend can send `plan_id="pro"`, but the backend resolves the authoritative price (`1900` paise). Frontend amounts are never trusted.
2. **HMAC SHA256 Verification**: Payment authorization requires server-side HMAC SHA256 calculation over `razorpay_order_id|razorpay_payment_id`.
3. **Idempotency**: Signature verification and webhook handling deduplicate requests using server order IDs and `WebhookEvent` records (`external_event_id`).
4. **Secret Isolation**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` reside exclusively on the server and are never exposed to client JavaScript.
5. **Agentic Commerce Guardrail**: AI recommends plans based on candidate performance signals, but **never** initiates financial transactions without explicit user click and authorization.
