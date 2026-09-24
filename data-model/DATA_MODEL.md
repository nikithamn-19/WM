# Data Model Conformance — WanderMatch (PS-11)

**Hackathon**: KogniVera Hackathon 2026 (Problem Statement PS-11, Travel & Tourism Theme)  
**Team**: Chaos Minds (BMS College of Engineering)  

---

## 1. Canonical Shared Data Model (PS-11 Provided Tables)

WanderMatch strictly uses the canonical PS-11 shared data model without breaking table or column names:

| Table Name | Opaque ID Prefix | Description & Purpose |
| :--- | :--- | :--- |
| `users` | `usr_` | Registered traveler profile data, Clerk auth mappings, names, avatars, age groups. |
| `user_preferences` | `prf_` | User BCP-47 language capabilities and travel interests (used deterministically by Solo matchmakers). |
| `trips` | `trp_` | Core group trip container storing destination city/country, start/end dates, mode (`Mode A` / `Mode NA`), and owner ID. |
| `trip_members` | `tmb_` | Junction table associating users with trips, assigning roles (`owner`, `editor`, `viewer`). |
| `itineraries` | `itn_` | Shared trip itinerary container with monotonic `version` integer for optimistic concurrency conflict resolution. |
| `itinerary_items` | `itm_` | Scheduled activity time slots (Morning, Afternoon, Evening, Night) detailing titles, rationale, entity resolution, cost, and slot status (`EMPTY`, `IN_CONSENSUS`, `BRANCHED`, `CONFIRMED`). |
| `proposals` | `prp_` | Proposed activity items for a slot; stores `rationale`, `cost_delta`, entity resolution (`entity_type`/`entity_id`), proposal status, current round, and `closes_at` expiry timestamp. |
| `votes` | `vot_` | Binary `yes`/`no` votes cast on proposals, enforcing mandatory typed comment strings for `no` votes. |
| `tour_guides` | `gid_` | Verified local tour guide directory queried deterministically by Solo-to-Guide matchmaker. |
| `cities` | `cty_` | Reference table for validated destination cities. |
| `countries` | `ctr_` | Reference table for validated destination countries. |
| `currencies` | `cur_` | Reference table for supported ISO-4217 currency codes. |
| `languages` | `lng_` | Reference table for supported BCP-47 language tags. |

---

## 2. Additive Extension Tables

| Additive Table Name | ID Prefix | Primary Purpose | Foreign Key Dependencies |
| :--- | :--- | :--- | :--- |
| `branches` | `brc_` | Sub-group alternative itinerary branches | `itm_id` → `itinerary_items(itm_id)`, `parent_branch_id` → `branches(brc_id)` |
| `branch_members` | `bmb_` | Sub-group branch membership | `brc_id` → `branches(brc_id)`, `usr_id` → `users(usr_id)` |
| `revision_history` | `rev_` | Audit trail of itinerary changes | `itm_id` → `itinerary_items(itm_id)` |
| `trip_chat_messages` | `msg_` | In-app group chat messages and inline proposals | `trp_id` → `trips(trp_id)`, `usr_id` → `users(usr_id)` |
| `face_profiles` | `fcp_` | Face embedding profiles for photo tagging | `usr_id` → `users(usr_id)` |
| `photos` | `pho_` | Shared trip photo gallery | `trp_id` → `trips(trp_id)`, `uploader_id` → `users(usr_id)` |
| `photo_person` | `php_` | Face recognition photo-to-user tagging mappings | `pho_id` → `photos(pho_id)`, `usr_id` → `users(usr_id)` |

---

## 3. Boundary Rules & Code Enforcement

1. **Strict Binary Voting & Comment Rule**:
   - Voting values MUST be `'yes'` or `'no'`. Abstaining is invalid.
   - Any `no` vote submission without a non-empty comment string is rejected at the API validation layer (`HTTP 422`).

2. **Monotonic Version Concurrency Locking**:
   - Every itinerary modification requires passing `expected_version`.
   - Edits check `WHERE itn_id = :itn_id AND version = :expected_version` and increment `version`. If version mismatches, FastAPI returns `HTTP 409 Conflict`.

3. **Field Naming & Entity Resolution Rules**:
   - Proposals use `rationale` (not `description`) and `cost_delta` (not `estimated_cost`).
   - Locations resolve strictly through `entity_type` (e.g. `'city'`, `'poi'`) and `entity_id` (e.g. `'cty_123'`).
   - Slot status follows canonical values: `EMPTY`, `IN_CONSENSUS`, `BRANCHED`, `CONFIRMED`.
