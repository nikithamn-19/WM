import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

try:
    from backend.database import get_db
    from backend.services.face.models import (
        Photo,
        PhotoPerson,
        User,
        save_photo,
        save_photo_matches,
        get_trip_photos,
        get_memories_boards,
    )
    from backend.services.face.matching import match_faces_in_photo
except ImportError:
    from ..database import get_db
    from ..services.face.models import (
        Photo,
        PhotoPerson,
        User,
        save_photo,
        save_photo_matches,
        get_trip_photos,
        get_memories_boards,
    )
    from ..services.face.matching import match_faces_in_photo

router = APIRouter(prefix="/api", tags=["photos & memories"])

# Local uploads folder fallback
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/photos")
async def upload_photo(
    file: Optional[UploadFile] = File(None),
    photo: Optional[UploadFile] = File(None),
    trp_id: Optional[str] = Form(None),
    trpId: Optional[str] = Form(None),
    uploader_id: Optional[str] = Form(None),
    uploaderId: Optional[str] = Form(None),
    photo_url: Optional[str] = Form(None),
    photoUrl: Optional[str] = Form(None),
    folder: Optional[str] = Form("All"),
    title: Optional[str] = Form("Trip Memory"),
    caption: Optional[str] = Form(""),
    db: Session = Depends(get_db),
):
    """
    Upload a trip photo into Memories:
    1. Notes timestamp & creates photo record in `photos`.
    2. DeepFace ArcFace scans for faces and matches against registered members of this trip.
    3. Persists detected member associations in `photo_person`.
    4. Returns photo record with uploader details and tagged members list.
    """
    # Clean up Swagger default 'string' placeholders
    if trp_id == "string": trp_id = None
    if trpId == "string": trpId = None
    if uploader_id == "string": uploader_id = None
    if uploaderId == "string": uploaderId = None
    if photo_url == "string": photo_url = None
    if photoUrl == "string": photoUrl = None
    if folder == "string": folder = "All"
    if title == "string": title = "Trip Memory"

    target_trp_id = trp_id or trpId or "trp_demo_goa"
    target_uploader_id = uploader_id or uploaderId or "usr_demo_owner"

    uploaded_file = None
    photo_bytes = b""

    # Pick whichever field actually contains file bytes
    for candidate in [file, photo]:
        if candidate is not None and getattr(candidate, "filename", ""):
            data = await candidate.read()
            if len(data) > 0:
                uploaded_file = candidate
                photo_bytes = data
                break

    final_url = photo_url or photoUrl

    if uploaded_file is not None and photo_bytes:
        try:
            filename = f"{uuid.uuid4().hex[:8]}_{uploaded_file.filename}"
            filepath = os.path.join(UPLOAD_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(photo_bytes)
            final_url = f"/static/uploads/{filename}"
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process uploaded photo: {str(e)}"
            )

    if not final_url:
        final_url = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"

    # Save photo record with folder and title
    photo_record = save_photo(
        db,
        trp_id=target_trp_id,
        uploader_id=target_uploader_id,
        photo_url=final_url,
        title=title or "Trip Memory",
        folder=folder or "All",
    )

    # Perform DeepFace face matching against trip members if photo bytes are available
    tagged_matches = []
    if photo_bytes:
        try:
            matches = match_faces_in_photo(photo_bytes, target_trp_id, db)
            print(f"[PhotoMatching] Matches detected: {matches}")
            if matches:
                save_photo_matches(db, photo_record.pho_id, matches)
                tagged_matches = matches
        except Exception as e:
            print(f"[PhotoMatching Error] {e}")

    # Fetch uploader name
    uploader = db.query(User).filter(User.user_id == target_uploader_id).first()
    uploader_name = uploader.display_name if uploader else target_uploader_id

    # Format tagged users response
    tagged_users = []
    for m in tagged_matches:
        if m.get("usr_id"):
            tagged_users.append({
                "usrId": m.get("usr_id"),
                "displayName": m.get("display_name") or m.get("usr_id"),
                "confidence": m.get("confidence"),
                "facialArea": m.get("facial_area"),
            })

    return {
        "phoId": photo_record.pho_id,
        "trpId": photo_record.trp_id,
        "uploaderId": photo_record.uploader_id,
        "uploaderName": uploader_name,
        "photoUrl": photo_record.photo_url,
        "title": photo_record.title,
        "folder": photo_record.folder,
        "createdAt": photo_record.created_at.isoformat() if photo_record.created_at else None,
        "taggedUsers": tagged_users,
    }


@router.get("/photos/{trp_id}")
def get_photos(
    trp_id: str,
    usrId: Optional[str] = Query(None),
    usr_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Query trip photos:
    - If `usrId` is provided: filters for 'My Photos' (only photos where this traveler is recognized).
    - If omitted: returns all photos for the trip in reverse chronological order.
    """
    filter_user = usrId or usr_id
    return get_trip_photos(db, trp_id, filter_user_id=filter_user)


@router.get("/memories/{trp_id}")
@router.get("/photos/{trp_id}/boards", include_in_schema=False)
def get_memories(
    trp_id: str,
    db: Session = Depends(get_db),
):
    """
    Get the 2 Memories Boards for a trip:
    - Board 1 ('all'): Full chronological timeline of photos uploaded to the trip.
    - Board 2 ('folders'): Smart-grouped folders:
        * folder:<MemberName> (e.g. folder:Alex Chen, folder:Panchami): All photos where this member is present.
        * folder:GroupPhotos: All photos containing multiple (>= 2) members together.
    """
    return get_memories_boards(db, trp_id)

