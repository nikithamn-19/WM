from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

try:
    from backend.database import get_db
    from backend.services.face.registration import register_face
    from backend.services.face.models import (
        FaceProfile,
        User,
        ensure_user_exists,
        add_trip_member,
    )
except ImportError:
    from ..database import get_db
    from ..services.face.registration import register_face
    from ..services.face.models import (
        FaceProfile,
        User,
        ensure_user_exists,
        add_trip_member,
    )

router = APIRouter(prefix="/api/face", tags=["face"])


@router.post("/register")
async def api_register_face(
    straight: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    usr_id: Optional[str] = Form(None),
    usrId: Optional[str] = Form(None),
    display_name: Optional[str] = Form(None),
    displayName: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    trp_id: Optional[str] = Form(None),
    trpId: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Register 3-photo face profile for traveler (straight, left, right).
    Enforces exactly 1 face per angle quality check, generates ArcFace embeddings,
    and saves user profile in `users` and `face_profiles`.
    """
    user_id = usr_id or usrId or "panchami"
    name = display_name or displayName or (user_id.replace("usr_", "").capitalize())
    user_email = email or f"{user_id}@wandermatch.local"
    target_trip = trp_id or trpId or "trp_demo_goa"

    # Read uploaded bytes
    try:
        straight_bytes = await straight.read()
        left_bytes = await left.read()
        right_bytes = await right.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed reading uploaded photo files: {str(e)}"
        )

    photos_dict = {
        "straight": straight_bytes,
        "left": left_bytes,
        "right": right_bytes,
    }

    try:
        # 1. Ensure user row exists in PS-11 users table
        user = ensure_user_exists(db, user_id, display_name=name, email=user_email)

        # 2. Quality check & generate ArcFace embeddings
        result = register_face(photos_dict, user_id, db)

        # 3. Add to trip members for target trip and demo trip
        add_trip_member(db, target_trip, user_id)
        if target_trip != "trp_demo_goa":
            add_trip_member(db, "trp_demo_goa", user_id)
        if target_trip != "trp_goa_2026":
            add_trip_member(db, "trp_goa_2026", user_id)

    except ValueError as e:
        # TRD.md: AC-FAC-01 requires HTTP 400 if face quality check fails
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face registration error: {str(e)}",
        )

    # Return in camelCase per API contract
    return {
        "fcpId": result["fcp_id"],
        "usrId": result["usr_id"],
        "displayName": user.display_name,
        "status": result["status"],
        "embeddingsCount": result["embeddings_count"],
    }


@router.get("/status/{usr_id}")
def get_face_registration_status(
    usr_id: str,
    db: Session = Depends(get_db),
):
    """
    Check if a traveler has completed face registration.
    Used by frontend onboarding & skippable face registration banner.
    """
    user = db.query(User).filter(User.user_id == usr_id).first()
    fcp = db.query(FaceProfile).filter(FaceProfile.usr_id == usr_id).first()

    return {
        "usrId": usr_id,
        "displayName": user.display_name if user else usr_id,
        "isFaceRegistered": bool(fcp),
        "fcpId": fcp.fcp_id if fcp else None,
        "registeredAt": fcp.created_at.isoformat() if fcp and fcp.created_at else None,
    }
