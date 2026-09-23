"""
End-to-End Verification Script for DeepFace Face Matching Service in WanderMatch
"""
import io
import json
import os
import sys
from PIL import Image
from sqlalchemy.orm import Session

base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from backend.database import SessionLocal, Base, engine
from backend.services.face.registration import register_face
from backend.services.face.matching import match_faces_in_photo, CONFIDENCE_THRESHOLD
from backend.services.face.models import (
    FaceProfile,
    Photo,
    PhotoPerson,
    save_photo,
    save_photo_matches,
)

def run_verification():
    print("=" * 60)
    print("      DEEPFACE / ARCFACE VERIFICATION PIPELINE")
    print("=" * 60)

    # 1. Initialize clean DB tables
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Read Lena test photo
    lena_file = os.path.join(base_dir, "tests", "sample_faces", "lena.jpg")
    with open(lena_file, "rb") as f:
        lena_bytes = f.read()

    # 2. Test Step A: Register Face with 3-Angle Quality Check
    print("\n[Step 1] Registering User 'usr_lena' with 3 Photos...")
    photos_dict = {
        "straight": lena_bytes,
        "left": lena_bytes,
        "right": lena_bytes,
    }
    reg_result = register_face(photos_dict, "usr_lena", db)
    print(f" -> Registration Success!")
    print(f"    Profile ID       : {reg_result['fcp_id']}")
    print(f"    User ID          : {reg_result['usr_id']}")
    print(f"    Status           : {reg_result['status']}")
    print(f"    Embeddings Count : {reg_result['embeddings_count']} (ArcFace 512-d)")

    # Add user to trip_members
    from backend.services.face.models import add_trip_member
    add_trip_member(db, "trp_demo_goa", "usr_lena")

    # Verify embedding_data is NOT exposed
    assert "embedding_data" not in reg_result, "CRITICAL: embedding_data was leaked in API response!"
    print(" -> Security Check: Vector embeddings safely shielded from client response.")

    # 3. Test Step B: Face Matching on a Trip Photo (Same Person)
    print("\n[Step 2] Matching Face in Uploaded Trip Photo (Trip: 'trp_demo_goa')...")
    # Save a trip photo
    photo_record = save_photo(db, "trp_demo_goa", "usr_uploader", "/static/uploads/trip_lena.jpg")
    
    # Run face matching
    matches = match_faces_in_photo(lena_bytes, "trp_demo_goa", db)
    print(f" -> Found {len(matches)} face(s) in photo:")
    for idx, match in enumerate(matches, 1):
        uid = match.get("usr_id")
        conf = match.get("confidence", 0.0)
        area = match.get("facial_area", {})
        print(f"    Face #{idx}: usr_id='{uid}', confidence={conf:.3f}, box={area}")
        assert uid == "usr_lena", f"Expected match to be usr_lena, got {uid}"
        assert conf >= CONFIDENCE_THRESHOLD, f"Confidence {conf} below threshold {CONFIDENCE_THRESHOLD}"

    save_photo_matches(db, photo_record.pho_id, matches)
    print(" -> Auto-tagging: Successfully saved match tag to 'photo_person' table.")

    # 4. Test Step C: Unknown Face / Unregistered Person Protection
    print("\n[Step 3] Testing Unknown Face (Quality check & Non-member gate)...")
    # Generate an image with no face
    blank_img = Image.new('RGB', (100, 100), color=(100, 120, 150))
    buf = io.BytesIO()
    blank_img.save(buf, format='JPEG')
    blank_bytes = buf.getvalue()

    matches_blank = match_faces_in_photo(blank_bytes, "trp_demo_goa", db)
    print(f" -> Faces detected in blank/unknown image: {len(matches_blank)}")
    if matches_blank:
        print(f"    Unknown Face: usr_id={matches_blank[0]['usr_id']} (Expected: None), confidence={matches_blank[0]['confidence']:.3f}")
        assert matches_blank[0]["usr_id"] is None, "Expected unknown face to have usr_id=None!"
        assert matches_blank[0]["confidence"] < CONFIDENCE_THRESHOLD, "Expected low confidence for non-face!"
        print(" -> Unknown Gate Verified: Low-confidence/unregistered faces stay Unknown (usr_id=None) without force-tagging.")

    # 5. Test Step D: Filtered Gallery Query ("My Photos" view)
    print("\n[Step 4] Testing Filtered Gallery ('My Photos' for 'usr_lena')...")
    tagged_photos = (
        db.query(Photo)
        .join(PhotoPerson, Photo.pho_id == PhotoPerson.pho_id)
        .filter(Photo.trp_id == "trp_demo_goa", PhotoPerson.usr_id == "usr_lena")
        .all()
    )
    print(f" -> 'My Photos' query returned {len(tagged_photos)} photo(s) tagged with usr_lena.")
    assert len(tagged_photos) >= 1
    print(f"    Photo ID: {tagged_photos[0].pho_id}, URL: {tagged_photos[0].photo_url}")

    print("\n" + "=" * 60)
    print("  ALL DEEPFACE / ARCFACE VERIFICATION CHECKS PASSED!")
    print("=" * 60)

    db.close()


if __name__ == "__main__":
    run_verification()
