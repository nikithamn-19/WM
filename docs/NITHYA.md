# NITHYA.md — Setup / Integration / Deploy Track Owner
## WanderMatch · KogniVera Hackathon 2026 · PS-11

---

## HOW TO USE THIS DOC (Read this first, give it to your agent verbatim)

> "I am P Nithya, Setup/Integration/Deploy developer for WanderMatch at KogniVera Hackathon 2026. Read this entire document carefully. It contains my full project context, my exact responsibilities across infrastructure setup, PostgreSQL provisioning and seeding, Clerk auth integration, Cloudinary photo service, Trip Chat WebSocket, face recognition service (optional), and full deployment to Vercel + Render. After reading, give me a detailed prompt to execute Phase [X] of my work. Do not assume anything not written here. Do not invent env variable names, table names, or service URLs. Everything is specified."

---

## 1. WHAT WANDERMATCH IS — FULL CONTEXT

WanderMatch is a social group travel planning web app. Groups plan trips together on a shared live itinerary. Members propose activities, vote YES or NO (NO requires a typed reason), and an AI layer generates compromise plans or parallel branches. Solo travelers can also find compatible group trips or guides via deterministic matching.

### My specific role:
I am the foundation everyone else builds on. My work is front-loaded into Hour 0–1 so nobody else is blocked. I:
- Create the GitHub repo and branch structure
- Provision PostgreSQL and seed the PS-11 data
- Set up all external services (Clerk, Cloudinary, ngrok)
- Write `.env.example` with every variable the team needs
- Build the Cloudinary photo upload endpoint
- Build the Trip Chat WebSocket (Panchami owns the DB table, I wire the real-time layer)
- Build the optional face recognition service
- Deploy backend to Render and frontend to Vercel
- Float into backend support after setup is done

### Tech I use:
- **Git/GitHub**: repo setup, branch management
- **PostgreSQL**: provisioning, schema migration, seeding PS-11 data
- **Clerk**: auth service setup (get keys, configure webhooks, test JWT)
- **Cloudinary**: photo storage service setup + upload endpoint (Python)
- **ngrok**: static tunnel for Sharvani's local Ollama LLM
- **Render**: backend deployment
- **Vercel**: frontend deployment
- **Python**: Cloudinary service, face recognition service
- **DeepFace / ArcFace**: optional face embedding + matching

I OWN:
- `/infra/` — all deployment configs, migration scripts, seed scripts
- `.env.example` — the single source of truth for all env variables
- `/backend/services/face/` — face recognition service
- `/backend/services/auth/` — Clerk webhook handler (coordinate with Panchami)
- Trip Chat WebSocket wiring (real-time layer, Panchami owns DB table)
- Cloudinary upload endpoint

I DO NOT touch:
- `/frontend/src/` (Nikitha owns)
- `/backend/app/routers/` or `/backend/app/models/` (Panchami owns)
- `/backend/ai/` (Sharvani owns)

---

## 2. THE DATABASE — WHAT I PROVISION AND SEED

### 2.1 The PS-11 provided data (27,428 rows across 14 tables)

I am responsible for loading ALL of this into PostgreSQL. Here are the tables and their row counts:

| Table | Rows | ID Prefix | Notes |
|---|---|---|---|
| currencies | 25 | cur_ | Load FIRST — others depend on it |
| languages | 26 | lng_ | Load SECOND |
| countries | 30 | cnt_ | Load THIRD |
| cities | 60 | cty_ | Load FOURTH |
| tour_guides | 120 | gid_ | |
| users | 1,200 | usr_ | |
| user_preferences | 1,200 | prf_ | |
| trips | 600 | trp_ | |
| trip_members | 1,407 | tmb_ | |
| itineraries | 803 | itn_ | |
| itinerary_items | 8,583 | itm_ | Largest table |
| proposals | 274 | prp_ | Pre-seeded proposals for demo |
| votes | 761 | vot_ | Pre-seeded votes including ties |
| user_interactions | 12,339 | uix_ | |

**Load order is critical** — CSV filenames are numbered for this reason. Load them in numeric order or foreign keys will fail.

### 2.2 WanderMatch additive columns (I add these AFTER seeding PS-11 data)

**Add to `trips` table**:
```sql
ALTER TABLE trips ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'Mode NA';
-- Values: 'Mode A' or 'Mode NA'
```

**Add to `users` table**:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_group TEXT;
-- age_group values: '18-24'|'25-34'|'35-44'|'45-54'|'55+'
```

**Add to `itinerary_items` table**:
```sql
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS slot_status TEXT NOT NULL DEFAULT 'EMPTY';
-- EXACTLY 4 values: 'EMPTY' | 'IN_CONSENSUS' | 'BRANCHED' | 'CONFIRMED'
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS time_slot TEXT;
-- Values: 'Morning' | 'Afternoon' | 'Evening' | 'Night'
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS current_round INTEGER NOT NULL DEFAULT 0;
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS consensus_cycle INTEGER NOT NULL DEFAULT 1;
```

**Add to `proposals` table**:
```sql
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS trp_id TEXT REFERENCES trips(trip_id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS itm_id TEXT REFERENCES itinerary_items(item_id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS current_round INTEGER NOT NULL DEFAULT 1;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user';
-- source values: 'user' | 'chat_propose'
-- NOTE: closes_at already exists in PS-11 schema (NOT NULL) — WanderMatch sets it to NULL on creation
-- To allow NULL: ALTER TABLE proposals ALTER COLUMN closes_at DROP NOT NULL;
```

### 2.3 WanderMatch additive tables (I create these from scratch)

```sql
-- branches (brc_ prefix)
CREATE TABLE IF NOT EXISTS branches (
    brc_id           TEXT PRIMARY KEY,
    itm_id           TEXT NOT NULL REFERENCES itinerary_items(item_id),
    parent_branch_id TEXT REFERENCES branches(brc_id),
    title            TEXT NOT NULL,
    rationale        TEXT,
    entity_type      TEXT,
    entity_id        TEXT,
    cost_delta       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency         TEXT NOT NULL DEFAULT 'USD',
    status           TEXT NOT NULL DEFAULT 'OPEN',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- branch_members (bmb_ prefix)
CREATE TABLE IF NOT EXISTS branch_members (
    bmb_id   TEXT PRIMARY KEY,
    brc_id   TEXT NOT NULL REFERENCES branches(brc_id),
    usr_id   TEXT NOT NULL REFERENCES users(user_id),
    status   TEXT NOT NULL DEFAULT 'CONFIRMED'
);

-- revision_history (rev_ prefix)
CREATE TABLE IF NOT EXISTS revision_history (
    rev_id         TEXT PRIMARY KEY,
    itm_id         TEXT NOT NULL REFERENCES itinerary_items(item_id),
    version_number INTEGER NOT NULL,
    snapshot_data  JSONB NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- trip_chat_messages (msg_ prefix)
CREATE TABLE IF NOT EXISTS trip_chat_messages (
    msg_id      TEXT PRIMARY KEY,
    trp_id      TEXT NOT NULL REFERENCES trips(trip_id),
    usr_id      TEXT NOT NULL REFERENCES users(user_id),
    content     TEXT NOT NULL,
    proposal_id TEXT REFERENCES proposals(proposal_id),
    source      TEXT DEFAULT 'chat',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- face_profiles (fcp_ prefix)
CREATE TABLE IF NOT EXISTS face_profiles (
    fcp_id         TEXT PRIMARY KEY,
    usr_id         TEXT UNIQUE NOT NULL REFERENCES users(user_id),
    embedding_data JSONB NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- photos (pho_ prefix)
CREATE TABLE IF NOT EXISTS photos (
    pho_id      TEXT PRIMARY KEY,
    trp_id      TEXT NOT NULL REFERENCES trips(trip_id),
    uploader_id TEXT NOT NULL REFERENCES users(user_id),
    photo_url   TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- photo_person (php_ prefix)
CREATE TABLE IF NOT EXISTS photo_person (
    php_id     TEXT PRIMARY KEY,
    pho_id     TEXT NOT NULL REFERENCES photos(pho_id),
    usr_id     TEXT NOT NULL REFERENCES users(user_id),
    confidence DECIMAL(4,3) NOT NULL DEFAULT 0.950
);
```

---

## 3. ENVIRONMENT VARIABLES — THE MASTER LIST

I own `.env.example`. Every env variable the whole team needs lives here. I fill in all real values in the actual `.env` (never committed to git) and share them securely with the team.

```bash
# ============================================================
# .env.example — WanderMatch · KogniVera Hackathon 2026
# Copy to .env and fill in real values. Never commit .env.
# ============================================================

# --- CLERK AUTHENTICATION ---
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
# → Get from: Clerk Dashboard → Your App → API Keys → Publishable Key
# → Used by: Nikitha's React frontend (VITE_ prefix = exposed to browser)

CLERK_SECRET_KEY=sk_test_...
# → Get from: Clerk Dashboard → Your App → API Keys → Secret Key
# → Used by: Panchami's FastAPI backend for JWT validation

CLERK_WEBHOOK_SECRET=whsec_...
# → Get from: Clerk Dashboard → Your App → Webhooks → signing secret
# → Used by: Panchami's webhook handler to verify Clerk events

# --- DATABASE ---
DATABASE_URL=postgresql://user:password@host:5432/wandermatch_db?sslmode=require
# → Get from: Render PostgreSQL dashboard OR Neon dashboard
# → Used by: Panchami's FastAPI backend (SQLAlchemy connection string)

# --- LLM (LOCAL MODEL VIA NGROK) ---
NGROK_LLM_URL=https://xxxx.ngrok-free.app
# → Get from: ngrok dashboard (set up static domain — same URL every restart)
# → Used by: Sharvani's AI modules (Ollama running on local laptop via tunnel)
# → NOTE: This is the ngrok tunnel to Sharvani's local Ollama instance (port 11434)

# --- CLOUDINARY ---
CLOUDINARY_CLOUD_NAME=wandermatch
# → Get from: Cloudinary Dashboard → Settings → Account
CLOUDINARY_API_KEY=123456789012345
# → Get from: Cloudinary Dashboard → Settings → Access Keys
CLOUDINARY_API_SECRET=abc123xyz_secret_here
# → Get from: Cloudinary Dashboard → Settings → Access Keys
# → All three used by: Nithya's photo upload service (backend only, never exposed to frontend)

# --- BACKEND URLS (used by frontend) ---
VITE_API_BASE_URL=https://wandermatch-api.onrender.com
# → Set after Render deployment. During local dev: http://localhost:8000
# → Used by: Nikitha's React frontend for all REST API calls

VITE_WS_BASE_URL=wss://wandermatch-api.onrender.com
# → Set after Render deployment. During local dev: ws://localhost:8000
# → Used by: Nikitha's React frontend for WebSocket connections

# --- OPTIONAL: FACE RECOGNITION ---
FACE_RECOGNITION_ENABLED=false
# → Set to 'true' only if face service is built and deployed
# → Used by: Nithya's face service + photo upload endpoint
```

---

## 4. DIRECTORY STRUCTURE — WHAT I OWN

```
/ (repo root)
  .env.example                ← I OWN THIS — master env variable list
  .gitignore                  ← I CREATE THIS (include .env, __pycache__, node_modules)
  README.md                   ← I CREATE THIS (setup instructions for team)

infra/                        ← I OWN ALL OF THIS
  migrations/
    01_ps11_schema.sql        ← PS-11 provided schema (verbatim copy)
    02_wandermatch_additive.sql ← Additive columns + new tables
    03_demo_seed.sql          ← Demo trip + demo users + scripted disagreement seed
  scripts/
    seed_ps11.sh              ← Script to load all PS-11 CSVs into PostgreSQL
    validate.sh               ← Runs validate_conformance.py
    reset_demo.sh             ← Resets demo trip data to clean state for rehearsal

backend/
  services/
    face/                     ← I OWN ALL OF THIS
      __init__.py
      registration.py         ← 3-photo capture, quality check, ArcFace embedding generation
      matching.py             ← DeepFace.find against trip members only
      models.py               ← face_profiles, photos, photo_person DB access
    cloudinary_service.py     ← I OWN THIS — photo upload + CDN URL generation
    chat_ws.py                ← I OWN THIS — Trip Chat WebSocket real-time layer

frontend/
  vercel.json                 ← I CREATE THIS — Vercel deployment config

backend/
  render.yaml                 ← I CREATE THIS — Render deployment config
  requirements.txt            ← I MAINTAIN THIS — all Python dependencies
  Procfile                    ← I CREATE THIS — uvicorn start command
```

---

## 5. GITHUB REPO SETUP

### 5.1 Branch structure (create ALL of these at Hour 0)
```bash
git init
git remote add origin https://github.com/[org]/wandermatch.git

# Create and push all branches:
git checkout -b main
git push -u origin main

git checkout -b develop
git push -u origin develop

git checkout -b feature/frontend
git push -u origin feature/frontend

git checkout -b feature/backend
git push -u origin feature/backend

git checkout -b feature/ai
git push -u origin feature/ai

git checkout -b feature/setup
git push -u origin feature/setup
```

### 5.2 `.gitignore` (create at root)
```gitignore
# Environment
.env
.env.local
.env.*.local

# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
venv/
dist/
*.pyc

# Node
node_modules/
dist/
.vite/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Data (never commit the PS-11.db or CSV files)
data/PS-11.db
data/csv/
*.db
```

### 5.3 Initial folder structure to create
```bash
mkdir -p frontend/src
mkdir -p backend/app/{models,schemas,routers,websocket,clerk}
mkdir -p backend/ai/{core,modes,scorers,llm,tests}
mkdir -p backend/services/{face}
mkdir -p infra/{migrations,scripts}
touch backend/requirements.txt
touch backend/Procfile
touch .env.example
touch README.md
```

---

## 6. POSTGRESQL PROVISIONING AND SEEDING

### 6.1 Provision on Render (or Neon)
1. Go to Render Dashboard → New → PostgreSQL
2. Name: `wandermatch-db`
3. Region: Singapore (closest to India for demo day latency)
4. Plan: Free tier (sufficient for hackathon)
5. Copy the **Internal Database URL** → this is `DATABASE_URL` in `.env`

### 6.2 Load PS-11 schema
```bash
# infra/scripts/seed_ps11.sh
#!/bin/bash
set -e

DB_URL=$DATABASE_URL

echo "Step 1: Running PS-11 schema..."
psql $DB_URL -f infra/migrations/01_ps11_schema.sql

echo "Step 2: Loading PS-11 CSVs in order..."
CSV_DIR="data/csv"
for f in $(ls $CSV_DIR/*.csv | sort); do
  tablename=$(basename "$f" .csv | sed 's/^[0-9]*_//')
  echo "  Loading $tablename from $f..."
  psql $DB_URL -c "\copy $tablename FROM '$f' CSV HEADER"
done

echo "Step 3: Running WanderMatch additive migrations..."
psql $DB_URL -f infra/migrations/02_wandermatch_additive.sql

echo "Step 4: Validating conformance..."
python3 tools/validate_conformance.py data/PS-11.db

echo "Step 5: Loading demo seed data..."
psql $DB_URL -f infra/migrations/03_demo_seed.sql

echo "✓ Database ready."
```

### 6.3 Demo seed data (`infra/migrations/03_demo_seed.sql`)

This creates the specific demo scenario used during judging:

```sql
-- Demo Trip: Bali Tropical Escape (Mode NA for demo — shows AI consensus)
INSERT INTO trips (trip_id, owner_user_id, title, destination_city_id, start_date, end_date, 
                   party_size, adults, children, trip_type, is_group_trip, status, home_currency, mode)
VALUES (
    'trp_demo_bali',
    'usr_demo_owner',
    'Bali Tropical Escape & Cultural Journey',
    (SELECT city_id FROM cities WHERE name ILIKE '%bali%' LIMIT 1),
    '2026-10-10',
    '2026-10-16',
    4, 4, 0, 'friends', true, 'planning', 'USD', 'Mode NA'
);

-- Demo Users (4 members with conflicting preferences for demo)
INSERT INTO users (user_id, display_name, email, home_city_id, home_currency, locale,
                   budget_band, travel_style, traveller_type, segment, date_of_signup, status,
                   clerk_user_id, full_name, age_group, created_at, updated_at)
VALUES
    ('usr_demo_owner', 'Alex Chen', 'alex@example.invalid',
     (SELECT city_id FROM cities LIMIT 1), 'USD', 'en',
     'mid', 'adventure', 'friends', 'heavy', '2025-01-01', 'active',
     NULL, 'Alex Chen', '25-34', NOW(), NOW()),
    ('usr_demo_member2', 'Priya Sharma', 'priya@example.invalid',
     (SELECT city_id FROM cities LIMIT 1), 'USD', 'en',
     'mid', 'cultural', 'friends', 'heavy', '2025-01-01', 'active',
     NULL, 'Priya Sharma', '25-34', NOW(), NOW()),
    ('usr_demo_member3', 'Jordan Lee', 'jordan@example.invalid',
     (SELECT city_id FROM cities LIMIT 1), 'USD', 'en',
     'premium', 'wellness', 'friends', 'light', '2025-01-01', 'active',
     NULL, 'Jordan Lee', '25-34', NOW(), NOW()),
    ('usr_demo_member4', 'Sam Rivera', 'sam@example.invalid',
     (SELECT city_id FROM cities LIMIT 1), 'USD', 'en',
     'value', 'adventure', 'friends', 'heavy', '2025-01-01', 'active',
     NULL, 'Sam Rivera', '25-34', NOW(), NOW());

-- Demo user_preferences
INSERT INTO user_preferences (preference_id, user_id, preferred_languages, interests,
                               preferred_currency, pace, updated_at)
VALUES
    ('prf_demo_1', 'usr_demo_owner', 'en', 'heritage,food,adventure', 'USD', 'moderate', NOW()),
    ('prf_demo_2', 'usr_demo_member2', 'en,hi', 'heritage,food,religious', 'USD', 'relaxed', NOW()),
    ('prf_demo_3', 'usr_demo_member3', 'en', 'wellness,food', 'USD', 'relaxed', NOW()),
    ('prf_demo_4', 'usr_demo_member4', 'en', 'adventure,trekking', 'USD', 'fast', NOW());

-- Demo trip_members
INSERT INTO trip_members (member_id, trip_id, user_id, role, joined_at, share_weight, status, updated_at)
VALUES
    ('tmb_demo_1', 'trp_demo_bali', 'usr_demo_owner', 'owner', NOW(), 1.000, 'active', NOW()),
    ('tmb_demo_2', 'trp_demo_bali', 'usr_demo_member2', 'editor', NOW(), 1.000, 'active', NOW()),
    ('tmb_demo_3', 'trp_demo_bali', 'usr_demo_member3', 'editor', NOW(), 1.000, 'active', NOW()),
    ('tmb_demo_4', 'trp_demo_bali', 'usr_demo_member4', 'editor', NOW(), 1.000, 'active', NOW());

-- Demo itinerary
INSERT INTO itineraries (itinerary_id, trip_id, name, version, is_active, generated_by,
                          total_cost, currency, total_duration_minutes, total_carbon_kg, status,
                          created_at, updated_at)
VALUES ('itn_demo_bali', 'trp_demo_bali', 'Bali Itinerary', 1, true, 'user',
        '0.00', 'USD', 0, 0.000, 'active', NOW(), NOW());

-- Demo itinerary items (Day 1)
INSERT INTO itinerary_items (item_id, itinerary_id, day_index, sort_order, item_type,
                              entity_type, entity_id, title, cost, currency, carbon_kg,
                              duration_minutes, source, locked, status, slot_status, time_slot,
                              created_at, updated_at)
VALUES
    ('itm_demo_morning', 'itn_demo_bali', 1, 1, 'poi',
     'poi', 'poi_monkey_forest', 'Sacred Monkey Forest Sanctuary',
     '25.00', 'USD', 0.000, 120, 'user', false, 'confirmed', 'CONFIRMED', 'Morning', NOW(), NOW()),
    ('itm_demo_afternoon', 'itn_demo_bali', 1, 2, 'poi',
     'poi', 'poi_batur', 'Mount Batur Trek',
     '65.00', 'USD', 0.000, 240, 'user', false, 'proposed', 'IN_CONSENSUS', 'Afternoon', NOW(), NOW()),
    ('itm_demo_evening', 'itn_demo_bali', 1, 3, 'free',
     NULL, NULL, 'Evening Activity',
     '0.00', 'USD', 0.000, 180, 'user', false, 'proposed', 'EMPTY', 'Evening', NOW(), NOW());

-- Demo proposal (the one that will trigger disagreement in demo)
INSERT INTO proposals (proposal_id, itinerary_id, proposed_by_user_id, action, target_item_id,
                        entity_type, entity_id, title, rationale, cost_delta, currency,
                        closes_at, status, trp_id, itm_id, current_round, created_at, updated_at)
VALUES (
    'prp_demo_batur',
    'itn_demo_bali',
    'usr_demo_owner',
    'add',
    'itm_demo_afternoon',
    'poi', 'poi_batur',
    'Mount Batur Trek',
    'Sunrise trek to active volcano for panoramic views',
    '0.00', 'USD',
    NULL,  -- closes_at starts NULL
    'open',
    'trp_demo_bali', 'itm_demo_afternoon', 1,
    NOW(), NOW()
);
```

---

## 7. CLERK SETUP

### 7.1 Create Clerk Application
1. Go to https://clerk.com → Sign up → Create application
2. App name: "WanderMatch"
3. Enable: Email/password + Google social login
4. Copy keys:
   - Publishable Key (`pk_test_...`) → `VITE_CLERK_PUBLISHABLE_KEY`
   - Secret Key (`sk_test_...`) → `CLERK_SECRET_KEY`

### 7.2 Configure Webhook
1. Clerk Dashboard → Webhooks → Add Endpoint
2. URL: `https://wandermatch-api.onrender.com/api/webhooks/clerk`
3. Subscribe to events: `user.created`, `user.updated`
4. Copy Signing Secret (`whsec_...`) → `CLERK_WEBHOOK_SECRET`

### 7.3 Configure Allowed Origins (CORS)
In Clerk Dashboard → Settings → Domains:
- Add: `https://wandermatch.vercel.app`
- Add: `http://localhost:5173` (local dev)

### 7.4 JWT Validation (coordinate with Panchami)
Clerk JWT validation in FastAPI uses the `CLERK_SECRET_KEY`. The flow:
1. Frontend gets JWT from Clerk SDK (`useAuth().getToken()`)
2. Frontend sends JWT in `Authorization: Bearer <token>` header
3. Panchami's `auth.py` validates it using Clerk's JWKS endpoint
4. On `user.created` webhook: FastAPI creates a row in `users` table with `clerk_user_id` set

---

## 8. CLOUDINARY SETUP AND PHOTO UPLOAD SERVICE

### 8.1 Create Cloudinary Account
1. Go to https://cloudinary.com → Sign up free
2. Dashboard → Copy:
   - Cloud Name → `CLOUDINARY_CLOUD_NAME`
   - API Key → `CLOUDINARY_API_KEY`
   - API Secret → `CLOUDINARY_API_SECRET`

### 8.2 Photo Upload Service
```python
# backend/services/cloudinary_service.py
import cloudinary
import cloudinary.uploader
import os
import uuid
from decimal import Decimal

def configure_cloudinary():
    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
    )

def upload_trip_photo(file_bytes: bytes, trip_id: str, uploader_id: str) -> dict:
    """
    Uploads a photo to Cloudinary under the trip's folder.
    Returns { pho_id, photo_url, public_id }
    """
    configure_cloudinary()
    
    pho_id = f"pho_{uuid.uuid4().hex[:8]}"
    
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=f"wandermatch/trips/{trip_id}",
        public_id=pho_id,
        resource_type="image",
        overwrite=False,
    )
    
    return {
        "pho_id": pho_id,
        "photo_url": result["secure_url"],
        "public_id": result["public_id"],
    }

def upload_face_reference_photo(file_bytes: bytes, usr_id: str, position: str) -> dict:
    """
    Uploads a face reference photo (straight/left/right) for face registration.
    position: 'straight' | 'left' | 'right'
    Returns { photo_url, public_id }
    """
    configure_cloudinary()
    
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=f"wandermatch/faces/{usr_id}",
        public_id=f"{usr_id}_{position}",
        resource_type="image",
        overwrite=True,
    )
    
    return {
        "photo_url": result["secure_url"],
        "public_id": result["public_id"],
    }
```

### 8.3 Photo Upload Endpoint (coordinate with Panchami — she registers this route)
```python
# This endpoint is registered in Panchami's photos.py router
# But the upload logic calls my cloudinary_service.py

# POST /api/photos
# Receives: multipart form with trp_id + photo file
# Calls: cloudinary_service.upload_trip_photo()
# Writes to DB: photos table (pho_id, trp_id, uploader_id, photo_url)
# Triggers: face matching if FACE_RECOGNITION_ENABLED=true
```

---

## 9. TRIP CHAT WEBSOCKET (Real-Time Layer)

Panchami owns the `trip_chat_messages` DB table and the `GET /api/chat` and `POST /api/chat` REST endpoints. I own the real-time delivery of chat messages via WebSocket.

### 9.1 How Trip Chat WebSocket works

The existing WebSocket hub (`/ws/trips/{trp_id}/{usr_id}`) is used for ALL real-time events including chat. When a chat message is POSTed:
1. Panchami's `POST /api/chat` endpoint inserts the row
2. It calls the WebSocket manager to broadcast to all trip members
3. The broadcast uses the SAME connection as all other trip events

### 9.2 Chat WebSocket event shape

Chat messages are broadcast as a WebSocket event (in addition to the 5 standard events):
```python
# When a chat message is sent, broadcast this to all trip members:
{
    "type": "chatMessageReceived",   # ← additional event, not in the core 5
    "trpId": "trp_demo_bali",
    "msgId": "msg_abc123",
    "usrId": "usr_demo_owner",
    "displayName": "Alex Chen",
    "content": "Let's do Beach Sunset Dinner!",
    "source": "chat",
    "createdAt": "2026-09-23T12:00:00Z"
}
```

### 9.3 Wire this with Panchami
In Panchami's `POST /api/chat` handler, after DB insert:
```python
from app.main import manager  # the WebSocket connection manager

await manager.broadcast_to_trip(trp_id, {
    "type": "chatMessageReceived",
    "trpId": trp_id,
    "msgId": msg.msg_id,
    "usrId": current_user.user_id,
    "displayName": current_user.display_name,
    "content": msg.content,
    "source": msg.source,
    "createdAt": msg.created_at.isoformat(),
})
```

---

## 10. NGROK TUNNEL SETUP (for Sharvani's LLM)

### 10.1 Setup instructions (to give Sharvani)
```bash
# 1. Install ngrok
brew install ngrok  # macOS
# OR download from https://ngrok.com/download

# 2. Authenticate (one-time)
ngrok authtoken YOUR_AUTH_TOKEN  # from ngrok dashboard

# 3. Get a STATIC domain (critical — so URL never changes across restarts)
# Go to ngrok dashboard → Cloud Edge → Domains → Create domain
# You get something like: YOUR_STATIC_SUBDOMAIN.ngrok-free.app

# 4. Start tunnel with static domain (run this BEFORE the hackathon starts, keep it running)
ngrok http --domain=YOUR_STATIC_SUBDOMAIN.ngrok-free.app 11434

# 5. Verify Ollama is reachable
curl https://YOUR_STATIC_SUBDOMAIN.ngrok-free.app/v1/models
```

The static ngrok URL goes into `.env` as `NGROK_LLM_URL`.

### 10.2 Tunnel reliability checklist (for demo day)
- [ ] Laptop running Ollama is plugged into power
- [ ] Laptop screen-lock is DISABLED during demo window
- [ ] Laptop is on stable WiFi or hotspot (not venue WiFi if unreliable)
- [ ] Ngrok tunnel started at least 15 minutes before demo slot
- [ ] Verify tunnel is alive right before going on stage: `curl $NGROK_LLM_URL/v1/models`
- [ ] Assign ONE person (Sharvani) as tunnel owner — their only job during judging is keeping it alive

---

## 11. FACE RECOGNITION SERVICE (OPTIONAL — BUILD ONLY IF AHEAD OF SCHEDULE)

**IMPORTANT**: This is OPTIONAL. If time is tight, skip entirely. The demo works perfectly without it. Only build this if Checkpoint 1 (Hour 12) passes cleanly AND you have spare capacity.

### 11.1 Dependencies
```bash
pip install deepface tensorflow  # or torch variant
# NOTE: DeepFace model weights download on first run (~500MB) — do this early
```

### 11.2 Registration Service
```python
# backend/services/face/registration.py
import numpy as np
import json
import uuid

def register_face(
    photos: dict,   # { "straight": bytes, "left": bytes, "right": bytes }
    usr_id: str,
    db,             # SQLAlchemy session from Panchami
) -> dict:
    """
    Accepts 3 reference photos, runs quality check, generates embeddings, stores in face_profiles.
    Returns { fcp_id, usr_id, status: 'REGISTERED', embeddings_count: 3 }
    Raises ValueError if quality check fails.
    """
    from deepface import DeepFace
    import tempfile, os
    
    embeddings = []
    
    for position, photo_bytes in photos.items():
        # Write to temp file (DeepFace needs file path)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp.write(photo_bytes)
            tmp_path = tmp.name
        
        try:
            # Quality check: exactly 1 face must be detected
            result = DeepFace.extract_faces(
                img_path=tmp_path,
                detector_backend='opencv',
                enforce_detection=True,
            )
            
            if len(result) != 1:
                raise ValueError(
                    f"Face quality check failed: exactly one face required per photo. "
                    f"Found {len(result)} faces in {position} photo."
                )
            
            # Generate ArcFace embedding
            embedding_result = DeepFace.represent(
                img_path=tmp_path,
                model_name='ArcFace',
                enforce_detection=False,
            )
            embeddings.append({
                "position": position,
                "embedding": embedding_result[0]["embedding"],
            })
        finally:
            os.unlink(tmp_path)
    
    # Store in face_profiles (NEVER expose embedding_data in API response)
    fcp_id = f"fcp_{uuid.uuid4().hex[:8]}"
    embedding_json = json.dumps(embeddings)
    
    # Panchami's DB write:
    # INSERT INTO face_profiles (fcp_id, usr_id, embedding_data) VALUES (...)
    # Call db.execute() here or return data to Panchami's route handler
    
    return {
        "fcp_id": fcp_id,
        "usr_id": usr_id,
        "status": "REGISTERED",
        "embeddings_count": len(embeddings),
        # NEVER include embedding_data in this return value
    }
```

### 11.3 Matching Service
```python
# backend/services/face/matching.py

CONFIDENCE_THRESHOLD = 0.90  # matches below this stay "Unknown"

def match_faces_in_photo(
    photo_bytes: bytes,
    trp_id: str,
    db,
) -> list[dict]:
    """
    Detects faces in a photo, matches against ONLY registered members of this specific trip.
    NEVER matches against global face database.
    Returns list of { usr_id, confidence } for matched faces.
    Low-confidence matches (< CONFIDENCE_THRESHOLD) return usr_id=None (shown as Unknown).
    """
    from deepface import DeepFace
    import json, tempfile, os
    
    # Get registered members of this trip only
    # Query: SELECT fp.usr_id, fp.embedding_data FROM face_profiles fp
    #        JOIN trip_members tm ON fp.usr_id = tm.user_id
    #        WHERE tm.trip_id = trp_id AND tm.status = 'active'
    registered_members = []  # load from DB
    
    if not registered_members:
        return []  # no registered members → no matching possible
    
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        tmp.write(photo_bytes)
        tmp_path = tmp.name
    
    results = []
    try:
        faces = DeepFace.extract_faces(img_path=tmp_path, enforce_detection=False)
        
        for face_data in faces:
            best_match_usr_id = None
            best_confidence = 0.0
            
            for member in registered_members:
                stored_embeddings = json.loads(member["embedding_data"])
                
                for stored_emb in stored_embeddings:
                    # Compare face to stored embedding
                    # Use cosine similarity or DeepFace.verify
                    similarity = _cosine_similarity(
                        face_data.get("embedding", []),
                        stored_emb["embedding"]
                    )
                    
                    if similarity > best_confidence:
                        best_confidence = similarity
                        best_match_usr_id = member["usr_id"]
            
            if best_confidence >= CONFIDENCE_THRESHOLD:
                results.append({
                    "usr_id": best_match_usr_id,
                    "confidence": round(best_confidence, 3),
                })
            else:
                results.append({
                    "usr_id": None,  # Unknown — never force-tag
                    "confidence": round(best_confidence, 3),
                })
    finally:
        os.unlink(tmp_path)
    
    return results

def _cosine_similarity(v1: list, v2: list) -> float:
    if not v1 or not v2:
        return 0.0
    import numpy as np
    a = np.array(v1)
    b = np.array(v2)
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)
```

---

## 12. BACKEND DEPLOYMENT (RENDER)

### 12.1 `backend/requirements.txt`
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
pydantic==2.9.0
pydantic-settings==2.5.0
python-multipart==0.0.12
clerk-backend-api==1.7.0
svix==1.24.0
cloudinary==1.41.0
openai==1.51.0
python-jose[cryptography]==3.3.0
httpx==0.27.2
# Optional face recognition (comment out if not building):
# deepface==0.0.93
# tensorflow==2.17.0
```

### 12.2 `backend/Procfile`
```
web: uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

### 12.3 `backend/render.yaml`
```yaml
services:
  - type: web
    name: wandermatch-api
    env: python
    buildCommand: pip install -r backend/requirements.txt
    startCommand: uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: wandermatch-db
          property: connectionString
      - key: CLERK_SECRET_KEY
        sync: false
      - key: CLERK_WEBHOOK_SECRET
        sync: false
      - key: NGROK_LLM_URL
        sync: false
      - key: CLOUDINARY_CLOUD_NAME
        sync: false
      - key: CLOUDINARY_API_KEY
        sync: false
      - key: CLOUDINARY_API_SECRET
        sync: false
      - key: FACE_RECOGNITION_ENABLED
        value: "false"
    healthCheckPath: /api/health
```

### 12.4 Render deployment steps
1. Render Dashboard → New → Web Service
2. Connect GitHub repo
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add all env variables from `.env`
7. Deploy → wait for green "Live" status
8. Verify: `curl https://wandermatch-api.onrender.com/api/health`

---

## 13. FRONTEND DEPLOYMENT (VERCEL)

### 13.1 `frontend/vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 13.2 Vercel deployment steps
1. Vercel Dashboard → New Project → Import from GitHub
2. Root directory: `frontend`
3. Framework preset: Vite
4. Add environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_BASE_URL` = `https://wandermatch-api.onrender.com`
   - `VITE_WS_BASE_URL` = `wss://wandermatch-api.onrender.com`
5. Deploy → wait for green "Ready" status
6. Verify: open `https://wandermatch.vercel.app` in browser

### 13.3 Sequential deployment order (MUST follow this order)
```
Step 1: Database → Step 2: Backend (Render) → Step 3: Frontend (Vercel) → Step 4: Smoke Test
```
NEVER deploy frontend before backend is live — the frontend needs the backend URL.

---

## 14. SMOKE TEST CHECKLIST (Run after every deployment)

Run this against the LIVE production URLs, not localhost:

```bash
# 1. Backend health
curl https://wandermatch-api.onrender.com/api/health
# Expected: { "status": "ok" }

# 2. Trips endpoint (needs auth token — get from Clerk dashboard test user)
curl -H "Authorization: Bearer TEST_TOKEN" \
  https://wandermatch-api.onrender.com/api/trips
# Expected: 200 with JSON array

# 3. Frontend loads
curl -I https://wandermatch.vercel.app
# Expected: HTTP 200

# 4. WebSocket (use wscat or browser console)
wscat -c wss://wandermatch-api.onrender.com/ws/trips/trp_demo_bali/usr_demo_owner
# Expected: connection accepted

# 5. Demo trip exists
curl -H "Authorization: Bearer TEST_TOKEN" \
  https://wandermatch-api.onrender.com/api/trips/trp_demo_bali
# Expected: demo trip with 4 members and itinerary items
```

---

## 15. PHASE-BY-PHASE EXECUTION PLAN

### PHASE 0 — Hour 0–1 (12:00–13:00) ← MOST CRITICAL PHASE
**Your job**: Unblock everyone. Nothing starts until this is done.

Concrete deliverables (in this exact order):
1. **GitHub repo created** → share link with all 3 teammates in first 5 minutes
2. **All 4 branches created and pushed** (`main`, `develop`, `feature/frontend`, `feature/backend`, `feature/ai`, `feature/setup`)
3. **Folder structure created** — empty files with placeholder exports so everyone can branch immediately
4. **PostgreSQL provisioned** on Render or Neon → test connection works
5. **PS-11 data seeded** → run `seed_ps11.sh` → verify 27,428 rows loaded
6. **Additive migrations run** → `02_wandermatch_additive.sql` applied
7. **Demo seed data loaded** → `03_demo_seed.sql` applied → verify `trp_demo_bali` exists
8. **`validate_conformance.py` runs PASS** → no exceptions
9. **Clerk app created** → keys obtained
10. **Cloudinary account created** → keys obtained
11. **`.env.example` written** with all variables filled
12. **`.env` written** with all real values → share with teammates via secure channel (NOT git)
13. **FastAPI health endpoint returns 200** (even a skeleton `main.py` is enough)
14. **Confirm with Sharvani**: `NGROK_LLM_URL` format agreed, she starts Ollama

**Gate**: Panchami can connect to PostgreSQL. Nikitha has `VITE_CLERK_PUBLISHABLE_KEY`. Sharvani has `NGROK_LLM_URL` format. Done.

---

### PHASE 1 — Hours 1–4 (13:00–16:00)
**Your job**: Join Panchami on WebSocket manager. Cloudinary upload endpoint.

Concrete deliverables:
1. Work with Panchami: set up in-memory WebSocket `ConnectionManager` (she writes it, you test it with two clients)
2. Test two WebSocket clients both receive the same broadcast event
3. `backend/services/cloudinary_service.py` complete (Section 8.2)
4. Wire `POST /api/photos` endpoint with Panchami: she registers the route, you provide the upload logic
5. Test photo upload: upload a test image → verify Cloudinary URL returned
6. `requirements.txt` complete with all dependencies

**Gate**: Upload a photo via POST /api/photos → get back a Cloudinary URL. Two WebSocket clients receive same broadcast. Done.

---

### PHASE 2 — Hours 4–8 (16:00–20:00)
**Your job**: Cloudinary gallery + chat WebSocket wiring.

Concrete deliverables:
1. `GET /api/photos/:trp_id` endpoint returns photo list from DB (coordinate with Panchami)
2. `?usrId=` query param filter for "My Photos" (requires face_profiles join)
3. Wire Trip Chat real-time: `POST /api/chat` calls WebSocket broadcast after DB insert (Section 9.3)
4. Test: send a chat message via POST → see `chatMessageReceived` event in WebSocket client

**Gate**: Chat message sent via POST appears as WebSocket event in connected browser. Done.

---

### PHASE 3 — Hours 8–12 (20:00–00:00)
**Your job**: Face registration 3-photo capture scaffold (optional start).

Concrete deliverables:
1. If face recognition scope is being built:
   - `POST /api/face/register` endpoint scaffold (multipart, 3 photos)
   - `backend/services/face/registration.py` quality check logic
   - Test with a real photo: exactly 1 face passes, 0 or 2 faces rejected
2. If not building face recognition yet: help Panchami with backend integration issues
3. Ensure Render deployment config is ready for Checkpoint 1

**Gate**: POST /api/face/register with 0 faces in photo returns HTTP 400 "Face quality check failed". Done.

---

### CHECKPOINT 1 — Hour 12 (00:00)
**Your job at checkpoint**:
- Merge `feature/setup` into `develop`
- Confirm DATABASE_URL is stable
- Verify Render is running and healthy
- Verify Clerk webhook is firing (check Render logs for user.created events)
- Run smoke test against production URLs

---

### PHASE 4 — Hours 12–16 (00:00–04:00)
**Your job**: Trip Chat complete. Pre-process face photos. Help backend if needed.

Concrete deliverables:
1. Trip Chat fully wired: GET messages, POST message, real-time delivery, "Propose this as the plan" button action
2. If face recognition: pre-process fixed demo photos through DeepFace and verify tags on known photos
3. Float into backend support: help Panchami with branches endpoint if she needs it

**Gate**: Full Trip Chat works — send message, all connected clients receive it in < 1 second. Done.

---

### PHASE 5 — Hours 16–19 (04:00–07:00)
**Your job**: Pre-process demo photos. Verify face tags. Auth/broadcast integration.

Concrete deliverables:
1. Pre-process the fixed demo photo set (not live — batch process so face matching is instant during demo)
2. Verify photo_person rows created with confidence values
3. Test `GET /api/photos/trp_demo_bali?usrId=usr_demo_owner` returns correctly filtered photos
4. Fix any auth integration issues (Clerk JWT expiry, CORS errors)
5. Confirm all 5 WebSocket events fire and are received by Nikitha's frontend

**Gate**: `GET /api/photos/:trpId?usrId=` returns only photos tagged with that user. Done.

---

### PHASE 6 — Hours 19–21 (07:00–09:00)
**Your job**: Fix auth/broadcast/photo integration issues from full click-through.

- Fix any CORS errors
- Fix any JWT validation failures
- Fix any WebSocket reconnect issues
- Verify demo seed data is intact and correct

---

### CHECKPOINT 2 — Hour 21 (09:00)
**STOP.** Merge everything into `develop` → `main`. Feature freeze.

---

### PHASE 7 — Hours 21–24 (09:00–12:00)
**Your job**: Demo prep. Rehearsal.

1. Run `reset_demo.sh` to restore demo data to clean state
2. Verify ALL production URLs respond correctly
3. Check ngrok tunnel is stable (coordinate with Sharvani)
4. Assign presentation roles
5. Run full demo script twice on the actual presentation machine
6. Record offline fallback video (screen capture of full demo flow)
   - Must demonstrate: live WebSocket sync, Mode NA timer, AI blended plan, branch fork, solo match scores
   - Store locally on presentation laptop — this is your insurance against venue WiFi failure

---

## 16. DEPENDENCY MAP — WHAT OTHERS NEED FROM ME AND WHEN

| What they need | Who needs it | When |
|---|---|---|
| GitHub repo URL + branch access | Everyone | Hour 0, first 5 minutes |
| `DATABASE_URL` | Panchami | Hour 0 |
| `CLERK_SECRET_KEY` + `CLERK_WEBHOOK_SECRET` | Panchami | Hour 0 |
| `VITE_CLERK_PUBLISHABLE_KEY` | Nikitha | Hour 0 |
| `VITE_API_BASE_URL` (even localhost:8000 is fine initially) | Nikitha | Hour 0 |
| `VITE_WS_BASE_URL` | Nikitha | Hour 0 |
| `NGROK_LLM_URL` format + static domain agreed | Sharvani | Hour 0 |
| PostgreSQL seeded with PS-11 data | Panchami | Hour 1 |
| Folder structure exists | Everyone | Hour 0 |
| `requirements.txt` with all deps | Panchami | Hour 1 |
| Cloudinary upload service callable | Panchami | Hour 4 |
| Demo seed data in DB | Everyone (for Checkpoint 1) | Hour 12 |
| Render deployment live | Everyone (for Checkpoint 1) | Hour 12 |
| Vercel deployment live | Everyone (for Checkpoint 2) | Hour 21 |

---

## 17. WHAT YOU MUST NEVER DO

1. Never commit `.env` to git — only `.env.example` goes in the repo
2. Never share API secrets in Slack/WhatsApp group — use a secure channel or in-person
3. Never load PS-11 CSVs out of order — the numbered filenames define load order, follow it exactly
4. Never hard-delete any row from any PS-11 table — use `status = 'inactive'`
5. Never rename any PS-11 provided column
6. Never expose `face_profiles.embedding_data` in any API response — the raw embeddings are internal only
7. Never match faces against a global database — only against registered members of the SPECIFIC trip
8. Never tag a face with confidence below `CONFIDENCE_THRESHOLD (0.90)` — mark as Unknown instead
9. Never deploy frontend before backend is live
10. Never restart the ngrok tunnel right before or during judging without warning Sharvani
11. Never build face recognition during Phase 0–3 if it puts Checkpoint 1 at risk — it is optional
12. Never push directly to `main` — all merges go through `develop` first, and only at checkpoints
