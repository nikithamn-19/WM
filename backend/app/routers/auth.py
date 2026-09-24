import os
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, UserPreference
from ..schemas.user import PreferencesInput, ProfileUpdateInput
from ..services.clerk_auth import get_current_user
from ..utils import generate_id

router = APIRouter()

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "whsec_your_secret_here")

@router.post("/api/auth/webhook")
async def clerk_webhook(
    request: Request,
    db: Session = Depends(get_db),
    svix_id: str = Header(None),
    svix_timestamp: str = Header(None),
    svix_signature: str = Header(None)
):
    """
    Handles Clerk user.created and user.updated webhook events.
    Verifies the webhook signature using svix library.
    On user.created: creates a row in users table.
    On user.updated: updates display_name and email in users table.
    """
    body = await request.body()
    
    # Try Svix verification if headers & secret are provided
    if svix_id and svix_timestamp and svix_signature and CLERK_WEBHOOK_SECRET and not CLERK_WEBHOOK_SECRET.startswith("whsec_your"):
        try:
            from svix.webhooks import Webhook
            wh = Webhook(CLERK_WEBHOOK_SECRET)
            event = wh.verify(body, {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature
            })
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        # Development / Direct JSON payload fallback
        import json
        try:
            event = json.loads(body.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("type")
    event_data = event.get("data", {})

    if event_type == "user.created":
        clerk_user_id = event_data.get("id")
        email_addresses = event_data.get("email_addresses", [])
        email = email_addresses[0].get("email_address") if email_addresses else f"{clerk_user_id}@example.com"
        first_name = event_data.get("first_name", "") or ""
        last_name = event_data.get("last_name", "") or ""
        display_name = f"{first_name} {last_name}".strip() or email.split("@")[0]
        
        if clerk_user_id:
            existing = db.query(User).filter(User.user_id == clerk_user_id).first()
            if not existing:
                new_user = User(
                    user_id=clerk_user_id,
                    display_name=display_name,
                    email=email,
                    home_city_id=None,
                    home_currency="USD",
                    locale="en",
                    budget_band="mid",
                    travel_style="comfort",
                    traveller_type="friends",
                    segment="light",
                    status="active",
                )
                db.add(new_user)
                db.commit()

    elif event_type == "user.updated":
        clerk_user_id = event_data.get("id")
        if clerk_user_id:
            user = db.query(User).filter(User.user_id == clerk_user_id).first()
            if user:
                first_name = event_data.get("first_name", "") or ""
                last_name = event_data.get("last_name", "") or ""
                email_addresses = event_data.get("email_addresses", [])
                if email_addresses:
                    user.email = email_addresses[0].get("email_address")
                user.display_name = f"{first_name} {last_name}".strip() or user.email.split("@")[0]
                db.commit()

    return {"received": True}

@router.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns the current user's profile + preferences."""
    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    return {
        "usrId": current_user.user_id,
        "displayName": current_user.display_name,
        "email": current_user.email,
        "budgetBand": current_user.budget_band,
        "travelStyle": current_user.travel_style,
        "travellerType": current_user.traveller_type,
        "status": current_user.status,
        "preferences": {
            "preferredLanguages": prefs.preferred_languages.split(",") if prefs and prefs.preferred_languages else [],
            "interests": prefs.interests.split(",") if prefs and prefs.interests else [],
            "pace": prefs.pace if prefs else None,
            "age": prefs.age if prefs else None,
            "ageGroup": prefs.age_group if prefs else None,
        } if prefs else None
    }

@router.post("/api/auth/preferences")
async def save_preferences(
    body: PreferencesInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Saves age, languages, and interests from sign-up.
    Computes age_group: 18-24, 25-30, 31-40, 40+
    """
    def compute_age_group(age: int) -> str:
        if age <= 24: return "18-24"
        if age <= 30: return "25-30"
        if age <= 40: return "31-40"
        return "40+"

    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    if not prefs:
        prefs = UserPreference(
            preference_id=generate_id("prf_"),
            user_id=current_user.user_id,
        )
        db.add(prefs)

    prefs.preferred_languages = ",".join(body.languages)
    prefs.interests = ",".join(body.interests)
    prefs.pace = body.pace or "relaxed"
    prefs.age = body.age
    prefs.age_group = compute_age_group(body.age)

    db.commit()
    return {"saved": True, "ageGroup": prefs.age_group}

@router.patch("/api/auth/profile")
async def update_profile(
    body: ProfileUpdateInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Partial update of user profile. Only updates fields that are provided."""
    if body.displayName is not None:
        current_user.display_name = body.displayName
    if body.travelStyle is not None:
        current_user.travel_style = body.travelStyle
    if body.budgetBand is not None:
        current_user.budget_band = body.budgetBand
    if body.homeCityId is not None:
        current_user.home_city_id = body.homeCityId
    db.commit()
    return {"updated": True}
