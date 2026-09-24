from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

try:
    from backend.database import get_db
    from backend.services.face.registration import register_face
except ImportError:
    from ..database import get_db
    from ..services.face.registration import register_face

router = APIRouter(prefix="/api/face", tags=["face"])


@router.post("/register")
async def api_register_face(
    straight: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    usr_id: Optional[str] = Form(None),
    usrId: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Register 3-photo face profile for traveler (straight, left, right).
    Enforces exactly 1 face per angle quality check, generates ArcFace embeddings.
    """
    user_id = usr_id or usrId or "usr_demo_user"

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
        result = register_face(photos_dict, user_id, db)
        from backend.services.face.models import add_trip_member
        add_trip_member(db, "trp_demo_goa", user_id)
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
        "status": result["status"],
        "embeddingsCount": result["embeddings_count"],
    }
