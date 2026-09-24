"""Comprehensive test suite for Mode A (Admin-Led) AI Consensus Engine.

Tests:
1. Mode A trip setup with designated owner/admin.
2. NO votes in Mode A: closes_at timer is NEVER set automatically (closes_at is None).
3. AI generates ADVISORY recommendations (advisory: True); does not make binding decisions.
4. Admin authorization gating: non-admin users cannot execute admin actions.
5. Admin Accept: locks blended plan or proposal into itinerary slot (CONFIRMED).
6. Admin Force Branch: immediately forks slot into parallel branches with single-member auto-finalization.
7. Admin Extend: continues voting round past advisory soft cap without auto-branching.
8. Admin Direct Confirm: directly confirms any proposal without waiting for unanimous consensus.
9. Unanimous fast-path: still works in Mode A if all members vote YES.
10. FastAPI HTTP endpoints for Mode A Admin controls and authorization gating (HTTP 403 on non-admin).
"""

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from backend.ai.modes.mode_a_orchestrator import run_mode_a_round
from backend.services.consensus_service import ConsensusManager
from backend.app.main import app


def test_mode_a_initialization_and_owner():
    """Verify trip registration in Mode A assigns owner and mode correctly."""
    manager = ConsensusManager()
    trip = manager.register_trip(
        trip_id="trp_bali_a",
        destination_city="Bali",
        members=["alice", "bob", "charlie"],
        title="Bali Tropical Escape",
        mode="Mode A",
        owner_id="alice",
    )
    assert trip["mode"] == "Mode A"
    assert trip["owner_id"] == "alice"


def test_mode_a_no_vote_never_sets_automatic_closes_at():
    """FR-ITN-06 & PANCHAMI.md: In Mode A, closes_at is NEVER set automatically on a NO vote."""
    manager = ConsensusManager()
    manager.register_trip(
        trip_id="trp_bali_a",
        destination_city="Bali",
        members=["alice", "bob", "charlie"],
        mode="Mode A",
        owner_id="alice",
    )
    manager.create_itinerary_slot("itm_a1", "trp_bali_a", "Morning Temple Tour")
    prop = manager.create_proposal(
        "itm_a1", "alice", "Uluwatu Temple Visit", "Historic cliffside temple"
    )
    prp_id = prop["proposal_id"]
    assert prop["closes_at"] is None

    # Bob votes NO with an objection
    res = manager.cast_vote(
        prp_id=prp_id,
        user_id="bob",
        value="no",
        comment="Too crowded, I prefer peaceful botanical gardens",
    )

    # In Mode A: status must be AWAITING_ADMIN_ACTION and advisory
    assert res["status"] == "AWAITING_ADMIN_ACTION"
    assert res["mode"] == "Mode A"
    assert res["advisory"] is True

    # closes_at must REMAIN None!
    assert prop["closes_at"] is None
    slot = manager.itinerary_items["itm_a1"]
    assert slot["slot_status"] == "IN_CONSENSUS"
    assert slot["admin_recommendation"] is not None


def test_mode_a_orchestrator_advisory_flag():
    """Directly verify run_mode_a_round outputs advisory: True and recommendation message."""
    proposal = {
        "title": "Baga Beach Sunbathing",
        "rationale": "Chill by the sea",
        "entity_type": "poi",
        "entity_id": "poi_baga",
        "cost_delta": "0.00",
        "currency": "USD",
    }
    no_votes = [
        {"user_id": "bob", "comment": "I want an amusement park with thrill rides!"}
    ]
    slot = {"item_id": "itm_m1", "title": "Morning Slot", "currency": "USD"}
    trip = {"destination_city": "Goa", "members": ["alice", "bob"]}

    res = run_mode_a_round(proposal, no_votes, slot, trip, current_round=1)
    assert res["advisory"] is True
    assert "admin_recommendation" in res
    assert res["action"] == "BLENDED"
    assert "waterpark" in res["blended_plan"]["title"].lower() or "splash" in res["blended_plan"]["title"].lower() or "park" in res["blended_plan"]["title"].lower()


def test_mode_a_non_admin_gating():
    """AC-AI: Non-owner members cannot execute Mode A admin override actions."""
    manager = ConsensusManager()
    manager.register_trip(
        trip_id="trp_bali_a",
        destination_city="Bali",
        members=["alice", "bob", "charlie"],
        mode="Mode A",
        owner_id="alice",
    )
    manager.create_itinerary_slot("itm_a2", "trp_bali_a", "Afternoon Hike")
    manager.create_proposal("itm_a2", "alice", "Mount Batur Sunrise Trek", "Volcano hike")

    # Bob (regular member, not owner) attempts admin actions
    with pytest.raises(PermissionError) as exc_invoke:
        manager.invoke_mode_a_ai(itm_id="itm_a2", user_id="bob")
    assert "not the trip owner/admin" in str(exc_invoke.value)

    with pytest.raises(PermissionError) as exc_accept:
        manager.admin_accept(itm_id="itm_a2", user_id="bob")
    assert "not the trip owner/admin" in str(exc_accept.value)

    with pytest.raises(PermissionError) as exc_force:
        manager.admin_force_branch(itm_id="itm_a2", user_id="bob")
    assert "not the trip owner/admin" in str(exc_force.value)

    with pytest.raises(PermissionError) as exc_extend:
        manager.admin_extend(itm_id="itm_a2", user_id="bob")
    assert "not the trip owner/admin" in str(exc_extend.value)


def test_mode_a_admin_accept_locks_itinerary():
    """Admin accept action locks the recommended compromise into the itinerary slot (CONFIRMED)."""
    manager = ConsensusManager()
    manager.register_trip(
        trip_id="trp_bali_a",
        destination_city="Bali",
        members=["alice", "bob", "charlie"],
        mode="Mode A",
        owner_id="alice",
    )
    manager.create_itinerary_slot("itm_a3", "trp_bali_a", "Morning Activity")
    prop = manager.create_proposal("itm_a3", "alice", "Kuta Beach Sunbathing", "Beach visit")
    prp_id = prop["proposal_id"]

    # Bob votes NO
    manager.cast_vote(prp_id, "bob", "no", comment="I want an amusement park with thrill rides!")

    # Slot has advisory recommendation
    slot = manager.itinerary_items["itm_a3"]
    assert slot["slot_status"] == "IN_CONSENSUS"
    assert slot["admin_recommendation"] is not None

    # Alice (Admin) accepts the recommendation
    accept_res = manager.admin_accept(itm_id="itm_a3", user_id="alice")
    assert accept_res["status"] == "CONFIRMED"
    assert slot["slot_status"] == "CONFIRMED"
    assert slot["confirmed_plan"] is not None
    assert "waterpark" in slot["confirmed_plan"]["title"].lower() or "splash" in slot["confirmed_plan"]["title"].lower() or "park" in slot["confirmed_plan"]["title"].lower()


def test_mode_a_admin_force_branch():
    """Admin can override and force-branch the slot into parallel groups with single-member auto-finalization."""
    manager = ConsensusManager()
    manager.register_trip(
        trip_id="trp_bali_a",
        destination_city="Bali",
        members=["alice", "bob", "charlie"],
        mode="Mode A",
        owner_id="alice",
    )
    manager.create_itinerary_slot("itm_a4", "trp_bali_a", "Adventure Activity")
    prop = manager.create_proposal("itm_a4", "alice", "Jungle Trek", "Trail hiking")
    prp_id = prop["proposal_id"]

    # Bob & Charlie have irreconcilable objections
    manager.cast_vote(prp_id, "bob", "no", comment="Injured knee, need quiet luxury thermal spa")
    manager.cast_vote(prp_id, "charlie", "no", comment="Scuba diving with sharks only")

    # Alice (Admin) chooses to force-branch immediately
    branch_res = manager.admin_force_branch(itm_id="itm_a4", user_id="alice")
    assert branch_res["status"] == "BRANCHED"

    slot = manager.itinerary_items["itm_a4"]
    assert slot["slot_status"] in ("BRANCHED", "CONFIRMED")
    branches = manager.branches["itm_a4"]
    assert len(branches) >= 2

    # Verify single-member branches have auto_finalized == True
    for b in branches:
        if len(b["member_user_ids"]) == 1:
            assert b["auto_finalized"] is True


def test_mode_a_admin_extend_round():
    """Admin extends voting round past soft cap without auto-branching."""
    manager = ConsensusManager()
    manager.register_trip(
        trip_id="trp_bali_a",
        destination_city="Bali",
        members=["alice", "bob", "charlie"],
        mode="Mode A",
        owner_id="alice",
    )
    manager.create_itinerary_slot("itm_a5", "trp_bali_a", "Evening Dinner")
    prop = manager.create_proposal("itm_a5", "alice", "Seafood BBQ", "Beach dinner")
    prp_id = prop["proposal_id"]

    manager.cast_vote(prp_id, "bob", "no", comment="Vegetarian only")

    # Round starts at 1
    assert manager.itinerary_items["itm_a5"]["current_round"] == 1

    # Admin extends round
    ext_res = manager.admin_extend(itm_id="itm_a5", user_id="alice", extend_minutes=15)
    assert ext_res["status"] == "EXTENDED"
    assert ext_res["current_round"] == 2
    assert manager.itinerary_items["itm_a5"]["current_round"] == 2
    assert prop["closes_at"] is not None  # Explicitly set by admin extension


def test_mode_a_admin_direct_confirm():
    """Admin directly confirms an open proposal into itinerary slot without waiting for consensus."""
    manager = ConsensusManager()
    manager.register_trip(
        trip_id="trp_bali_a",
        destination_city="Bali",
        members=["alice", "bob", "charlie"],
        mode="Mode A",
        owner_id="alice",
    )
    manager.create_itinerary_slot("itm_a6", "trp_bali_a", "Sunset Viewpoint")
    prop = manager.create_proposal("itm_a6", "alice", "Tanah Lot Sunset", "Iconic coastal rock")

    # Before any votes, admin directly confirms it
    confirm_res = manager.admin_direct_confirm(itm_id="itm_a6", user_id="alice")
    assert confirm_res["status"] == "CONFIRMED"
    slot = manager.itinerary_items["itm_a6"]
    assert slot["slot_status"] == "CONFIRMED"
    assert slot["confirmed_plan"]["title"] == "Tanah Lot Sunset"


def test_mode_a_unanimous_fast_path():
    """Unanimous YES from all members confirms immediately in Mode A as well."""
    manager = ConsensusManager()
    manager.register_trip(
        trip_id="trp_bali_a",
        destination_city="Bali",
        members=["alice", "bob"],
        mode="Mode A",
        owner_id="alice",
    )
    manager.create_itinerary_slot("itm_a7", "trp_bali_a", "Lunch")
    prop = manager.create_proposal("itm_a7", "alice", "Warung Local Balinese Food", "Local cuisine")
    prp_id = prop["proposal_id"]

    manager.cast_vote(prp_id, "alice", "yes")
    r2 = manager.cast_vote(prp_id, "bob", "yes")

    assert r2["status"] == "CONFIRMED"
    assert manager.itinerary_items["itm_a7"]["slot_status"] == "CONFIRMED"


def test_mode_a_fastapi_http_endpoints():
    """End-to-end HTTP verification of Mode A endpoints via FastAPI TestClient."""
    client = TestClient(app)

    # Reset state to get seeded demo data
    client.post("/api/reset")

    # Check seeded Mode A trip
    trip_res = client.get("/api/trips/trp_bali_mode_a")
    assert trip_res.status_code == 200
    trip_data = trip_res.json()
    assert trip_data["trip"]["mode"] == "Mode A"
    assert trip_data["trip"]["owner_id"] == "alice"

    # Bob casts NO vote on the seeded Bali proposal
    vote_res = client.post(
        "/api/votes",
        json={
            "itm_id": "itm_bali_morning",
            "user_id": "bob",
            "value": "no",
            "comment": "Prefer waterpark and thrill slides instead",
        },
    )
    assert vote_res.status_code == 200
    vdata = vote_res.json()
    assert vdata["status"] == "AWAITING_ADMIN_ACTION"
    assert vdata["advisory"] is True
    assert vdata["proposal"]["closes_at"] is None

    # Test Gating: non-owner Bob tries to accept or force branch -> 403 Forbidden!
    unauth_accept = client.post(
        "/api/consensus/mode-a/accept",
        json={"itm_id": "itm_bali_morning", "user_id": "bob"},
    )
    assert unauth_accept.status_code == 403
    assert "not the trip owner/admin" in unauth_accept.json()["detail"]

    unauth_force = client.post(
        "/api/consensus/mode-a/force-branch",
        json={"itm_id": "itm_bali_morning", "user_id": "bob"},
    )
    assert unauth_force.status_code == 403

    unauth_extend = client.post(
        "/api/consensus/mode-a/extend",
        json={"itm_id": "itm_bali_morning", "user_id": "bob"},
    )
    assert unauth_extend.status_code == 403

    # Admin Alice extends the round
    ext_res = client.post(
        "/api/consensus/mode-a/extend",
        json={"itm_id": "itm_bali_morning", "user_id": "alice", "extend_minutes": 20},
    )
    assert ext_res.status_code == 200
    assert ext_res.json()["status"] == "EXTENDED"

    # Admin Alice accepts the blended recommendation
    accept_res = client.post(
        "/api/consensus/mode-a/accept",
        json={"itm_id": "itm_bali_morning", "user_id": "alice"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "CONFIRMED"
    assert accept_res.json()["slot_status"] == "CONFIRMED"

    # Verify slot history contains audit timeline with admin recommendation
    hist_res = client.get("/api/slots/itm_bali_morning/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["slot_status"] == "CONFIRMED"
    assert len(hist_data["timeline"]) >= 1
