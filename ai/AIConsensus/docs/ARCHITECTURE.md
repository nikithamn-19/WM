# System Architecture Documentation: WanderMatch

**Product**: WanderMatch — Social & Group Travel Planning with an AI Consensus Planner  
**Hackathon**: KogniVera Hackathon 2026 (Problem Statement PS-11, Travel & Tourism Theme)  
**Team**: Chaosminds (Nikitha M N — Frontend, Panchami P — Backend + Auth, P Nithya — Setup/Integration/Deploy + AI/Consensus)

---

## 1. System Architecture Diagram

WanderMatch is built on a **Single Orchestrator Architecture**. The **React/TypeScript** frontend is strictly a user interface layer and **never** communicates directly with PostgreSQL, the hosted LLM API, Cloudinary, or the Python face service. Every request passes through **FastAPI**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            Users (Browser / Mobile)                          │
│                            React + TypeScript Frontend                       │
└──────────────────────────────────────┬──────────────────▲────────────────────┘
                                       │ REST API         │ WebSocket Events
                                       │ (camelCase)      │ (verb-first camelCase)
┌──────────────────────────────────────▼──────────────────┴────────────────────┐
│                           FastAPI Single Orchestrator                        │
│               (Auth Check, Business Logic, REST & WebSocket Hub)             │
├─────────────────┬─────────────────┬───────────────────┬──────────────────────┤
│ PostgreSQL DB   │ Clerk Auth      │ Hosted LLM API    │ Cloudinary & Python  │
│ (System of      │ (User Webhook   │ (Gemini / Claude /│ Face Service         │
│  Record)        │  & JWT Sync)    │  Ollama Local)    │ (DeepFace/ArcFace)   │
└─────────────────┴─────────────────┴───────────────────┴──────────────────────┘

```

> **Isolation Constraint**: The React frontend NEVER connects directly to PostgreSQL, the hosted LLM API, Cloudinary, or the face service — all operations are proxied and orchestrated exclusively through FastAPI.

---

## 2. Mode A / Mode NA Architecture Split

The consensus system is architected as a **shared, mode-agnostic core** sitting underneath two thin, separate orchestrators:

```
┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────────────┐
│             mode_a_orchestrator              │  │             mode_na_orchestrator             │
│ (Admin-Led: Trip owner final authority;      │  │ (Collaborative: 10-min timer on 1st NO vote; │
│  advisory round cap; manual admin triggers) │  │  auto-branching on fixed requirements)       │
└──────────────────────┬───────────────────────┘  └──────────────────────┬───────────────────────┘
                       │                                                 │
 ──────────────────────┴─────────────────────────────────────────────────┴──────────────────────
                                    SHARED MODE-AGNOSTIC CORE
 ───────────────────────────────────────────────────────────────────────────────────────────────
   ├── blended_plan_generator       : Generates single compromise plan from typed NO comments
   ├── branch_trigger_classifier    : Classifies incompatible preferences into branch clusters
   ├── branch_grouping              : Merges duplicates & auto-resolves single-member branches
   └── hard_constraint_validator    : Validates time/location/transport limits before UI display
```

- **Shared Mode-Agnostic Core**: Contains `blended_plan_generator`, `branch_trigger_classifier`, `branch_grouping`, and `hard_constraint_validator`. It executes core consensus algorithms without any hardcoded knowledge of trip modes.
- **`mode_a_orchestrator`**: Thin orchestrator for Admin-Led trips. Implements advisory round caps, manual admin overrides, and explicit approval triggers.
- **`mode_na_orchestrator`**: Thin orchestrator for Collaborative trips. Automatically initializes the 10-minute response timer upon the 1st `no` vote, manages soft-capped round iterations (~3 rounds), and triggers early branching when fixed objections land.

---

## 3. Face Recognition Module Architecture Block (OPTIONAL)

The Face Recognition module is a fully isolated architecture block:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       Face Recognition Module (Optional)                     │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ Registration Service                 │ Matching Service                      │
│ • Accepts 3 reference photos         │ • Triggers on trip photo upload       │
│ • Quality check (exactly 1 face)     │ • Compares faces ONLY against         │
│ • ArcFace embedding generator        │   registered members of THAT SPECIFIC │
│ • Secure face_profiles storage       │   trip (never global database)        │
│ • Never exposes raw embeddings in    │ • Confidence threshold check         │
│   public API responses               │   (matches < threshold stay Unknown)  │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

- **Isolation Guarantee**: The module is completely decoupled from all core features (Itinerary, Proposals, Voting, Chat, Solo Matchmaker).
- **UI Gating**: Frontend screens work against a dummy "registered" state regardless of whether this backend module is active. The shared Trip Photo Gallery remains fully visible to all members; only the personal "My Photos" view is gated behind face registration.

---

## 4. WebSocket Broadcast Design

FastAPI manages a dedicated WebSocket broadcast hub per trip (`/ws/trips/{trp_id}/{usr_id}`):

- **Event Protocol**: All WebSocket events use verb-first `camelCase`:
  1. `voteCast`: Emitted when a vote is recorded.
  2. `proposalCreated`: Emitted when a proposal is submitted.
  3. `branchConfirmed`: Emitted when a branch choice is confirmed.
  4. `slotStatusChanged`: Emitted when a slot transitions (`EMPTY`, `IN_CONSENSUS`, `BRANCHED`, `CONFIRMED`).
  5. `aiPlanGenerated`: Emitted when a new blended plan is generated.
- **Scaling Architecture Note**: A Redis-backed connection manager is a documented future option for multi-instance scaling, not required for the hackathon build.

---

## 5. Directory-Level Ownership Mapping

To ensure architecture documentation and code organization never drift apart:

- **`frontend/src/`**: React components, locked visual system styling, TypeScript type contracts, and `TripContext` WebSocket listener.
- **`backend/app/`**: FastAPI REST routes, Pydantic camelCase schemas, SQLAlchemy database models, and WebSocket connection manager.
- **`backend/ai/`**: Shared mode-agnostic consensus core (`blended_plan_generator`, `branch_trigger_classifier`, `branch_grouping`, `hard_constraint_validator`), and deterministic solo matchmakers.
- **`infra/`**: Render backend configuration, Vercel frontend configuration, PostgreSQL migration scripts, and seed data scripts.
