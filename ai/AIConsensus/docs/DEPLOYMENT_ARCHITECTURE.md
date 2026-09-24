# Deployment Architecture Documentation: Infrastructure & Physical Topology

**Product**: WanderMatch — Social & Group Travel Planning with an AI Consensus Planner  
**Hackathon**: KogniVera Hackathon 2026 (Problem Statement PS-11, Travel & Tourism Theme)  
**Team**: Chaosminds (Nikitha M N — Frontend, Panchami P — Backend + Auth, P Nithya — Setup/Integration/Deploy + AI/Consensus)

---

## 1. Physical Infrastructure & Hosting Topology Diagram

This document formalizes the **physical/infrastructure view** of WanderMatch, detailing host environments, service boundaries, and egress network paths across production cloud providers.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PUBLIC INTERNET / CLIENT BROWSERS                                                      │
└───────────────────────────┬───────────────────────────────────▲────────────────────────┘
                            │ HTTPS                             │ WSS / WebSockets
                            │                                   │ (camelCase events)
┌───────────────────────────▼───────────────────────────────────┴────────────────────────┐
│ VERCEL EDGE NETWORK                                                                    │
│ • Static Assets & React HTML5/JS Application Bundle                                    │
│ • Edge CDN Caching & Global DNS Routing                                                │
└───────────────────────────┬────────────────────────────────────────────────────────────┘
                            │ HTTPS REST & WSS WebSockets
                            │
┌───────────────────────────▼────────────────────────────────────────────────────────────┐
│ RENDER CLOUD HOSTING (PRIMARY BACKEND SUITE)                                           │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Render Web Service 1: FastAPI Orchestrator App (Python 3.11 / Uvicorn)           │ │
│ │ • Public HTTPS REST endpoints & WebSocket Hub (/ws/trips/{trp_id}/{usr_id})        │ │
│ └───────┬───────────────────────────────┬───────────────────────────────┬────────────┘ │
│         │                               │                               │              │
│         │ Internal Process Call         │ HTTPS                         │ HTTPS        │
│ ┌───────▼─────────────────────────────┐ │                               │              │
│ │ Render Web Service 2 (Optional):    │ │                               │              │
│ │ Python DeepFace/ArcFace Service     │ │                               │              │
│ └─────────────────────────────────────┘ │                               │              │
└─────────┬───────────────────────────────┼───────────────────────────────┼──────────────┘
          │                               │                               │
          │ Internal TLS Connection       │ Outbound HTTPS                │ Outbound HTTPS
┌─────────▼─────────────────────────────┐ │                               │
│ MANAGED POSTGRESQL (Render/Neon)      │ │                               │
│ • Private System of Record Database   │ │                               │
│ • PS-11 Tables + Additive Tables      │ │                               │
└───────────────────────────────────────┘ │                               │
                                ┌─────────▼─────────────────────┐ ┌───────▼──────────────┐
                                │ HOSTED LLM API (Gemini/Claude)│ │ CLOUDINARY MEDIA CDN │
                                │ • Blended Plan Generation     │ │ • Photo Storage      │
                                │ • Multi-Way Branch Classifier │ │ • Image Delivery CDN │
                                └───────────────────────────────┘ └──────────────────────┘
```

> **Strict Proxy Rule**: React client applications running in the browser connect **only** to the Vercel Edge Network and the Render FastAPI public endpoints. Clients **never** establish direct connections to Managed PostgreSQL, Cloudinary, Clerk Webhooks, or the hosted LLM API.

---

## 2. Network Boundaries & Security Isolation

- **Publicly Reachable Surface**:
  - **Vercel Static CDN**: Serves the built React HTML/JS/CSS bundle over public HTTPS.
  - **FastAPI Public Endpoint**: Exposes public REST endpoints (`https://wandermatch-api.onrender.com/api/...`) and WebSocket channels (`wss://wandermatch-api.onrender.com/ws/...`) over TLS.
- **Internal / Protected Infrastructure Boundary**:
  - **Managed PostgreSQL Database**: Protected by strong authentication and SSL connection encryption (`sslmode=require`). The database instance accepts connections **exclusively** via FastAPI connection string credentials; it is NEVER exposed directly to public client browsers.
  - **Hosted LLM API & Cloudinary**: Managed third-party services accessed strictly via server-side HTTP calls initiated by FastAPI using secret API key environment variables (`GEMINI_API_KEY`, `CLOUDINARY_API_SECRET`).

---

## 3. Scaling Topology Notes (Documented Future Scope)

> [!NOTE]
> **Future Multi-Instance Scaling Architecture**: For post-hackathon production scaling across multiple backend application instances, the in-memory WebSocket connection manager is designed to be swapped for a **Redis-backed Pub/Sub Connection Manager**.

This Redis message broker layer will handle cross-instance WebSocket event fan-out, ensuring `voteCast` and `slotStatusChanged` events propagate seamlessly regardless of which instance holds a specific client's WebSocket connection. For the hackathon single-orchestrator deployment, in-memory WebSocket connection tracking on Render is fully sufficient and required.

---

## 4. Checkpoint 2 (Hour 21) Deployment Definition of Done

> [!IMPORTANT]
> **Checkpoint 2 (Hour 21) Deployment Requirement**: Deployment is considered "DONE" **only** when the complete user flow—trip creation, real-time binary voting, Mode A / Mode NA AI consensus reconciliation, multi-way branch split rendering on the Route Line, unanimous chat overrides, and deterministic solo matching—is fully reachable and verified working end-to-end against the **live deployed production URLs** (`https://wandermatch.vercel.app` and `https://wandermatch-api.onrender.com`), not merely running on `localhost`.
