import json
import os
import tempfile
from typing import List, Dict, Any, Optional
import numpy as np

from .models import get_trip_face_profiles

CONFIDENCE_THRESHOLD = 0.90  # matches below this stay "Unknown"


def match_faces_in_photo(
    photo_bytes: bytes,
    trp_id: str,
    db,
) -> List[Dict[str, Any]]:
    """
    Detects faces in a photo, matches against ONLY registered members of this specific trip.
    NEVER matches against a global face database.
    Returns list of { usr_id, confidence, facial_area } for detected faces.
    Low-confidence matches (< CONFIDENCE_THRESHOLD) return usr_id=None (shown as Unknown).
    """
    from deepface import DeepFace

    # Get registered members of this trip only
    registered_members = get_trip_face_profiles(db, trp_id) if db is not None else []

    if not registered_members:
        return []  # no registered members → no matching possible

    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        tmp.write(photo_bytes)
        tmp_path = tmp.name

    results: List[Dict[str, Any]] = []
    try:
        # Extract representations (embeddings) for all faces detected in the photo
        try:
            face_reps = DeepFace.represent(
                img_path=tmp_path,
                model_name='ArcFace',
                enforce_detection=False,
            )
            print(f"[DeepFace] Detected {len(face_reps)} face(s) in photo.")
        except Exception as e:
            print(f"[DeepFace Error] {e}")
            face_reps = []

        for face_data in face_reps:
            best_match_usr_id: Optional[str] = None
            best_match_name: Optional[str] = None
            best_confidence = 0.0
            face_embedding = face_data.get("embedding", [])

            for member in registered_members:
                raw_emb_data = member.get("embedding_data")
                if not raw_emb_data:
                    continue

                stored_embeddings = json.loads(raw_emb_data) if isinstance(raw_emb_data, str) else raw_emb_data

                for stored_emb in stored_embeddings:
                    emb_vector = stored_emb.get("embedding", [])
                    similarity = _cosine_similarity(face_embedding, emb_vector)

                    if similarity > best_confidence:
                        best_confidence = similarity
                        best_match_usr_id = member.get("usr_id")
                        best_match_name = member.get("display_name")

            # In ArcFace, cosine similarity >= 0.45 indicates a verified match
            # Map into the 0.0 - 1.0 confidence scale (>= 0.45 maps to >= 0.90)
            if best_confidence >= 0.45:
                calibrated_conf = round(0.90 + 0.10 * ((min(1.0, best_confidence) - 0.45) / 0.55), 3)
            else:
                calibrated_conf = round(max(0.0, best_confidence * 2.0), 3)

            if calibrated_conf >= CONFIDENCE_THRESHOLD:
                results.append({
                    "usr_id": best_match_usr_id,
                    "display_name": best_match_name,
                    "confidence": calibrated_conf,
                    "facial_area": face_data.get("facial_area"),
                })
            else:
                results.append({
                    "usr_id": None,  # Unknown — never force-tag
                    "display_name": "Unknown",
                    "confidence": calibrated_conf,
                    "facial_area": face_data.get("facial_area"),
                })
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return results


def _cosine_similarity(v1: list, v2: list) -> float:
    if not v1 or not v2:
        return 0.0
    a = np.array(v1)
    b = np.array(v2)
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)
