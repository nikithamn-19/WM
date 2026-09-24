# WanderMatch — Implementation Plan

**PS-11 · KogniVera Hackathon 2026 · Team Chaosminds**  
**Sprint Window**: 24h Sprint (24 Sep 12:00 → 25 Sep 12:00)

This is the single source of truth for who builds what, when, in which directory, and how parallel tracks merge without conflict.

---

## 1. People, Laptops, & Track Ownership

| Team Member | Laptops | Track(s) Owned | Ownership Directory Scope |
| :--- | :--- | :--- | :--- |
| **Nikitha M N** | 1 | **Frontend** | `frontend/src/` |
| **Panchami P** | 1 | **Backend + Auth (Clerk)** | `backend/app/` |
| **P Nithya** | 2 | **Track 1**: Setup / Integration / Deploy<br>**Track 2**: AI / Consensus Engine | `infra/`, root configs<br>`backend/ai/` |

- **Parallel Execution Safety**: P Nithya operates two Antigravity sessions across two laptops (Session A: Setup/Deploy, Session B: AI/Consensus). This is 100% collision-free because `infra/` and `backend/ai/` touch disjoint directory trees.

---

## 2. The Naming Contract (Read this before writing any code)

This is the single biggest conflict-preventer in the whole plan. Every track, every prompt, every session follows this without exception:

- **PostgreSQL and Python**: `snake_case` for every table, column, and internal variable — matches the provided PS-11 schema exactly, per Rule R1 (never rename or re-key provided fields).
- **FastAPI JSON responses**: `camelCase` at the API boundary. FastAPI/Pydantic models handle the `snake_case` → `camelCase` conversion; the frontend never sees a `snake_case` key.
- **TypeScript types**: match the `camelCase` API responses exactly, field for field. The frontend's dummy-data shapes (already locked in the UI/UX doc) already use this convention — do not invent new field names when wiring real data in, reuse the dummy names verbatim.
- **WebSocket event names**: `camelCase`, verb-first: `voteCast`, `proposalCreated`, `branchConfirmed`, `slotStatusChanged`, `aiPlanGenerated`. This exact list is the complete set for the MVP; do not add ad hoc events without updating this file.
- **IDs**: opaque, prefixed strings from the provided dataset conventions (`usr_`, `trp_`, `prp_`, `vot_`, etc. for provided tables; same pattern for new tables — `brc_` for branches, `bmb_` for branch_members, `rev_` for revision_history, `msg_` for trip_chat_messages, `fcp_` for face_profiles, `pho_` for photos). Never parsed, never assumed sequential.
- **Money**: always a `decimal(12,2)` + ISO-4217 currency code pair. Never a float, anywhere, on either side of the stack.
- **Enums**: lowercase `snake_case`, values only from `data/enums.json` for provided tables; new enums (slot status, branch status) follow the same style.
- **Votes are binary**: `value` is `yes` or `no` only. The dataset's `votes.value` enum technically allows abstain — do not use it. Treat it as a legacy value that exists in seed data but is never written by WanderMatch.
- **Votes.weight**: `votes.weight` exists in schema but is UNUSED for MVP.

> **Standing Instruction**: Paste this section into every phase's prompt, every time, regardless of track.

---

## 3. Directory Ownership — The Actual Conflict Firewall

| Directory | Owner | Ownership Scope & Rule (Nobody else touches without sign-off) |
| :--- | :--- | :--- |
| `/frontend/src/*` | **Nikitha** | All React/TS components, screens, hooks, Tailwind config |
| `/backend/app/*` | **Panchami** | FastAPI routes, DB models/migrations, WebSocket broadcast manager, Clerk webhook handler |
| `/backend/ai/*` | **Nithya (Laptop 2)** | Blended-plan generator, branch-trigger classifier, branch grouping, hard-constraint validator, compatibility scorers |
| `/infra/*`, `.env.example`, `/backend/services/face*`, `/backend/services/auth*` | **Nithya (Laptop 1)** | Repo/env setup, Clerk project config, Cloudinary, deploy config, optional face-recognition service |
| `PROJECT_MEMORY.md` | **Everyone (Append-only)** | Never edit someone else's entry, only add your own |

> **DB Schema Ownership Exception**: One shared file that needs a single owner for the day is the DB schema file(s) (`schema.sql` / migration files). **Panchami owns this** — she's the only one who edits it. If Nithya's AI track needs a new column or table (e.g. for `revision_history`), she requests it from Panchami rather than editing the schema herself. This is the one deliberate exception to "everyone stays in their own lane," because an uncoordinated schema is the single fastest way to break everyone at once.

---

## 4. Architecture — Properly Differentiated by Feature

### 4.1 Mode A vs Mode NA — Shared Core, Separate Orchestrators
```
/backend/ai/
  core/
    blended_plan_generator.py      <- mode-agnostic: reads proposals + votes + suggestions, returns ONE candidate
    branch_trigger_classifier.py   <- mode-agnostic: fixable tweak vs genuinely incompatible
    branch_grouping.py             <- mode-agnostic: clusters holdouts into N branches, recursive
    hard_constraint_validator.py   <- mode-agnostic: rejects a plan that breaks time/location/transport
  modes/
    mode_a_orchestrator.py         <- Admin-Led control flow ONLY: admin approval gates, advisory round cap
    mode_na_orchestrator.py        <- No-Admin control flow ONLY: fully automatic, hard round cap → auto-branch
```

### 4.2 Face Recognition — Fully Isolated, Optional Module
```
/backend/services/face/
  registration.py     <- capture quality-check, embedding generation (DeepFace.represent)
  matching.py          <- DeepFace.find against registered trip members, confidence threshold gate
  models.py            <- face_profiles, photos, photo_person table access
```

### 4.3 Solo-to-Group vs Solo-to-Guide — Two Scorers, One Pattern
- `group_compatibility_scorer.py`: age group, languages, interests, dates, against `trips`/`trip_members`/`user_preferences`.
- `guide_compatibility_scorer.py`: language, specialisation, price (and rating), against `tour_guides`.

---

## 5. Phases & Timeline Milestones

### Phase 0 — Docs & Contract Freeze (Hour 0–1)
One driver runs the eight document-generation prompts. Output: `PRD.md`, `TRD.md`, `DESIGN.md`, `DATABASE.md`, `ARCHITECTURE.md`, `AI.md`, `DEPLOYMENT.md`, `DEPLOYMENT_ARCHITECTURE.md` committed to repo.
- **Panchami**: Create Clerk project, get API keys, provision + seed Postgres from `PS-11.db`.
- **Nithya (Laptop 1)**: Repo created, branch structure set up, Cloudinary keys obtained, `.env.example` written.
- **Phase 0 Gate**: Does not end until schema file and API endpoint list are committed. Nobody starts Phase 1 against a changing schema.

### Phase 1 — Four Tracks in Parallel (Hour 1–8)
- **Nikitha (Frontend)**: Build all 12 screens from UI/UX doc against locked dummy data matching frozen contract field names verbatim. Zero real backend calls yet.
- **Panchami (Backend)**: Postgres migrations, FastAPI CRUD (`trips`, `trip_members`, `proposals`, `votes`), Clerk webhook → `users` row sync, WebSocket broadcast manager skeleton, `itineraries.version` optimistic-concurrency bump logic.
- **Nithya (Laptop 2 - AI)**: Build `core/` modules tested standalone against scripted JSON inputs built from `PS-11.db` rows.
- **Nithya (Laptop 1 - Setup/Integration)**: Cloudinary upload endpoint + gallery scaffold, mandatory Trip Chat over WebSocket, optional face registration capture flow scaffold.
- **Merge Cadence**: Every 1–2 hours, each track commits and merges into `develop`. Small, frequent merges.

### Checkpoint 1 — Core Working Demo (Hour 12)
Integration test. Everyone stops, confirms `develop` runs end-to-end: sign-up → create/join trip → itinerary → proposal → Yes/No with reason → live WebSocket update across dual tabs. Merge `develop` → `main` as safety net.

### Phase 2 — Wiring + Branching (Hour 12–19)
- **Nikitha (Frontend)**: Replace dummy-data hooks with real live calls (Postgres/WebSocket), Branch View + Confirm/Request Modification UI, Mode A admin-recommendation panel.
- **Panchami (Backend)**: `branches`/`branch_members` tables live, recursive branch endpoint, `mode_a_orchestrator.py` & `mode_na_orchestrator.py` wired to real votes.
- **Nithya (Laptop 2 - AI)**: Branch classifier + multi-way grouping tested on real 3–4-way scenario; solo-to-group and solo-to-guide scorers.
- **Nithya (Laptop 1 - Setup)**: Face recognition service integration (if comfortably ahead of schedule; cut first if Checkpoint 1 slipped).

### Checkpoint 2 — AI Working Demo (Hour 21)
Hard feature freeze (matches 09:00 rule). Full flow proven: proposal → No with reason → AI blended plan → re-vote → scripted branch → branch preview → confirm. Merge `develop` → `main`. Nothing new after this point by anyone.

### Phase 3 — Stabilize & Rehearse (Hour 21–24)
Fix only the rehearsed demo path. Clean seeded demo trip/disagreement/photos. Rehearse full demo twice on presentation machine. Record offline fallback in case of venue wifi failure.

---

## 6. Git Mechanics & Branching Rules

- **`main`**: Protected, only receives merges at Checkpoint 1 (Hour 12) and Checkpoint 2 (Hour 21), always demo-safe. No one touches `main` directly.
- **`develop`**: Shared integration branch, everyone merges here first.
- **Track Feature Branches** (branched from `develop`):
  - `feature/frontend` (Nikitha)
  - `feature/backend` (Panchami)
  - `feature/ai` (Nithya - Laptop 2)
  - `feature/setup` (Nithya - Laptop 1)
- **Git Workflow Rules**:
  1. Pull `develop` before every work session.
  2. Commit small, commit often.
  3. One-line PR self-review before merging into `develop` (even solo, re-read your own diff once before it merges).
  4. No one touches `main` directly.

---

## 7. What's Explicitly Out of Scope

- Multilingual support (English only, final).
- Admin-inactivity auto-fallback.
- Self-hosted LLM serving.
- Live face recognition during judging (bulk photo matching is pre-processed; only single-user registration capture is demoed live).
- AI follow-up questioning of a No-voter (comments used strictly as submitted).
- Deep AI-training detail.
- Harmony Score & Weighted Voting (Harmony Score cut entirely; `votes.weight` present in schema but unused for MVP).

> **Note on Face Recognition**: Face recognition itself is optional, not cut — see Section 4.2 and Section 5 (Phase 2).
