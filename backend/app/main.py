from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models # ensure all ORM models are registered

# Create database tables if using direct SQLAlchemy creation
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WanderMatch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://wandermatch.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/health")
def health():
    return {"status": "ok"}

# Import & register routers
from .routers import auth, trips, matching
app.include_router(auth.router, prefix="", tags=["auth"])
app.include_router(trips.router, prefix="", tags=["trips"])
app.include_router(matching.router, prefix="", tags=["matching"])



