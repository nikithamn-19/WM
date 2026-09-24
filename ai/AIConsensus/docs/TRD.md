# Technical Requirements Document (TRD): WanderMatch

**Product**: WanderMatch — Social & Group Travel Planning with an AI Consensus Planner  
**Hackathon**: KogniVera Hackathon 2026 (Problem Statement PS-11, Travel & Tourism Theme)  
**Team**: Chaosminds (Nikitha M N — Frontend, Panchami P — Backend + Auth, P Nithya — Setup/Integration/Deploy + AI/Consensus)

---

## 1. System Overview & Architecture

WanderMatch uses a single-orchestrator backend pattern powered by **FastAPI**. The **React/TypeScript** frontend acts strictly as a user interface layer and **never** communicates directly with PostgreSQL, the hosted LLM API, Cloudinary, or the DeepFace service. Every client interaction passes through FastAPI endpoints or WebSocket channels.

```
┌─────────────────────────────────────────────────────────────┐
│                 React + TypeScript Frontend                 │
│              (Vercel Deployment / Local Vite)               │
└───────────────┬─────────────────────────────▲───────────────┘
                │ REST (camelCase)            │ WebSocket Events
                │                             │ (verb-first camelCase)
┌───────────────▼─────────────────────────────┴───────────────┐
│               FastAPI Single Orchestrator                   │
│              (Render Deployment / Python)                   │
├─────────────────┬──────────────┬──────────────┬─────────────┤
│  PostgreSQL DB  │ Clerk Auth   │ Hosted LLM   │ Cloudinary  │
│  (System of     │ Webhooks &   │ API (Gemini/ │ Photo       │
│   Record)       │ JWT Sync     │ Claude)      │ Storage     │
└─────────────────┴──────────────┴──────────────┴─────────────┘
```

- **Backend Orchestrator**: FastAPI managing REST API requests, Pydantic schemas with `camelCase` transformation, SQLAlchemy ORM, database transactions, optimistic lock checks, and per-trip WebSocket connections.
- **Frontend Layer**: React 18, TypeScript, Tailwind CSS with the locked visual system (Paper `#F7F5F0`, Ink `#14213D`, Route `#2F6F6B`, Route Line transit map style).
- **Database System of Record**: PostgreSQL following PS-11 schema (`snake_case`, prefixed opaque IDs: `usr_`, `prf_`, `trp_`, `tmb_`, `itn_`, `itm_`, `prp_`, `vot_`, `gid_`) plus additive tables (`branches`, `branch_members`, `revision_history`, `trip_chat_messages`, `face_profiles`, `photos`, `photo_person`).
- **Real-Time Layer**: Single WebSocket broadcast engine per trip broadcasting verb-first camelCase events (`voteCast`, `proposalCreated`, `branchConfirmed`, `slotStatusChanged`, `aiPlanGenerated`).

---

## 2. API Contract & Endpoint Specifications

Naming Contract Enforcement:
- Database & Python = `snake_case`
- FastAPI JSON Payloads & Responses = `camelCase`
- TypeScript Interfaces = `camelCase`
- WebSocket Events = `camelCase` (verb-first)

### 2.1 Trips & Members (`/api/trips`)
- `POST /api/trips`: Create new trip
  - **Request**: `{ "title": "Bali Escape", "destinationCity": "Bali", "destinationCountry": "Indonesia", "startDate": "2026-10-10", "endDate": "2026-10-16", "mode": "Mode A", "ownerId": "usr_123" }`
  - **Response**: `{ "trpId": "trp_987", "title": "Bali Escape", "destinationCity": "Bali", "destinationCountry": "Indonesia", "startDate": "2026-10-10", "endDate": "2026-10-16", "mode": "Mode A", "ownerId": "usr_123", "createdAt": "2026-09-23T00:00:00Z" }`
  - **Errors**: `400 Bad Request` (invalid date format or missing fields).

- `GET /api/trips/{trpId}`: Retrieve trip details with full itinerary, members, and active proposals
  - **Response**: Full `Trip` payload including `members` and `itinerary`.
  - **Errors**: `404 Not Found`.

### 2.2 Proposals & Voting (`/api/proposals`, `/api/votes`)
- `POST /api/proposals`: Create activity proposal
  - **Request**: `{ "itmId": "itm_456", "trpId": "trp_987", "creatorId": "usr_123", "title": "Mount Batur Trek", "rationale": "Sunrise hike for adventure lovers", "costDelta": 15.00, "currencyCode": "USD", "entityType": "poi", "entityId": "poi_batur_01" }`
  - **Response**: Proposal object with `closesAt: null`, `status: "OPEN"`, `currentRound: 1`.
  - **WebSocket Trigger**: Broadcasts `proposalCreated` to `trp_987`.
  - **Errors**: `404 Not Found` (invalid item or trip ID).

- `POST /api/votes`: Cast binary vote on proposal
  - **Request**: `{ "prpId": "prp_111", "usrId": "usr_222", "value": "no", "comment": "Injured ankle, prefer hot springs spa." }`
  - **Response**: `{ "votId": "vot_333", "prpId": "prp_111", "usrId": "usr_222", "value": "no", "comment": "Injured ankle, prefer hot springs spa.", "createdAt": "2026-09-23T00:01:00Z" }`
  - **Note**: `votes.weight` exists in schema but is UNUSED for MVP.
  - **WebSocket Trigger**: Broadcasts `voteCast` to `trp_987`.
  - **Errors**:
    - `400 Bad Request`: If `value` is not `'yes'` or `'no'`.
    - `400 Bad Request`: If `value == 'no'` and `comment` is null, empty, or whitespace-only.
  - **Voting Behavioral Rules** (enforced at API + DB level):
    - **Single Active Yes Per Slot**: A member may hold only one active `yes` vote per slot at a time. If a member casts `yes` on proposal B while holding an active `yes` on proposal A for the same `itm_id`, the `yes` on proposal A is automatically retracted in the same transaction before the new `yes` on proposal B is recorded. This is enforced server-side, never assumed client-side.
    - **Non-Voter Future Round Rights**: A member who does not vote during a round's open window is treated as non-vote for that round only. They retain the unconditional right to cast a `no` vote on that slot in **any future round**, at any depth of the consensus cycle, including inside a branch. This right is never revoked by inaction. FastAPI must never close this door at the database or session level.
    - **Queued Proposals During Open Window**: If a new proposal is submitted for a slot while that slot's voting window is already open (i.e. `closes_at IS NOT NULL` and `NOW() < closes_at`), the new proposal is queued for the next decision cycle. It does not interrupt, restart, or extend the current round. The submitter receives response field `"status": "QUEUED"` and `"message": "This proposal has been queued for the next round — the current voting window is still open."`. The queued proposal does not appear in the active vote UI until the current round closes.

### 2.3 AI Consensus & Branching (`/api/consensus`)
- `POST /api/consensus/reconcile`: Trigger AI blended plan generation or multi-way branching
  - **Request**: `{ "prpId": "prp_111" }`
  - **Response (Blended Plan)**: `{ "action": "BLENDED", "blendedPlan": { "title": "Batur Volcano Thermal Springs & View", "rationale": "Relaxing spa visit with summit views.", "costDelta": 0.00, "entityType": "poi", "entityId": "poi_thermal_spa" }, "currentRound": 2 }`
  - **Response (Branched)**: `{ "action": "BRANCHED", "branches": [{ "brcId": "brc_001", "title": "Summit Hiking Group", "status": "OPEN" }, { "brcId": "brc_002", "title": "Herbal Spa & Hot Springs", "status": "FINALIZED" }] }`
  - **WebSocket Trigger**: Broadcasts `aiPlanGenerated` or `slotStatusChanged`.
  - **AI Consensus Behavioral Rules**:
    - **Vague or Low-Information No Comments**: If a member's typed `no` comment is vague or low-information (e.g. `"not feeling it"`, `"idk"`, `"something else"`), the AI treats it as a **low-signal soft preference**, not a hard constraint. It is still stored verbatim and shown to the group. The blended plan generator will not over-interpret it as a fixed requirement or use it to trigger early branching. The branch-trigger classifier must explicitly label such inputs as `"soft_preference"` rather than `"fixed_requirement"` when no concrete alternative or constraint is stated.
    - **Reopened Confirmed/Branched Slot Behavior**: When a previously `CONFIRMED` or `BRANCHED` slot receives a new proposal:
      1. The slot status transitions back to `IN_CONSENSUS`.
      2. The **consensus cycle counter** for that slot increments by 1 (cycle 1 → cycle 2, etc.).
      3. The **round counter resets to 1** with a fresh soft cap for the new cycle.
      4. The previous confirmed plan is **never erased** — it is preserved in `revision_history` and remains visible in the slot's audit history as a selectable reference option.
      5. The AI blended-plan generator for the new cycle reads the new proposal and new `no` vote comments only — it does not inherit prior cycle's votes as active inputs.
    - **New Member Joining After Resolved Slots**: When a new member joins a trip via `trip_members`, slots that are already `CONFIRMED` or `BRANCHED` are not retroactively invalidated. The new member:
      - Can view every version and branch in the slot's history.
      - Can cast a `no` vote on the current confirmed plan, which triggers a fresh cycle (per reopened slot behavior above).
      - Can submit a new proposal for any slot.
      - Does **not** get retroactively inserted into prior vote tallies or branch assignments.

### 2.4 Mandatory Trip Chat (`/api/chat`)
- `POST /api/chat`: Send chat message
  - **Request**: `{ "trpId": "trp_987", "usrId": "usr_123", "content": "Let's do Beach Sunset Dinner!" }`
  - **Response**: `{ "msgId": "msg_555", "trpId": "trp_987", "usrId": "usr_123", "content": "Let's do Beach Sunset Dinner!", "createdAt": "2026-09-23T00:02:00Z" }`
- `POST /api/chat/{msgId}/propose`: Click "Propose this as the plan" action button on a chat message
  - **Logic**:
    - **Unanimous Yes path**: If every applicable member (all trip members for that slot, excluding the message author if desired — team to confirm scope) votes `yes` on the chat-proposed plan, the slot status is immediately updated to `CONFIRMED` and all active AI consensus loops for that slot/branch are terminated, regardless of current round number or branch depth. This override works at any point — during blending, during branching, inside a recursive sub-branch.
    - **Majority-but-not-unanimous path**: If the chat proposal receives `yes` votes from more than half but not all applicable members, it is **not** auto-accepted. It re-enters the normal proposal and vote flow as a standard new proposal in the next cycle, tagged with `source: "chat_propose"` for audit trail purposes. No special fast-track applies to a non-unanimous chat proposal.
    - **No votes or no response**: If the chat proposal receives any `no` vote or no response within the chat-proposal response window, it is dropped and the active AI consensus process for that slot continues uninterrupted.

### 2.5 Solo Matchmaking (`/api/solo-matching`)
- `POST /api/solo-matching/groups`: Match solo traveler to trips
  - **Request**: `{ "usrId": "usr_solo_1" }`
  - **Response**: Array of `{ "trip": TripObject, "compatibilityScore": 85, "ageGroupMatch": true, "sharedLanguages": ["en", "es"], "sharedInterests": ["Culture", "Adventure"], "dateOverlapDays": 5 }`.

- `POST /api/solo-matching/guides`: Match solo traveler to tour guides
  - **Request**: `{ "usrId": "usr_solo_1", "city": "Bali", "maxBudget": 100.0 }`
  - **Response**: Array of `TourGuide` objects with `compatibilityScore: 92`.

### 2.6 Face Recognition & Photo Gallery (`/api/photos`, `/api/face`)
- `POST /api/face/register`: Register user face profile
  - **Request**: Multipart form data with 3 image files (`straight`, `left`, `right`).
  - **Response**: `{ "fcpId": "fcp_101", "usrId": "usr_123", "status": "REGISTERED", "embeddingsCount": 3 }`.
  - **Errors**: `400 Bad Request` ("Face quality check failed: exactly one face required per photo").

- `GET /api/photos/{trpId}`: Query trip gallery
  - **Query Params**: `?usrId=usr_123` (optional filter for "My Photos").
  - **Response**: Array of `Photo` (`pho_` prefix) objects with populated `taggedUsers`.

---

## 3. The `proposals.closes_at` Technical Requirement

Layered Rule Specification:
1. When a proposal `prp_` is created, `closes_at` MUST be initialized as `NULL` in PostgreSQL.
2. In Mode NA (Collaborative), no timer process or background check is initiated while `closes_at IS NULL`.
3. When the **first `no` vote** is recorded for a proposal (i.e. `COUNT(votes WHERE value='no')` transitions from 0 to 1), FastAPI MUST set `closes_at = NOW() + INTERVAL '10 minutes'`.
4. If no `no` vote is ever cast on a proposal, `closes_at` remains `NULL`, and the item carries forward to its scheduled time slot without executing background timer checks.

---

## 4. `itineraries.version` Optimistic Concurrency Control

Monotonic Versioning Specification:
1. Every GET request returning an itinerary includes `version` (an integer starting at 1).
2. Every mutation request affecting an itinerary item MUST include `expectedVersion`.
3. FastAPI executes the SQL query:
   ```sql
   UPDATE itineraries 
   SET version = version + 1, updated_at = NOW() 
   WHERE itn_id = :itn_id AND version = :expected_version;
   ```
4. If zero rows are updated, FastAPI MUST abort the transaction, rollback changes, and return HTTP `409 Conflict` with response payload:
   `{ "error": "CONFLICT", "message": "Itinerary was modified by another member. Please reload latest schedule." }`
5. The server MUST NEVER silently overwrite an itinerary write when version mismatches occur.

---

## 5. Canonical Slot Status List & Visual Alignment

Slot status uses the canonical 4-value list, mapping 1:1 onto the locked palette:
- `EMPTY`: Slate `#6B7280` (empty/pending slot)
- `IN_CONSENSUS`: Route `#2F6F6B` (proposal active in voting/reconciliation)
- `BRANCHED`: Clay `#C1502E` (forked into multi-way parallel branches)
- `CONFIRMED`: Amber `#E1A93A` (unanimously agreed or admin-approved)

---

## 6. Non-Functional Technical Requirements

1. **Real-Time Update Latency**:
   - WebSocket event broadcast latency from backend commit to client receive MUST be `< 250ms` for active connections.
2. **Hard-Constraint Pre-Validation**:
   - Before presenting ANY AI-generated blended plan to users, FastAPI MUST execute a validation function checking time slot overlap, geographical distance limits, and transport feasibility.
   - If validation fails, the AI engine regenerates once; if it fails again, the system escalates directly to branching/admin review.
3. **Generic Branch Recursion**:
   - Branching MUST be implemented as a single, generic recursive function:
     `reconcile_branch(branch_id: str, member_ids: List[str], depth: int)`
   - The function handles depth via self-referencing `parent_branch_id` without code duplication per depth level.
4. **Isolated Face Profile Embeddings**:
   - `face_profiles` vector embeddings MUST be processed locally in memory and stored securely. API responses MUST NEVER return raw embedding vectors in JSON.

---

## 7. Explicit Acceptance Criteria Matrix

| Feature Area | Technical Requirement ID | Testable Acceptance Criteria |
| :--- | :--- | :--- |
| **Voting** | `AC-VOT-01` | Casting a `no` vote with an empty or whitespace comment returns `HTTP 400` with detail `"A 'no' vote REQUIRES a typed reason or suggestion in the comment field."` |
| **Mode NA Timer** | `AC-TMR-01` | A proposal created in Mode NA has `closes_at == null`. Upon the 1st `no` vote, `closes_at` updates to timestamp exactly 10 minutes in the future. |
| **Concurrency** | `AC-CNC-01` | Sending an itinerary item edit with `expectedVersion = 1` when DB `version == 2` returns `HTTP 409 Conflict` and prevents mutation. |
| **Blended Plan** | `AC-AI-01` | Calling `/api/consensus/reconcile` on a slot with `no` comments produces exactly ONE blended plan object containing `title`, `rationale`, `costDelta`, `entityType`, and `entityId`. |
| **Branching** | `AC-BRN-01` | When incompatible preferences are processed, the system creates rows in `branches` linked by `itm_id` (`brc_` prefix). Single-member branches have `status = 'FINALIZED'` automatically. |
| **Branch Recursion** | `AC-BRN-02` | Sub-branches correctly store `parent_branch_id = parent_brc_id`, allowing nested tree queries to any depth. |
| **Chat Override** | `AC-CHT-01` | Clicking "Propose this as the plan" button on a chat message with unanimous `yes` updates the active slot status to `CONFIRMED` and halts ongoing AI consensus loops. |
| **Solo Matching** | `AC-MCH-01` | Calling `/api/solo-matching/groups` returns deterministic integer `compatibilityScore` (0-100%) without making external LLM calls. |
| **Face Quality** | `AC-FAC-01` | Submitting a face registration photo containing 0 or >1 face returns `HTTP 400` with message `"Face quality check failed: exactly one face required per photo."` |
| **Single Active Yes** | `AC-VOT-02` | Casting `yes` on proposal B while holding an active `yes` on proposal A for the same `itm_id` results in proposal A's vote being retracted in the same transaction. Final DB state: zero active `yes` votes on A from that user, one active `yes` on B. |
| **Queued Proposal** | `AC-PRO-01` | Submitting a proposal while `closes_at IS NOT NULL AND NOW() < closes_at` returns `{ "status": "QUEUED" }` and does not alter the current round's active proposal set or `closes_at` value. |
| **Non-unanimous Chat Propose** | `AC-CHT-02` | A chat-proposed plan with majority but not unanimous `yes` does not update slot status. It appears as a standard new proposal in the next cycle with `source: "chat_propose"` in its metadata. |
| **Vague No Comment Classification** | `AC-AI-02` | A `no` comment containing no concrete alternative or constraint (e.g. `"not feeling it"`) is classified as `"soft_preference"` by the branch-trigger classifier, never `"fixed_requirement"`. Verified against a fixed test input set. |
| **Reopened Slot Cycle Increment** | `AC-ITN-01` | When a new proposal is submitted on a `CONFIRMED` slot, the slot transitions to `IN_CONSENSUS`, cycle counter increments, round counter resets to 1, and prior confirmed plan remains readable in `revision_history`. |
