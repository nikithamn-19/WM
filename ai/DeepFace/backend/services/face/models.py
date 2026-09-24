import datetime
import uuid
import json
from typing import List, Optional, Dict, Any
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Numeric, Text, ForeignKey, Integer, Boolean, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

try:
    from backend.database import Base
except ImportError:
    from ...database import Base


# --- PS-11 Core Tables ---

class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True)          # usr_ prefixed
    display_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    clerk_user_id = Column(String, unique=True, nullable=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    age_group = Column(String, nullable=True)           # '18-24'|'25-34'|'35-44'|'45-54'|'55+'
    home_city_id = Column(String, default="cty_blr")
    home_currency = Column(String(3), default="INR")
    locale = Column(String, default="en")
    budget_band = Column(String, default="mid")
    travel_style = Column(String, default="comfort")
    traveller_type = Column(String, default="friends")
    segment = Column(String, default="light")
    status = Column(String, default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class Trip(Base):
    __tablename__ = "trips"

    trip_id = Column(String, primary_key=True)          # trp_ prefixed
    owner_user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)
    destination_city_id = Column(String, default="cty_goa", nullable=False)
    start_date = Column(String, default="2026-10-10", nullable=False)
    end_date = Column(String, default="2026-10-16", nullable=False)
    party_size = Column(Integer, default=4, nullable=False)
    adults = Column(Integer, default=4, nullable=False)
    children = Column(Integer, default=0, nullable=False)
    trip_type = Column(String, default="friends", nullable=False)
    is_group_trip = Column(Boolean, default=True, nullable=False)
    status = Column(String, default="planning", nullable=False)
    home_currency = Column(String(3), default="INR", nullable=False)
    mode = Column(String, default="Mode NA", nullable=False)  # 'Mode A' or 'Mode NA'
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class TripMember(Base):
    __tablename__ = "trip_members"

    member_id = Column(String, primary_key=True)        # tmb_ prefixed
    trip_id = Column(String, ForeignKey("trips.trip_id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    role = Column(String, default="editor", nullable=False)  # 'owner'|'editor'|'viewer'
    share_weight = Column(Numeric(6, 3), default=Decimal("1.000"), nullable=False)
    status = Column(String, default="active", nullable=False)
    joined_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


# --- WanderMatch Additive Tables ---

class FaceProfile(Base):
    __tablename__ = "face_profiles"

    fcp_id = Column(String, primary_key=True)           # fcp_ prefixed
    usr_id = Column(String, ForeignKey("users.user_id"), unique=True, nullable=False, index=True)
    embedding_data = Column(Text, nullable=False)       # JSON string; NEVER expose in API responses
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class Photo(Base):
    __tablename__ = "photos"

    pho_id = Column(String, primary_key=True)           # pho_ prefixed
    trp_id = Column(String, ForeignKey("trips.trip_id"), nullable=False, index=True)
    uploader_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    photo_url = Column(String, nullable=False)
    folder = Column(String, default="All", nullable=False)
    title = Column(String, default="Trip Memory", nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class PhotoPerson(Base):
    __tablename__ = "photo_person"

    php_id = Column(String, primary_key=True)           # php_ prefixed
    pho_id = Column(String, ForeignKey("photos.pho_id"), nullable=False, index=True)
    usr_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    confidence = Column(Numeric(4, 3), default=Decimal("0.950"), nullable=False)


# --- DB Query & Seed Helpers ---

def ensure_user_exists(
    db,
    user_id: str,
    display_name: Optional[str] = None,
    email: Optional[str] = None,
    full_name: Optional[str] = None,
) -> User:
    """Ensures a user row exists in the users table."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        if display_name and user.display_name != display_name:
            user.display_name = display_name
        if email and user.email != email:
            user.email = email
        db.commit()
        return user

    name = display_name or full_name or user_id.replace("usr_", "").capitalize()
    user_email = email or f"{user_id}@wandermatch.local"
    user = User(
        user_id=user_id,
        display_name=name,
        email=user_email,
        full_name=name,
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_trip_exists(
    db,
    trip_id: str,
    title: Optional[str] = None,
    owner_user_id: Optional[str] = None,
) -> Trip:
    """Ensures a trip exists in the trips table."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if trip:
        return trip

    owner_id = owner_user_id or "usr_demo_owner"
    ensure_user_exists(db, owner_id, display_name="Alex Chen", email="alex@wandermatch.local")

    trip_title = title or "Goa Coastal Adventure & Sunset Trail"
    trip = Trip(
        trip_id=trip_id,
        owner_user_id=owner_id,
        title=trip_title,
        destination_city_id="cty_goa",
        party_size=4,
        mode="Mode NA",
        status="planning",
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def add_trip_member(db, trip_id: str, user_id: str, role: str = "editor") -> TripMember:
    """Ensures a member is in trip_members for the given trip."""
    ensure_trip_exists(db, trip_id)
    ensure_user_exists(db, user_id)

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


def get_trip_face_profiles(db, trp_id: str) -> List[Dict[str, Any]]:
    """
    Loads active face profiles for members of a specific trip only.
    Returns list of dicts with usr_id, display_name, and embedding_data.
    """
    if db is None:
        return []

    try:
        rows = (
            db.query(FaceProfile.usr_id, FaceProfile.embedding_data, User.display_name)
            .join(TripMember, FaceProfile.usr_id == TripMember.user_id)
            .join(User, FaceProfile.usr_id == User.user_id)
            .filter(TripMember.trip_id == trp_id, TripMember.status == "active")
            .all()
        )
        return [{"usr_id": r[0], "embedding_data": r[1], "display_name": r[2]} for r in rows]
    except Exception:
        db.rollback()
        return []


def save_face_profile(db, fcp_id: str, usr_id: str, embedding_data: str) -> FaceProfile:
    """Upserts a face profile for usr_id."""
    ensure_user_exists(db, usr_id)
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


def save_photo(
    db,
    trp_id: str,
    uploader_id: str,
    photo_url: str,
    title: str = "Trip Memory",
    folder: str = "All",
) -> Photo:
    """Saves a trip photo record."""
    ensure_trip_exists(db, trp_id)
    ensure_user_exists(db, uploader_id)
    add_trip_member(db, trp_id, uploader_id)

    pho_id = f"pho_{uuid.uuid4().hex[:8]}"
    photo = Photo(
        pho_id=pho_id,
        trp_id=trp_id,
        uploader_id=uploader_id,
        photo_url=photo_url,
        title=title,
        folder=folder,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


def save_photo_matches(db, pho_id: str, matches: List[Dict[str, Any]]) -> List[PhotoPerson]:
    """Persists recognized face tags for a photo."""
    created = []
    for match in matches:
        usr_id = match.get("usr_id")
        if not usr_id:
            continue
        ensure_user_exists(db, usr_id)

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


def get_trip_photos(db, trp_id: str, filter_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves photos for a trip, optionally filtered for a specific user ('My Photos')."""
    query = db.query(Photo).filter(Photo.trp_id == trp_id)

    if filter_user_id:
        query = query.join(PhotoPerson, Photo.pho_id == PhotoPerson.pho_id).filter(
            PhotoPerson.usr_id == filter_user_id
        )

    photos = query.order_by(Photo.created_at.desc()).all()
    results = []

    for p in photos:
        # Load uploader name
        uploader = db.query(User).filter(User.user_id == p.uploader_id).first()
        uploader_name = uploader.display_name if uploader else p.uploader_id

        # Load tagged users
        tags = (
            db.query(PhotoPerson, User.display_name)
            .outerjoin(User, PhotoPerson.usr_id == User.user_id)
            .filter(PhotoPerson.pho_id == p.pho_id)
            .all()
        )

        results.append({
            "phoId": p.pho_id,
            "trpId": p.trp_id,
            "uploaderId": p.uploader_id,
            "uploaderName": uploader_name,
            "photoUrl": p.photo_url,
            "title": p.title,
            "folder": p.folder,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
            "taggedUsers": [
                {
                    "usrId": t[0].usr_id,
                    "displayName": t[1] or t[0].usr_id,
                    "confidence": float(t[0].confidence),
                }
                for t in tags
            ],
        })

    return results


def get_trip_members_with_face_status(db, trp_id: str) -> List[Dict[str, Any]]:
    """Returns trip members with their face registration status."""
    members = (
        db.query(TripMember, User)
        .join(User, TripMember.user_id == User.user_id)
        .filter(TripMember.trip_id == trp_id, TripMember.status == "active")
        .all()
    )
    result = []
    for tm, user in members:
        fcp = db.query(FaceProfile).filter(FaceProfile.usr_id == user.user_id).first()
        result.append({
            "memberId": tm.member_id,
            "tripId": tm.trip_id,
            "userId": user.user_id,
            "displayName": user.display_name,
            "role": tm.role,
            "isFaceRegistered": bool(fcp),
            "joinedAt": tm.joined_at.isoformat() if tm.joined_at else None,
        })
    return result


def get_memories_boards(db, trp_id: str) -> Dict[str, Any]:
    """
    Constructs the 2 Memories Boards:
    - Board 1 ('all'): Complete chronological photo gallery of the trip.
    - Board 2 ('folders'): Smart-grouped folders:
        * Member Folders (e.g. 'folder:Alex Chen' and 'Alex Chen'): All photos where that member appears.
        * 'folder:GroupPhotos' / 'GroupPhotos': Photos where multiple members (>= 2) are present.
        * 'folder:Scenery' / 'Scenery': Photos where no members were detected (scenery, food, landmarks).
    """
    all_photos = get_trip_photos(db, trp_id)

    # Get all active members for this trip
    members = (
        db.query(TripMember.user_id, User.display_name)
        .join(User, TripMember.user_id == User.user_id)
        .filter(TripMember.trip_id == trp_id, TripMember.status == "active")
        .all()
    )

    folders: Dict[str, List[Dict[str, Any]]] = {}

    # 1. Initialize member folders (UserA, UserB...)
    for uid, display_name in members:
        member_name = display_name or uid
        user_photos = [
            p for p in all_photos if any(t["usrId"] == uid for t in p["taggedUsers"])
        ]
        # Provide both canonical folder:UserA and UserA for universal client compatibility
        folders[f"folder:{member_name}"] = user_photos
        folders[member_name] = user_photos

    # 2. GroupPhotos: photos where multiple members (>= 2) are together in the photo
    group_photos = [
        p for p in all_photos if len(p["taggedUsers"]) >= 2
    ]
    folders["folder:GroupPhotos"] = group_photos
    folders["GroupPhotos"] = group_photos

    # Folder count stats based on distinct folder categories
    display_folder_counts = {
        f"folder:{display_name or uid}": len(folders[f"folder:{display_name or uid}"])
        for uid, display_name in members
    }
    display_folder_counts["folder:GroupPhotos"] = len(group_photos)

    summary = {
        "totalPhotos": len(all_photos),
        "totalFolders": len(display_folder_counts),
        "folderCounts": display_folder_counts,
    }

    return {
        "tripId": trp_id,
        "boards": {
            "all": all_photos,
            "folders": folders,
        },
        "summary": summary,
    }


def seed_default_demo_data(db):
    """Pre-seeds standard PS-11 demo users, trips, and members for out-of-the-box testing."""
    demo_users = [
        ("usr_demo_owner", "Alex Chen", "alex@example.invalid", "Alex Chen"),
        ("usr_demo_member2", "Priya Sharma", "priya@example.invalid", "Priya Sharma"),
        ("usr_demo_member3", "Jordan Lee", "jordan@example.invalid", "Jordan Lee"),
        ("usr_demo_member4", "Sam Rivera", "sam@example.invalid", "Sam Rivera"),
        ("panchami", "Panchami", "panchami@example.com", "Panchami P"),
    ]
    for uid, dname, email, fname in demo_users:
        ensure_user_exists(db, uid, display_name=dname, email=email, full_name=fname)

    demo_trips = [
        ("trp_demo_goa", "Goa Coastal Adventure & Sunset Trail", "usr_demo_owner"),
        ("trp_goa_2026", "Goa Group Trip 2026", "usr_demo_owner"),
        ("trp_demo_bali", "Bali Tropical Escape & Cultural Journey", "usr_demo_owner"),
    ]
    for tid, title, owner in demo_trips:
        ensure_trip_exists(db, tid, title=title, owner_user_id=owner)
        for uid, _, _, _ in demo_users:
            add_trip_member(db, tid, uid, role="owner" if uid == owner else "editor")
