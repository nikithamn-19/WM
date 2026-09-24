"""Multi-way branch grouping: clusters members into parallel branches upon persistent impasse."""

from decimal import Decimal
import re
from typing import Any, Dict, List

from backend.ai.llm.client import safe_llm_call
from backend.ai.llm.prompts import BRANCH_GROUPING_SYSTEM_PROMPT


def _cluster_holdouts_offline(holdout_members: List[Dict[str, Any]], currency: str = "USD") -> List[Dict[str, Any]]:
    """Heuristic clustering grouping members with similar preference keywords."""
    clusters: Dict[str, Dict[str, Any]] = {}

    for member in holdout_members:
        uid = member.get("user_id", "usr_unknown")
        comment = member.get("comment", "").strip()
        lower = comment.lower()

        # Extract dominant theme
        if any(w in lower for w in ["beach", "sea", "ocean", "swim", "coast"]):
            key = "beach"
            title = "Coastal Beach & Relaxation Group"
            rationale = "Members preferring open sea, coastal breezes, and sunbathing."
        elif any(w in lower for w in ["amusement", "thrill", "ride", "roller coaster", "theme park"]):
            key = "thrill"
            title = "Amusement & Thrill Adventure Group"
            rationale = "Members seeking high-energy rides and amusement attractions."
        elif any(w in lower for w in ["spa", "relax", "hot spring", "massage", "wellness"]):
            key = "wellness"
            title = "Thermal Spa & Wellness Group"
            rationale = "Members desiring peaceful restorative wellness and thermal therapies."
        elif any(w in lower for w in ["hike", "trek", "mountain", "climb"]):
            key = "hiking"
            title = "Mountain Trekking & Hiking Group"
            rationale = "Members seeking scenic trail hiking and summit exploration."
        elif any(w in lower for w in ["museum", "culture", "heritage", "history", "temple"]):
            key = "culture"
            title = "Cultural Heritage & History Group"
            rationale = "Members exploring architecture, temples, and historic exhibitions."
        else:
            clean = re.sub(r"^(?:i prefer|i want|prefer|let'?s do)\s*", "", comment, flags=re.I).strip(". ")
            key = clean[:15].lower() if clean else f"custom_{uid}"
            title = f"{clean.title()[:30]} Group" if clean else "Alternative Activities Group"
            rationale = f"Members expressing specific preference for: '{comment[:50]}'."

        if key not in clusters:
            clusters[key] = {
                "title": title,
                "rationale": rationale,
                "entity_type": "poi",
                "entity_id": f"poi_{key[:12]}_branch",
                "cost_delta": "0.00",
                "currency": currency,
                "member_user_ids": [],
            }
        clusters[key]["member_user_ids"].append(uid)

    branches = list(clusters.values())
    for b in branches:
        b["auto_finalized"] = len(b["member_user_ids"]) == 1
    return branches


def group_into_branches(
    holdout_members: List[Dict[str, Any]],
    itinerary_item: Dict[str, Any],
    trip_context: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Groups holdouts into N parallel branches based on distinct preferences.
    Guarantees every member is assigned and single-member branches are auto-finalized.
    """
    if not holdout_members:
        return {"action": "BRANCHED", "branches": []}

    currency = itinerary_item.get("currency", "USD")
    offline_fallback = _cluster_holdouts_offline(holdout_members, currency=currency)

    members_str = "\n".join(
        f"Member {m.get('user_id')}: \"{m.get('comment')}\""
        for m in holdout_members
    )
    user_message = f"""
Activity being disagreed on: "{itinerary_item.get('title', 'Activity')}"
Destination: {trip_context.get('destination_city', 'City')}

Holdout members and their objections:
{members_str}

Cluster these members into parallel branches.
"""

    raw_result = safe_llm_call(
        system_prompt=BRANCH_GROUPING_SYSTEM_PROMPT,
        user_message=user_message,
        fallback_result=offline_fallback,
        fallback_fn=lambda _: offline_fallback,
    )

    if isinstance(raw_result, dict) and "branches" in raw_result:
        branches = raw_result["branches"]
    elif isinstance(raw_result, list):
        branches = raw_result
    else:
        branches = offline_fallback

    # Post-process: ensure integrity & auto_finalized status
    assigned_members = set()
    cleaned_branches: List[Dict[str, Any]] = []

    for b in branches:
        if not isinstance(b, dict):
            continue
        member_ids = [str(uid) for uid in b.get("member_user_ids", [])]
        if not member_ids:
            continue

        cost_val = b.get("cost_delta", "0.00")
        try:
            cost_str = f"{Decimal(str(cost_val)):.2f}"
        except Exception:
            cost_str = "0.00"

        branch_obj = {
            "title": str(b.get("title", "Alternative Activity Group")),
            "rationale": str(b.get("rationale", "Parallel branch for divergent preferences")),
            "entity_type": b.get("entity_type", "poi"),
            "entity_id": b.get("entity_id", "poi_branch"),
            "cost_delta": cost_str,
            "currency": b.get("currency", currency),
            "member_user_ids": member_ids,
            "auto_finalized": len(member_ids) == 1,
        }
        cleaned_branches.append(branch_obj)
        assigned_members.update(member_ids)

    # Ensure unassigned members are captured in catch-all branch
    all_holdout_ids = {str(m.get("user_id")) for m in holdout_members}
    unassigned = all_holdout_ids - assigned_members
    if unassigned:
        cleaned_branches.append({
            "title": "Independent Choices Group",
            "rationale": "Members pursuing individual personalized options.",
            "entity_type": "poi",
            "entity_id": "poi_independent_branch",
            "cost_delta": "0.00",
            "currency": currency,
            "member_user_ids": list(unassigned),
            "auto_finalized": len(unassigned) == 1,
        })

    return {
        "action": "BRANCHED",
        "branches": cleaned_branches or offline_fallback,
    }
