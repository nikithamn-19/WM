# Database Documentation: WanderMatch Schema & Data Model

**Product**: WanderMatch — Social & Group Travel Planning with an AI Consensus Planner  
**Hackathon**: KogniVera Hackathon 2026 (Problem Statement PS-11, Travel & Tourism Theme)  
**Team**: Chaosminds (Nikitha M N — Frontend, Panchami P — Backend + Auth, P Nithya — Setup/Integration/Deploy + AI/Consensus)

---

## 1. PS-11 Provided Tables Utilization

| Table Name | Opaque ID Prefix | Purpose & Usage in WanderMatch |
| :--- | :--- | :--- |
| `users` | `usr_` | Stores registered traveler profile data, Clerk auth mappings, full names, avatars, and age groups. |
| `user_preferences` | `prf_` | Stores user BCP-47 language capabilities and travel interests (used deterministically by solo matchmakers). |
| `trips` | `trp_` | Core group trip container storing destination city/country, start/end dates, mode (`Mode A` / `Mode NA`), and owner ID. |
| `trip_members` | `tmb_` | Junction table associating users with trips, assigning roles (`owner`, `editor`, `viewer`), where `owner` = Mode A Admin. |
| `itineraries` | `itn_` | Shared trip itinerary container with monotonic `version` integer for optimistic concurrency conflict resolution. |
| `itinerary_items` | `itm_` | Scheduled activity time slots (Morning, Afternoon, Evening, Night) detailing titles, rationale, entity resolution (entity_type/entity_id), cost, and slot status (`EMPTY`, `IN_CONSENSUS`, `BRANCHED`, `CONFIRMED`). |
| `proposals` | `prp_` | Proposed activity items for a slot; stores `rationale` (not description), `cost_delta` (not estimated_cost), entity resolution (`entity_type`/`entity_id`), proposal status, current round, and `closes_at` expiry timestamp. |
| `votes` | `vot_` | Binary `yes`/`no` votes cast on proposals, enforcing mandatory typed comment strings for `no` votes (`votes.weight` present in schema but UNUSED for MVP). |
| `tour_guides` | `gid_` | Verified local tour guide directory queried deterministically by the Solo-to-Guide matchmaker. |
| `cities` | `cty_` | Reference table for validated destination cities. |
| `countries` | `ctr_` | Reference table for validated destination countries. |
| `currencies` | `cur_` | Reference table for supported ISO-4217 currency codes. |
| `languages` | `lng_` | Reference table for supported BCP-47 language tags. |

---

## 2. Additive Extension Tables

| Additive Table Name | ID Prefix | Columns, Types, & Constraints | Foreign Key Dependencies |
| :--- | :--- | :--- | :--- |
| `branches` | `brc_` | `brc_id VARCHAR PK`, `itm_id VARCHAR NOT NULL`, `parent_branch_id VARCHAR NULL`, `title VARCHAR NOT NULL`, `rationale TEXT`, `entity_type VARCHAR`, `entity_id VARCHAR`, `cost_delta NUMERIC(12,2)`, `status VARCHAR DEFAULT 'OPEN'`, `created_at TIMESTAMP` | `itm_id` → `itinerary_items(itm_id)`, `parent_branch_id` → `branches(brc_id)` (Self-reference) |
| `branch_members` | `bmb_` | `bmb_id VARCHAR PK`, `brc_id VARCHAR NOT NULL`, `usr_id VARCHAR NOT NULL`, `status VARCHAR DEFAULT 'CONFIRMED'` | `brc_id` → `branches(brc_id)`, `usr_id` → `users(usr_id)` |
| `revision_history` | `rev_` | `rev_id VARCHAR PK`, `itm_id VARCHAR NOT NULL`, `version_number INT NOT NULL`, `snapshot_data JSONB NOT NULL`, `created_at TIMESTAMP` | `itm_id` → `itinerary_items(itm_id)` |
| `trip_chat_messages` | `msg_` | `msg_id VARCHAR PK`, `trp_id VARCHAR NOT NULL`, `usr_id VARCHAR NOT NULL`, `content TEXT NOT NULL`, `proposal_id VARCHAR NULL`, `created_at TIMESTAMP` | `trp_id` → `trips(trp_id)`, `usr_id` → `users(usr_id)`, `proposal_id` → `proposals(prp_id)` |
| `face_profiles` | `fcp_` | `fcp_id VARCHAR PK`, `usr_id VARCHAR UNIQUE NOT NULL`, `embedding_data JSONB NOT NULL`, `created_at TIMESTAMP` | `usr_id` → `users(usr_id)` |
| `photos` | `pho_` | `pho_id VARCHAR PK`, `trp_id VARCHAR NOT NULL`, `uploader_id VARCHAR NOT NULL`, `photo_url VARCHAR NOT NULL`, `created_at TIMESTAMP` | `trp_id` → `trips(trp_id)`, `uploader_id` → `users(usr_id)` |
| `photo_person` | `php_` | `php_id VARCHAR PK`, `pho_id VARCHAR NOT NULL`, `usr_id VARCHAR NOT NULL`, `confidence NUMERIC(4,3) DEFAULT 0.950` | `pho_id` → `photos(pho_id)`, `usr_id` → `users(usr_id)` |


---

## 3. Schema Exception Statements & Rules

### 3.1 Unused Fields in `user_preferences` & `votes`
> [!IMPORTANT]
> The `pace` and `budget_class` fields exist in the provided `user_preferences` (`prf_`) table schema, and `votes.weight` exists in the `votes` (`vot_`) table schema. However, they are **currently UNUSED** for MVP. Compatibility scoring is computed strictly over age group, spoken BCP-47 languages, travel interests, and date overlap. Voting is strictly binary (1 person = 1 vote).

### 3.2 Strict Application Constraint on `votes.value`
> [!NOTE]
> Although the database column `votes.value` is typed as a generic string or enum, WanderMatch application code enforces a strict binary-only constraint: `value` **MUST** be either `'yes'` or `'no'`. Abstaining is invalid, and a `no` vote submission is rejected at the FastAPI level if `comment` is null or empty.

### 3.3 The `proposals.closes_at` Layered Rule
Upon proposal creation, `closes_at` is initialized as `NULL`. In Mode NA, `closes_at` is updated to `NOW() + INTERVAL '10 minutes'` **only when the first `no` vote lands**. If no `no` vote ever lands, `closes_at` remains `NULL`, and no background timer process executes.

### 3.4 Monotonic `itineraries.version` Concurrency Rule
Itinerary edits check `WHERE itn_id = :itn_id AND version = :expected_version`, incrementing `version = version + 1`. If zero rows update, FastAPI aborts and throws HTTP 409 Conflict to prevent silent overwrites.

### 3.5 Slot Status & Field Naming Integrity Rules
- **Proposals & Items**: Proposals store `rationale` (not `description`), `cost_delta` (not `estimated_cost`), and `itinerary_items` store `cost` (not `estimated_cost`).
- **Entity Resolution**: Location is never a free-text field — it resolves strictly through `entity_type` (e.g. `'city'`, `'poi'`) and `entity_id` (e.g. `'cty_123'`).
- **Slot Status**: Canonical 4-value list: `EMPTY` (Slate), `IN_CONSENSUS` (Route), `BRANCHED` (Clay), `CONFIRMED` (Amber).

---

## 4. Entity Relationship (ER) Dependencies

```
users (usr_) ──< trip_members (tmb_) >── trips (trp_) ──< itineraries (itn_) ──< itinerary_items (itm_)
  │                                                                                  │
  ├──< user_preferences (prf_)                                                       ├──< proposals (prp_) ──< votes (vot_)
  ├──< face_profiles (fcp_)                                                          │
  ├──< trip_chat_messages (msg_) >── trips (trp_)                                    └──< branches (brc_) ──< branch_members (bmb_)
  └──< photo_person (php_) >── photos (pho_) >── trips (trp_)                             │ (parent_branch_id self-ref)
                                                                                          └── recursive branches (brc_)
```


---

## 5. Schema Integrity Rules (R1 through R8)

- **R1 (No Renaming/Re-keying)**: Provided PS-11 tables and column names are kept verbatim in `snake_case` with opaque prefixed primary keys (`usr_`, `trp_`, `itm_`, `prp_`, `vot_`).
- **R2 (Additive Extensions Only)**: All custom features use additive tables (`branches`, `branch_members`, `revision_history`, `trip_chat_messages`, `face_profiles`, `photos`, `photo_person`).
- **R3 (Opaque Prefixed Keys)**: Additive tables strictly use opaque prefixed string primary keys (`brc_`, `bmb_`, `rev_`, `msg_`, `fcp_`, `pho_`, `php_`).
- **R4 (Monotonic Versioning)**: `itineraries.version` uses strict numeric increments for optimistic concurrency locking.
- **R5 (BCP-47 Standard)**: Language codes follow BCP-47 standard (`en`, `es`, `hi`, `kn`, `ta`).
- **R6 (ISO-4217 Currency)**: Currency fields store standard ISO-4217 string codes (`USD`, `EUR`, `INR`).
- **R7 (ISO-8601 Timestamps)**: Timestamps use ISO-8601 UTC format.
- **R8 (Referential Integrity)**: Foreign keys enforce relational integrity across all provided and additive tables.
