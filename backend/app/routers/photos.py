from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import Optional, List

router = APIRouter(prefix="/api", tags=["photos"])

@router.get("/photos/memories/{trp_id}")
def get_memories_boards(trp_id: str, usrId: Optional[str] = None):
    return {
        "trpId": trp_id,
        "boards": {
            "all": [],
            "my": [],
            "folders": {}
        }
    }

@router.get("/photos/{trp_id}")
def get_trip_photos(trp_id: str, folder: Optional[str] = None, taggedUserId: Optional[str] = None):
    return []

@router.post("/photos")
async def upload_photo(
    file: Optional[UploadFile] = File(None),
    trpId: Optional[str] = Form(None),
    folder: Optional[str] = Form("All"),
    title: Optional[str] = Form("Trip Memory")
):
    return {
        "phoId": "pho_demo",
        "trpId": trpId or "trp_demo",
        "title": title or "Trip Memory",
        "folder": folder or "All",
        "status": "uploaded"
    }
