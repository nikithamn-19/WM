# WanderMatch — DeepFace / ArcFace Face Matching Service

Standalone face recognition and matching service for WanderMatch (PS-11).

## Architecture
- **ArcFace (512-d)** vector embeddings for facial representations.
- **OpenCV** detector for single-face quality checks (`AC-FAC-01`).
- **Trip-Member Scoped Matching**: Searches strictly within trip members (`trip_members`), preventing global database scans.
- **Confidence Gating**: Low-confidence/unregistered faces (< 0.90) remain un-tagged (`usr_id: None`).

## Directory Structure
```
deepface/
├── backend/
│   ├── database.py              # SQLAlchemy engine & session factory
│   ├── main.py                  # FastAPI application with CORS & health check
│   ├── routers/
│   │   ├── face.py              # POST /api/face/register
│   │   └── photos.py            # POST /api/photos, GET /api/photos/{trp_id}
│   └── services/face/
│       ├── __init__.py
│       ├── models.py            # face_profiles, photos, photo_person ORM models
│       ├── registration.py      # 3-photo quality check & ArcFace embedding generation
│       └── matching.py          # Cosine similarity face matching with confidence calibration
├── tests/
│   ├── sample_faces/            # Sample faces for automated tests
│   └── test_face_service.py     # Pytest test suite (7/7 passing)
├── demo_verify_deepface.py      # End-to-end verification script
└── requirements.txt             # Python dependencies
```

## Setup & Running

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Tests
```bash
py -3.12 -X utf8 -m pytest tests/test_face_service.py -v
```

### 3. Run Automated End-to-End Verification
```bash
py -3.12 -X utf8 demo_verify_deepface.py
```

### 4. Start Live FastAPI Server
```bash
py -3.12 -X utf8 -m uvicorn backend.main:app --reload --port 8000
```
Swagger UI available at: `http://localhost:8000/docs`
