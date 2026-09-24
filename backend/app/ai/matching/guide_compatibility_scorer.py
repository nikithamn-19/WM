from decimal import Decimal

def compute_guide_compatibility(
    user_languages: list[str],
    user_interests: list[str],
    user_max_budget: Decimal | None,
    guide_languages: list[str],   # comma-sep BCP-47 from tour_guides.languages
    guide_specialisation: str,
    guide_secondary_specialisation: str | None,
    guide_day_rate: Decimal,
) -> dict:
    """
    Returns:
    {
        "score": int (0-100),
        "sharedLanguages": list[str],
        "sharedSpecialisations": list[str],
        "withinBudget": bool
    }
    """
    guide_lang_set = set(guide_languages)
    user_lang_set = set(user_languages)
    shared_languages = list(user_lang_set & guide_lang_set)
    language_points = int((len(shared_languages) / max(1, len(user_lang_set))) * 50)
    
    guide_specs = {guide_specialisation} if guide_specialisation else set()
    if guide_secondary_specialisation:
        guide_specs.add(guide_secondary_specialisation)
    shared_specs = list(set(user_interests) & guide_specs)
    spec_points = 30 if shared_specs else 0
    
    within_budget = True
    budget_points = 20
    if user_max_budget is not None and guide_day_rate and guide_day_rate > user_max_budget:
        within_budget = False
        budget_points = 0
    
    total_score = min(100, language_points + spec_points + budget_points)
    
    return {
        "score": total_score,
        "sharedLanguages": shared_languages,
        "sharedSpecialisations": shared_specs,
        "withinBudget": within_budget,
    }
