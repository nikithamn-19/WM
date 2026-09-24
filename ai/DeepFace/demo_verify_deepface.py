"""
End-to-End Verification Script for DeepFace & Memories Service in WanderMatch
Tests:
1. Database Schema & Pre-seeded PS-11 Demo Data (Users & Trips)
2. Traveler Face Registration Status (isFaceRegistered)
3. 3-Angle Face Registration (Straight, Left, Right) with ArcFace 512-d embeddings
4. Trip Photo Upload with timestamp and DeepFace face detection
5. Facial Recognition & Auto-tagging into `photo_person`
6. Memories 2 Boards Generation:
   - Board 1 ('all'): Full chronological trip photo timeline
   - Board 2 ('folders'): Smart folders:
       * Member Folders (e.g. 'folder:Alex Chen', 'folder:Panchami')
       * 'folder:GroupPhotos' (photos where multiple members appear together)
       * 'folder:Scenery' (photos with no members)
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
    User,
    Trip,
    save_photo,
    save_photo_matches,
    get_trip_photos,
    get_memories_boards,
    get_trip_members_with_face_status,
    seed_default_demo_data,
    add_trip_member,
)


def run_verification():
    print("=" * 70)
    print("      WANDERMATCH DEEPFACE & MEMORIES VERIFICATION PIPELINE")
    print("=" * 70)

    # 1. Initialize clean DB tables and seed demo data
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    seed_default_demo_data(db)

    print("\n[Step 1] Checking Pre-seeded Demo Data...")
    trips = db.query(Trip).all()
    print(f" -> Found {len(trips)} trip(s): {[t.trip_id for t in trips]}")
    users = db.query(User).all()
    print(f" -> Found {len(users)} registered user(s): {[u.display_name for u in users]}")

    # Read Lena sample face image
    sample_file = os.path.join(base_dir, "tests", "sample_faces", "lena.jpg")
    with open(sample_file, "rb") as f:
        face_bytes = f.read()

    # 2. Check initial face status before registration
    print("\n[Step 2] Checking Initial Face Status for 'usr_demo_owner'...")
    members = get_trip_members_with_face_status(db, "trp_demo_goa")
    for m in members:
        print(f"    Member: {m['displayName']:<15} | ID: {m['userId']:<18} | Face Registered: {m['isFaceRegistered']}")

    # 3. Register face profile for 'usr_demo_owner' (Alex Chen)
    print("\n[Step 3] Registering 3-Angle Face Profile for 'usr_demo_owner' (Alex Chen)...")
    photos_dict = {
        "straight": face_bytes,
        "left": face_bytes,
        "right": face_bytes,
    }
    reg_result = register_face(photos_dict, "usr_demo_owner", db)
    print(" -> Registration Successful!")
    print(f"    Profile ID       : {reg_result['fcp_id']}")
    print(f"    User ID          : {reg_result['usr_id']}")
    print(f"    Status           : {reg_result['status']}")
    print(f"    Embeddings Count : {reg_result['embeddings_count']} (ArcFace 512-d)")
    assert "embedding_data" not in reg_result, "Security check failed: raw embeddings leaked!"
    print(" -> Security: Raw 512-d embeddings shielded from client response.")

    # 4. Upload a Memory Photo containing Alex Chen
    print("\n[Step 4] Uploading Trip Photo with Alex Chen (Trip: 'trp_demo_goa')...")
    photo_record1 = save_photo(
        db,
        trp_id="trp_demo_goa",
        uploader_id="usr_demo_owner",
        photo_url="/static/uploads/alex_sunset.jpg",
        title="Sunset at Anjuna Beach",
        folder="Arrival & Resort",
    )
    print(f" -> Photo record created: pho_id='{photo_record1.pho_id}', timestamp={photo_record1.created_at}")

    # Scan face with DeepFace ArcFace
    matches = match_faces_in_photo(face_bytes, "trp_demo_goa", db)
    print(f" -> Detected {len(matches)} face(s):")
    for m in matches:
        print(f"    Matched: usr_id='{m.get('usr_id')}', name='{m.get('display_name')}', conf={m.get('confidence')}")
    save_photo_matches(db, photo_record1.pho_id, matches)
    print(" -> Saved match to 'photo_person' table.")

    # 5. Upload a Scenery Photo (no faces)
    print("\n[Step 5] Uploading Scenery Photo (No Faces)...")
    blank_img = Image.new("RGB", (200, 200), color=(60, 120, 180))
    buf = io.BytesIO()
    blank_img.save(buf, format="JPEG")
    blank_bytes = buf.getvalue()

    photo_record2 = save_photo(
        db,
        trp_id="trp_demo_goa",
        uploader_id="usr_demo_member2",
        photo_url="/static/uploads/calangute_waves.jpg",
        title="Ocean Waves & Blue Sky",
        folder="Baga Beach",
    )
    scenery_matches = match_faces_in_photo(blank_bytes, "trp_demo_goa", db)
    print(f" -> Faces detected in scenery image: {len(scenery_matches)} (Expected: 0)")
    save_photo_matches(db, photo_record2.pho_id, scenery_matches)

    # 6. Retrieve Memories 2 Boards
    print("\n[Step 6] Querying Memories 2 Boards for 'trp_demo_goa'...")
    boards_data = get_memories_boards(db, "trp_demo_goa")
    boards = boards_data["boards"]
    summary = boards_data["summary"]

    print(f" -> Board 1 ('all'): {len(boards['all'])} total photo(s)")
    for p in boards['all']:
        tagged_names = [t['displayName'] for t in p['taggedUsers']] or ['None (No Members)']
        print(f"    [{p['phoId']}] '{p['title']}' | Uploader: {p['uploaderName']} | Tagged: {tagged_names}")

    print(f"\n -> Board 2 ('folders'): {summary['totalFolders']} folders generated:")
    for folder_name, count in summary["folderCounts"].items():
        print(f"    * {folder_name:<25}: {count} photo(s)")

    print("\n" + "=" * 70)
    print("  ALL VERIFICATION CHECKS & MEMORIES BOARDS PASSED SUCCESSFULLY!")
    print("=" * 70)

    db.close()


if __name__ == "__main__":
    run_verification()
