"""Mode A (Admin-Led) Consensus Orchestrator.

In Mode A:
- The trip owner (admin) retains final decision authority.
- The AI only RECOMMENDS (advisory: True) — it never makes binding decisions.
- The ~3 round cap is strictly advisory.
- Admin action overrides AI recommendation at any time:
    - 'accept': Admin approves the blended proposal or active plan.
    - 'force_branch': Admin overrides and forces slot to branch immediately.
    - 'extend': Admin extends the voting round beyond the advisory cap.
"""

from typing import Any, Dict, List, Optional

from backend.ai.core.blended_plan_generator import generate_blended_plan
from backend.ai.core.branch_grouping import group_into_branches
from backend.ai.core.branch_trigger_classifier import classify_objection

SOFT_ROUND_CAP = 3


def run_mode_a_round(
    proposal: Dict[str, Any],
    no_votes: List[Dict[str, Any]],
    itinerary_item: Dict[str, Any],
    trip_context: Dict[str, Any],
    current_round: int = 1,
    admin_action: Optional[str] = None,  # 'force_branch' | 'extend' | 'accept' | None
) -> Dict[str, Any]:
    """
    Mode A consensus round.
    Admin action overrides AI recommendation.
    Returns a result dict — in Mode A, AI output is always ADVISORY (advisory: True)
    unless the admin has explicitly executed an override action.
    """

    # 1. Admin Override Action: Force Branch
    if admin_action == "force_branch":
        holdout_members = [
            {
                "user_id": v.get("user_id"),
                "comment": v.get("comment", ""),
                "suggestion": v.get("comment", ""),
            }
            for v in no_votes
        ]
        result = group_into_branches(holdout_members, itinerary_item, trip_context)

        # Include main branch for remaining group members if any
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

        result["action"] = "BRANCHED"
        result["admin_action_executed"] = "force_branch"
        result["message"] = "Admin explicitly forced parallel branching for this slot."
        return result

    # 2. Admin Override Action: Extend Round
    if admin_action == "extend":
        return {
            "action": "EXTENDED",
            "message": "Admin extended the round. Voting window continues without automatic branching.",
            "current_round": current_round,
            "admin_action_executed": "extend",
        }

    # 3. Admin Override Action: Accept
    if admin_action == "accept":
        return {
            "action": "ACCEPTED",
            "message": "Admin accepted the proposal directly into the itinerary slot.",
            "proposal": proposal,
            "admin_action_executed": "accept",
        }

    # 4. No admin action yet -> Generate AI recommendation (Advisory Only)
    classification = classify_objection(
        no_comments=no_votes,
        current_round=current_round,
        soft_round_cap=SOFT_ROUND_CAP,
    )

    if classification["classification"] == "FIXED_REQUIREMENT":
        # Recommend branching to admin
        holdout_members = [
            {
                "user_id": v.get("user_id"),
                "comment": v.get("comment", ""),
                "suggestion": v.get("comment", ""),
            }
            for v in no_votes
        ]
        branch_result = group_into_branches(holdout_members, itinerary_item, trip_context)

        all_members = trip_context.get("members", [])
        holdout_ids = {m["user_id"] for m in holdout_members}
        remaining_members = [uid for uid in all_members if uid not in holdout_ids]
        if remaining_members and isinstance(branch_result, dict) and "branches" in branch_result:
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
            branch_result["branches"].insert(0, main_branch)

        branch_result["action"] = "BRANCHED"
        branch_result["advisory"] = True  # Admin must still approve
        branch_result["admin_recommendation"] = "Branch — fixed incompatible requirements detected"
        branch_result["classification"] = classification
        return branch_result

    # Check advisory round cap notice
    round_cap_notice = None
    if current_round >= SOFT_ROUND_CAP:
        round_cap_notice = (
            f"Advisory: Soft cap of {SOFT_ROUND_CAP} rounds reached. In Mode A, "
            "the admin may choose to accept a compromise, extend voting, or force branching."
        )

    # Attempt common-ground blending
    try:
        blend_result = generate_blended_plan(
            current_proposal=proposal,
            no_vote_comments=no_votes,
            itinerary_item=itinerary_item,
            trip_context=trip_context,
            current_round=current_round,
        )
        blend_result["advisory"] = True  # Admin must still approve
        blend_result["admin_recommendation"] = "Accept blended plan — objections appear resolvable"
        blend_result["classification"] = classification
        if round_cap_notice:
            blend_result["advisory_notice"] = round_cap_notice
        return blend_result
    except ValueError:
        # Constraint validation failure -> recommend branching
        holdout_members = [
            {
                "user_id": v.get("user_id"),
                "comment": v.get("comment", ""),
                "suggestion": v.get("comment", ""),
            }
            for v in no_votes
        ]
        branch_result = group_into_branches(holdout_members, itinerary_item, trip_context)

        all_members = trip_context.get("members", [])
        holdout_ids = {m["user_id"] for m in holdout_members}
        remaining_members = [uid for uid in all_members if uid not in holdout_ids]
        if remaining_members and isinstance(branch_result, dict) and "branches" in branch_result:
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
            branch_result["branches"].insert(0, main_branch)

        branch_result["action"] = "BRANCHED"
        branch_result["advisory"] = True
        branch_result["admin_recommendation"] = "Branch — blending failed constraint validation"
        branch_result["classification"] = classification
        if round_cap_notice:
            branch_result["advisory_notice"] = round_cap_notice
        return branch_result
