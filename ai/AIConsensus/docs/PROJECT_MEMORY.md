# WanderMatch — Project Memory
Durable facts and decisions that don't change often. Append-only — never edit someone else's entry.

## Conventions (frozen at Phase 0, do not restate elsewhere)
- Naming contract: see IMPLEMENTATION_PLAN.md Section 2.
- Votes are binary yes/no only, never abstain.
- proposals.closes_at: null until first `no` vote, then now()+10min.
- itineraries.version: bump, never overwrite.

## Entries
### Antigravity — 2026-09-23 01:33 — Setup / Documentation Folder Organized
What was built: Organized all Phase 0 markdown spec documents into the `docs/` directory (`docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/AI.md`, `docs/DEPLOYMENT.md`, `docs/DEPLOYMENT_ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`).
Files touched: docs/*, PROJECT_MEMORY.md, IMPLEMENTATION_LOG.md
Anything the next session needs to know: Master documentation suite is available in both root and `docs/`.

### Antigravity — 2026-09-23 09:45 — Document Suite Patched with Final User Corrections
What was built: Patched all 11 documentation files (and mirrored inside `docs/`) with user's final decision set:
1. `proposals.rationale` (not description), `proposals.cost_delta` (not estimated_cost), `itinerary_items.cost` (not estimated_cost), location resolved via entity_type/entity_id (no free-text location column).
2. Final ID prefixes: `brc_` branches, `bmb_` branch_members, `rev_` revision_history, `msg_` trip_chat_messages, `fcp_` face_profiles, `pho_` photos, `php_` photo_person.
3. `votes.weight` present in schema but UNUSED for MVP.
4. "Harmony Score" cut entirely across all documentation.
5. Canonical 4 slot statuses: `EMPTY` (Slate), `IN_CONSENSUS` (Route), `BRANCHED` (Clay), `CONFIRMED` (Amber).
6. Trip Chat proposal action: "Propose this as the plan" message action button (not slash command).
Files touched: PRD.md, TRD.md, DESIGN.md, DATABASE.md, ARCHITECTURE.md, AI.md, DEPLOYMENT.md, DEPLOYMENT_ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, docs/*, PROJECT_MEMORY.md, IMPLEMENTATION_LOG.md.
Anything the next session needs to know: Phase 0 specs are 100% frozen and aligned with the exact database schema and design tokens.

### Antigravity — 2026-09-23 10:16 — Voting Behavioral Rules Added to TRD.md
What was built: Added Section 2.2 Voting Behavioral Rules to `TRD.md` (and `docs/TRD.md`):
1. Single Active Yes Per Slot: Auto-retracts prior `yes` on proposal A if user casts `yes` on proposal B for the same slot.
2. Non-Voter Future Round Rights: Non-voters retain unconditional right to vote `no` in any future round or branch depth.
3. Queued Proposals During Open Window: Submitting a proposal while window is open queues it for next round (`status: QUEUED`).
Files touched: TRD.md, docs/TRD.md, PROJECT_MEMORY.md, IMPLEMENTATION_LOG.md.
Anything the next session needs to know: Server-side validation rules for single active yes, non-voter rights, and queued proposals are formally specified in TRD.md.

### Antigravity — 2026-09-23 10:19 — Expanded Chat Proposal Logic in TRD.md
What was built: Expanded Section 2.4 Chat Proposal Logic in `TRD.md` (and `docs/TRD.md`):
1. Unanimous Yes path: Immediately sets slot to `CONFIRMED` and halts all AI consensus loops at any round/branch depth.
2. Majority-but-not-unanimous path: Re-enters standard proposal/vote flow in next cycle tagged `source: "chat_propose"`.
3. No votes or no response: Dropped; active AI consensus continues uninterrupted.
Files touched: TRD.md, docs/TRD.md, PROJECT_MEMORY.md, IMPLEMENTATION_LOG.md.
Anything the next session needs to know: 3-path resolution logic for chat proposals is formally locked in TRD.md Section 2.4.

### Antigravity — 2026-09-23 10:22 — AI Consensus Behavioral Rules Added to TRD.md
What was built: Added Section 2.3 AI Consensus Behavioral Rules to `TRD.md` (and `docs/TRD.md`):
1. Vague/Low-Info Comments: Treated as soft_preference (low-signal), not a hard constraint or early branch trigger.
2. Reopened Slot Behavior: Resets slot to IN_CONSENSUS, increments cycle counter, resets round counter to 1, preserves prior plan in revision_history.
3. Late Joining Members: Slots stay confirmed; member can view history, cast `no` on active plan to reopen cycle, or propose new activity.
Files touched: TRD.md, docs/TRD.md, PROJECT_MEMORY.md, IMPLEMENTATION_LOG.md.
Anything the next session needs to know: AI Consensus Behavioral Rules for low-info comments, reopened slots, and late-joining members are formally locked in TRD.md Section 2.3.

### Antigravity — 2026-09-23 10:24 — Acceptance Criteria Rows Appended to TRD.md
What was built: Appended 5 new testable rows to Section 7 Acceptance Criteria Matrix in `TRD.md` (and `docs/TRD.md`):
1. `AC-VOT-02`: Single active yes per slot auto-retraction transaction guarantee.
2. `AC-PRO-01`: Queued proposal during open voting window (`status: QUEUED`).
3. `AC-CHT-02`: Non-unanimous chat proposal re-entry as standard proposal with `source: "chat_propose"`.
4. `AC-AI-02`: Vague no comment classified as `soft_preference` by branch classifier.
5. `AC-ITN-01`: Reopened slot transitions to `IN_CONSENSUS`, increments cycle counter, resets round counter to 1, preserves history.
Files touched: TRD.md, docs/TRD.md, PROJECT_MEMORY.md, IMPLEMENTATION_LOG.md.
Anything the next session needs to know: All 5 new acceptance criteria codes (AC-VOT-02, AC-PRO-01, AC-CHT-02, AC-AI-02, AC-ITN-01) are formally locked in Section 7 of TRD.md.

### Antigravity — 2026-09-23 10:25 — Behavioral Rules & Open Items Documented

What was decided: Applied the following behavioral rules to TRD.md (all are now spec-level, not implied):
1. Single active Yes per slot — Yes on B auto-retracts Yes on A in same transaction.
2. Non-voter retains unconditional No rights in any future round at any depth.
3. New proposal during open window → queued, does not interrupt current round.
4. Majority-but-not-unanimous chat proposal → re-enters normal flow, no fast-track.
5. Vague No comment → classified as soft_preference, not fixed_requirement, by branch-trigger classifier.
6. Reopened confirmed slot → cycle counter increments, round resets to 1, prior plan preserved in revision_history.
7. New member joining after resolved slots → no retroactive invalidation; can view, vote, propose, trigger reopen.

Open items explicitly acknowledged as OUT OF SCOPE for MVP (do not design or build these during the hackathon — flag and move on if hit):
- Admin inactive/unresponsive during a slot decision → no fallback built, no automatic invocation defined.
- Member leaves trip mid-process → no resolved handling; recommended default (drop pending votes, treat as non-vote) is noted but NOT implemented.
- Slot reopened close to activity start time → no time-buffer cutoff defined; recommend adding post-hackathon.
- Admin-change vote threshold → conceptually agreed (member-triggered vote) but threshold undecided; not built.

Files touched: TRD.md, PROJECT_MEMORY.md
Anything the next session needs to know: These rules are now spec-level. Panchami needs AC-VOT-02 and AC-PRO-01 before writing votes and proposals endpoints. Nithya (AI track) needs AC-AI-02 before writing the branch-trigger classifier prompt. The four open items above are frozen as acknowledged gaps — do not spend hackathon time resolving them.

### Antigravity — 2026-09-23 18:39 — Created docs/NIKITHA.md (Frontend Track Spec)
What was built: Created `docs/NIKITHA.md` for Nikitha M N (Frontend Track Owner). Contains 100% self-contained frontend context, naming contract, 14 screen specs, component library, TypeScript types, API/WebSocket endpoints, actor UI gating rules, and Phase 0-7 execution timeline.
Files touched: docs/NIKITHA.md, docs/PROJECT_MEMORY.md, docs/IMPLEMENTATION_LOG.md.
Anything the next session needs to know: Nikitha's agent can read `docs/NIKITHA.md` + `docs/PRD.md` + `docs/TRD.md` to begin Phase 1 React+TS component construction.

### Antigravity — 2026-09-23 18:43 — Created docs/PANCHAMI.md (Backend Track Spec)
What was built: Created `docs/PANCHAMI.md` for Panchami P (Backend Track Owner). Contains 100% self-contained backend context, full database schema (PS-11 + WanderMatch additive), naming contract, FastAPI directory structure, 9 API endpoint specifications, WebSocket connection manager, Clerk auth & webhook handler, all business rules, PyDantic schemas, consensus service orchestration logic, and Phase 0-7 execution timeline.
Files touched: docs/PANCHAMI.md, docs/PROJECT_MEMORY.md, docs/IMPLEMENTATION_LOG.md.
Anything the next session needs to know: Panchami's agent can read `docs/PANCHAMI.md` + `docs/PRD.md` + `docs/TRD.md` to begin Phase 0-1 FastAPI app and DB schema setup.

### Antigravity — 2026-09-23 18:45 — Created docs/SHARVANI.md (AI Track Spec)
What was built: Created `docs/SHARVANI.md` for Sharvani G Bhaskar (AI / Consensus Engine Track Owner). Contains 100% self-contained AI core context, Ollama + Phi-4-mini + ngrok setup, input/output data structures, implementation specs for `hard_constraint_validator`, `branch_trigger_classifier`, `blended_plan_generator`, `branch_grouping`, Mode A & Mode NA orchestrators, deterministic math solo matchmakers (`group_compatibility_scorer` & `guide_compatibility_scorer`), and Phase 0-7 timeline.
Files touched: docs/SHARVANI.md, docs/PROJECT_MEMORY.md, docs/IMPLEMENTATION_LOG.md.
Anything the next session needs to know: Sharvani's agent can read `docs/SHARVANI.md` + `docs/PRD.md` + `docs/TRD.md` to begin Phase 0-1 Ollama setup and validator/classifier construction.

### Antigravity — 2026-09-23 18:46 — Created docs/NITHYA.md (Setup / Integration / Deploy Track Spec)
What was built: Created `docs/NITHYA.md` for P Nithya (Setup / Integration / Deploy Track Owner). Contains 100% self-contained infrastructure context, PS-11 data seeding (27,428 rows across 14 tables) + WanderMatch additive schema scripts, master `.env.example`, Cloudinary photo upload service, Trip Chat WebSocket wiring, optional face recognition service (`registration.py` & `matching.py`), Render backend deployment, Vercel frontend deployment, and Phase 0-7 execution timeline.
Files touched: docs/NITHYA.md, docs/PROJECT_MEMORY.md, docs/IMPLEMENTATION_LOG.md.
Anything the next session needs to know: Nithya's agent can read `docs/NITHYA.md` + `docs/PRD.md` + `docs/TRD.md` to begin Phase 0-1 repo initialization, database seeding, and env setup.

### Antigravity — 2026-09-23 19:23 — Executed NIKITHA Phase 0 (Frontend Scaffold & Contract Setup)
What was built: Completed Nikitha's Phase 0 deliverables in `frontend/`:
1. Scaffolded Vite + React + TypeScript project with Tailwind CSS v4 and Google Fonts (Fraunces, Inter, IBM Plex Mono).
2. Configured Tailwind theme extensions (`tailwind.config.ts`), `index.css`, `@tailwindcss/vite` plugin in `vite.config.ts`.
3. Created complete folder structure: `components/ui/`, `components/layout/`, `components/itinerary/`, `components/chat/`, `components/solo/`, `components/face/`, `screens/`, `context/`, `hooks/`, `types/`, `lib/`.
4. Defined TypeScript types (`proposal.ts`, `vote.ts`, `trip.ts`, `branch.ts`, `user.ts`, `solo.ts`) enforcing all naming contract constraints (`rationale`, `costDelta`, money as string, SlotStatus 4 values, Vote yes/no).
5. Created API shell (`lib/api.ts`) and WebSocket manager (`lib/websocket.ts`).
6. Built App.tsx routing for all 10 routes wrapped in `ClerkProvider`, `AuthProvider`, and `TripProvider`.
7. GATE CHECK PASSED: Production build `npm run build` succeeded in 865ms with zero errors. Dev server running cleanly on `http://localhost:5173/`.
Files touched: frontend/*, docs/PROJECT_MEMORY.md, docs/IMPLEMENTATION_LOG.md.
Anything the next session needs to know: Phase 0 is 100% complete and verified. Ready to begin Phase 1 (Static Trip Home + Slot Detail UI).

### Antigravity — 2026-09-23 19:30 — Executed NIKITHA Phase 1 (Global Components + Static Trip Home)
What was built: Completed Nikitha's Phase 1 deliverables in `frontend/`:
1. `components/ui/Button.tsx`: Primary (`bg-route text-card rounded-[10px]`) and Secondary (`bg-paper text-ink border border-slate-light`) variants with min-h-[44px] and focus rings.
2. `components/ui/Input.tsx`: Custom styled text input with label and clay error text.
3. `components/ui/StatusPill.tsx`: Paired color + icon + text label for all 4 slot statuses (`EMPTY` ○ Slate, `IN_CONSENSUS` ◎ Route, `BRANCHED` ⑂ Clay, `CONFIRMED` ✓ Amber).
4. `components/ui/VotePill.tsx`: Interactive YES (`bg-route`) / NO (`bg-clay`) buttons. Shows mandatory comment textarea with `border-2 border-clay` when empty and NO is selected.
5. `components/ui/SuggestionChip.tsx`: Displays voter initials, name, and comment in a pill badge.
6. `components/ui/Toast.tsx`: Auto-dismissing notification banner sliding in from top-right.
7. `components/ui/Modal.tsx`: Backdrop modal overlay (`bg-ink/40`) with close button.
8. `components/ui/EmptyState.tsx`: Serif title, sans message, and primary CTA button.
9. `components/layout/TopNav.tsx`: Header with brand logo, section tabs, Mode pill ("Mode A" / "Mode NA"), and online member avatar stack.
10. `components/itinerary/RouteLine.tsx`: Signature vertical timeline connecting slots in sequence with status-colored dots and line segments (solid amber, dashed route, dashed slate-light, and 2 parallel clay lines for BRANCHED fork).
11. `components/itinerary/SlotCard.tsx`: Slot card with top time badge + status pill, title, entity info, money as string, vote tally ("3 YES / 1 NO"), status highlights (`bg-amber/5`, `border-l-4 border-l-clay`), and "Invoke AI" admin control button.
12. `screens/TripHomeScreen.tsx`: Built static Trip Home with required 4 dummy slot cards (Sacred Monkey Forest, Mount Batur Trek, Evening Activity, Dinner Options) connected by RouteLine, two-column desktop / single-column mobile layout, and sticky "+ Propose Activity" button.
13. `screens/LoginScreen.tsx` & `screens/SignUpScreen.tsx`: Integrated Clerk `<SignIn />` and `<SignUp />` components.
14. `screens/MyTripsScreen.tsx`: 2 dummy trip cards grid.
15. GATE CHECK PASSED: `npm run build` completed in 697ms with zero errors.
Files touched: frontend/*, docs/PROJECT_MEMORY.md, docs/IMPLEMENTATION_LOG.md.
Anything the next session needs to know: Phase 1 is 100% complete and verified. Ready for Phase 2 (Wiring proposal/vote UI + live tally updates).

