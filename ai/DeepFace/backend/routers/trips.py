from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

try:
    from backend.database import get_db
    from backend.services.face.models import (
        Trip,
        TripMember,
        User,
        get_trip_members_with_face_status,
        ensure_trip_exists,
    )
except ImportError:
    from ..database import get_db
    from ..services.face.models import (
        Trip,
        TripMember,
        User,
        get_trip_members_with_face_status,
        ensure_trip_exists,
    )

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.get("")
def list_trips(db: Session = Depends(get_db)):
    """List all trips in the database."""
    trips = db.query(Trip).all()
    return [
        {
            "tripId": t.trip_id,
            "title": t.title,
            "ownerUserId": t.owner_user_id,
            "destinationCityId": t.destination_city_id,
            "partySize": t.party_size,
            "mode": t.mode,
            "status": t.status,
            "createdAt": t.created_at.isoformat() if t.created_at else None,
        }
        for t in trips
    ]


@router.get("/{trp_id}/members")
def get_trip_members(trp_id: str, db: Session = Depends(get_db)):
    """
    List all members of a trip along with their Face Registration status (`isFaceRegistered`).
    Helps frontend decide whether to prompt the skippable face registration banner.
    """
    ensure_trip_exists(db, trp_id)
    return get_trip_members_with_face_status(db, trp_id)
