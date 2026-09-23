import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

try:
    from backend.database import get_db
    from backend.services.face.models import Photo, PhotoPerson, save_photo, save_photo_matches
    from backend.services.face.matching import match_faces_in_photo
except ImportError:
    from ..database import get_db
    from ..services.face.models import Photo, PhotoPerson, save_photo, save_photo_matches
    from ..services.face.matching import match_faces_in_photo

router = APIRouter(prefix="/api/photos", tags=["photos"])

# Local uploads folder fallback
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("")
async def upload_photo(
    file: Optional[UploadFile] = File(None),
    photo: Optional[UploadFile] = File(None),
    trp_id: Optional[str] = Form(None),
    trpId: Optional[str] = Form(None),
    uploader_id: Optional[str] = Form(None),
    uploaderId: Optional[str] = Form(None),
    photo_url: Optional[str] = Form(None),
    photoUrl: Optional[str] = Form(None),
    folder: Optional[str] = Form("All Photos"),
    title: Optional[str] = Form("Trip Photo"),
    caption: Optional[str] = Form(""),
    db: Session = Depends(get_db),
):
    """
    Upload trip photo, run DeepFace matching against registered members of this trip,
    and save detected member tags into photo_person.
    """
    # Clean up Swagger default 'string' placeholders
    if trp_id == "string": trp_id = None
    if trpId == "string": trpId = None
    if uploader_id == "string": uploader_id = None
    if uploaderId == "string": uploaderId = None
    if photo_url == "string": photo_url = None
    if photoUrl == "string": photoUrl = None

    target_trp_id = trp_id or trpId or "trp_demo_goa"
    target_uploader_id = uploader_id or uploaderId or "usr_demo_user"

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

    # Save photo record
    photo_record = save_photo(db, target_trp_id, target_uploader_id, final_url)

    # Perform DeepFace face matching against trip members if photo bytes are available
    tagged_matches = []
    if photo_bytes:
        try:
            matches = match_faces_in_photo(photo_bytes, target_trp_id, db)
            print(f"[PhotoMatching] Matches found: {matches}")
            if matches:
                save_photo_matches(db, photo_record.pho_id, matches)
                tagged_matches = matches
        except Exception as e:
            print(f"[PhotoMatching Error] {e}")

    return {
        "phoId": photo_record.pho_id,
        "trpId": photo_record.trp_id,
        "uploaderId": photo_record.uploader_id,
        "photoUrl": photo_record.photo_url,
        "createdAt": photo_record.created_at.isoformat() if photo_record.created_at else None,
        "taggedUsers": [
            {"usrId": m.get("usr_id"), "confidence": m.get("confidence")}
            for m in tagged_matches if m.get("usr_id") is not None
        ],
    }


@router.get("/{trp_id}")
def get_trip_photos(
    trp_id: str,
    usrId: Optional[str] = Query(None),
    usr_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Query trip photo gallery.
    If usrId is provided: returns only photos where photo_person.usr_id = usrId ('My Photos').
    Otherwise: returns all photos for the trip.
    """
    filter_user = usrId or usr_id

    if filter_user:
        # Filter for photos containing this specific user
        tagged_photos = (
            db.query(Photo)
            .join(PhotoPerson, Photo.pho_id == PhotoPerson.pho_id)
            .filter(Photo.trp_id == trp_id, PhotoPerson.usr_id == filter_user)
            .all()
        )
        photos = tagged_photos
    else:
        photos = db.query(Photo).filter(Photo.trp_id == trp_id).all()

    results = []
    for p in photos:
        # Load tagged users for each photo
        tags = db.query(PhotoPerson).filter(PhotoPerson.pho_id == p.pho_id).all()
        results.append({
            "phoId": p.pho_id,
            "trpId": p.trp_id,
            "uploaderId": p.uploader_id,
            "photoUrl": p.photo_url,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
            "taggedUsers": [
                {"usrId": t.usr_id, "confidence": float(t.confidence)}
                for t in tags
            ],
        })

    return results
