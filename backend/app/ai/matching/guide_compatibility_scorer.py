from decimal import Decimal
from typing import Optional

def _norm_lang(l: str) -> str:
    return l.strip().lower().split('-')[0] if l else ""

def _extract_spec_roots(term: str) -> set[str]:
    t = (term or "").lower().strip()
    roots = set()
    parts = t.replace('-', '_').split('_')
    for p in parts:
        p = p.strip()
        if not p:
            continue
        roots.add(p)
        if p in ('food', 'foodie', 'culinary', 'dining', 'cooking', 'street', 'fine'):
            roots.add('food')
        if p in ('culture', 'heritage', 'history', 'temple', 'monuments', 'ruins', 'fort', 'architecture'):
            roots.add('heritage')
            roots.add('culture')
        if p in ('wildlife', 'safari', 'birding', 'animals', 'sanctuary', 'nature'):
            roots.add('wildlife')
            roots.add('nature')
        if p in ('adventure', 'trek', 'trekking', 'hiking', 'rafting', 'mountain', 'water'):
            roots.add('adventure')
            roots.add('trekking')
        if p in ('shopping', 'craft', 'bazaar', 'textiles', 'markets'):
            roots.add('shopping')
        if p in ('accessibility', 'accessible', 'special'):
            roots.add('accessibility')
    return roots

def compute_guide_compatibility(
    user_languages: list[str],
    user_interests: list[str],
    user_max_budget: Optional[Decimal],
    guide_languages: list[str],
    guide_specialisation: str,
    guide_secondary_specialisation: Optional[str],
    guide_day_rate: Decimal,
    guide_city_name: str = "",
    guide_state_name: str = "",
    guide_region_name: str = "",
    guide_country_name: str = "",
    target_city: str = "",
    guide_rating: float = 4.8,
    guide_certified: bool = True,
    filter_specialisation: str = "",
    filter_language: str = "",
) -> dict:
    """
    Computes deterministic, hierarchical compatibility between a traveler and a local tour guide.
    Supports PS-11 dataset and new verified guides.
    """
    # 1. City / Destination Match (max 30 points)
    t_city = (target_city or "").strip().lower()
    g_city = (guide_city_name or "").strip().lower()
    g_state = (guide_state_name or "").strip().lower()
    g_region = (guide_region_name or "").strip().lower()
    g_country = (guide_country_name or "").strip().lower()
    guide_loc_pool = f"{g_city} {g_state} {g_region} {g_country}"

    city_match = True
    if t_city:
        if (t_city in g_city or t_city in g_state or t_city in g_region or 
            t_city in g_country or g_city in t_city):
            city_points = 30
            city_match = True
        elif any(part in guide_loc_pool for part in t_city.split() if len(part) >= 3):
            city_points = 20
            city_match = True
        else:
            city_points = 0
            city_match = False
    else:
        city_points = 25
        city_match = True

    # 2. Specialisation & Interests Match (max 35 points)
    user_roots = set()
    for u in user_interests:
        user_roots.update(_extract_spec_roots(u))

    guide_roots = set()
    if guide_specialisation:
        guide_roots.update(_extract_spec_roots(guide_specialisation))
    if guide_secondary_specialisation:
        guide_roots.update(_extract_spec_roots(guide_secondary_specialisation))

    shared_roots = sorted(user_roots & guide_roots)
    shared_display = [guide_specialisation.title()] if guide_specialisation else []
    if guide_secondary_specialisation and guide_secondary_specialisation.title() not in shared_display:
        shared_display.append(guide_secondary_specialisation.title())

    if filter_specialisation and filter_specialisation != "All":
        f_roots = _extract_spec_roots(filter_specialisation)
        if f_roots & guide_roots:
            if filter_specialisation.title() not in shared_display:
                shared_display.insert(0, filter_specialisation.title())

    if shared_roots:
        spec_points = min(35, 20 + len(shared_roots) * 7)
    else:
        spec_points = 18  # Certified local expert baseline

    # 3. Language Compatibility (max 20 points)
    user_langs = sorted(set(_norm_lang(l) for l in user_languages if l.strip()))
    guide_langs = sorted(set(_norm_lang(l) for l in guide_languages if l.strip()))
    
    shared_langs = sorted(set(user_langs) & set(guide_langs))
    shared_lang_display = [l.upper() for l in shared_langs if l]

    if filter_language:
        fl = _norm_lang(filter_language)
        if fl in guide_langs:
            lang_points = 20
            if filter_language.upper() not in shared_lang_display:
                shared_lang_display.insert(0, filter_language.upper())
        else:
            lang_points = 10
    elif shared_lang_display:
        lang_points = min(20, 12 + len(shared_lang_display) * 4)
    elif "en" in user_langs or "en" in guide_langs:
        shared_lang_display = ["EN"]
        lang_points = 15
    else:
        lang_points = 8

    # 4. Budget & Rate Check (max 10 points)
    within_budget = True
    if user_max_budget is not None and guide_day_rate:
        if guide_day_rate <= user_max_budget:
            budget_points = 10
            within_budget = True
        elif guide_day_rate <= user_max_budget * Decimal("1.25"):
            budget_points = 5
            within_budget = False
        else:
            budget_points = 0
            within_budget = False
    else:
        budget_points = 10
        within_budget = True

    # 5. Quality & Certification (max 5 points)
    quality_points = 0
    if guide_certified:
        quality_points += 2
    if guide_rating and guide_rating >= 4.5:
        quality_points += 3
    elif guide_rating and guide_rating >= 4.0:
        quality_points += 2

    raw_score = city_points + spec_points + lang_points + budget_points + quality_points
    total_score = min(100, max(20, raw_score))

    # Construct recommendation explanation
    reasons = []
    if t_city and city_match:
        loc_display = guide_city_name
        if guide_state_name and guide_state_name != guide_city_name:
            loc_display += f", {guide_state_name}"
        reasons.append(f"Located in {loc_display}")
    if guide_certified:
        reasons.append("Certified guide")
    if shared_display:
        reasons.append(f"specializes in {', '.join(shared_display[:2])}")
    if shared_lang_display:
        reasons.append(f"speaks {', '.join(shared_lang_display)}")
    if within_budget:
        reasons.append("within your budget")

    if reasons:
        rec_reason = f"{total_score}% match: " + "; ".join(reasons) + "."
    else:
        rec_reason = f"{total_score}% match based on city and guide specialisation."

    return {
        "score": total_score,
        "cityMatch": city_match,
        "sharedLanguages": shared_lang_display,
        "sharedSpecialisations": shared_display,
        "withinBudget": within_budget,
        "recommendationReason": rec_reason,
        "breakdown": {
            "cityPoints": city_points,
            "specPoints": spec_points,
            "langPoints": lang_points,
            "budgetPoints": budget_points,
            "qualityPoints": quality_points,
        }
    }
