from datetime import date
from typing import Optional

def _normalize_lang(l: str) -> str:
    """Normalize language code to base tag e.g. en-IN -> en."""
    return l.strip().lower().split('-')[0] if l else ""

def _extract_interest_roots(term: str) -> set[str]:
    """
    Extracts semantic root tokens from an interest tag.
    Bridges PS-11 underscore tags (e.g. food_street, heritage_fort, beach_quiet)
    with frontend profile tags (foodie, culture, beach, adventure).
    """
    t = (term or "").lower().strip()
    roots = set()
    parts = t.replace('-', '_').split('_')
    for p in parts:
        p = p.strip()
        if not p:
            continue
        roots.add(p)
        if p in ('foodie', 'culinary', 'dining', 'cooking', 'street', 'fine', 'market'):
            roots.add('food')
        if p in ('culture', 'heritage', 'history', 'temple', 'monuments', 'ruins', 'fort', 'stepwell'):
            roots.add('heritage')
            roots.add('culture')
        if p in ('beach', 'coastal', 'sea', 'ocean', 'quiet', 'active'):
            roots.add('beach')
        if p in ('adventure', 'trek', 'trekking', 'hiking', 'rafting', 'cycle', 'water'):
            roots.add('adventure')
        if p in ('wildlife', 'safari', 'birding', 'animals', 'sanctuary'):
            roots.add('wildlife')
        if p in ('nature', 'hill', 'desert', 'waterfall', 'lake', 'mountain'):
            roots.add('nature')
        if p in ('shopping', 'craft', 'bazaar', 'textiles', 'mall'):
            roots.add('shopping')
        if p in ('wellness', 'yoga', 'ayur', 'spa', 'meditation'):
            roots.add('wellness')
        if p in ('nightlife', 'bar', 'club', 'party', 'live'):
            roots.add('nightlife')
        if p in ('religious', 'pilgrim', 'ghats', 'spiritual'):
            roots.add('spiritual')
        if p in ('museum', 'art', 'science'):
            roots.add('museum')
    return roots

def _matches_date_filter(trip_start: Optional[date], trip_end: Optional[date], trip_title: str, filter_date: str) -> bool:
    """Evaluates if trip date aligns with search query (month name, year, or ISO string)."""
    if not filter_date:
        return True
    fq = filter_date.strip().lower()
    if fq in (trip_title or "").lower():
        return True
    if not trip_start:
        return False
    start_str = str(trip_start).lower()
    end_str = str(trip_end).lower() if trip_end else ""
    if fq in start_str or fq in end_str:
        return True
    try:
        month_abbr = trip_start.strftime("%b").lower()
        month_full = trip_start.strftime("%B").lower()
        year_str = trip_start.strftime("%Y")
        month_num = trip_start.strftime("%m")
        tokens = [month_abbr, month_full, year_str, month_num, f"{month_abbr} {year_str}", f"{year_str}-{month_num}"]
        for t in tokens:
            if t in fq or fq in t:
                return True
    except Exception:
        pass
    return False

def compute_group_compatibility(
    user_interests: list[str],
    user_languages: list[str],
    user_age_group: str,
    trip_start: Optional[date],
    trip_end: Optional[date],
    trip_member_interests: list[str],
    trip_member_languages: list[str],
    trip_member_age_groups: list[str],
    destination_query: str = "",
    trip_city_name: str = "",
    trip_state_name: str = "",
    trip_region_name: str = "",
    trip_country_name: str = "",
    trip_title: str = "",
    trip_type: str = "",
    itinerary_keywords: Optional[list[str]] = None,
    filter_interest: str = "",
    filter_date: str = "",
    user_travel_style: str = "",
) -> dict:
    """
    Computes deterministic, hierarchical compatibility between a user's account preferences
    and a group trip's details. Fully supports PS-11 dataset and new public trips.
    """
    # 1. Destination Relevance (max 30 points)
    dest_q = (destination_query or "").strip().lower()
    city_str = (trip_city_name or "").strip().lower()
    state_str = (trip_state_name or "").strip().lower()
    region_str = (trip_region_name or "").strip().lower()
    country_str = (trip_country_name or "").strip().lower()
    title_str = (trip_title or "").strip().lower()
    dest_pool = f"{city_str} {state_str} {region_str} {country_str} {title_str}"

    destination_match = True
    if dest_q:
        if (dest_q in city_str or dest_q in state_str or dest_q in region_str or 
            dest_q in country_str or dest_q in title_str):
            destination_points = 30
            destination_match = True
        elif any(part in dest_pool for part in dest_q.split() if len(part) >= 3):
            destination_points = 20
            destination_match = True
        else:
            destination_points = 0
            destination_match = False
    else:
        # Default baseline when exploring without explicit destination constraint
        destination_points = 25
        destination_match = True

    # 2. Interests & Travel Style Overlap (max 35 points)
    user_roots = set()
    for u in user_interests:
        user_roots.update(_extract_interest_roots(u))
    if user_travel_style:
        user_roots.update(_extract_interest_roots(user_travel_style))

    trip_roots = set()
    for t in trip_member_interests:
        trip_roots.update(_extract_interest_roots(t))
    if trip_type:
        trip_roots.update(_extract_interest_roots(trip_type))
    if itinerary_keywords:
        for kw in itinerary_keywords:
            trip_roots.update(_extract_interest_roots(kw))

    shared_roots = sorted(user_roots & trip_roots)
    display_shared_interests = [
        r.title() for r in shared_roots 
        if r not in ('quiet', 'active', 'fine', 'live', 'street', 'hill', 'ghats')
    ]
    if not display_shared_interests and shared_roots:
        display_shared_interests = [shared_roots[0].title()]

    if filter_interest and filter_interest != "All":
        f_roots = _extract_interest_roots(filter_interest)
        if f_roots & trip_roots:
            if filter_interest.title() not in display_shared_interests:
                display_shared_interests.insert(0, filter_interest.title())

    if user_roots:
        interest_ratio = len(shared_roots) / max(1, len(user_roots))
        interest_points = min(35, max(12, int(interest_ratio * 30) + (5 if shared_roots else 0)))
    else:
        interest_points = 20

    # 3. Language Compatibility (max 20 points)
    user_base_langs = sorted(set(_normalize_lang(l) for l in user_languages if l.strip()))
    trip_base_langs = sorted(set(_normalize_lang(l) for l in trip_member_languages if l.strip()))
    
    shared_base = sorted(set(user_base_langs) & set(trip_base_langs))
    shared_languages = [l.upper() for l in shared_base if l]
    
    if not shared_languages and "en" in user_base_langs:
        shared_languages = ["EN"]
        language_points = 15
    elif shared_languages:
        language_points = min(20, 12 + int((len(shared_languages) / max(1, len(user_base_langs))) * 8))
    else:
        language_points = 8

    # 4. Age Group Match (max 10 points)
    if not trip_member_age_groups:
        age_group_match = True
        age_group_points = 10
    elif user_age_group in trip_member_age_groups:
        age_group_match = True
        age_group_points = 10
    else:
        age_group_match = False
        age_group_points = 6

    # 5. Date Overlap & Schedule Alignment (max 5 points)
    overlap_days = 0
    if trip_start and trip_end:
        today = date.today()
        overlap_start = max(today, trip_start)
        overlap_end = trip_end
        overlap_days = max(0, (overlap_end - overlap_start).days)

    if filter_date:
        if _matches_date_filter(trip_start, trip_end, trip_title, filter_date):
            date_points = 5
        else:
            date_points = 1
    else:
        date_points = 5

    # Total Score
    raw_score = destination_points + interest_points + language_points + age_group_points + date_points
    total_score = min(100, max(20, raw_score))

    # Construct explainable recommendation reason
    reasons = []
    if dest_q and destination_match:
        reasons.append(f"Destination matches '{destination_query}'")
    if display_shared_interests:
        reasons.append(f"shares {', '.join(display_shared_interests[:3])} interests")
    if shared_languages:
        reasons.append(f"fluent in {', '.join(shared_languages)}")
    if age_group_match and user_age_group:
        reasons.append(f"compatible with {user_age_group} age group")

    if reasons:
        rec_reason = f"{total_score}% match: " + "; ".join(reasons) + "."
    else:
        rec_reason = f"{total_score}% match based on destination and activity preferences."

    return {
        "score": total_score,
        "ageGroupMatch": age_group_match,
        "destinationMatch": destination_match,
        "sharedLanguages": shared_languages,
        "sharedInterests": display_shared_interests[:4],
        "dateOverlapDays": overlap_days,
        "recommendationReason": rec_reason,
        "breakdown": {
            "destinationPoints": destination_points,
            "interestPoints": interest_points,
            "languagePoints": language_points,
            "ageGroupPoints": age_group_points,
            "datePoints": date_points,
        }
    }
