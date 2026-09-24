"""Blended plan generator: reconciles typed objections into exactly ONE common-ground compromise."""

from decimal import Decimal
import re
from typing import Any, Dict, List

from backend.ai.core.hard_constraint_validator import validate_plan
from backend.ai.llm.client import safe_llm_call
from backend.ai.llm.prompts import BLEND_SYSTEM_PROMPT


def _synthesize_compromise_offline(
    original_title: str,
    original_rationale: str,
    objections: List[str],
    destination: str,
    currency: str = "USD",
) -> Dict[str, Any]:
    """
    Intelligent semantic compromise synthesizer used when LLM is offline or for instant fallback.
    Maps conflicting desires into concrete, real-world compromise activities.
    """
    all_text = f"{original_title} {original_rationale} {' '.join(objections)}".lower()
    is_goa = "goa" in destination.lower() or "baga" in all_text or "anjuna" in all_text

    # 1. Beach/Water + Amusement Park / Thrill Rides -> Waterpark
    has_water = any(w in all_text for w in ["beach", "coast", "shore", "ocean", "sea", "sunbathing", "swim"])
    has_amusement = any(w in all_text for w in ["amusement", "theme park", "thrill", "roller coaster", "rides", "waterpark"])
    if has_water and has_amusement:
        title = "Splashdown Waterpark & Slide Arena (Anjuna)" if is_goa else f"{destination} Splash & Thrill Waterpark"
        return {
            "title": title,
            "rationale": "Reconciles beach leisure and amusement park desires by combining sun-soaked lagoon pools and lazy rivers with high-speed thrill slides and wave pools.",
            "entity_type": "poi",
            "entity_id": "poi_waterpark_adventure",
            "cost_delta": "8.00",
            "currency": currency,
        }

    # 2. Beach + Nightlife / Music / Party -> Silent Headphone Beach Club
    has_party = any(w in all_text for w in ["party", "club", "dj", "nightclub", "dance", "rave"])
    if has_water and has_party:
        title = "Silent Noise Headphone Beach Party (Palolem Beach)" if is_goa else f"{destination} Oceanfront Sunset Silent Lounge"
        return {
            "title": title,
            "rationale": "Combines open-air beach breezes and ocean scenery with multi-channel wireless headphone dancing, letting partygoers dance while others lounge quietly by the shore.",
            "entity_type": "poi",
            "entity_id": "poi_silent_beach_club",
            "cost_delta": "10.00",
            "currency": currency,
        }

    # 3. Deep Water / Scuba / Snorkel + Non-swimmer / Fear of water -> Glass-Bottom Boat & Coral Deck
    has_fear_water = any(w in all_text for w in ["can't swim", "cannot swim", "non swimmer", "fear of water", "scared of water"])
    if has_fear_water or (has_water and "boat" in all_text):
        title = "Grand Island Glass-Bottom Dolphin Cruise & Reef Deck" if is_goa else f"{destination} Glass-Bottom Catamaran Marine Tour"
        return {
            "title": title,
            "rationale": "Allows non-swimmers to observe coral reefs and marine life safely from dry glass-bottom viewing decks while others can snorkel and swim from the aft platform.",
            "entity_type": "poi",
            "entity_id": "poi_glass_bottom_cruise",
            "cost_delta": "12.00",
            "currency": currency,
        }

    # 4. Meat / Seafood BBQ + Vegan / Vegetarian -> Fusion Global Bistro
    has_meat = any(w in all_text for w in ["seafood", "fish", "meat", "bbq", "steak", "chicken"])
    has_veg = any(w in all_text for w in ["vegan", "vegetarian", "veg", "plant based"])
    if has_meat and has_veg:
        title = "Fontainhas Latin Quarter Fusion Bistro & Vegan Goan Kitchen" if is_goa else f"{destination} Artisan Global & Farm-to-Table Bistro"
        return {
            "title": title,
            "rationale": "Bridges dietary divides by offering authentic fresh coastal catch alongside dedicated farm-to-table vegan tapas and plant-based thalis in one vibrant setting.",
            "entity_type": "poi",
            "entity_id": "poi_fusion_bistro",
            "cost_delta": "0.00",
            "currency": currency,
        }

    # 5. Trek / Hike + Injury / Tired / Spa / Relax -> Scenic Thermal Hot Springs / Nature Walk
    has_trek = any(w in all_text for w in ["trek", "hike", "summit", "climb", "mountain", "waterfall"])
    has_relax = any(w in all_text for w in ["spa", "relax", "hot springs", "massage", "thermal", "rest", "injured", "ankle", "tired"])
    if has_trek and has_relax:
        title = "Tambdi Surla Nature Stream & Ayurvedic Herbal Spa" if is_goa else f"{destination} Scenic Thermal Springs & Panoramic Foothills Walk"
        return {
            "title": title,
            "rationale": "Provides majestic natural mountain and forest scenery via flat, accessible stream-side boardwalks followed by restorative thermal hot springs soak, avoiding steep rocky trails.",
            "entity_type": "poi",
            "entity_id": "poi_thermal_nature_retreat",
            "cost_delta": "5.00",
            "currency": currency,
        }

    # 6. Nightclub / Drinking + Quiet / Nature / Scenic -> Sunset Cliffside Lounge
    has_quiet = any(w in all_text for w in ["quiet", "peaceful", "nature", "chill", "relaxing", "calm", "headache"])
    if has_party and has_quiet:
        title = "Sunset Cliffside Acoustic Lounge & Garden Deck (Vagator)" if is_goa else f"{destination} Panoramic Cliffside Sunset Lounge"
        return {
            "title": title,
            "rationale": "Offers craft cocktails and upbeat live acoustic melodies with sweeping sea views in an open-air garden terrace, striking a balance between lively energy and relaxed conversation.",
            "entity_type": "poi",
            "entity_id": "poi_cliffside_lounge",
            "cost_delta": "0.00",
            "currency": currency,
        }

    # 7. Culture / Museum + Adventure / Outdoor -> Heritage Kayak or Safari Trail
    has_culture = any(w in all_text for w in ["museum", "history", "temple", "monument", "culture", "fort", "church"])
    has_outdoor = any(w in all_text for w in ["outdoor", "nature", "adventure", "kayak", "jeep", "safari", "bike", "cycling"])
    if has_culture and has_outdoor:
        title = "Reis Magos Coastal Fort & Mangrove Kayak Trail" if is_goa else f"{destination} Open-Air Heritage Fort & River Kayak Adventure"
        return {
            "title": title,
            "rationale": "Combines historic architectural exploration of a coastal fortress with an active outdoor paddle through serene river mangrove waterways.",
            "entity_type": "poi",
            "entity_id": "poi_heritage_kayak_adventure",
            "cost_delta": "6.00",
            "currency": currency,
        }

    # 8. Shopping / Market + Sightseeing / Beach -> Artisan Flea Market on Promenade
    has_shop = any(w in all_text for w in ["shopping", "shop", "market", "bazaar", "souvenirs"])
    if has_shop:
        title = "Anjuna Sunset Flea Market & Ocean Promenade" if is_goa else f"{destination} Coastal Artisan Market & Promenade"
        return {
            "title": title,
            "rationale": "Combines vibrant open-air handicraft shopping and live street performances directly alongside a scenic sunset coastal promenade.",
            "entity_type": "poi",
            "entity_id": "poi_artisan_market_walk",
            "cost_delta": "0.00",
            "currency": currency,
        }

    # 9. Adrenaline / Karting / Thrill + Spectator / Chill -> Trackside Club & Karting
    has_thrill_alone = any(w in all_text for w in ["karting", "racing", "zipline", "bungee", "atv", "quad"])
    if has_thrill_alone:
        title = "Arpora Trackside Cafe & Outdoor Go-Karting Arena" if is_goa else f"{destination} Adventure Sports Park & Panorama Deck"
        return {
            "title": title,
            "rationale": "Features competitive multi-turn outdoor racing tracks for adrenaline enthusiasts alongside shaded trackside cafe lounges with panoramic spectator viewing.",
            "entity_type": "poi",
            "entity_id": "poi_trackside_karting",
            "cost_delta": "15.00",
            "currency": currency,
        }

    # 10. Competing Dining / Cuisine Styles (e.g. North Indian vs Japanese Ramen, Italian vs Sushi)
    has_food = any(w in all_text for w in ["dinner", "lunch", "food", "restaurant", "cafe", "cuisine", "eat", "curry", "ramen", "indian", "japanese", "pasta", "sushi", "tacos", "bbq", "noodles"])
    if has_food:
        if any(c in all_text for c in ["indian", "curry", "tandoor", "naan"]) and any(c in all_text for c in ["ramen", "japanese", "sushi", "udon"]):
            title = f"{destination} Asian Spice Food Market & Curry Ramen Hall" if destination else "Asian Spice Food Market & Curry Ramen Hall"
            return {
                "title": title,
                "rationale": "Bridges North Indian and Japanese cravings at a vibrant communal food market offering steaming Japanese curry ramen and authentic tandoori skewers at the same shared dining table.",
                "entity_type": "poi",
                "entity_id": "poi_curry_ramen_hall",
                "cost_delta": "0.00",
                "currency": currency,
            }
        else:
            title = f"{destination} Artisanal Night Market & Multi-Kitchen Food Hall" if destination else "Artisanal Night Market & Multi-Kitchen Food Hall"
            return {
                "title": title,
                "rationale": "Resolves divergent dining cravings at an artisanal food market featuring dedicated micro-kitchens for each member's preferred cuisine around a shared social table.",
                "entity_type": "poi",
                "entity_id": "poi_gourmet_food_hall",
                "cost_delta": "0.00",
                "currency": currency,
            }

    # 11. Dynamic Semantic Extraction for other novel combinations
    first_obj = objections[0] if objections else "group preference adjustments"
    clean_obj = re.sub(r"^(?:i\s+prefer|let'?s\s+do|lets\s+go\s+to|i\s+want|want|would\s+rather|how\s+about|what\s+about)\s*", "", first_obj, flags=re.I).strip(". ")
    clean_orig = re.sub(r"^(?:day|visit|tour|trip)\s*", "", original_title, flags=re.I).strip()

    title = f"{destination} {clean_orig} & {clean_obj.title()} Fusion" if destination else f"{clean_orig} & {clean_obj.title()} Experience"
    return {
        "title": title[:55],
        "rationale": f"Balanced compromise coordinating '{original_title}' with '{clean_obj}', satisfying both distinct preferences in a unified plan.",
        "entity_type": "poi",
        "entity_id": "poi_blended_compromise",
        "cost_delta": "0.00",
        "currency": currency,
    }


def generate_blended_plan(
    current_proposal: Dict[str, Any],
    no_vote_comments: List[Dict[str, Any]],
    itinerary_item: Dict[str, Any],
    trip_context: Dict[str, Any],
    current_round: int = 1,
) -> Dict[str, Any]:
    """
    Generates EXACTLY ONE blended compromise plan incorporating NO objections.
    Validates against hard constraints and raises ValueError if unable to satisfy constraints after retry.
    """
    destination = trip_context.get("destination_city", trip_context.get("destination", "Destination"))
    currency = current_proposal.get("currency", itinerary_item.get("currency", "USD"))

    objections = [
        str(c.get("comment", "")).strip()
        for c in no_vote_comments
        if str(c.get("comment", "")).strip()
    ]

    comments_block = "\n".join(f"- {c}" for c in objections) if objections else "- General preference for variation"

    user_message = f"""
Current proposed activity: "{current_proposal.get('title', 'Activity')}"
Rationale: {current_proposal.get('rationale', 'No rationale provided')}
Destination City: {destination}
Round: {current_round}

NO-voter objections and suggestions:
{comments_block}

CRITICAL REQUIREMENT: Recommend an ACTUAL, REAL-LIFE, EXISTING spot, restaurant, market, or attraction located in {destination} that reconciles these preferences. Do NOT invent a fictional or made-up name.
"""

    fallback_plan = _synthesize_compromise_offline(
        original_title=current_proposal.get("title", "Activity"),
        original_rationale=current_proposal.get("rationale", ""),
        objections=objections,
        destination=destination,
        currency=currency,
    )

    def _dynamic_fallback(_):
        return _synthesize_compromise_offline(
            original_title=current_proposal.get("title", "Activity"),
            original_rationale=current_proposal.get("rationale", ""),
            objections=objections,
            destination=destination,
            currency=currency,
        )

    raw_plan = safe_llm_call(
        system_prompt=BLEND_SYSTEM_PROMPT,
        user_message=user_message,
        fallback_result=fallback_plan,
        fallback_fn=_dynamic_fallback,
    )

    # Standardize plan dict structure
    if not isinstance(raw_plan, dict) or "title" not in raw_plan:
        raw_plan = fallback_plan

    # Format cost_delta as string with 2 decimals
    try:
        raw_cost = raw_plan.get("cost_delta", "0.00")
        raw_plan["cost_delta"] = f"{Decimal(str(raw_cost)):.2f}"
    except Exception:
        raw_plan["cost_delta"] = "0.00"

    raw_plan.setdefault("currency", currency)
    raw_plan.setdefault("entity_type", "poi")
    raw_plan.setdefault("entity_id", "poi_compromise")

    # Run hard constraint validation
    validation = validate_plan(raw_plan, itinerary_item, trip_context)
    constraint_status = "PASSED"

    if not validation["valid"]:
        # Retry once with explicit feedback
        retry_msg = user_message + f"\n\nPrevious attempt failed validation: {'; '.join(validation['violations'])}. Please fix."
        raw_plan = safe_llm_call(
            system_prompt=BLEND_SYSTEM_PROMPT,
            user_message=retry_msg,
            fallback_result=fallback_plan,
            fallback_fn=_dynamic_fallback,
        )
        try:
            raw_plan["cost_delta"] = f"{Decimal(str(raw_plan.get('cost_delta', '0.00'))):.2f}"
        except Exception:
            raw_plan["cost_delta"] = "0.00"
        raw_plan.setdefault("currency", currency)

        validation2 = validate_plan(raw_plan, itinerary_item, trip_context)
        if not validation2["valid"]:
            raise ValueError(f"Blended plan failed validation twice: {validation2['violations']}")
        constraint_status = "REGENERATED_ONCE"

    return {
        "action": "BLENDED",
        "blended_plan": raw_plan,
        "current_round": current_round,
        "constraint_validation": constraint_status,
    }
