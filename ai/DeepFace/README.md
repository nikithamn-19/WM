# WanderMatch — DeepFace / ArcFace & Smart Memories Service

Standalone face recognition and auto-sorting Memories service for WanderMatch (**PS-11**).

---

## Key Capabilities

1. **Skippable Onboarding Face Registration**:
   - `POST /api/face/register`: Uploads 3 profile angles (`straight`, `left`, `right`). Enforces exactly 1 face per angle (`AC-FAC-01`). Generates 512-d ArcFace embeddings and stores login profile in `users` and embeddings in `face_profiles`.
   - `GET /api/face/status/{usr_id}`: Checks whether a traveler has completed or skipped face registration.
2. **Trip Photo Upload & DeepFace Recognition**:
   - `POST /api/photos`: Uploads a memory photo for a trip. The exact upload time is recorded (`created_at`).
   - DeepFace ArcFace automatically detects all faces and compares them *strictly against the registered members of that trip* (`trip_members`).
   - Identified members are auto-tagged in `photo_person`. Unknown or unregistered faces remain un-tagged without false positives.
3. **Memories 2 Boards**:
   - `GET /api/memories/{trp_id}` and `GET /api/photos/{trp_id}/boards`:
     - **Board 1 (`all`)**: Chronological timeline of all photos uploaded for the trip with uploader name and tagged members.
     - **Board 2 (`folders`)**: Smart-categorized folders:
       - `folder:<MemberName>` (e.g., `folder:Alex Chen`, `folder:Panchami`): Every photo where that member appears.
       - `folder:GroupPhotos`: Photos containing multiple/all members together ($\ge 2$ members).
       - `folder:Scenery`: Photos where 0 members were detected (landscapes, sunsets, food).
4. **Trip Members & Face Status**:
   - `GET /api/trips/{trp_id}/members`: Lists all members of a trip along with their `isFaceRegistered` status.

---

## Directory Structure
```
deepface/
├── backend/
│   ├── database.py              # SQLite / Postgres database engine & session maker
│   ├── main.py                  # FastAPI app with CORS, static file server & demo data seeder
│   ├── routers/
│   │   ├── face.py              # Face registration & status endpoints
│   │   ├── photos.py            # Photo upload & Memories 2 boards endpoints
│   │   └── trips.py             # Trips & trip member status endpoints
│   └── services/face/
│       ├── models.py            # PS-11 ORM models (users, trips, trip_members, face_profiles, photos, photo_person)
│       ├── registration.py      # 3-angle quality check & ArcFace embedding extraction
│       └── matching.py          # ArcFace cosine similarity matching with confidence calibration
├── tests/
│   ├── sample_faces/            # Sample faces for test suite
│   └── test_face_service.py     # Pytest integration tests (8/8 passing)
├── demo_verify_deepface.py      # Terminal end-to-end verification script
├── requirements.txt             # Dependencies
└── README.md
```

---

## Quickstart & Verification

### 1. Run Automated Pytest Suite
```powershell
Set-Location E:\College\Sem5\DeepFace\deepface
py -3.12 -X utf8 -m pytest tests/test_face_service.py -v
```

### 2. Run End-to-End Terminal Demo
```powershell
py -3.12 -X utf8 demo_verify_deepface.py
```

### 3. Start Live Server & Swagger UI
```powershell
py -3.12 -X utf8 -m uvicorn backend.main:app --reload --port 8000
```
Then open: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

---

## Swagger UI Step-by-Step Testing Guide

1. **Check System Health**:
   - Execute `GET /api/health` → Verify status `ok`.
2. **Inspect Trip Members**:
   - Execute `GET /api/trips/trp_demo_goa/members` → Notice members (`Alex Chen`, `Panchami`, `Priya Sharma`) with `isFaceRegistered: false`.
3. **Register Face Profile**:
   - Open `POST /api/face/register` → Click **Try it out**.
   - Set `usrId`: `panchami`, `displayName`: `Panchami`, `trpId`: `trp_demo_goa`.
   - Upload 3 photos (`straight`, `left`, `right`) of your face.
   - Click **Execute** → Returns `fcpId`, `status: REGISTERED`, `embeddingsCount: 3`.
4. **Verify Face Status**:
   - Execute `GET /api/face/status/panchami` → Returns `isFaceRegistered: true`.
5. **Upload a Trip Photo**:
   - Open `POST /api/photos` → Click **Try it out**.
   - Set `trpId`: `trp_demo_goa`, `uploaderId`: `panchami`, `title`: `Beach Sunset Group Shot`.
   - Attach your group photo under `file`.
   - Click **Execute** → Face detection runs instantly. Returns photo record with `taggedUsers: [{ "usrId": "panchami", "displayName": "Panchami", "confidence": 0.95 }]`.
6. **View the 2 Memories Boards**:
   - Open `GET /api/memories/trp_demo_goa` → Click **Execute**.
   - View `boards.all`: All photos uploaded for the trip with timestamps and tags.
   - View `boards.folders`:
     - `folder:Panchami`: Contains photos where Panchami was detected.
     - `folder:GroupPhotos`: Contains photos where multiple members were detected.
     - `folder:Scenery`: Contains photos without members.
