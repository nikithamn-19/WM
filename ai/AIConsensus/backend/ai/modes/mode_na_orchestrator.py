"""Mode NA (Collaborative / Automatic) Orchestrator."""

from typing import Any, Dict, List

from backend.ai.core.blended_plan_generator import generate_blended_plan
from backend.ai.core.branch_grouping import group_into_branches
from backend.ai.core.branch_trigger_classifier import classify_objection

SOFT_ROUND_CAP = 3


def run_mode_na_round(
    proposal: Dict[str, Any],
    no_votes: List[Dict[str, Any]],
    itinerary_item: Dict[str, Any],
    trip_context: Dict[str, Any],
    current_round: int = 1,
) -> Dict[str, Any]:
    """
    Executes a complete Mode NA automated consensus round.
    Returns either a BLENDED compromise plan or a BRANCHED structure.
    """
    at_round_cap = current_round >= SOFT_ROUND_CAP

    # Step 1: Classify objections
    classification = classify_objection(
        no_comments=no_votes,
        current_round=current_round,
        soft_round_cap=SOFT_ROUND_CAP,
    )

    should_branch = (
        classification["classification"] == "FIXED_REQUIREMENT"
        or at_round_cap
    )

    if should_branch:
        # Branch holdouts directly
        holdout_members = [
            {"user_id": v.get("user_id"), "comment": v.get("comment", ""), "suggestion": v.get("comment", "")}
            for v in no_votes
        ]
        result = group_into_branches(holdout_members, itinerary_item, trip_context)
        # Ensure remaining non-holdout members also have a branch for the original activity
        all_members = trip_context.get("members", [])
        holdout_ids = {m["user_id"] for m in holdout_members}
        remaining_members = [uid for uid in all_members if uid not in holdout_ids]
        if remaining_members and isinstance(result, dict) and "branches" in result:
            main_branch = {
                "title": proposal.get("title", itinerary_item.get("title", "Main Activity Group")),
                "rationale": proposal.get("rationale", "Primary activity for remaining group members."),
                "entity_type": proposal.get("entity_type", "poi"),
                "entity_id": proposal.get("entity_id", "poi_main_branch"),
                "cost_delta": proposal.get("cost_delta", "0.00"),
                "currency": proposal.get("currency", itinerary_item.get("currency", "USD")),
                "member_user_ids": remaining_members,
                "auto_finalized": len(remaining_members) == 1,
            }
            result["branches"].insert(0, main_branch)
        return result

    # Step 2: Attempt creative common-ground blending
    try:
        blended = generate_blended_plan(
            current_proposal=proposal,
            no_vote_comments=no_votes,
            itinerary_item=itinerary_item,
            trip_context=trip_context,
            current_round=current_round,
        )
        return blended
    except ValueError:
        # If blending fails constraint validation twice, escalate to branching
        holdout_members = [
            {"user_id": v.get("user_id"), "comment": v.get("comment", ""), "suggestion": v.get("comment", "")}
            for v in no_votes
        ]
        return group_into_branches(holdout_members, itinerary_item, trip_context)
