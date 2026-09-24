import datetime
import uuid
from typing import List, Optional, Dict, Any
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Numeric, Text, ForeignKey, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

try:
    from backend.database import Base
except ImportError:
    from ...database import Base


class FaceProfile(Base):
    __tablename__ = "face_profiles"

    fcp_id = Column(String, primary_key=True)
    usr_id = Column(String, unique=True, nullable=False, index=True)
    embedding_data = Column(Text, nullable=False)  # JSON-encoded embeddings list; NEVER expose in API responses
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class Photo(Base):
    __tablename__ = "photos"

    pho_id = Column(String, primary_key=True)
    trp_id = Column(String, nullable=False, index=True)
    uploader_id = Column(String, nullable=False, index=True)
    photo_url = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class PhotoPerson(Base):
    __tablename__ = "photo_person"

    php_id = Column(String, primary_key=True)
    pho_id = Column(String, ForeignKey("photos.pho_id"), nullable=False, index=True)
    usr_id = Column(String, nullable=False, index=True)
    confidence = Column(Numeric(4, 3), default=Decimal("0.950"), nullable=False)


class TripMember(Base):
    __tablename__ = "trip_members"

    member_id = Column(String, primary_key=True)
    trip_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    role = Column(String, default="editor", nullable=False)
    status = Column(String, default="active", nullable=False)


# --- DB Query Helpers ---

def get_trip_face_profiles(db, trp_id: str) -> List[Dict[str, Any]]:
    """
    Loads active face profiles for members of a specific trip only.
    NEVER queries members outside of this trip.
    """
    if db is None:
        return []

    try:
        rows = (
            db.query(FaceProfile.usr_id, FaceProfile.embedding_data)
            .join(TripMember, FaceProfile.usr_id == TripMember.user_id)
            .filter(TripMember.trip_id == trp_id, TripMember.status == "active")
            .all()
        )
        return [{"usr_id": r[0], "embedding_data": r[1]} for r in rows]
    except Exception:
        db.rollback()
        return []


def add_trip_member(db, trip_id: str, user_id: str, role: str = "editor") -> TripMember:
    """
    Ensures a member is in trip_members for the given trip.
    """
    existing = (
        db.query(TripMember)
        .filter(TripMember.trip_id == trip_id, TripMember.user_id == user_id)
        .first()
    )
    if existing:
        existing.status = "active"
        db.commit()
        return existing

    member_id = f"tmb_{uuid.uuid4().hex[:8]}"
    tm = TripMember(member_id=member_id, trip_id=trip_id, user_id=user_id, role=role, status="active")
    db.add(tm)
    db.commit()
    db.refresh(tm)
    return tm


def save_face_profile(db, fcp_id: str, usr_id: str, embedding_data: str) -> FaceProfile:
    """
    Upserts a face profile for usr_id.
    """
    profile = db.query(FaceProfile).filter(FaceProfile.usr_id == usr_id).first()
    if profile:
        profile.embedding_data = embedding_data
        profile.fcp_id = fcp_id
    else:
        profile = FaceProfile(
            fcp_id=fcp_id,
            usr_id=usr_id,
            embedding_data=embedding_data,
        )
        db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def save_photo(db, trp_id: str, uploader_id: str, photo_url: str) -> Photo:
    pho_id = f"pho_{uuid.uuid4().hex[:8]}"
    photo = Photo(
        pho_id=pho_id,
        trp_id=trp_id,
        uploader_id=uploader_id,
        photo_url=photo_url,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


def save_photo_matches(db, pho_id: str, matches: List[Dict[str, Any]]) -> List[PhotoPerson]:
    created = []
    for match in matches:
        usr_id = match.get("usr_id")
        if not usr_id:
            continue
        php_id = f"php_{uuid.uuid4().hex[:8]}"
        conf = Decimal(str(match.get("confidence", 0.950)))
        tag = PhotoPerson(
            php_id=php_id,
            pho_id=pho_id,
            usr_id=usr_id,
            confidence=conf,
        )
        db.add(tag)
        created.append(tag)
    db.commit()
    return created
