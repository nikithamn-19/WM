from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import Optional

router = APIRouter(prefix="/api/face", tags=["face"])

@router.get("/status/{usr_id}")
def get_face_status(usr_id: str):
    return {
        "usrId": usr_id,
        "registered": False,
        "isFaceRegistered": False,
        "status": "not_registered"
    }

@router.post("/register")
async def register_face(
    straight: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    usrId: Optional[str] = Form(None),
    displayName: Optional[str] = Form(None),
):
    return {
        "status": "success",
        "usrId": usrId or "usr_demo",
        "displayName": displayName or "Traveler",
        "message": "Face registered successfully"
    }
