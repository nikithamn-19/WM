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
    from backend.database import engine, Base
    from backend.routers import face, photos
except ImportError:
    from database import engine, Base
    from routers import face, photos

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WanderMatch API", version="1.0.0")

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
@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

# Register routers
app.include_router(face.router)
app.include_router(photos.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
