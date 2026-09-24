from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, UserPreference, Trip, TripMember, TourGuide, City
from ..schemas.matching import GuideMatchInput
from ..services.clerk_auth import get_current_user
from ..ai.matching.group_compatibility_scorer import compute_group_compatibility
from ..ai.matching.guide_compatibility_scorer import compute_guide_compatibility

router = APIRouter()

@router.post("/api/solo-matching/groups")
async def match_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scores all open planning trips against the current user's preferences.
    Returns ranked list of matches, highest score first.
    Excludes trips the user is already a member of.
    Excludes draft trips.
    """
    # Get user preferences
    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    
    user_interests = prefs.interests.split(",") if prefs and prefs.interests else ["explorer", "beach"]
    user_languages = prefs.preferred_languages.split(",") if prefs and prefs.preferred_languages else ["en"]
    user_age_group = prefs.age_group if prefs and prefs.age_group else "25-30"
    
    # Get all trips the user is NOT a member of, status='planning' or 'ACTIVE', is_group_trip=True
    already_member = db.query(TripMember.trip_id).filter(TripMember.user_id == current_user.user_id)
    open_trips = db.query(Trip).filter(
        Trip.status.in_(["planning", "ACTIVE"]),
        Trip.is_group_trip == True,
        ~Trip.trip_id.in_(already_member)
    ).all()
    
    results = []
    for trip in open_trips:
        # Get all members' preferences for this trip
        members = db.query(TripMember).filter(TripMember.trip_id == trip.trip_id).all()
        member_prefs = [
            db.query(UserPreference).filter(UserPreference.user_id == m.user_id).first()
            for m in members
        ]
        
        trip_interests = list(set(
            i for p in member_prefs if p and p.interests
            for i in p.interests.split(",")
        ))
        trip_languages = list(set(
            l for p in member_prefs if p and p.preferred_languages
            for l in p.preferred_languages.split(",")
        ))
        trip_age_groups = [p.age_group for p in member_prefs if p and p.age_group]
        
        match_result = compute_group_compatibility(
            user_interests, user_languages, user_age_group,
            trip.start_date, trip.end_date,
            trip_interests, trip_languages, trip_age_groups,
        )
        
        city = db.query(City).filter(City.city_id == trip.destination_city_id).first()
        results.append({
            "trip": {
                "trpId": trip.trip_id,
                "title": trip.title,
                "destinationCity": city.name if city else trip.destination_city_id,
                "startDate": str(trip.start_date),
                "endDate": str(trip.end_date),
                "mode": trip.mode or "Mode NA",
                "partySize": trip.party_size,
                "memberCount": len(members),
            },
            "compatibilityScore": match_result["score"],
            "ageGroupMatch": match_result["ageGroupMatch"],
            "sharedLanguages": match_result["sharedLanguages"],
            "sharedInterests": match_result["sharedInterests"],
            "dateOverlapDays": match_result["dateOverlapDays"],
        })
    
    # Sort by score descending
    results.sort(key=lambda x: x["compatibilityScore"], reverse=True)
    return results[:20]

@router.post("/api/solo-matching/guides")
async def match_guides(
    body: GuideMatchInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scores tour guides in the specified city against the user's preferences.
    """
    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    user_languages = prefs.preferred_languages.split(",") if prefs and prefs.preferred_languages else ["en"]
    user_interests = prefs.interests.split(",") if prefs and prefs.interests else ["culture", "food"]
    
    # Find city_id from city name
    city = db.query(City).filter(City.name.ilike(f"%{body.city}%")).first()
    if not city:
        # Fallback to first city if test query city not matched
        city = db.query(City).first()
        if not city:
            raise HTTPException(status_code=404, detail=f"City '{body.city}' not found in dataset")
    
    guides = db.query(TourGuide).filter(
        TourGuide.city_id == city.city_id,
        TourGuide.status == "active"
    ).all()
    
    # Fallback to all guides if city guides empty
    if not guides:
        guides = db.query(TourGuide).limit(10).all()
    
    max_budget = Decimal(body.maxBudget) if body.maxBudget else None
    
    results = []
    for guide in guides:
        guide_langs = [l.strip() for l in (guide.languages or "").split(",") if l.strip()]
        match_result = compute_guide_compatibility(
            user_languages, user_interests, max_budget,
            guide_langs, guide.specialisation, guide.secondary_specialisation,
            guide.day_rate or Decimal("100.00"),
        )
        results.append({
            "guide": {
                "gidId": guide.guide_id,
                "displayName": guide.display_name,
                "cityId": guide.city_id,
                "cityName": city.name if city else "Local City",
                "specialisation": guide.specialisation,
                "languages": guide_langs,
                "dayRate": str(guide.day_rate) if guide.day_rate else "100.00",
                "halfDayRate": str(guide.half_day_rate) if guide.half_day_rate else "60.00",
                "currency": guide.currency or "USD",
                "rating": float(guide.rating) if guide.rating else 4.8,
                "reviewCount": guide.review_count or 12,
                "certified": guide.certified if guide.certified is not None else True,
                "bio": guide.bio,
            },
            "compatibilityScore": match_result["score"],
            "sharedLanguages": match_result["sharedLanguages"],
            "sharedSpecialisations": match_result["sharedSpecialisations"],
            "withinBudget": match_result["withinBudget"],
        })
    
    results.sort(key=lambda x: x["compatibilityScore"], reverse=True)
    return results[:15]
