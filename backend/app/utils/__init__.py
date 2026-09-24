import uuid
from datetime import datetime, date, timedelta

def generate_id(prefix: str = "") -> str:
    """Generate a short unique ID with prefix."""
    return f"{prefix}{uuid.uuid4().hex[:12]}"

def parse_time(time_str: str | None, trip_start: date, day_index: int) -> datetime | None:
    """Convert 'HH:MM' + trip start date + day_index into a full TIMESTAMPTZ datetime."""
    if not time_str:
        return None
    try:
        if len(time_str) == 5 and ":" in time_str:
            trip_day = trip_start + timedelta(days=day_index - 1)
            return datetime.strptime(f"{trip_day} {time_str}", "%Y-%m-%d %H:%M")
        return datetime.fromisoformat(time_str)
    except Exception:
        return datetime.utcnow()

import secrets

def generate_invite_code() -> str:
    """Generate an 8-character cryptographically secure uppercase join code excluding ambiguous characters (0, O, 1, I, 5, S)."""
    unambiguous_alphabet = "2346789ABCDEFGHJKLMNPQRTUVWXY"
    chars = "".join(secrets.choice(unambiguous_alphabet) for _ in range(6))
    return f"WM{chars}"


