from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys

# Ensure backend and deepface directory can be resolved
cur_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(cur_dir)
if cur_dir not in sys.path:
    sys.path.insert(0, cur_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from backend.database import engine, Base, SessionLocal
    from backend.routers import face, photos, trips
    from backend.services.face.models import seed_default_demo_data
except ImportError:
    from database import engine, Base, SessionLocal
    from routers import face, photos, trips
    from services.face.models import seed_default_demo_data

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

# Seed initial PS-11 demo trips, users, and members
_db = SessionLocal()
try:
    seed_default_demo_data(_db)
finally:
    _db.close()

app = FastAPI(
    title="WanderMatch DeepFace & Memories API",
    description=(
        "**WanderMatch Face Service & Memories Engine (PS-11)**\n\n"
        "Features:\n"
        "- **Face Registration**: 3-angle capture (straight, left, right), 1-face quality validation (AC-FAC-01), ArcFace 512-d embeddings.\n"
        "- **Skippable Onboarding Check**: Query traveler face registration status.\n"
        "- **Trip Photo Upload**: Timestamp recording, DeepFace face matching against trip members, auto-tagging in `photo_person`.\n"
        "- **2 Memories Boards**: \n"
        "  1. `all`: Complete chronological trip photos timeline.\n"
        "  2. `folders`: Auto-sorted smart folders (`folder:<MemberName>`, `folder:GroupPhotos`, `folder:Scenery`)."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wandermatch.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Health check
@app.get("/api/health", tags=["system"])
def health_check():
    return {"status": "ok", "service": "WanderMatch DeepFace & Memories API", "version": "1.0.0"}

# Register routers
app.include_router(face.router)
app.include_router(photos.router)
app.include_router(trips.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
