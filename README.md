# WanderMatch — Social & Group Travel Planning with AI Consensus Planner

## 1. Team & Problem Statement
- **Team Name**: Chaos Minds
- **College**: BMS College of Engineering
- **Problem Statement**: PS-11 — WanderMatch (Social & Group Travel Planning)
- **Hackathon**: KogniVera Hackathon 2026

---

## 2. What We Built
WanderMatch solves group travel planning friction, solo traveler matching, and memory organization through a single orchestrator platform:
- **Solo & Group Matchmaking Engine**: Deterministic Jaccard & cosine compatibility scoring over spoken languages (BCP-47), age groups, travel interests, and local tour guide verification.
- **AI Consensus Planner (Mode A & Mode NA)**: Single-owner authoritative mode (Mode A) and decentralized consensus voting mode (Mode NA) with dynamic 10-minute consensus countdown timers triggered on dissent.
- **Sub-group Itinerary Branching**: Dynamic branching for conflicting activity preferences with automatic sub-group membership management without splitting the core trip.
- **Optimistic Concurrency Control**: Monotonic version locking (`version = version + 1`) preventing silent overwrite collisions during group editing.
- **AI Face Recognition Photo Gallery**: Facial embedding extraction (`DeepFace`/ResNet) to auto-tag group members in shared photo albums.

---

## 3. Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      React / Vite Frontend                  │
│               (TailwindCSS, Clerk SDK, WebSockets)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST & WebSockets
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend Service                  │
│       (Orchestration, Auth Guards, Consensus Timers)        │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
┌──────────────▼─────────────┐ ┌───────▼──────────────────────┐
│   PostgreSQL / Neon DB     │ │     DeepFace AI Service      │
│  (Canonical + Additive)    │ │   (Face Detection & Embed)   │
└────────────────────────────┘ └──────────────────────────────┘
```

---

## 4. Data Model
WanderMatch implements the canonical **PS-11 Shared Data Model** (D1–D9) along with additive extensions:
- **Canonical Tables**: `users`, `user_preferences`, `trips`, `trip_members`, `itineraries`, `itinerary_items`, `proposals`, `votes`, `tour_guides`, `cities`, `countries`, `currencies`, `languages`.
- **Additive Extensions**: `branches`, `branch_members`, `revision_history`, `trip_chat_messages`, `face_profiles`, `photos`, `photo_person`.
- Detailed documentation: [data-model/DATA_MODEL.md](file:///c:/Users/gjaya/OneDrive/Desktop/PROJECTS/wander-match-final/data-model/DATA_MODEL.md)

---

## 5. AI Features
1. **Deterministic Compatibility Matchmaker**:
   - **Mechanism**: Jaccard similarity index on user travel interests + BCP-47 language set intersection + age group weight matrix.
   - **Grounded In**: User preference profiles in PostgreSQL (`user_preferences`, `users`).
2. **AI Consensus Planner & Dissent Handler**:
   - **Mechanism**: Dynamic consensus round evaluator with automated fallback proposal generation and dissent resolution timers.
   - **Grounded In**: Active trip proposal votes (`proposals`, `votes`).
3. **Face Recognition & Auto-Tagging**:
   - **Mechanism**: Cosine similarity match over 128-dimensional facial embedding vectors derived via DeepFace model.
   - **Grounded In**: Registered user face profiles (`face_profiles`, `photo_person`).

---

## 6. Run It Locally

### Prerequisites
- Python 3.10+
- Node.js 18+

### Step 1: Environment Setup
Copy the environment example files:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### Step 2: Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

### Step 3: DeepFace AI Service Setup
```bash
cd deepface
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8001
```

### Step 4: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 7. Demo Path
1. **Login & Onboarding**: Log in via Clerk auth or demo credentials; select travel preferences and age group.
2. **Solo Matching**: Navigate to "Solo Match" to view compatible travel companions and local tour guides sorted by match score.
3. **Trip Creation**: Create a trip (e.g., "Kyoto Autumn Expedition") selecting mode (`Mode NA` - Consensus).
4. **Itinerary Consensus**: View slot consensus, propose an alternative activity, and cast a `no` vote with mandatory reason to trigger the 10-minute dissent timer.
5. **Sub-group Branching**: Accept branch split to create a parallel branch for dissenting members.
6. **Photo Memories**: Upload a group photo to verify facial auto-tagging.

---

## 8. Tests / Proof
Run automated tests:

```bash
# DeepFace Service Tests
cd deepface
pytest tests/test_face_service.py
```
