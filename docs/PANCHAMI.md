# PANCHAMI.md — Backend Track Owner
## WanderMatch · KogniVera Hackathon 2026 · PS-11

---

## HOW TO USE THIS DOC (Read this first, give it to your agent verbatim)

> "I am Panchami P, Backend developer for WanderMatch at KogniVera Hackathon 2026. Read this entire document carefully. It contains my full project context, my exact responsibilities, every database table I work with (both provided PS-11 tables and WanderMatch additive tables), every API endpoint I must build, every business rule I must enforce, and my phase-by-phase execution plan. After reading, give me a detailed prompt to execute Phase [X] of my work. Do not assume anything not written here. Do not invent field names, change column names, or deviate from the naming contract. Everything is specified."

---

## 1. WHAT WANDERMATCH IS — FULL CONTEXT

WanderMatch is a social group travel planning web app. Groups plan trips together on a shared live itinerary. Members propose activities, vote YES or NO (NO votes REQUIRE a typed reason), and an AI layer reads those typed reasons to generate compromise plans or — when preferences are truly incompatible — parallel branches.

### Two trip modes:
- **Mode A (Admin-Led)**: Trip owner has final authority. AI only recommends. Admin can extend rounds, force branches, or accept proposals directly.
- **Mode NA (Collaborative)**: Fully automatic. First NO vote starts a 10-minute timer (`closes_at`). After ~3 rounds, AI auto-branches. No human override needed.

### The consensus flow (backend must enforce this):
1. Proposal created → `closes_at = NULL`, `status = 'open'`
2. First NO vote lands → In Mode NA: `closes_at = NOW() + INTERVAL '10 minutes'`
3. AI reconcile triggered → generates blended plan (round 1), stores in `revision_history`
4. Group re-votes on blended plan
5. If still NO after ~3 rounds → branches created in `branches` table
6. Single-member branches: auto-set `status = 'FINALIZED'` immediately
7. Unanimous Trip Chat propose → immediately sets slot to CONFIRMED, terminates AI loop

---

## 2. TECH STACK — EXACTLY WHAT YOU USE

- **Framework**: FastAPI (Python 3.11+)
- **Server**: Uvicorn
- **ORM**: SQLAlchemy (async preferred, sync acceptable for hackathon)
- **DB**: PostgreSQL 15+ (Render/Neon managed)
- **Auth**: Clerk — JWT validation middleware + webhook handler for user sync
- **Schema validation**: Pydantic v2 (with `alias_generator` for camelCase responses)
- **WebSocket**: FastAPI native WebSocket + in-memory connection manager per trip
- **Deployment**: Render web service

You OWN:
- `/backend/app/` — all FastAPI routes, Pydantic schemas, SQLAlchemy models, WebSocket manager
- DB schema file (`schema.sql` or Alembic migrations) — YOU ARE THE SOLE OWNER, nobody else edits this

You DO NOT touch:
- `/frontend/` (ever)
- `/backend/ai/` (Sharvani owns this — you call her functions, you don't edit them)
- `/infra/` (Nithya owns this)
- Face service (`/backend/services/face*`) (Nithya owns this)

---

## 3. THE DATABASE — COMPLETE SCHEMA

### 3.1 PS-11 Provided Tables (NEVER rename, rekey, or drop any column)

These tables come from the PS-11 dataset. Field names are VERBATIM — do not camelCase them in the DB, do not rename them.

#### `users` (1,200 rows in seed data, IDs start `usr_`)
```sql
user_id          TEXT PRIMARY KEY        -- usr_ prefixed opaque string
display_name     TEXT NOT NULL
email            TEXT NOT NULL UNIQUE
home_city_id     TEXT NOT NULL FK → cities.city_id
home_currency    CHAR(3) NOT NULL FK → currencies.iso4217
locale           TEXT NOT NULL FK → languages.bcp47   -- BCP-47 tag
budget_band      TEXT NOT NULL   -- shoestring|value|mid|premium|luxury
travel_style     TEXT NOT NULL   -- budget|comfort|luxury|adventure|slow|cultural|wellness
traveller_type   TEXT NOT NULL   -- solo|couple|family|business|friends|senior|backpacker
segment          TEXT NOT NULL   -- heavy|light|cold_start
date_of_signup   DATE NOT NULL
loyalty_tier     TEXT            -- nullable
status           TEXT NOT NULL   -- active|inactive|archived|draft
created_at       TIMESTAMPTZ NOT NULL
updated_at       TIMESTAMPTZ NOT NULL
```

**WanderMatch adds these columns to users** (additive, R1 compliant):
```sql
clerk_user_id    TEXT UNIQUE     -- Clerk's user ID, synced via webhook
full_name        TEXT            -- from Clerk profile
avatar_url       TEXT            -- from Clerk profile
age_group        TEXT            -- '18-24'|'25-34'|'35-44'|'45-54'|'55+'
```

#### `user_preferences` (1,200 rows, IDs start `prf_`)
```sql
preference_id          TEXT PRIMARY KEY    -- prf_ prefixed
user_id                TEXT NOT NULL UNIQUE FK → users.user_id
preferred_languages    TEXT NOT NULL       -- comma-separated BCP-47 e.g. "en,hi,ta"
guide_language         TEXT FK → languages.bcp47
interests              TEXT NOT NULL       -- comma-separated category codes
dietary_flags          TEXT                -- nullable
accessibility_needs    TEXT                -- nullable
preferred_currency     CHAR(3) NOT NULL FK → currencies.iso4217
max_daily_budget       DECIMAL(12,2)       -- nullable, NEVER float
max_daily_budget_currency CHAR(3) FK → currencies.iso4217
pace                   TEXT NOT NULL       -- relaxed|moderate|fast  (NOT used in AI for MVP)
updated_at             TIMESTAMPTZ NOT NULL
```
> IMPORTANT: `pace` and `max_daily_budget` exist but are UNUSED by the AI matchmaker for MVP. Do not remove them.

#### `trips` (600 rows in seed, IDs start `trp_`)
```sql
trip_id               TEXT PRIMARY KEY    -- trp_ prefixed
owner_user_id         TEXT NOT NULL FK → users.user_id
title                 TEXT NOT NULL
origin_city_id        TEXT FK → cities.city_id   -- nullable
destination_city_id   TEXT NOT NULL FK → cities.city_id
start_date            DATE NOT NULL               -- zoneless, no timezone
end_date              DATE NOT NULL               -- zoneless, no timezone
party_size            SMALLINT NOT NULL
adults                SMALLINT NOT NULL
children              SMALLINT NOT NULL
trip_type             TEXT NOT NULL   -- solo|couple|family|business|friends|senior|backpacker
is_group_trip         BOOLEAN NOT NULL
status                TEXT NOT NULL   -- draft|planning|confirmed|in_progress|completed|cancelled
home_currency         CHAR(3) NOT NULL FK → currencies.iso4217
notes                 TEXT            -- nullable
created_at            TIMESTAMPTZ NOT NULL
updated_at            TIMESTAMPTZ NOT NULL
```

**WanderMatch adds to trips** (additive):
```sql
mode   TEXT NOT NULL DEFAULT 'Mode NA'  -- 'Mode A' or 'Mode NA'
```

#### `trip_members` (1,407 rows, IDs start `tmb_`)
```sql
member_id         TEXT PRIMARY KEY    -- tmb_ prefixed
trip_id           TEXT NOT NULL FK → trips.trip_id
user_id           TEXT NOT NULL FK → users.user_id
role              TEXT NOT NULL   -- owner|editor|viewer
joined_at         TIMESTAMPTZ NOT NULL
share_weight      DECIMAL(6,3) NOT NULL DEFAULT 1.000
invited_by_user_id TEXT FK → users.user_id   -- nullable
status            TEXT NOT NULL   -- active|inactive|archived|draft
updated_at        TIMESTAMPTZ NOT NULL
UNIQUE (trip_id, user_id)
```

#### `itineraries` (803 rows, IDs start `itn_`)
```sql
itinerary_id           TEXT PRIMARY KEY    -- itn_ prefixed
trip_id                TEXT NOT NULL FK → trips.trip_id
name                   TEXT NOT NULL
version                INTEGER NOT NULL    -- MONOTONIC, NEVER overwrite, always bump
is_active              BOOLEAN NOT NULL    -- exactly one active per trip
generated_by           TEXT NOT NULL   -- user|ai_planner|optimizer|agent|vote|import
total_cost             DECIMAL(12,2) NOT NULL  -- NEVER float
currency               CHAR(3) NOT NULL FK → currencies.iso4217
total_duration_minutes INTEGER NOT NULL
total_carbon_kg        DECIMAL(10,3) NOT NULL
optimizer_weights      TEXT            -- JSON string, nullable
status                 TEXT NOT NULL   -- active|inactive|archived|draft
created_at             TIMESTAMPTZ NOT NULL
updated_at             TIMESTAMPTZ NOT NULL
```

**CRITICAL RULE — Optimistic Concurrency**:
Every mutation to itinerary items MUST:
```sql
UPDATE itineraries
SET version = version + 1, updated_at = NOW()
WHERE itinerary_id = :itn_id AND version = :expected_version;
```
If 0 rows updated → return HTTP 409 Conflict:
```json
{ "error": "CONFLICT", "message": "Itinerary was modified by another member. Please reload latest schedule." }
```
NEVER silently overwrite.

#### `itinerary_items` (8,583 rows, IDs start `itm_`)
```sql
item_id          TEXT PRIMARY KEY    -- itm_ prefixed
itinerary_id     TEXT NOT NULL FK → itineraries.itinerary_id
day_index        SMALLINT NOT NULL   -- 1-based
sort_order       SMALLINT NOT NULL   -- order within the day
starts_at        TIMESTAMPTZ         -- nullable for unscheduled
ends_at          TIMESTAMPTZ         -- nullable
item_type        TEXT NOT NULL   -- hotel|flight|poi|package|guide|transfer|meal|free
entity_type      TEXT            -- hotel|room_type|rate_plan|flight|flight_fare|poi|package|package_component|guide|transfer|event|xr_scene
entity_id        TEXT            -- canonical ID of the referenced supply row
title            TEXT NOT NULL
cost             DECIMAL(12,2) NOT NULL  -- NEVER float, NEVER called estimated_cost
currency         CHAR(3) NOT NULL FK → currencies.iso4217
carbon_kg        DECIMAL(8,3) NOT NULL
duration_minutes INTEGER NOT NULL
source           TEXT NOT NULL   -- user|ai_planner|optimizer|agent|vote|import
explanation      TEXT            -- nullable
locked           BOOLEAN NOT NULL
status           TEXT NOT NULL   -- proposed|confirmed|removed|replaced
created_at       TIMESTAMPTZ NOT NULL
updated_at       TIMESTAMPTZ NOT NULL
```

**WanderMatch adds to itinerary_items** (additive):
```sql
slot_status      TEXT NOT NULL DEFAULT 'EMPTY'
-- EXACTLY 4 values: 'EMPTY' | 'IN_CONSENSUS' | 'BRANCHED' | 'CONFIRMED'
-- Maps 1:1 to colors: Slate | Route | Clay | Amber
-- Never use any other value

time_slot        TEXT  -- 'Morning'|'Afternoon'|'Evening'|'Night' (display label)
current_round    INTEGER NOT NULL DEFAULT 0
consensus_cycle  INTEGER NOT NULL DEFAULT 1
```

#### `proposals` (274 rows, IDs start `prp_`)
```sql
proposal_id         TEXT PRIMARY KEY    -- prp_ prefixed
itinerary_id        TEXT NOT NULL FK → itineraries.itinerary_id
proposed_by_user_id TEXT NOT NULL FK → users.user_id
action              TEXT NOT NULL   -- 'add' | 'remove' | 'replace' | 'reschedule'
target_item_id      TEXT FK → itinerary_items.item_id   -- null for 'add' action
entity_type         TEXT    -- legal entity_type values from enums.json
entity_id           TEXT    -- canonical ID
title               TEXT NOT NULL
rationale           TEXT    -- NOTE: this field is called 'rationale' NOT 'description'
cost_delta          DECIMAL(12,2) NOT NULL  -- NOTE: called 'cost_delta' NOT 'estimated_cost', NEVER float
currency            CHAR(3) NOT NULL FK → currencies.iso4217
closes_at           TIMESTAMPTZ     -- NULL on creation; set to NOW()+10min on first NO vote in Mode NA
status              TEXT NOT NULL DEFAULT 'open'  -- open|accepted|rejected|expired
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

**WanderMatch adds to proposals** (additive):
```sql
trp_id           TEXT FK → trips.trip_id   -- denormalized for convenience
itm_id           TEXT FK → itinerary_items.item_id  -- the slot this proposal is for
current_round    INTEGER NOT NULL DEFAULT 1
source           TEXT DEFAULT 'user'   -- 'user' | 'chat_propose'
```

**CRITICAL RULE — `closes_at` behavior**:
1. On proposal creation: `closes_at = NULL`
2. When FIRST `no` vote is recorded for this proposal IN MODE NA:
   ```sql
   UPDATE proposals SET closes_at = NOW() + INTERVAL '10 minutes'
   WHERE proposal_id = :prp_id AND closes_at IS NULL;
   ```
3. If no NO vote ever lands: `closes_at` stays NULL forever, no timer runs
4. In Mode A: `closes_at` is NEVER set automatically — admin controls timing

#### `votes` (761 rows, IDs start `vot_`)
```sql
vote_id      TEXT PRIMARY KEY    -- vot_ prefixed
proposal_id  TEXT NOT NULL FK → proposals.proposal_id
user_id      TEXT NOT NULL FK → users.user_id
value        TEXT NOT NULL   -- 'yes' | 'no'  (schema allows 'abstain' but WanderMatch NEVER writes it)
weight       DECIMAL(4,2) NOT NULL DEFAULT 1.00  -- present but UNUSED for MVP
comment      TEXT            -- REQUIRED (non-null, non-empty) when value = 'no'
cast_at      TIMESTAMPTZ NOT NULL
updated_at   TIMESTAMPTZ NOT NULL
UNIQUE (proposal_id, user_id)
```

#### `tour_guides` (120 rows, IDs start `gid_`)
```sql
guide_id                 TEXT PRIMARY KEY    -- gid_ prefixed
city_id                  TEXT NOT NULL FK → cities.city_id
display_name             TEXT NOT NULL
languages                TEXT NOT NULL   -- comma-separated BCP-47
specialisation           TEXT NOT NULL   -- heritage|food|trekking|wildlife|photography|religious|shopping|accessibility
secondary_specialisation TEXT            -- same enum, nullable
years_experience         SMALLINT NOT NULL
rating                   DECIMAL(2,1)    -- nullable for new guides
review_count             INTEGER NOT NULL
day_rate                 DECIMAL(12,2) NOT NULL   -- NEVER float
half_day_rate            DECIMAL(12,2) NOT NULL
currency                 CHAR(3) NOT NULL FK → currencies.iso4217
certified                BOOLEAN NOT NULL
bio                      TEXT NOT NULL
status                   TEXT NOT NULL
updated_at               TIMESTAMPTZ NOT NULL
```

#### Reference tables (read-only for WanderMatch)
- `cities` (60 rows, `cty_` prefix): city_id, name, country_id, lat, lng, timezone, primary_language
- `countries` (30 rows, `cnt_` prefix): country_id, iso2, name, default_currency
- `currencies` (25 rows, `cur_` prefix): currency_id, iso4217, symbol, minor_unit_exponent
- `languages` (26 rows, `lng_` prefix): language_id, bcp47, english_name

---

### 3.2 WanderMatch Additive Tables (new — you create these)

#### `branches` (IDs start `brc_`)
```sql
CREATE TABLE branches (
  brc_id          TEXT PRIMARY KEY,
  itm_id          TEXT NOT NULL REFERENCES itinerary_items(item_id),
  parent_branch_id TEXT REFERENCES branches(brc_id),  -- NULL for top-level, set for sub-branches
  title           TEXT NOT NULL,
  rationale       TEXT,
  entity_type     TEXT,
  entity_id       TEXT,
  cost_delta      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'OPEN',  -- 'OPEN' | 'FINALIZED'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `branch_members` (IDs start `bmb_`)
```sql
CREATE TABLE branch_members (
  bmb_id   TEXT PRIMARY KEY,
  brc_id   TEXT NOT NULL REFERENCES branches(brc_id),
  usr_id   TEXT NOT NULL REFERENCES users(user_id),
  status   TEXT NOT NULL DEFAULT 'CONFIRMED'
);
```

#### `revision_history` (IDs start `rev_`)
```sql
CREATE TABLE revision_history (
  rev_id         TEXT PRIMARY KEY,
  itm_id         TEXT NOT NULL REFERENCES itinerary_items(item_id),
  version_number INTEGER NOT NULL,
  snapshot_data  JSONB NOT NULL,   -- full AI-generated plan snapshot
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `trip_chat_messages` (IDs start `msg_`)
```sql
CREATE TABLE trip_chat_messages (
  msg_id      TEXT PRIMARY KEY,
  trp_id      TEXT NOT NULL REFERENCES trips(trip_id),
  usr_id      TEXT NOT NULL REFERENCES users(user_id),
  content     TEXT NOT NULL,
  proposal_id TEXT REFERENCES proposals(proposal_id),  -- set when "Propose this as the plan" clicked
  source      TEXT DEFAULT 'chat',  -- 'chat' | 'chat_propose'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `face_profiles` (IDs start `fcp_`) — Nithya manages the service, you own the table
```sql
CREATE TABLE face_profiles (
  fcp_id        TEXT PRIMARY KEY,
  usr_id        TEXT UNIQUE NOT NULL REFERENCES users(user_id),
  embedding_data JSONB NOT NULL,   -- NEVER expose in API responses
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `photos` (IDs start `pho_`)
```sql
CREATE TABLE photos (
  pho_id      TEXT PRIMARY KEY,
  trp_id      TEXT NOT NULL REFERENCES trips(trip_id),
  uploader_id TEXT NOT NULL REFERENCES users(user_id),
  photo_url   TEXT NOT NULL,   -- Cloudinary URL
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `photo_person` (IDs start `php_`)
```sql
CREATE TABLE photo_person (
  php_id     TEXT PRIMARY KEY,
  pho_id     TEXT NOT NULL REFERENCES photos(pho_id),
  usr_id     TEXT NOT NULL REFERENCES users(user_id),
  confidence DECIMAL(4,3) NOT NULL DEFAULT 0.950
);
```

---

## 4. NAMING CONTRACT — READ BEFORE WRITING ANY CODE

### 4.1 Database & Python: snake_case always
```python
# Correct DB column names (verbatim from PS-11):
user_id, display_name, trip_id, owner_user_id, itinerary_id, item_id,
proposal_id, vote_id, member_id, guide_id, preference_id,
cost_delta, closes_at, rationale, entity_type, entity_id,
day_index, sort_order, starts_at, ends_at, preferred_languages

# Correct additive column names:
slot_status, time_slot, current_round, consensus_cycle,
brc_id, bmb_id, rev_id, msg_id, fcp_id, pho_id, php_id,
clerk_user_id, age_group, trp_id, itm_id, usr_id
```

### 4.2 FastAPI JSON responses: camelCase always
Use Pydantic's `alias_generator`:
```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class WanderMatchBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
```

This automatically converts `trip_id` → `trpId`, `cost_delta` → `costDelta`, etc.

### 4.3 Money: DECIMAL(12,2) in DB, string in API responses
```python
# In SQLAlchemy model:
from decimal import Decimal
cost_delta: Decimal  # never float

# In Pydantic schema (API response):
cost_delta: str  # serialized as "15.00" not 15.0
# Override serializer if needed:
@field_serializer('cost_delta')
def serialize_money(self, v: Decimal) -> str:
    return f"{v:.2f}"
```

### 4.4 WebSocket events: verb-first camelCase (EXACT LIST, no others)
```python
VOTE_CAST = "voteCast"
PROPOSAL_CREATED = "proposalCreated"
BRANCH_CONFIRMED = "branchConfirmed"
SLOT_STATUS_CHANGED = "slotStatusChanged"
AI_PLAN_GENERATED = "aiPlanGenerated"
```

### 4.5 ID generation: opaque prefixed strings
```python
import uuid

def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

# Examples:
generate_id("trp")  # → "trp_a91f3c2b"
generate_id("prp")  # → "prp_7d3e9f1a"
generate_id("vot")  # → "vot_2c8b4e7d"
generate_id("brc")  # → "brc_5f1a2e8c"
```

### 4.6 Enums: exact lowercase snake_case from enums.json
```python
# Vote values (WanderMatch constraint — never write abstain):
VOTE_YES = "yes"
VOTE_NO = "no"

# Slot status (WanderMatch additive):
SLOT_EMPTY = "EMPTY"
SLOT_IN_CONSENSUS = "IN_CONSENSUS"
SLOT_BRANCHED = "BRANCHED"
SLOT_CONFIRMED = "CONFIRMED"

# Branch status (WanderMatch additive):
BRANCH_OPEN = "OPEN"
BRANCH_FINALIZED = "FINALIZED"

# Member roles (from enums.json):
ROLE_OWNER = "owner"
ROLE_EDITOR = "editor"
ROLE_VIEWER = "viewer"
```

---

## 5. DIRECTORY STRUCTURE — WHAT YOU OWN

```
backend/
  app/
    main.py                    ← FastAPI app init, CORS, router registration
    database.py                ← SQLAlchemy engine + session factory
    auth.py                    ← Clerk JWT validation middleware
    models/                    ← SQLAlchemy ORM models (YOU OWN)
      user.py
      trip.py
      itinerary.py
      proposal.py
      vote.py
      branch.py
      chat.py
      photo.py
    schemas/                   ← Pydantic request/response schemas (YOU OWN)
      user.py
      trip.py
      itinerary.py
      proposal.py
      vote.py
      branch.py
      chat.py
      solo.py
    routers/                   ← FastAPI route handlers (YOU OWN)
      trips.py
      proposals.py
      votes.py
      consensus.py             ← calls Sharvani's AI functions
      branches.py
      chat.py
      solo_matching.py         ← calls Sharvani's scorer functions
      photos.py
      health.py
    websocket/
      manager.py               ← In-memory WebSocket connection manager (YOU OWN)
      events.py                ← WebSocket event type constants
    clerK/
      webhook.py               ← Clerk webhook handler → sync user to PostgreSQL
    services/
      consensus_service.py     ← orchestrates Mode A / Mode NA logic, calls backend/ai/
```

You DO NOT edit `/backend/ai/` — you CALL functions from there.

---

## 6. FASTAPI APP SETUP

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WanderMatch API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wandermatch.vercel.app",  # production
        "http://localhost:5173",            # local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
from app.routers import trips, proposals, votes, consensus, branches, chat, solo_matching, photos, health
app.include_router(health.router, prefix="/api")
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
app.include_router(proposals.router, prefix="/api/proposals", tags=["proposals"])
app.include_router(votes.router, prefix="/api/votes", tags=["votes"])
app.include_router(consensus.router, prefix="/api/consensus", tags=["consensus"])
app.include_router(branches.router, prefix="/api/branches", tags=["branches"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(solo_matching.router, prefix="/api/solo-matching", tags=["solo"])
app.include_router(photos.router, prefix="/api/photos", tags=["photos"])

# WebSocket
from app.websocket.manager import ConnectionManager
manager = ConnectionManager()

@app.websocket("/ws/trips/{trp_id}/{usr_id}")
async def websocket_endpoint(websocket, trp_id: str, usr_id: str):
    await manager.connect(websocket, trp_id, usr_id)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except:
        manager.disconnect(trp_id, usr_id)
```

---

## 7. WEBSOCKET CONNECTION MANAGER

```python
# backend/app/websocket/manager.py
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # { trp_id: { usr_id: WebSocket } }
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, trp_id: str, usr_id: str):
        await websocket.accept()
        if trp_id not in self.active_connections:
            self.active_connections[trp_id] = {}
        self.active_connections[trp_id][usr_id] = websocket

    def disconnect(self, trp_id: str, usr_id: str):
        if trp_id in self.active_connections:
            self.active_connections[trp_id].pop(usr_id, None)

    async def broadcast_to_trip(self, trp_id: str, event: dict):
        """Broadcast to ALL members of a trip."""
        if trp_id in self.active_connections:
            for usr_id, ws in self.active_connections[trp_id].items():
                try:
                    await ws.send_json(event)
                except:
                    pass  # disconnected client, ignore

    async def broadcast_to_trip_except(self, trp_id: str, exclude_usr_id: str, event: dict):
        """Broadcast to all members EXCEPT the sender."""
        if trp_id in self.active_connections:
            for usr_id, ws in self.active_connections[trp_id].items():
                if usr_id != exclude_usr_id:
                    try:
                        await ws.send_json(event)
                    except:
                        pass
```

---

## 8. CLERK AUTHENTICATION

### 8.1 JWT Validation Middleware
```python
# backend/app/auth.py
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """Validate Clerk JWT and return the local user record."""
    token = credentials.credentials
    # Validate with Clerk's JWKS endpoint
    # Return local user from DB by clerk_user_id
    # Raise HTTP 401 if invalid
    ...
```

### 8.2 Clerk Webhook Handler (user sync)
```python
# backend/app/clerk/webhook.py
# POST /api/webhooks/clerk
# Receives: user.created event from Clerk
# Action: INSERT into users table with clerk_user_id, display_name, email
# Verify webhook signature using CLERK_WEBHOOK_SECRET from env

@router.post("/webhooks/clerk")
async def clerk_webhook(request: Request, db = Depends(get_db)):
    # Verify svix signature header
    # Parse event type
    # If event_type == "user.created": create user row
    # If event_type == "user.updated": update user row
    # Return 200 OK
```

---

## 9. ALL API ENDPOINTS — COMPLETE SPECIFICATION

### 9.1 Health Check
```
GET /api/health
Response: { "status": "ok", "version": "1.0.0" }
No auth required.
```

### 9.2 Trips

```
GET /api/trips
Auth: required
Returns: list of trips where current user is a member
Response: [{ trpId, title, destinationCityId, startDate, endDate, mode, status, role }]

GET /api/trips/{trp_id}
Auth: required
Returns: full trip with members + active itinerary + proposals + votes
Response: { trpId, title, mode, version, members: [], itinerary: { items: [{ ...item, activeProposal, votes }] } }

POST /api/trips
Auth: required
Body: { title, destinationCityId, startDate, endDate, partySize, mode, notes? }
Action:
  1. Create trip row with owner_user_id = current user
  2. Create itinerary row (version=1, is_active=true, generated_by='user')
  3. Create trip_member row (role='owner')
Response: full Trip object
Errors: 400 if dates invalid

POST /api/trips/{trp_id}/members
Auth: required (owner or editor only)
Body: { userId }
Action: INSERT into trip_members (role='editor' default)
Response: TripMember object
Errors: 409 if already a member
```

### 9.3 Proposals

```
POST /api/proposals
Auth: required (owner or editor role on the trip)
Body: {
  itmId: string,
  trpId: string,
  title: string,
  rationale: string,        ← FIELD IS CALLED rationale, NOT description
  entityType: string,       ← must be valid entity_type from enums.json
  entityId: string,
  costDelta: string,        ← FIELD IS CALLED costDelta, NOT estimatedCost. Store as DECIMAL(12,2)
  currency: string,         ← ISO-4217
}
Action:
  1. Validate entityType is a legal value from enums.json entity_type list
  2. Check if voting window is already open for this itm_id:
     - If proposal exists for this itm_id with closes_at IS NOT NULL AND NOW() < closes_at:
       Return: { status: 'QUEUED', message: 'This proposal has been queued for the next round — the current voting window is still open.' }
       Do NOT create the proposal yet — queue it.
  3. Otherwise: INSERT proposal (closes_at=NULL, status='open', current_round=1)
  4. Update itinerary_item.slot_status = 'IN_CONSENSUS'
  5. Broadcast WebSocket event: proposalCreated
Response: Proposal object with closesAt: null

GET /api/proposals/{prp_id}
Auth: required
Returns: full proposal with votes
```

### 9.4 Votes

```
POST /api/votes
Auth: required
Body: { prpId, value, comment? }
Business rules (enforce ALL of these at API level):

RULE 1 — Binary only:
  If value not in ['yes', 'no'] → HTTP 400: "vote value must be 'yes' or 'no'"

RULE 2 — NO requires comment:
  If value == 'no' AND (comment is null OR comment.strip() == '') →
  HTTP 400: "A 'no' vote REQUIRES a typed reason or suggestion in the comment field."

RULE 3 — One active YES per slot:
  If value == 'yes':
    Find all proposals for the SAME itm_id as prpId
    For each: if current user has a 'yes' vote on it (and it's not prpId) → retract it
    (UPDATE votes SET value='no', comment='Retracted — voted yes on another proposal', updated_at=NOW()
     WHERE proposal_id = :other_prp_id AND user_id = :usr_id AND value = 'yes')
    Do this in the SAME transaction as the new vote insert.

RULE 4 — Mode NA timer:
  After inserting the NO vote:
    Count NO votes for this proposal WHERE value='no'
    If count == 1 (this is the FIRST no vote):
      Get the trip's mode
      If mode == 'Mode NA':
        UPDATE proposals SET closes_at = NOW() + INTERVAL '10 minutes'
        WHERE proposal_id = :prp_id AND closes_at IS NULL

RULE 5 — Non-voters are never blocked:
  A user who hasn't voted can always vote. Do NOT check "has this user voted before" as a blocker.
  The UNIQUE(proposal_id, user_id) constraint handles duplicate prevention — use upsert (ON CONFLICT DO UPDATE).

Action sequence:
  1. Validate rules 1 and 2 first (cheap checks)
  2. Begin transaction
  3. Retract other YES votes (rule 3) if applicable
  4. Upsert vote row
  5. Handle Mode NA timer (rule 4) if applicable
  6. Commit transaction
  7. Broadcast WebSocket: voteCast { type, trpId, prpId, usrId, value, comment }
Response: Vote object
```

### 9.5 Consensus

```
POST /api/consensus/reconcile
Auth: required (owner or editor)
Body: { prpId }
Action:
  1. Load proposal, all current NO votes with comments, itinerary item, trip
  2. Validate: slot_status == 'IN_CONSENSUS' (not already BRANCHED or CONFIRMED)
  3. Call Sharvani's AI functions:
     from backend.ai.modes.mode_a_orchestrator import run_mode_a  (if Mode A)
     from backend.ai.modes.mode_na_orchestrator import run_mode_na  (if Mode NA)
  4. If AI returns BLENDED action:
     - Store result in revision_history
     - Broadcast: aiPlanGenerated { type, trpId, itmId, blendedPlan, currentRound }
     - Return: { action: 'BLENDED', blendedPlan: {...}, currentRound: N }
  5. If AI returns BRANCHED action:
     - Create branch rows in branches table
     - Create branch_member rows
     - Single-member branches: set status='FINALIZED' immediately
     - Update itinerary_item.slot_status = 'BRANCHED'
     - Broadcast: slotStatusChanged { type, trpId, itmId, slotStatus: 'BRANCHED' }
     - Return: { action: 'BRANCHED', branches: [...] }

Response (BLENDED):
{
  action: 'BLENDED',
  blendedPlan: {
    title: string,
    rationale: string,
    entityType: string,
    entityId: string,
    costDelta: string,   ← money as string
  },
  currentRound: number
}

Response (BRANCHED):
{
  action: 'BRANCHED',
  branches: [
    { brcId, title, status, members: [{ usrId, displayName }] }
  ]
}
```

### 9.6 Branches

```
GET /api/branches/{itm_id}
Auth: required (trip member)
Returns: all branches for this slot, including members and parent_branch_id

POST /api/branches/{brc_id}/confirm
Auth: required (must be a branch_member of this brc_id)
Action:
  1. Verify current user is in branch_members for brc_id
  2. Mark member's status as 'CONFIRMED'
  3. Check if all branch members have confirmed → if yes, set branch status='FINALIZED'
  4. Check if all top-level branches are FINALIZED → if yes, set slot_status='CONFIRMED'
  5. Broadcast: branchConfirmed { type, trpId, brcId, usrId }
  6. If slot now CONFIRMED: broadcast slotStatusChanged { type, trpId, itmId, slotStatus: 'CONFIRMED' }

POST /api/branches/{brc_id}/modify
Auth: required (must be a branch_member)
Body: { comment: string }
Action: Store modification request, trigger branch revision cycle (call Sharvani's AI)
Response: { status: 'MODIFICATION_REQUESTED', message: '...' }
```

### 9.7 Trip Chat

```
GET /api/chat/{trp_id}
Auth: required (trip member)
Returns: all messages for trip, ordered by created_at ASC
Response: [{ msgId, trpId, usrId, displayName, content, proposalId, source, createdAt }]

POST /api/chat
Auth: required (trip member)
Body: { trpId, content }
Action:
  1. INSERT trip_chat_messages
  2. Broadcast via WebSocket to ALL trip members (not just others)
     Note: chat messages are broadcast through a different channel — discuss with Nithya
     who owns the chat WebSocket implementation. You provide the DB + endpoint.
Response: ChatMessage object

POST /api/chat/{msg_id}/propose
Auth: required (trip member)
Action:
  1. Load the chat message
  2. Get all active trip members for the trip
  3. Create a proposal from the message content (source='chat_propose')
  4. Wait for votes OR check if already unanimous (in practice, expose vote endpoint)
  5. UNANIMOUS PATH: if all applicable members vote YES:
     - Update itinerary_item.slot_status = 'CONFIRMED'
     - Update proposal.status = 'accepted'
     - Terminate any active AI consensus loop for this slot
     - Broadcast: slotStatusChanged { type, trpId, itmId, slotStatus: 'CONFIRMED' }
     - Return: { status: 'CONFIRMED', message: 'Unanimous! Slot confirmed.' }
  6. MAJORITY-NOT-UNANIMOUS PATH: if majority but not all YES:
     - Create standard proposal (source='chat_propose') for next round
     - Do NOT confirm the slot
     - Return: { status: 'QUEUED', message: 'Not unanimous — queued as standard proposal for next round.' }
Response: { status: 'CONFIRMED' | 'QUEUED' | 'PENDING', ... }
```

### 9.8 Solo Matching

```
POST /api/solo-matching/groups
Auth: required
Body: { usrId }
Action:
  1. Load user + user_preferences for usrId
  2. Get all group trips (is_group_trip=true, status='planning') with their members + preferences
  3. Call Sharvani's scorer:
     from backend.ai.scorers.group_compatibility_scorer import score_group_match
     scores = score_group_match(user, user_prefs, candidate_trips)
  4. Sort by score descending
  5. Return top 20 matches
Response: [{ trip: TripObject, compatibilityScore: int, ageGroupMatch: bool, sharedLanguages: [], sharedInterests: [], dateOverlapDays: int }]
NOTE: compatibilityScore is an INTEGER 0-100. NOT a float. NOT a string. This is a deterministic math function — no LLM call.

POST /api/solo-matching/guides
Auth: required
Body: { usrId, city: string, maxBudget: string }
Action:
  1. Load user + user_preferences
  2. Load guides for the city (filter by city name or city_id)
  3. Call Sharvani's scorer:
     from backend.ai.scorers.guide_compatibility_scorer import score_guide_match
     scores = score_guide_match(user, user_prefs, candidate_guides, max_budget)
  4. Sort by score descending
  5. Return top 20 matches
Response: [{ guide: GuideObject, compatibilityScore: int, sharedLanguages: [], sharedSpecialisations: [] }]
NOTE: Same rule — integer 0-100, no LLM.
```

### 9.9 Photos

```
POST /api/photos
Auth: required (trip member)
Body: multipart form — trpId, photo file
Action:
  1. Upload to Cloudinary (Nithya's service handles this — call her endpoint or service)
  2. INSERT into photos table (pho_id, trp_id, uploader_id, photo_url)
  3. If face recognition enabled: trigger Nithya's face matching service
  4. Return photo object
Response: { phoId, trpId, uploaderId, photoUrl, createdAt }

GET /api/photos/{trp_id}
Auth: required (trip member)
Query params: ?usrId= (optional, for "My Photos" filtered view)
Action:
  - Without usrId: return ALL photos for the trip (visible to everyone)
  - With usrId: return only photos where photo_person.usr_id = usrId (requires face registration)
Response: [{ phoId, photoUrl, uploaderId, taggedUsers: [{ usrId, displayName, confidence }] }]
```

---

## 10. CONSENSUS SERVICE — YOUR ORCHESTRATION LAYER

You own `services/consensus_service.py` which orchestrates between your business logic and Sharvani's AI core:

```python
# backend/app/services/consensus_service.py

from backend.ai.modes.mode_a_orchestrator import run_mode_a_round
from backend.ai.modes.mode_na_orchestrator import run_mode_na_round

async def run_consensus_round(proposal_id: str, trip_id: str, db):
    """
    Main entry point called by POST /api/consensus/reconcile
    Decides which orchestrator to run based on trip mode.
    Returns either BLENDED or BRANCHED result.
    """
    # 1. Load trip mode
    # 2. Load proposal + all NO votes + comments
    # 3. Load itinerary item + hard constraints
    # 4. Check current_round number
    # 5. Route to correct orchestrator
    # 6. Handle result (store revision_history, create branches if needed)
    # 7. Update slot_status
    # 8. Broadcast WebSocket events
    # 9. Return structured result
```

---

## 11. PYDANTIC SCHEMAS — KEY SHAPES

```python
# schemas/proposal.py
from pydantic import BaseModel, ConfigDict, field_serializer
from pydantic.alias_generators import to_camel
from decimal import Decimal
from typing import Optional
from datetime import datetime

class ProposalCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    itm_id: str
    trp_id: str
    title: str
    rationale: str          # NOT description
    entity_type: str
    entity_id: str
    cost_delta: Decimal     # stored as DECIMAL(12,2)
    currency: str

class ProposalResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    prp_id: str
    itm_id: str
    title: str
    rationale: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    cost_delta: str         # serialized as string
    currency: str
    closes_at: Optional[str]  # null until first NO in Mode NA
    status: str
    current_round: int

    @field_serializer('cost_delta')
    def serialize_cost_delta(self, v) -> str:
        return f"{Decimal(str(v)):.2f}"

# schemas/vote.py
class VoteCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    prp_id: str
    value: str      # 'yes' or 'no' only
    comment: Optional[str] = None

class VoteResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    vot_id: str
    prp_id: str
    usr_id: str
    display_name: str
    value: str
    comment: Optional[str]
    cast_at: str
```

---

## 12. CRITICAL BUSINESS RULES SUMMARY

| Rule | Enforcement location | What happens on violation |
|---|---|---|
| NO vote requires non-empty comment | `POST /api/votes` | HTTP 400 |
| vote.value must be 'yes' or 'no' only | `POST /api/votes` | HTTP 400 |
| Yes on B retracts Yes on A (same slot) | `POST /api/votes` transaction | Silent retraction in same TX |
| closes_at set only on first NO in Mode NA | `POST /api/votes` | Set to NOW()+10min |
| itineraries.version must be bumped, never overwritten | Every itinerary item mutation | HTTP 409 on mismatch |
| Proposal queued if window open for slot | `POST /api/proposals` | Return QUEUED status |
| entity_type must be valid enum value | `POST /api/proposals` | HTTP 400 |
| rationale field name (not description) | DB column + API schema | N/A — just use the right name |
| cost_delta field name (not estimatedCost) | DB column + API schema | N/A — just use the right name |
| Single-member branch auto-finalizes | `POST /api/consensus/reconcile` | Set status='FINALIZED' immediately |
| unanimous chat propose → CONFIRMED | `POST /api/chat/:msgId/propose` | slot_status='CONFIRMED', AI loop terminated |
| majority-not-unanimous → re-enters flow | `POST /api/chat/:msgId/propose` | QUEUED as standard proposal |
| Money never as float | All DB interactions | Use Decimal throughout |
| Nothing hard-deleted | All DELETE operations | Use status='inactive' or 'archived' instead |

---

## 13. PHASE-BY-PHASE EXECUTION PLAN

### PHASE 0 — Hour 0–1 (12:00–13:00)
**Your job**: Load PS-11 data, confirm additive tables, set up FastAPI scaffold.

Concrete deliverables:
1. Load PS-11 data into PostgreSQL:
   ```bash
   createdb wandermatch_db
   psql -d wandermatch_db -f schema.sql
   # Load CSVs in order (numbered filenames = load order)
   for f in csv/*.csv; do
     t=$(basename "$f" .csv | sed 's/^[0-9]*_//')
     psql -d wandermatch_db -c "\copy $t FROM '$f' CSV HEADER"
   done
   ```
2. Add WanderMatch additive columns and tables (Section 3.1 additive additions + Section 3.2 new tables)
3. Run `validate_conformance.py` — must output PASS
4. Set up FastAPI app with health endpoint responding HTTP 200
5. Set up SQLAlchemy models for all tables
6. Write `.env` with `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
7. Confirm with team: API endpoint list is shared and agreed

**Gate**: `GET /api/health` returns `{ "status": "ok" }`. Done.

---

### PHASE 1 — Hours 1–4 (13:00–16:00)
**Your job**: FastAPI scaffold + CRUD for trips, trip_members, proposals, votes.

Concrete deliverables:
1. Clerk JWT middleware (`auth.py`) — protect all routes except `/api/health` and `/api/webhooks/clerk`
2. Clerk webhook handler (`POST /api/webhooks/clerk`) — create/update user on `user.created` event
3. `POST /api/trips` — create trip + itinerary + owner membership in one transaction
4. `GET /api/trips` — list user's trips
5. `GET /api/trips/:trp_id` — full trip with members and itinerary items
6. `POST /api/trips/:trp_id/members` — invite member
7. `POST /api/proposals` — create proposal with queuing logic
8. WebSocket manager skeleton (`ConnectionManager`) — accept connections, `broadcast_to_trip` method
9. WebSocket endpoint `/ws/trips/{trp_id}/{usr_id}`

**Gate**: Can you create a trip via POST and retrieve it via GET? Done.

---

### PHASE 2 — Hours 4–8 (16:00–20:00)
**Your job**: Vote endpoint with all business rules + WebSocket broadcasting.

Concrete deliverables:
1. `POST /api/votes` with ALL 5 business rules (Section 9.4):
   - Rule 1: binary only validation
   - Rule 2: NO requires comment
   - Rule 3: yes-on-B retracts yes-on-A (SAME TRANSACTION)
   - Rule 4: closes_at set on first NO in Mode NA
   - Rule 5: non-voters never blocked (upsert pattern)
2. After vote insert: broadcast `voteCast` to all trip members via WebSocket
3. `itineraries.version` optimistic concurrency bump logic
4. HTTP 409 on version mismatch (Section 3.1, itineraries)
5. In-memory WebSocket manager: test with two clients receiving the same broadcast

**Gate**: POST /api/votes with value='no' and empty comment returns HTTP 400. Vote with valid comment succeeds and you see broadcast in second WebSocket client. Done.

---

### PHASE 3 — Hours 8–12 (20:00–00:00)
**Your job**: closes_at 10-minute window. Round counter. Revision history.

Concrete deliverables:
1. Mode NA timer trigger in `POST /api/votes`:
   - Count NO votes for proposal
   - If first NO vote AND mode == 'Mode NA': set closes_at
2. Background timer / expiry check:
   - Option A (simplest for hackathon): check `closes_at < NOW()` on every `GET /api/proposals/:prp_id` call and return `status: 'expired'` if past
   - Option B: `asyncio.create_task` background timer (more correct, more complex)
   - Recommendation: Option A for hackathon reliability
3. `current_round` increment logic in proposals
4. `revision_history` table: INSERT on every AI-generated blended plan
5. `POST /api/consensus/reconcile` skeleton (returns mock BLENDED response until Sharvani's AI is ready)

**Gate**: POST a NO vote in Mode NA trip, confirm closes_at is set to ~10 min from now. Done.

---

### CHECKPOINT 1 — Hour 12 (00:00)
**STOP.** Everyone merges into `develop`. You run the integration test with Nikitha:
- Sign up (Clerk webhook fires → user row created)
- Create trip → itinerary created, version=1
- Submit proposal → slot_status=IN_CONSENSUS
- Vote NO with comment → HTTP 200, closesAt set, voteCast WebSocket broadcast received in Nikitha's browser
- Vote YES → HTTP 200, voteCast broadcast

---

### PHASE 4 — Hours 12–16 (00:00–04:00)
**Your job**: Branches + branch_members + recursive endpoint. Wire real AI calls.

Concrete deliverables:
1. Wire `POST /api/consensus/reconcile` to Sharvani's actual AI modules (coordinate with her)
2. `GET /api/branches/:itm_id` — list all branches with members
3. `POST /api/branches/:brc_id/confirm` — confirm branch, check if all confirmed → FINALIZED
4. `POST /api/branches/:brc_id/modify` — request modification, call AI revision
5. Auto-resolve single-member branches: when creating branches, any branch with 1 member → status='FINALIZED' immediately
6. When all branches FINALIZED: set slot_status='CONFIRMED', broadcast slotStatusChanged
7. Broadcast `branchConfirmed` on each confirm action

**Gate**: POST /api/consensus/reconcile returns { action: 'BRANCHED', branches: [...] } with correct branch rows in DB. Done.

---

### PHASE 5 — Hours 16–19 (04:00–07:00)
**Your job**: Solo matching endpoints. Group + guide compatibility.

Concrete deliverables:
1. `POST /api/solo-matching/groups` — call Sharvani's group_compatibility_scorer, return sorted results
2. `POST /api/solo-matching/guides` — call Sharvani's guide_compatibility_scorer, return sorted results
3. Verify compatibilityScore is integer 0-100 in response (never float, never string)
4. Trip Chat: `GET /api/chat/:trp_id`, `POST /api/chat`, `POST /api/chat/:msg_id/propose`
5. Unanimous override logic in `POST /api/chat/:msg_id/propose`

**Gate**: POST /api/solo-matching/groups returns array with integer compatibilityScore field. Done.

---

### PHASE 6 — Hours 19–21 (07:00–09:00)
**Your job**: Fix cross-endpoint integration issues found during full click-through.

- Coordinate with Nikitha on any field name mismatches
- Coordinate with Sharvani on any AI function signature issues
- Fix any HTTP 500 errors in the demo flow
- Verify all 5 WebSocket events fire correctly

---

### CHECKPOINT 2 — Hour 21 (09:00)
**STOP.** Merge into `develop` → `main`. Feature freeze.

---

### PHASE 7 — Hours 21–24 (09:00–12:00)
**Demo prep only.** Fix only bugs in the rehearsed demo path.

---

## 14. DEPENDENCY MAP — WHAT YOU NEED FROM OTHERS AND WHEN

| What you need | From whom | When |
|---|---|---|
| `DATABASE_URL` configured | Nithya | Hour 0 |
| `CLERK_SECRET_KEY` + `CLERK_WEBHOOK_SECRET` | Nithya | Hour 0 |
| Sharvani's AI function signatures | Sharvani | Hour 8 (before Phase 3) |
| `run_mode_a_round()` function callable | Sharvani | Hour 12 (Checkpoint 1) |
| `run_mode_na_round()` function callable | Sharvani | Hour 12 (Checkpoint 1) |
| `score_group_match()` function callable | Sharvani | Hour 16 (Phase 4) |
| `score_guide_match()` function callable | Sharvani | Hour 16 (Phase 4) |
| Cloudinary upload service | Nithya | Hour 16 (Phase 4) |
| Face matching service | Nithya | Hour 19 (Phase 5, optional) |

---

## 15. WHAT YOU MUST NEVER DO

1. Never rename or drop any PS-11 provided column
2. Never store money as float — always DECIMAL(12,2) in DB, string in API
3. Never write `value = 'abstain'` in any vote insert
4. Never call the field `description` — it is `rationale`
5. Never call the field `estimated_cost` — it is `cost_delta`
6. Never set `closes_at` automatically in Mode A
7. Never silently overwrite on `itineraries.version` mismatch — always HTTP 409
8. Never hard-delete any row — use `status = 'inactive'` or `'archived'`
9. Never expose `face_profiles.embedding_data` in any API response
10. Never skip the "single-member branch auto-finalize" step
11. Never accept `value='no'` with empty or whitespace-only comment
12. Never edit `/backend/ai/` — call Sharvani's functions, don't change them
13. Never parse an ID string for meaning — IDs are opaque
14. Never return money as a JS number — serialize Decimal as string in all responses
