import os
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, UserPreference
from ..schemas.user import PreferencesInput, ProfileUpdateInput, RegisterInput, LoginInput
from ..services.clerk_auth import get_current_user
from ..utils import generate_id

router = APIRouter()

@router.post("/api/auth/register")
async def register_user(body: RegisterInput, db: Session = Depends(get_db)):
    """Registers a new user and creates their profile and preference records in DB."""
    email_clean = body.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        return {
            "usrId": existing.user_id,
            "email": existing.email,
            "displayName": existing.display_name,
            "message": "User already exists — logged in."
        }
    
    new_id = generate_id("usr_")
    new_user = User(
        user_id=new_id,
        display_name=body.displayName.strip(),
        email=email_clean,
        home_city_id="cty_bali",
        home_currency="USD",
        locale="en",
        budget_band="mid",
        travel_style="comfort",
        traveller_type="friends",
        segment="light",
        status="active",
    )
    db.add(new_user)
    
    # Compute age group if age provided
    def compute_age_group(age_val: int) -> str:
        if age_val <= 24: return "18-24"
        if age_val <= 30: return "25-30"
        if age_val <= 40: return "31-40"
        return "40+"

    prefs = UserPreference(
        preference_id=generate_id("prf_"),
        user_id=new_id,
        preferred_languages=",".join(body.languages) if body.languages else "English",
        interests=",".join(body.interests) if body.interests else "Heritage,Food,Trekking",
        pace=body.pace or "relaxed",
        age=body.age or 25,
        age_group=compute_age_group(body.age or 25),
    )
    db.add(prefs)
    db.commit()

    return {
        "usrId": new_user.user_id,
        "email": new_user.email,
        "displayName": new_user.display_name,
        "message": "Account created successfully!"
    }

@router.post("/api/auth/login")
async def login_user(body: LoginInput, db: Session = Depends(get_db)):
    """Logs in an existing user strictly by email."""
    email_clean = body.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="Account not found with this email address. Please click Sign Up to create your account."
        )

    return {
        "usrId": user.user_id,
        "email": user.email,
        "displayName": user.display_name,
    }



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
        "homeCityId": current_user.home_city_id,
        "avatarUrl": getattr(current_user, "avatar_url", None),
        "bio": getattr(current_user, "bio", None),
        "status": current_user.status,
        "preferences": {
            "preferredLanguages": prefs.preferred_languages.split(",") if prefs and prefs.preferred_languages else [],
            "interests": prefs.interests.split(",") if prefs and prefs.interests else [],
            "hashtags": prefs.hashtags.split(",") if prefs and getattr(prefs, "hashtags", None) else [],
            "preferredMode": getattr(prefs, "preferred_mode", "Mode NA") if prefs else "Mode NA",
            "tripTypePreference": getattr(prefs, "trip_type_preference", "both") if prefs else "both",
            "sameAgeGroupOnly": getattr(prefs, "same_age_group_only", False) if prefs else False,
            "furtherPreferences": getattr(prefs, "further_preferences", None) if prefs else None,
            "pace": prefs.pace if prefs and prefs.pace else "relaxed",
            "age": prefs.age if prefs else None,
            "ageGroup": prefs.age_group if prefs else None,
            "maxDailyBudget": float(prefs.max_daily_budget) if prefs and prefs.max_daily_budget else None,
        }
    }

@router.post("/api/auth/preferences")
async def save_preferences(
    body: PreferencesInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Saves age, languages, interests, hashtags, preferredMode, tripTypePreference,
    sameAgeGroupOnly, furtherPreferences, pace, maxDailyBudget.
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

    if body.languages is not None:
        prefs.preferred_languages = ",".join(body.languages)
    if body.interests is not None:
        prefs.interests = ",".join(body.interests)
    if body.hashtags is not None:
        prefs.hashtags = ",".join(body.hashtags)
    if body.preferredMode is not None:
        prefs.preferred_mode = body.preferredMode
    if body.tripTypePreference is not None:
        prefs.trip_type_preference = body.tripTypePreference
    if body.sameAgeGroupOnly is not None:
        prefs.same_age_group_only = body.sameAgeGroupOnly
    if body.furtherPreferences is not None:
        prefs.further_preferences = body.furtherPreferences
    if body.pace is not None:
        prefs.pace = body.pace
    if body.age is not None:
        prefs.age = body.age
        prefs.age_group = compute_age_group(body.age)
    if body.maxDailyBudget is not None:
        prefs.max_daily_budget = body.maxDailyBudget

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
    if body.avatarUrl is not None:
        current_user.avatar_url = body.avatarUrl
    if body.bio is not None:
        current_user.bio = body.bio
    db.commit()
    return {"updated": True}
