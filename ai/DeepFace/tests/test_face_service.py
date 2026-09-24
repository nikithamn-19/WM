import io
import json
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

import os
import sys

# Ensure backend can be imported from deepface directory
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from backend.main import app
from backend.services.face.registration import register_face
from backend.services.face.matching import match_faces_in_photo, _cosine_similarity, CONFIDENCE_THRESHOLD
from backend.database import SessionLocal, Base, engine
from backend.services.face.models import FaceProfile, Photo, PhotoPerson


def create_blank_image_bytes():
    """Generates a blank image without any faces."""
    img = Image.new('RGB', (100, 100), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()


@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


def test_cosine_similarity():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    assert abs(_cosine_similarity(v1, v2) - 1.0) < 1e-5

    v3 = [0.0, 1.0, 0.0]
    assert abs(_cosine_similarity(v1, v3) - 0.0) < 1e-5

    v4 = [0.0, 0.0, 0.0]
    assert _cosine_similarity(v1, v4) == 0.0


def test_confidence_threshold_constant():
    assert CONFIDENCE_THRESHOLD == 0.90


def test_face_quality_check_fails_on_blank_image(db_session):
    """
    Verifies AC-FAC-01:
    Submitting a photo containing 0 faces raises ValueError with the exact required error string.
    """
    blank = create_blank_image_bytes()
    photos = {
        "straight": blank,
        "left": blank,
        "right": blank,
    }

    with pytest.raises(ValueError) as excinfo:
        register_face(photos, "usr_test_123", db_session)

    assert "Face quality check failed: exactly one face required per photo." in str(excinfo.value)


def test_api_health():
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_face_register_quality_check_rejection():
    """
    Verifies HTTP 400 rejection from /api/face/register on non-face photos per AC-FAC-01.
    """
    client = TestClient(app)
    blank = create_blank_image_bytes()

    files = {
        "straight": ("straight.jpg", blank, "image/jpeg"),
        "left": ("left.jpg", blank, "image/jpeg"),
        "right": ("right.jpg", blank, "image/jpeg"),
    }
    data = {"usrId": "usr_fail_user"}

    response = client.post("/api/face/register", files=files, data=data)
    assert response.status_code == 400
    assert "Face quality check failed: exactly one face required per photo." in response.json()["detail"]


from backend.services.face.models import FaceProfile, Photo, PhotoPerson, add_trip_member


def test_match_faces_no_registered_members(db_session):
    """If no registered members in trip, returns empty list without error."""
    blank = create_blank_image_bytes()
    matches = match_faces_in_photo(blank, "trp_empty_never_registered", db_session)
    assert matches == []


def test_real_face_registration_and_matching(db_session):
    """
    End-to-end integration test:
    1. Register face with 3 photos of Lena.
    2. Add member to trp_test_trip.
    3. Verify embeddings count is 3 and ArcFace vector is shielded.
    4. Match against uploaded trip photo and verify confidence >= 0.90.
    """
    import os
    sample_path = os.path.join(os.path.dirname(__file__), "sample_faces", "lena.jpg")
    if not os.path.exists(sample_path):
        pytest.skip("sample face image not present")

    with open(sample_path, "rb") as f:
        face_bytes = f.read()

    photos = {
        "straight": face_bytes,
        "left": face_bytes,
        "right": face_bytes,
    }

    res = register_face(photos, "usr_lena_test", db_session)
    assert res["status"] == "REGISTERED"
    assert res["embeddings_count"] == 3
    assert "embedding_data" not in res

    # Add user as member of trp_test_trip
    add_trip_member(db_session, "trp_test_trip", "usr_lena_test")

    matches = match_faces_in_photo(face_bytes, "trp_test_trip", db_session)
    assert len(matches) >= 1
    assert matches[0]["usr_id"] == "usr_lena_test"
    assert matches[0]["confidence"] >= CONFIDENCE_THRESHOLD


def test_memories_boards_and_members(db_session):
    """
    Verifies Memories 2 Boards (all and folders) and trip members face status.
    """
    client = TestClient(app)

    # 1. Check trips & members
    resp = client.get("/api/trips/trp_demo_goa/members")
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) >= 1
    assert any("userId" in m and "isFaceRegistered" in m for m in members)

    # 2. Check face status for a user
    resp = client.get("/api/face/status/panchami")
    assert resp.status_code == 200
    assert "isFaceRegistered" in resp.json()

    # 3. Upload a photo without faces (scenery)
    blank = create_blank_image_bytes()
    resp = client.post(
        "/api/photos",
        files={"file": ("beach_sunset.jpg", blank, "image/jpeg")},
        data={
            "trpId": "trp_demo_goa",
            "uploaderId": "usr_demo_owner",
            "title": "Goa Beach Sunset",
            "folder": "Arrival & Resort",
        },
    )
    assert resp.status_code == 200
    photo_data = resp.json()
    assert photo_data["trpId"] == "trp_demo_goa"
    assert photo_data["uploaderId"] == "usr_demo_owner"
    assert "taggedUsers" in photo_data
    assert "createdAt" in photo_data

    # 4. Check 2 Memories boards
    boards_resp = client.get("/api/memories/trp_demo_goa")
    assert boards_resp.status_code == 200
    body = boards_resp.json()
    assert "boards" in body
    assert "all" in body["boards"]
    assert "folders" in body["boards"]
    assert len(body["boards"]["all"]) >= 1

    # Check folders contain member folders and GroupPhotos, and NO Scenery
    folders = body["boards"]["folders"]
    assert "folder:GroupPhotos" in folders or "GroupPhotos" in folders
    assert "folder:Alex Chen" in folders or "Alex Chen" in folders
    assert "folder:Scenery" not in folders and "Scenery" not in folders

