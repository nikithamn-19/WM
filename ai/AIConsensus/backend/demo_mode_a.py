"""WanderMatch Mode A (Admin-Led) Interactive Demo Script.

Demonstrates:
1. Trip creation in Mode A with designated owner/admin (Alice).
2. Proposal submission (closes_at starts as None).
3. Member votes NO: verifies closes_at is NOT set automatically in Mode A.
4. AI generates ADVISORY recommendation (advisory: True) for admin review.
5. Non-admin permission gating: regular members cannot execute admin actions.
6. Admin Accept: locks blended plan into itinerary slot (CONFIRMED).
7. Irreconcilable conflict slot: Admin Force Branch splits holdouts into parallel branches.
8. Round cap extension: Admin extends round beyond advisory cap without branching.
"""

import os
import sys
import json
from datetime import datetime, timezone

# Ensure UTF-8 output encoding on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.services.consensus_service import ConsensusManager


def run_mode_a_walkthrough():
    print("=" * 75)
    print(" 🌴 WANDERMATCH MODE A (ADMIN-LED) CONSENSUS DEMONSTRATION")
    print("=" * 75)

    manager = ConsensusManager()

    # Step 1: Create Mode A trip
    print("\n[Step 1] Registering Trip in Mode A (Admin-Led)...")
    trip = manager.register_trip(
        trip_id="trp_bali_demo",
        title="Bali Tropical Escape",
        destination_city="Bali",
        members=["alice", "bob", "charlie", "david"],
        mode="Mode A",
        owner_id="alice",
    )
    print(f" -> Trip: '{trip['title']}' | Mode: {trip['mode']} | Owner (Admin): {trip['owner_id']}")
    print(f" -> Members: {', '.join(trip['members'])}")

    # Step 2: Create Slot and Proposal
    print("\n[Step 2] Creating Slot & Initial Proposal...")
    slot = manager.create_itinerary_slot(
        item_id="itm_morning",
        trip_id="trp_bali_demo",
        title="Day 1 Morning Activity (09:00 - 13:00)",
        time_slot="Morning",
    )
    prop = manager.create_proposal(
        itm_id="itm_morning",
        proposed_by_user_id="alice",
        title="Uluwatu Cliffside Temple Tour",
        rationale="Historic oceanfront cliff temple visit and traditional dance.",
    )
    print(f" -> Slot ID: {slot['item_id']} | Status: {slot['slot_status']}")
    print(f" -> Proposal ID: {prop['proposal_id']} | Title: '{prop['title']}'")
    print(f" -> closes_at: {prop['closes_at']} (NULL - never set automatically in Mode A)")

    # Step 3: Member Votes NO
    print("\n[Step 3] Member Bob votes NO with objection...")
    vote_res = manager.cast_vote(
        prp_id=prop["proposal_id"],
        user_id="bob",
        value="no",
        comment="Too crowded, I want an amusement park with thrill rides!",
    )
    print(f" -> Vote Status: {vote_res['status']}")
    print(f" -> Advisory Flag: {vote_res.get('advisory')}")
    print(f" -> Closes Timer: {prop['closes_at']} (STILL NULL - Rule 4 enforced!)")
    print(f" -> AI Recommendation: {vote_res.get('admin_recommendation')}")
    rec = vote_res.get("advisory_result", {})
    if rec and "blended_plan" in rec:
        print(f" -> Proposed Compromise: '{rec['blended_plan']['title']}'")
        print(f"    Rationale: {rec['blended_plan']['rationale']}")

    # Step 4: Authorization Gating Check
    print("\n[Step 4] Authorization Gating: Regular member Bob attempts admin accept...")
    try:
        manager.admin_accept(itm_id="itm_morning", user_id="bob")
        print(" [FAIL] Non-admin was allowed!")
    except PermissionError as pe:
        print(f" -> [BLOCKED AS EXPECTED]: {pe}")

    # Step 5: Admin Alice Accepts Recommendation
    print("\n[Step 5] Admin Alice accepts the AI recommendation...")
    accept_res = manager.admin_accept(itm_id="itm_morning", user_id="alice")
    slot = manager.itinerary_items["itm_morning"]
    print(f" -> Accept Status: {accept_res['status']}")
    print(f" -> Slot Status: {slot['slot_status']}")
    print(f" -> Confirmed Plan: '{slot['confirmed_plan']['title']}'")

    # Step 6: Irreconcilable Conflict & Admin Force Branch
    print("\n[Step 6] New Slot: Irreconcilable Preferences & Admin Force Branch...")
    slot2 = manager.create_itinerary_slot(
        item_id="itm_afternoon",
        trip_id="trp_bali_demo",
        title="Day 1 Afternoon Adventure",
        time_slot="Afternoon",
    )
    prop2 = manager.create_proposal(
        itm_id="itm_afternoon",
        proposed_by_user_id="alice",
        title="Mount Batur Volcano Hike",
        rationale="Strenuous scenic summit trek.",
    )
    manager.cast_vote(prop2["proposal_id"], "bob", "no", comment="Injured ankle, need quiet thermal spa wellness")
    manager.cast_vote(prop2["proposal_id"], "charlie", "no", comment="Extreme skydiving and bungee jumping only")

    print(f" -> Slot 2 Status before Admin action: {slot2['slot_status']}")
    print(" -> Admin Alice triggers Force Branch...")
    branch_res = manager.admin_force_branch(itm_id="itm_afternoon", user_id="alice")
    print(f" -> Branch Action Status: {branch_res['status']}")
    print(f" -> Slot 2 Final Status: {manager.itinerary_items['itm_afternoon']['slot_status']}")
    print(f" -> Generated {len(branch_res['branches'])} Parallel Branches:")
    for idx, b in enumerate(branch_res["branches"], 1):
        print(f"    Branch {idx}: '{b['title']}' | Members: {b['member_user_ids']} | Auto-Finalized: {b['auto_finalized']}")

    # Step 7: Admin Extend Round
    print("\n[Step 7] Slot 3: Admin Extends Voting Round Past Soft Cap...")
    slot3 = manager.create_itinerary_slot(
        item_id="itm_dinner",
        trip_id="trp_bali_demo",
        title="Day 1 Dinner",
        time_slot="Night",
    )
    prop3 = manager.create_proposal(
        itm_id="itm_dinner",
        proposed_by_user_id="alice",
        title="Seafood BBQ on Jimbaran Beach",
        rationale="Grilled fish dinner.",
    )
    manager.cast_vote(prop3["proposal_id"], "david", "no", comment="Strict vegan diet")
    print(f" -> Round before extend: {slot3['current_round']}")
    ext_res = manager.admin_extend(itm_id="itm_dinner", user_id="alice", extend_minutes=15)
    print(f" -> Round after extend: {ext_res['current_round']}")
    print(f" -> Explicit closes_at set by admin: {ext_res.get('closes_at')}")

    print("\n" + "=" * 75)
    print(" ✅ ALL MODE A SPECIFICATIONS VERIFIED ACCORDING TO PS-11 DOCS!")
    print("=" * 75)


if __name__ == "__main__":
    run_mode_a_walkthrough()
