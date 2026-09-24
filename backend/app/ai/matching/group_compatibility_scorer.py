from datetime import date

def compute_group_compatibility(
    user_interests: list[str],
    user_languages: list[str],
    user_age_group: str,
    trip_start: date,
    trip_end: date,
    trip_member_interests: list[str],   # aggregated from all trip members
    trip_member_languages: list[str],   # aggregated
    trip_member_age_groups: list[str],  # list of all members' age groups
) -> dict:
    """
    Returns:
    {
        "score": int (0-100),
        "ageGroupMatch": bool,
        "sharedLanguages": list[str],   # BCP-47 codes
        "sharedInterests": list[str],
        "dateOverlapDays": int,
        "breakdown": {
            "interestPoints": int,
            "languagePoints": int,
            "datePoints": int,
            "ageGroupPoints": int,
        }
    }
    """
    # Interest overlap (Jaccard-style, max 40 points)
    user_set = set(user_interests)
    trip_set = set(trip_member_interests)
    shared_interests = list(user_set & trip_set)
    union = user_set | trip_set
    interest_points = int((len(shared_interests) / len(union)) * 40) if union else 0
    
    # Language overlap (max 30 points)
    user_lang_set = set(user_languages)
    trip_lang_set = set(trip_member_languages)
    shared_languages = list(user_lang_set & trip_lang_set)
    language_points = int((len(shared_languages) / len(user_lang_set)) * 30) if user_lang_set else 0
    
    # Date overlap (max 20 points)
    today = date.today()
    overlap_start = max(today, trip_start)
    overlap_end = trip_end
    overlap_days = max(0, (overlap_end - overlap_start).days)
    trip_duration = max(1, (trip_end - trip_start).days)
    date_points = min(20, int((overlap_days / trip_duration) * 20))
    
    # Age group match (10 points)
    age_group_match = user_age_group in trip_member_age_groups if trip_member_age_groups else True
    age_group_points = 10 if age_group_match else 0
    
    total_score = min(100, interest_points + language_points + date_points + age_group_points)
    
    return {
        "score": total_score,
        "ageGroupMatch": age_group_match,
        "sharedLanguages": shared_languages,
        "sharedInterests": shared_interests,
        "dateOverlapDays": overlap_days,
        "breakdown": {
            "interestPoints": interest_points,
            "languagePoints": language_points,
            "datePoints": date_points,
            "ageGroupPoints": age_group_points,
        }
    }
