# Product Requirements Document (PRD): WanderMatch

**Product**: WanderMatch — Social & Group Travel Planning with an AI Consensus Planner  
**Hackathon**: KogniVera Hackathon 2026 (Problem Statement PS-11, Travel & Tourism Theme)  
**Team**: Chaosminds (Nikitha M N — Frontend, Panchami P — Backend + Auth, P Nithya — Setup/Integration/Deploy + AI/Consensus)

---

## 1. Problem Statement

Group trip planning breaks down when one or two people disagree, nobody wants to block the group, and the disagreement is either steamrolled (forced through to avoid confrontation) or lost in chat back-and-forth (endless unorganized discussion leading to indecision). 

WanderMatch combines a live shared itinerary, a structured proposal-and-vote flow, and an AI layer that reads the **reasons** behind objections (typed comments on `no` votes, not just a numerical yes/no tally) to produce common ground or, when preferences are genuinely incompatible, parallel branches. The AI never has final authority — the admin (Mode A) or a unanimous group agreement (either mode) can always override it.

---

## 2. Target Users

1. **Group Trip Organizers (Trip Owners / Admins)**: Users initiating group travel who set destination/dates and want to keep decision-making moving forward while retaining final authority in Mode A.
2. **Group Trip Members**: Participants in a group trip who want an equal voice, clear visibility into itinerary updates, and a structured way to object and offer alternative suggestions without causing interpersonal friction or getting buried in chat.
3. **Solo Travelers**: Individuals traveling alone seeking compatible group trips or local tour guides based on shared age groups, languages, interests, dates, and specializations.
4. **Local Tour Guides**: Professional or local guides listing their language capabilities, specializations, and daily rates to connect with solo travelers or group trips.

---

## 3. Core User Stories

- **US-01 (Proposing an Activity)**: As a group trip member, I want to propose a new activity for a specific itinerary time slot with a rationale, cost_delta, and entity resolution (entity_type/entity_id), so that the group can vote on my idea and incorporate it into our shared plan.
- **US-02 (Voting with a Reason)**: As a group trip member, I want to cast a binary `yes` or `no` vote on a proposal, and be required to provide a typed comment when voting `no`, so that my specific objection or suggestion is captured for AI reconciliation.
- **US-03 (Seeing an AI Blended Plan)**: As a group trip member, I want the AI to generate a single blended activity plan that incorporates typed `no` suggestions into the existing activity before any split occurs, so that the group can re-vote on a unified compromise.
- **US-04 (Branching & Branch Confirmation)**: As a dissenting group member whose preference is genuinely incompatible, I want to be placed into a slot-specific parallel branch where I can review, confirm, or request modifications to a customized plan for that time slot.
- **US-05 (Short-Circuiting AI via Trip Chat Button)**: As a group trip member, I want to click the "Propose this as the plan" button on a message in the mandatory Trip Chat, so that if every applicable member votes `yes` in chat, the proposal is accepted immediately, terminating any active AI consensus process for that slot.
- **US-06 (Solo-to-Group Matchmaking)**: As a solo traveller, I want to find compatible group trips ranked by an explainable, deterministic compatibility score over age group, languages known, travel interests, and overlapping dates, so that I can request to join a group that fits my travel style.
- **US-07 (Solo-to-Guide Matchmaking)**: As a solo traveller, I want to find local tour guides ranked by a deterministic compatibility score over language, specialization, price, and rating, so that I can hire a compatible guide for my trip.
- **US-08 (Face Registration & Photo Segregation - OPTIONAL)**: As a trip member, I want to optionally register 3 reference photos of my face (straight/left/right), so that when photos are uploaded to the shared trip gallery, images containing my face are automatically sorted into my personal "My Photos" view.

---

## 4. Functional Requirements

### 4.1 Itinerary & Proposals
- **FR-ITN-01**: The system shall maintain a live shared itinerary per trip backed by PostgreSQL, using monotonic versioning (`version` integer bumps on edit, never overwriting) for conflict handling.
- **FR-ITN-02**: Any trip member with `owner` or `editor` role can create a proposal (`prp_`) attached to an itinerary item (`itm_`).
- **FR-ITN-03**: Proposals shall store `rationale` (not description) and `cost_delta` (not estimated_cost). Location resolution shall pass through `entity_type` (e.g. `'city'` or `'poi'`) and `entity_id` (e.g. `'cty_123'`), never a free-text location column.
- **FR-ITN-04**: Slot status shall use the canonical 4-value list: `EMPTY` (Slate), `IN_CONSENSUS` (Route), `BRANCHED` (Clay), `CONFIRMED` (Amber).
- **FR-ITN-05**: A proposal's `closes_at` field shall remain `NULL` upon creation, and shall only be set to a 10-minute expiry timestamp when the first `no` vote lands on that proposal in Mode NA.
- **FR-ITN-06**: In Mode A (Admin-Led), the trip owner (admin) retains final authority; the round cap is advisory only, and the admin can extend, force-branch early, or accept a proposal at any time.

### 4.2 Voting Engine
- **FR-VOT-01**: A vote's `value` field shall accept only `'yes'` or `'no'`. Abstentions are invalid.
- **FR-VOT-02**: A `no` vote submission shall be rejected by API validation if the `comment` field is empty or contains only whitespace.
- **FR-VOT-03**: The `votes.weight` column exists in the schema but is UNUSED for the MVP.
- **FR-VOT-04**: The AI shall never ask a voter follow-up questions; it shall read the typed comment string exactly as submitted.
- **FR-VOT-05**: A member shall hold only one active `yes` vote per proposal set at a time.
- **FR-VOT-06**: A silent/non-voting member shall be treated as "non-no"—never a blocker, never force-moved into a branch, and retains the right to vote `no` at any later point, even after a round has closed.

### 4.3 AI Consensus Planner
- **FR-CON-01**: Upon round execution, the AI Consensus Planner shall read all currently active `no` votes' typed comments for the current round alongside hard constraints (time, location, transport feasibility).
- **FR-CON-02**: The AI shall generate exactly ONE blended plan attempting to accommodate typed suggestions inside the existing activity. This blended plan step is always attempted BEFORE any branching, and is never skipped.
- **FR-CON-03**: The blended plan shall be validated against hard constraints before being shown to the group. If validation fails, it shall be regenerated once; if it fails again, it shall escalate to branching or admin review rather than being displayed.
- **FR-CON-04**: The whole group shall re-vote on the validated blended plan (not just previous `no`-voters). If accepted (no new `no` vote before window closes), the slot status becomes `CONFIRMED`.
- **FR-CON-05**: If a holdout votes `no` again, another round runs (soft-capped at ~3 rounds by default). In Mode NA, the AI may branch earlier than the cap if a suggestion reads as a genuinely fixed requirement rather than a fixable tweak. In Mode A, the cap is advisory and the admin decides whether to continue.
- **FR-CON-06**: Once branching is triggered for a slot's current consensus cycle, common-ground blending is permanently abandoned for that cycle until the slot is reopened via a fresh proposal.

### 4.4 Multi-Way Recursive Branching
- **FR-BRN-01**: The system shall create one branch per genuinely distinct incompatible preference (`brc_` prefix), with no cap at two (a slot may produce three, four, or more branches simultaneously if supported by typed suggestions).
- **FR-BRN-02**: Near-duplicate preferences shall be merged into the same branch.
- **FR-BRN-03**: A branch containing exactly one member shall auto-resolve immediately without a vote, making their suggestion the finalized branch plan.
- **FR-BRN-04**: Any branch whose members still disagree shall recursively re-run the entire consensus flow (common-ground attempt, then branch if needed) inside itself via a `parent_branch_id` self-reference.
- **FR-BRN-05**: Branch scope shall be strictly limited to that one activity/time slot only; the next time slot/day starts unbranched for everyone again.
- **FR-BRN-06**: Affected members in a branch see a preview with Confirm / Request Modification / no response (where no response = accepted after window). Repeated modification requests run a soft-capped revision cycle, then the branch is finalized as-is.

### 4.5 Mandatory Trip Chat & Unanimous Override
- **FR-CHT-01**: Every trip shall feature an always-on, real-time Trip Chat independent of the AI process (`trip_chat_messages` table with `msg_` prefix).
- **FR-CHT-02**: Clicking the "Propose this as the plan" action button on a chat message that receives a UNANIMOUS `yes` vote from everyone it applies to shall accept the item immediately, terminating whatever the AI process was doing for that slot/branch, at any round or branch depth.

### 4.6 Solo Matchmaking Engine
- **FR-MCH-01**: Solo-to-group matchmaking shall compute a deterministic weighted score over age group, languages known (BCP-47), travel interests, and overlapping dates. It shall NOT use a generative AI call, remaining 100% explainable and testable against fixed profiles.
- **FR-MCH-02**: Solo-to-guide matchmaking shall compute a deterministic weighted score over language, specialization, and price (plus rating) against the `tour_guides` table.

### 4.7 Face Recognition & Photo Segregation (OPTIONAL)
- **FR-FAC-01**: User face registration shall accept 3 reference photos (straight, left tilt, right tilt) with a basic quality check (exactly 1 face, adequate size/lighting), rejecting with a retry message if quality fails.
- **FR-FAC-02**: Extracted embeddings shall be stored strictly in `face_profiles` (`fcp_` prefix) and never exposed via any public API response.
- **FR-FAC-03**: On trip photo upload, every face shall be detected and compared against registered members of that SPECIFIC trip only (never global database), gated by a confidence threshold; below threshold stays `"Unknown"`.
- **FR-FAC-04**: The shared Trip Gallery is fully visible to everyone regardless of registration status; only the personal "My Photos" auto-sorted view requires prior registration.

---

## 5. Explicit Non-Goals

The following items are explicitly OUT OF SCOPE:
1. **Multilingual Support**: English only (final).
2. **Admin-Inactivity Auto-Fallback**: In Mode A, no automatic fallback to Mode NA if admin is inactive.
3. **Self-Hosted LLM Serving**: Hosted LLM API used instead of self-hosted local Qwen/Phi.
4. **Live Bulk Face Recognition During Judging**: Bulk matching pre-processed; only live single-user registration capture is demoed running live.
5. **AI Follow-up Questioning**: The AI never prompts a `no`-voter with follow-up clarifying questions.
6. **Deep AI Model Fine-Tuning**: No custom weights or deep model training details.
7. **Harmony Score & Weighted Voting**: Harmony Score is cut entirely. `votes.weight` is present in schema but unused for MVP.

---

## 6. Hackathon Demo Success Criteria

For a successful submission at KogniVera Hackathon 2026:
1. **Shared Live Itinerary**: Two active browser sessions showing live WebSocket updates (`voteCast`, `slotStatusChanged`, `proposalCreated`).
2. **Voting with Mandatory Comment**: Rejection of empty `no` comments demonstrated; submission with comment triggering the Mode NA 10-minute timer.
3. **AI Blended Plan Generation**: Triggering AI to generate a single validated blended plan addressing typed `no` comments.
4. **Recursive Multi-way Branching**: Demonstrating a slot forking into parallel branches on the Route Line (Clay `#C1502E`) and auto-resolution of a single-member branch.
5. **Chat Proposal Button Short-Circuit**: Clicking "Propose this as the plan" button on a chat message and confirming it instantly upon unanimous `yes` votes, overriding AI processing.
6. **Deterministic Solo Matching**: Running solo-to-group and solo-to-guide match queries and displaying explainable percentage scores.
7. **Visual System Adherence**: Paper `#F7F5F0` background, Ink `#14213D` text, Route `#2F6F6B` buttons, Route Line transit aesthetic with Fraunces/Inter/IBM Plex Mono fonts.
