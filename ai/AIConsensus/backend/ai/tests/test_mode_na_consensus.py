"""Comprehensive test suite for Mode NA AI Consensus Engine."""

from datetime import datetime, timedelta, timezone
import pytest

from backend.ai.core.hard_constraint_validator import validate_plan
from backend.ai.core.branch_trigger_classifier import classify_objection
from backend.ai.core.blended_plan_generator import generate_blended_plan
from backend.ai.core.branch_grouping import group_into_branches
from backend.ai.modes.mode_na_orchestrator import run_mode_na_round
from backend.services.mode_na_service import ModeNAConsensusManager


def test_hard_constraint_validator():
    """Verify constraint rules: valid passes, missing fields or bad entity_type fails."""
    valid_plan = {
        "title": "Goa Beach Walk",
        "rationale": "Pleasant morning beach walk",
        "entity_type": "poi",
        "entity_id": "poi_baga_01",
        "cost_delta": "0.00",
        "currency": "USD",
    }
    res = validate_plan(valid_plan, {}, {})
    assert res["valid"] is True
    assert len(res["violations"]) == 0

    invalid_plan = {
        "title": "",
        "rationale": "",
        "entity_type": "invalid_entity",
        "entity_id": "",
        "cost_delta": "not-a-number",
    }
    res_bad = validate_plan(invalid_plan, {}, {})
    assert res_bad["valid"] is False
    assert len(res_bad["violations"]) >= 4


def test_vague_comment_treated_as_soft_preference():
    """AC-AI-02: Vague comments ('not feeling it') are classified as soft preferences / FIXABLE_TWEAK."""
    vague_comments = [
        {"user_id": "usr_2", "comment": "not feeling it", "round": 1},
    ]
    res = classify_objection(vague_comments, current_round=1)
    assert res["classification"] == "FIXABLE_TWEAK"

    injury_comments = [
        {"user_id": "usr_2", "comment": "injured ankle cannot walk or hike at all", "round": 1},
    ]
    res_injury = classify_objection(injury_comments, current_round=1)
    assert res_injury["classification"] == "FIXED_REQUIREMENT"


def test_beach_amusement_park_blended_synthesis():
    """Verify creative common-ground synthesis: Beach + Amusement Park -> Waterpark."""
    proposal = {
        "title": "Baga Beach Relaxation",
        "rationale": "Chill morning by the sea",
        "entity_type": "poi",
        "entity_id": "poi_baga_beach",
        "cost_delta": "0.00",
        "currency": "USD",
    }
    no_votes = [
        {"user_id": "usr_2", "comment": "I want an amusement park and thrill rides!"}
    ]
    slot = {"item_id": "itm_1", "title": "Morning Slot", "currency": "USD"}
    trip = {"destination_city": "Goa"}

    blended_output = generate_blended_plan(proposal, no_votes, slot, trip, current_round=1)
    assert blended_output["action"] == "BLENDED"
    plan = blended_output["blended_plan"]

    # Must contain waterpark or wave park or aquatic thrill synthesis
    title_lower = plan["title"].lower()
    rationale_lower = plan["rationale"].lower()
    combined_text = f"{title_lower} {rationale_lower}"

    assert any(term in combined_text for term in ["waterpark", "water park", "splash", "aquatic", "rides", "thrill"])
    assert plan["entity_type"] == "poi"
    assert plan["cost_delta"] is not None


def test_unanimous_fast_path_confirms_immediately():
    """If all trip members vote YES, confirm immediately without waiting 10 minutes."""
    manager = ModeNAConsensusManager()
    manager.register_trip("trp_100", "Goa", members=["usr_1", "usr_2", "usr_3"])
    manager.create_itinerary_slot("itm_100", "trp_100", "Morning Activity")

    prop = manager.create_proposal("itm_100", "usr_1", "Fort Aguada Heritage Tour", "Historic ocean fort")
    prp_id = prop["proposal_id"]

    # Member 1 votes YES
    r1 = manager.cast_vote(prp_id, "usr_1", "yes")
    assert r1["status"] == "VOTE_RECORDED"
    assert manager.itinerary_items["itm_100"]["slot_status"] == "IN_CONSENSUS"

    # Member 2 votes YES
    r2 = manager.cast_vote(prp_id, "usr_2", "yes")
    assert r2["status"] == "VOTE_RECORDED"

    # Member 3 votes YES -> UNANIMOUS FAST-PATH!
    r3 = manager.cast_vote(prp_id, "usr_3", "yes")
    assert r3["status"] == "CONFIRMED"
    assert "immediately" in r3["message"].lower()

    # Slot must be officially CONFIRMED in itinerary
    slot = manager.itinerary_items["itm_100"]
    assert slot["slot_status"] == "CONFIRMED"
    assert slot["confirmed_plan"]["title"] == "Fort Aguada Heritage Tour"


def test_first_no_triggers_ai_and_sets_10min_window():
    """First NO vote automatically invokes Mode NA AI and sets 10-minute closes_at window."""
    manager = ModeNAConsensusManager()
    start_time = datetime(2026, 9, 24, 10, 0, 0, tzinfo=timezone.utc)
    manager.register_trip("trp_200", "Goa", members=["usr_1", "usr_2"])
    manager.create_itinerary_slot("itm_200", "trp_200", "Morning Activity")

    prop = manager.create_proposal("itm_200", "usr_1", "Baga Beach Relaxation", "Sunny beach visit")
    prp_id = prop["proposal_id"]
    assert prop["closes_at"] is None

    # usr_1 votes YES
    manager.cast_vote(prp_id, "usr_1", "yes", now=start_time)

    # usr_2 votes NO with objection: amusement park
    res = manager.cast_vote(
        prp_id,
        "usr_2",
        "no",
        comment="I want an amusement park with thrill rides!",
        now=start_time,
    )
    assert res["status"] == "AI_RECONCILED"
    ai_result = res["ai_result"]
    assert ai_result["action"] == "BLENDED"

    compromise_prop = ai_result["compromise_proposal"]
    assert "waterpark" in compromise_prop["title"].lower() or "splash" in compromise_prop["title"].lower() or "park" in compromise_prop["title"].lower()

    # Verify 10-minute timer
    closes_at = datetime.fromisoformat(compromise_prop["closes_at"])
    expected_closes_at = start_time + timedelta(minutes=10)
    assert closes_at == expected_closes_at


def test_10min_window_expiry_auto_confirms():
    """If 10 minutes pass with no NO votes, plan is decided and confirmed in itinerary."""
    manager = ModeNAConsensusManager()
    t0 = datetime(2026, 9, 24, 12, 0, 0, tzinfo=timezone.utc)
    manager.register_trip("trp_300", "Goa", members=["usr_1", "usr_2"])
    manager.create_itinerary_slot("itm_300", "trp_300", "Afternoon Activity")

    prop = manager.create_proposal("itm_300", "usr_1", "Beach Sunbathing", "Beach time")
    prp_id = prop["proposal_id"]

    # Vote NO to trigger AI compromise
    res = manager.cast_vote(prp_id, "usr_2", "no", comment="Prefer thrill water rides", now=t0)
    compromise_prp_id = res["ai_result"]["compromise_proposal"]["proposal_id"]

    # At t = 5 mins: window still open
    t_5m = t0 + timedelta(minutes=5)
    check_5m = manager.check_window_expiry(compromise_prp_id, now=t_5m)
    assert check_5m["decided"] is False
    assert check_5m["status"] == "IN_CONSENSUS"
    assert manager.itinerary_items["itm_300"]["slot_status"] == "IN_CONSENSUS"

    # At t = 10m 1s: window expired with zero NO votes -> Auto-CONFIRMED!
    t_10m = t0 + timedelta(minutes=10, seconds=1)
    check_10m = manager.check_window_expiry(compromise_prp_id, now=t_10m)
    assert check_10m["decided"] is True
    assert check_10m["status"] == "CONFIRMED"

    slot = manager.itinerary_items["itm_300"]
    assert slot["slot_status"] == "CONFIRMED"
    assert slot["confirmed_plan"] is not None


def test_subsequent_no_vote_triggers_round_2():
    """Subsequent NO vote on compromise triggers Round 2 re-synthesis."""
    manager = ModeNAConsensusManager()
    t0 = datetime(2026, 9, 24, 14, 0, 0, tzinfo=timezone.utc)
    manager.register_trip("trp_400", "Goa", members=["usr_1", "usr_2", "usr_3"])
    manager.create_itinerary_slot("itm_400", "trp_400", "Morning Activity")

    prop = manager.create_proposal("itm_400", "usr_1", "Trek to Waterfall", "Hiking trail")
    prp_id = prop["proposal_id"]

    # Round 1 NO
    res1 = manager.cast_vote(prp_id, "usr_2", "no", comment="Prefer hot springs spa", now=t0)
    assert res1["ai_result"]["current_round"] == 2
    comp_id_r2 = res1["ai_result"]["compromise_proposal"]["proposal_id"]

    # Round 2 NO arrives during the 10-minute window
    t_2m = t0 + timedelta(minutes=2)
    res2 = manager.cast_vote(comp_id_r2, "usr_3", "no", comment="Prefer botanical garden walk", now=t_2m)
    assert res2["status"] == "AI_RECONCILED"
    assert res2["ai_result"]["current_round"] == 3


def test_persistent_impasse_auto_branches_single_members():
    """Persistent impasse or fixed physical incompatibility triggers parallel branching with auto-finalization."""
    holdouts = [
        {"user_id": "usr_1", "comment": "injured ankle, need quiet spa", "suggestion": "spa"},
        {"user_id": "usr_2", "comment": "roller coasters and high thrill only", "suggestion": "thrill"},
    ]
    slot = {"item_id": "itm_500", "title": "Slot", "currency": "USD"}
    trip = {"destination_city": "Goa"}

    branch_result = group_into_branches(holdouts, slot, trip)
    assert branch_result["action"] == "BRANCHED"
    branches = branch_result["branches"]
    assert len(branches) >= 2

    # Single-member branches must be auto-finalized
    for b in branches:
        if len(b["member_user_ids"]) == 1:
            assert b["auto_finalized"] is True
