# Deployment & Operations Documentation: WanderMatch

**Product**: WanderMatch — Social & Group Travel Planning with an AI Consensus Planner  
**Hackathon**: KogniVera Hackathon 2026 (Problem Statement PS-11, Travel & Tourism Theme)  
**Team**: Chaosminds (Nikitha M N — Frontend, Panchami P — Backend + Auth, P Nithya — Setup/Integration/Deploy + AI/Consensus)

---

## 1. Deployment Targets & Infrastructure Stack

| Service Component | Target Infrastructure Host | Description & Tech Stack |
| :--- | :--- | :--- |
| **Frontend UI** | **Vercel** | React 18, TypeScript, Tailwind CSS, Vite build output. Serves static bundle and connects via REST/WebSockets to backend. |
| **Backend Orchestrator** | **Render** | FastAPI web service running Python 3.11+, Uvicorn server, SQLAlchemy ORM, and WebSocket connection hub. |
| **Database System of Record** | **Managed PostgreSQL (Render/Neon)** | PostgreSQL 15+ instance executing PS-11 schema + additive tables (`branches`, `trip_chat_messages`, `face_profiles`). |
| **Optional Face Recognition Service** | **Render** | Isolated Python worker service running DeepFace / ArcFace embedding extraction logic. |
| **Authentication Service** | **Clerk (Hosted)** | User identity management, social logins, and webhook event emitter syncing users to PostgreSQL. |
| **Photo Storage & CDN** | **Cloudinary** | Cloud photo upload storage and CDN image delivery. |
| **AI LLM Engine** | **Hosted LLM API (Gemini/Claude)** | Third-party hosted LLM API for blended plan generation and multi-way branch classification. |

---

## 2. Environment Variables Matrix (`.env.example`)

Below are the required environment configuration keys for production deployment:

```bash
# --- CLERK AUTHENTICATION ---
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...    # Clerk publishable API key for React frontend auth SDK
CLERK_SECRET_KEY=sk_test_...             # Clerk secret key for FastAPI JWT validation middleware
CLERK_WEBHOOK_SECRET=whsec_...           # Secret for verifying Clerk user creation webhooks

# --- DATABASE CONNECTION ---
DATABASE_URL=postgresql://user:pass@ep-host.render.com/wandermatch_db?sslmode=require # Production PostgreSQL connection string

# --- LLM API ENGINE ---
GEMINI_API_KEY=AIzaSy...                 # API key for hosted/local LLM consensus blended plan & branch generator


# --- CLOUDINARY MEDIA STORAGE ---
CLOUDINARY_CLOUD_NAME=wandermatch         # Cloudinary cloud identifier for trip photo uploads
CLOUDINARY_API_KEY=123456789             # Cloudinary API authentication key
CLOUDINARY_API_SECRET=abc123xyz...       # Cloudinary secret key for signed upload signatures

# --- BACKEND CORS & WEBSOCKET URLS ---
VITE_API_BASE_URL=https://wandermatch-api.onrender.com # Production FastAPI REST endpoint base URL
VITE_WS_BASE_URL=wss://wandermatch-api.onrender.com/ws # Production WebSocket endpoint base URL
```

---

## 3. Sequential Deployment Pipeline

To prevent race conditions, deployment MUST proceed in the following strict order:

```
┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
│   Step 1: Database     │ ──► │   Step 2: Backend      │ ──► │   Step 3: Frontend     │ ──► │   Step 4: Smoke Test   │
│   Provision & Seed     │     │   Render Deployment    │     │   Vercel Deployment    │     │   End-to-End Live Check│
└────────────────────────┘     └────────────────────────┘     └────────────────────────┘     └────────────────────────┘
```

1. **Step 1: Database Provisioning & Schema Migration**:
   - Provision Managed PostgreSQL instance.
   - Run SQL DDL scripts to create PS-11 verbatim tables (`usr_`, `trp_`, `itm_`, `prp_`, `vot_`, `gid_`) and additive tables (`branches`, `trip_chat_messages`, `face_profiles`).
   - Run `seed_data.sql` script to load 27,428 rows of reference data and initial demo profiles.
2. **Step 2: Backend Deployment on Render**:
   - Deploy FastAPI application repository branch to Render.
   - Configure environment variables (`DATABASE_URL`, `GEMINI_API_KEY`, `CLERK_SECRET_KEY`).
   - Verify health check endpoint returns `HTTP 200 OK` at `https://wandermatch-api.onrender.com/api/health`.
3. **Step 3: Frontend Deployment on Vercel**:
   - Deploy React Vite repository to Vercel.
   - Set environment variables (`VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`) pointing directly to the live Render backend URL.
4. **Step 4: Production End-to-End Smoke Test**:
   - Perform live smoke test on the production Vercel URL (not localhost).
   - Verify dual-browser live WebSocket syncing (`voteCast`), proposal creation, AI blended plan generation, and deterministic solo matching.

---

## 4. Rollback & Emergency Strategy

> [!WARNING]
> **Production Branch Protection Rule**: The `main` git branch MUST remain in a 100% demo-safe, deployable state at all times.

- If a deployment failure or unexpected bug occurs during the hackathon judging window:
  - **DO NOT debug live** or push unverified hotfixes directly during the judging session.
  - Immediately perform a 1-click redeploy of the **last known-good commit from `main`** on Vercel and Render dashboards.
  - Verify that the previous stable production build is serving successfully.

---

## 5. Offline Fallback Deliverable (Phase 3 Requirement)

> [!IMPORTANT]
> **Mandatory Fallback Deliverable**: A pre-recorded video recording of the entire live product demo is a **REQUIRED Phase 3 deliverable**, not an optional extra.

- **Purpose**: Protects against unexpected venue Wi-Fi failure, network latency spikes, or cloud service outages during live judging.
- **Specification**: High-resolution screen capture stored locally on the presentation laptop demonstrating:
  1. Live itinerary editing and presence across two simulated user profiles.
  2. Mode NA 10-minute timer start on 1st `no` vote with typed reason.
  3. AI blended plan output and multi-way branch fork on the Route Line (Clay `#C1502E`).
  4. Unanimous Trip Chat proposal override.
  5. Deterministic Solo Matchmaker results for groups and tour guides.
