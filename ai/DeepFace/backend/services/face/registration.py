import json
import os
import tempfile
import uuid
from typing import Dict, Any

from .models import save_face_profile

def register_face(
    photos: Dict[str, bytes],   # { "straight": bytes, "left": bytes, "right": bytes }
    usr_id: str,
    db,                         # SQLAlchemy session
) -> Dict[str, Any]:
    """
    Accepts 3 reference photos ('straight', 'left', 'right'), runs quality checks,
    generates ArcFace embeddings, and stores them in face_profiles.
    
    Returns { fcp_id, usr_id, status: 'REGISTERED', embeddings_count: 3 }
    Raises ValueError if quality check fails (0 or >1 face detected).
    """
    from deepface import DeepFace

    required_positions = ["straight", "left", "right"]
    for pos in required_positions:
        if pos not in photos or not photos[pos]:
            raise ValueError(f"Missing required photo angle: '{pos}'")

    embeddings = []

    for position in required_positions:
        photo_bytes = photos[position]
        
        # Write to temp file (DeepFace requires file path)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp.write(photo_bytes)
            tmp_path = tmp.name

        try:
            # Quality check: exactly 1 face must be detected
            faces = []
            try:
                faces = DeepFace.extract_faces(
                    img_path=tmp_path,
                    detector_backend='opencv',
                    enforce_detection=True,
                )
            except Exception as e:
                # When 0 faces are found, DeepFace with enforce_detection=True raises ValueError
                faces = []

            if len(faces) != 1:
                raise ValueError(
                    f"Face quality check failed: exactly one face required per photo. "
                    f"Found {len(faces)} faces in {position} photo."
                )

            # Generate ArcFace embedding
            embedding_result = DeepFace.represent(
                img_path=tmp_path,
                model_name='ArcFace',
                enforce_detection=False,
            )

            if not embedding_result or "embedding" not in embedding_result[0]:
                raise ValueError(f"Failed to generate ArcFace embedding for {position} photo.")

            embeddings.append({
                "position": position,
                "embedding": embedding_result[0]["embedding"],
            })
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    # Store in face_profiles (NEVER expose embedding_data in API response)
    fcp_id = f"fcp_{uuid.uuid4().hex[:8]}"
    embedding_json = json.dumps(embeddings)

    if db is not None:
        save_face_profile(db, fcp_id, usr_id, embedding_json)

    return {
        "fcp_id": fcp_id,
        "usr_id": usr_id,
        "status": "REGISTERED",
        "embeddings_count": len(embeddings),
        # NEVER include embedding_data in this return value
    }
