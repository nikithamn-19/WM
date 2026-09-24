from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, not_
from ..database import get_db
from ..models import User, UserPreference, Trip, TripMember, TourGuide, City, Country, Itinerary, ItineraryItem
from ..schemas.matching import GroupMatchInput, GuideMatchInput
from ..services.clerk_auth import get_current_user
from ..ai.matching.group_compatibility_scorer import compute_group_compatibility
from ..ai.matching.guide_compatibility_scorer import compute_guide_compatibility

router = APIRouter()

@router.post("/api/solo-matching/groups")
async def match_groups(
    body: Optional[GroupMatchInput] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deterministically scores and hierarchically ranks public group trips from the database
    against the current user's profile and active search criteria.
    Dynamically includes PS-11 dataset trips and any newly created public trips.
    """
    body = body or GroupMatchInput()
    
    # 1. Fetch user's travel preferences
    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    
    user_interests = [i.strip() for i in (prefs.interests or "").split(",") if i.strip()] if prefs else []
    if not user_interests:
        user_interests = ["beach", "foodie", "culture", "adventure", "nature"]
        
    user_languages = [l.strip() for l in (prefs.preferred_languages or "").split(",") if l.strip()] if prefs else []
    if not user_languages:
        user_languages = [current_user.locale or "en"]
        
    user_age_group = prefs.age_group if prefs and prefs.age_group else getattr(current_user, "age_group", "25-34") or "25-34"
    user_travel_style = current_user.travel_style or "cultural"

    # 2. Exclude trips user already owns or belongs to
    already_member_subq = db.query(TripMember.trip_id).filter(TripMember.user_id == current_user.user_id)
    
    trip_query = db.query(Trip).filter(
        Trip.owner_user_id != current_user.user_id,
        not_(Trip.trip_id.in_(already_member_subq)),
        Trip.status != "cancelled",
        or_(Trip.visibility != "private", Trip.visibility.is_(None))
    )
    
    # Handle trip modes cleanly (WanderMatch defaults to Mode NA Consensus when mode is null)
    if body.mode and body.mode != "All":
        if body.mode == "Mode NA":
            trip_query = trip_query.filter(or_(Trip.mode == "Mode NA", Trip.mode.is_(None)))
        elif body.mode == "Mode A":
            trip_query = trip_query.filter(Trip.mode == "Mode A")
        else:
            trip_query = trip_query.filter(Trip.mode == body.mode)

    trips = trip_query.all()
    
    # 3. Pre-fetch cities and countries for fast resolution
    cities_map = {c.city_id: c for c in db.query(City).all()}
    countries_map = {c.country_id: c.name for c in db.query(Country).all()}

    results = []
    dest_query = (body.destination or "").strip()

    for trip in trips:
        city = cities_map.get(trip.destination_city_id)
        city_name = city.name if city else (trip.destination_city_id or "Unknown")
        state_name = city.state if city else ""
        region_name = city.region if city else ""
        country_name = countries_map.get(city.country_id, "") if city and city.country_id else ""
        
        # Members and member preferences
        members = db.query(TripMember).filter(TripMember.trip_id == trip.trip_id).all()
        member_uids = [m.user_id for m in members]
        if trip.owner_user_id and trip.owner_user_id not in member_uids:
            member_uids.append(trip.owner_user_id)
            
        m_prefs = db.query(UserPreference).filter(UserPreference.user_id.in_(member_uids)).all() if member_uids else []
        
        trip_interests = sorted(list(set(
            i.strip() for p in m_prefs if p and p.interests
            for i in p.interests.split(",") if i.strip()
        )))
        trip_languages = sorted(list(set(
            l.strip() for p in m_prefs if p and p.preferred_languages
            for l in p.preferred_languages.split(",") if l.strip()
        )))
        trip_age_groups = [p.age_group for p in m_prefs if p and p.age_group]
        
        # Itinerary keywords
        itinerary = db.query(Itinerary).filter(Itinerary.trip_id == trip.trip_id, Itinerary.is_active == True).first()
        itinerary_keywords = []
        if itinerary:
            items = db.query(ItineraryItem).filter(ItineraryItem.itinerary_id == itinerary.itinerary_id).all()
            for itm in items:
                if itm.title:
                    itinerary_keywords.append(itm.title)
                if itm.item_type:
                    itinerary_keywords.append(itm.item_type)

        match_res = compute_group_compatibility(
            user_interests=user_interests,
            user_languages=user_languages,
            user_age_group=user_age_group,
            trip_start=trip.start_date,
            trip_end=trip.end_date,
            trip_member_interests=trip_interests,
            trip_member_languages=trip_languages,
            trip_member_age_groups=trip_age_groups,
            destination_query=dest_query,
            trip_city_name=city_name,
            trip_state_name=state_name,
            trip_region_name=region_name,
            trip_country_name=country_name,
            trip_title=trip.title,
            trip_type=trip.trip_type or "friends",
            itinerary_keywords=itinerary_keywords,
            filter_interest=body.interest or "",
            filter_date=body.dateFilter or "",
            user_travel_style=user_travel_style,
        )

        dest_match_rank = 1 if match_res["destinationMatch"] else 0
        
        # Friendly display destination
        loc_parts = [city_name]
        if state_name and state_name != city_name:
            loc_parts.append(state_name)
        if country_name:
            loc_parts.append(country_name)
        display_city = ", ".join(loc_parts)
        
        results.append({
            "trip": {
                "trpId": trip.trip_id,
                "title": trip.title,
                "destinationCity": display_city,
                "startDate": str(trip.start_date) if trip.start_date else "",
                "endDate": str(trip.end_date) if trip.end_date else "",
                "mode": trip.mode or "Mode NA",
                "partySize": trip.party_size or 4,
                "memberCount": max(1, len(members)),
                "status": trip.status,
            },
            "compatibilityScore": match_res["score"],
            "ageGroupMatch": match_res["ageGroupMatch"],
            "destinationMatch": match_res["destinationMatch"],
            "isExactMatch": match_res["destinationMatch"] if dest_query else False,
            "sharedLanguages": match_res["sharedLanguages"],
            "sharedInterests": match_res["sharedInterests"],
            "dateOverlapDays": match_res["dateOverlapDays"],
            "recommendationReason": match_res["recommendationReason"],
            "_destRank": dest_match_rank,
        })

    # Deterministic hierarchical sorting:
    # 1. Exact / Partial destination matches first when a search query is given
    # 2. Compatibility score descending
    # 3. Date overlap days descending
    # 4. Trip ID ascending (stable tie-breaker so ordering never jumps between scrolls/renders)
    results.sort(
        key=lambda x: (
            x["_destRank"] if dest_query else 1,
            x["compatibilityScore"],
            x["dateOverlapDays"],
            x["trip"]["trpId"]
        ),
        reverse=True
    )

    for r in results:
        r.pop("_destRank", None)
        
    return results[:30]


@router.post("/api/solo-matching/guides")
async def match_guides(
    body: Optional[GuideMatchInput] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scores and hierarchically ranks local tour guides against user preferences
    and search inputs (city, budget, specialisation, language, certification).
    """
    body = body or GuideMatchInput()
    
    prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.user_id).first()
    user_languages = [l.strip() for l in (prefs.preferred_languages or "").split(",") if l.strip()] if prefs else []
    if not user_languages:
        user_languages = [current_user.locale or "en"]
    user_interests = [i.strip() for i in (prefs.interests or "").split(",") if i.strip()] if prefs else []
    if not user_interests:
        user_interests = ["culture", "food", "heritage", "adventure"]
        
    user_max_budget = None
    if body.maxBudget:
        try:
            user_max_budget = Decimal(str(body.maxBudget).replace(",", "").replace("$", ""))
        except Exception:
            pass
    elif prefs and prefs.max_daily_budget:
        user_max_budget = prefs.max_daily_budget

    target_city = (body.city or body.destination or "").strip()
    
    # Query guides from database
    guides_query = db.query(TourGuide).filter(
        or_(TourGuide.status == "active", TourGuide.status.is_(None))
    )
    if body.certifiedOnly:
        guides_query = guides_query.filter(TourGuide.certified == True)
    if body.currency and body.currency != "All":
        guides_query = guides_query.filter(TourGuide.currency.ilike(body.currency.strip()))
        
    guides = guides_query.all()
    cities_map = {c.city_id: c for c in db.query(City).all()}
    countries_map = {c.country_id: c.name for c in db.query(Country).all()}

    results = []
    for guide in guides:
        city = cities_map.get(guide.city_id)
        guide_city_name = city.name if city else "Local Area"
        guide_state_name = city.state if city else ""
        guide_region_name = city.region if city else ""
        guide_country_name = countries_map.get(city.country_id, "") if city and city.country_id else ""
        
        guide_langs = sorted([l.strip() for l in (guide.languages or "").split(",") if l.strip()])
        
        match_result = compute_guide_compatibility(
            user_languages=user_languages,
            user_interests=user_interests,
            user_max_budget=user_max_budget,
            guide_languages=guide_langs,
            guide_specialisation=guide.specialisation or "General Guide",
            guide_secondary_specialisation=guide.secondary_specialisation,
            guide_day_rate=guide.day_rate or Decimal("100.00"),
            guide_city_name=guide_city_name,
            guide_state_name=guide_state_name,
            guide_region_name=guide_region_name,
            guide_country_name=guide_country_name,
            target_city=target_city,
            guide_rating=float(guide.rating) if guide.rating else 4.8,
            guide_certified=bool(guide.certified) if guide.certified is not None else True,
            filter_specialisation=body.specialisation or "",
            filter_language=body.language or "",
        )

        city_rank = 1 if match_result["cityMatch"] else 0
        
        loc_display = guide_city_name
        if guide_state_name and guide_state_name != guide_city_name:
            loc_display += f", {guide_state_name}"

        results.append({
            "guide": {
                "gidId": guide.guide_id,
                "displayName": guide.display_name,
                "cityId": guide.city_id,
                "cityName": loc_display,
                "specialisation": guide.specialisation or "General Guide",
                "secondarySpecialisation": guide.secondary_specialisation,
                "languages": guide_langs,
                "dayRate": str(guide.day_rate) if guide.day_rate else "100.00",
                "halfDayRate": str(guide.half_day_rate) if guide.half_day_rate else "60.00",
                "currency": guide.currency or "USD",
                "rating": float(guide.rating) if guide.rating else 4.8,
                "reviewCount": guide.review_count or 12,
                "certified": bool(guide.certified) if guide.certified is not None else True,
                "bio": guide.bio or f"Experienced local tour guide in {loc_display}.",
            },
            "compatibilityScore": match_result["score"],
            "cityMatch": match_result["cityMatch"],
            "isExactMatch": match_result["cityMatch"] if target_city else False,
            "sharedLanguages": match_result["sharedLanguages"],
            "sharedSpecialisations": match_result["sharedSpecialisations"],
            "withinBudget": match_result["withinBudget"],
            "recommendationReason": match_result["recommendationReason"],
            "_cityRank": city_rank,
        })

    # Deterministic hierarchical sorting:
    # 1. Target city / state / region match first (if target_city specified)
    # 2. Compatibility score descending
    # 3. Rating descending
    # 4. Guide ID tie breaker
    results.sort(
        key=lambda x: (
            x["_cityRank"] if target_city else 1,
            x["compatibilityScore"],
            x["guide"]["rating"],
            x["guide"]["gidId"]
        ),
        reverse=True
    )

    for r in results:
        r.pop("_cityRank", None)

    return results[:30]
