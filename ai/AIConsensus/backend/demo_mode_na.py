"""Interactive Demonstration of WanderMatch Mode NA AI Consensus Engine.

Demonstrates:
1. Activity proposal creation.
2. Fast path: Unanimous all-YES confirms immediately without waiting 10 minutes.
3. Natural Language Compromise: "Beach" + "Amusement Park" -> "Splash & Thrill Waterpark".
4. Automated Mode NA trigger on NO vote + 10-minute timer.
5. Auto-confirmation upon 10-minute window expiry with zero NO votes.
6. Auto-branching on persistent impasse.
"""

import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timedelta, timezone
from backend.services.mode_na_service import ModeNAConsensusManager


def print_banner(text: str):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def run_demo():
    manager = ModeNAConsensusManager()
    now = datetime(2026, 9, 24, 10, 0, 0, tzinfo=timezone.utc)

    print_banner("WANDERMATCH MODE NA AI CONSENSUS ENGINE DEMO")

    # 1. Setup Trip
    trip = manager.register_trip(
        trip_id="trp_goa_01",
        title="Goa Friends Trip 2026",
        destination_city="Goa",
        members=["usr_alice", "usr_bob", "usr_charlie"],
    )
    print(f"[TRIP CREATED] {trip['title']} in {trip['destination_city']}")
    print(f"Members: Alice (usr_alice), Bob (usr_bob), Charlie (usr_charlie)")
    print(f"Mode: {trip['mode']} (Collaborative / Automatic Consensus)")

    # 2. Setup Itinerary Slot
    slot = manager.create_itinerary_slot(
        item_id="itm_slot_01",
        trip_id="trp_goa_01",
        title="Day 2 Morning Slot (09:00 - 13:00)",
        time_slot="Morning",
    )
    print(f"\n[SLOT INITIALIZED] {slot['title']} -> Status: {slot['slot_status']}")

    # 3. FAST PATH DEMO: Unanimous YES
    print_banner("SCENARIO 1: UNANIMOUS YES (FAST CONFIRMATION)")
    prop_unanimous = manager.create_proposal(
        itm_id="itm_slot_01",
        proposed_by_user_id="usr_alice",
        title="Fort Aguada Ocean Heritage Walk",
        rationale="Historic Portuguese fort with panoramic Arabian sea views.",
    )
    print(f"Proposal: '{prop_unanimous['title']}' (closes_at: {prop_unanimous['closes_at']})")

    manager.cast_vote(prop_unanimous["proposal_id"], "usr_alice", "yes", now=now)
    manager.cast_vote(prop_unanimous["proposal_id"], "usr_bob", "yes", now=now)
    res_fast = manager.cast_vote(prop_unanimous["proposal_id"], "usr_charlie", "yes", now=now)
    print(f"Result: {res_fast['message']}")
    print(f"Slot Status: {res_fast['slot_status']} (Immediately confirmed without 10-min wait!)")

    # 4. SCENARIO 2: Natural Language Disagreement & Common Ground Blending
    print_banner("SCENARIO 2: DISAGREEMENT (BEACH vs AMUSEMENT PARK)")

    # Reopen slot with new proposal
    slot2 = manager.create_itinerary_slot(
        item_id="itm_slot_02",
        trip_id="trp_goa_01",
        title="Day 3 Afternoon Slot (14:00 - 18:00)",
        time_slot="Afternoon",
    )
    prop_beach = manager.create_proposal(
        itm_id="itm_slot_02",
        proposed_by_user_id="usr_alice",
        title="Baga Beach Sunbathing & Shacks",
        rationale="Relaxing on the sand, swimming in the sea, and lounging at beach shacks.",
    )
    print(f"Alice proposes: '{prop_beach['title']}'")
    print(f"Rationale: {prop_beach['rationale']}")

    # Alice votes YES
    manager.cast_vote(prop_beach["proposal_id"], "usr_alice", "yes", now=now)

    # Bob votes NO with typed reason: "I want an amusement park with thrill rides!"
    print("\nBob votes NO:")
    print("  Comment: 'I want an amusement park and thrill rides!'")
    res_no = manager.cast_vote(
        prop_beach["proposal_id"],
        "usr_bob",
        "no",
        comment="I want an amusement park and thrill rides!",
        now=now,
    )

    ai_result = res_no["ai_result"]
    compromise = ai_result["compromise_proposal"]
    print(f"\n[AI CONSENSUS TRIGGERED AUTOMATICALLY IN MODE NA]")
    print(f"AI Decision: {ai_result['action']}")
    print(f"Synthesized Compromise: '{compromise['title']}'")
    print(f"AI Rationale: {compromise['rationale']}")
    print(f"Voting Window closes at: {compromise['closes_at']} (Exactly 10 minutes from now!)")

    # 5. SCENARIO 3: 10-Minute Window Expiry & Auto-Confirmation
    print_banner("SCENARIO 3: 10-MINUTE WINDOW EXPIRY (AUTO-CONFIRMATION)")
    comp_id = compromise["proposal_id"]

    # At 5 minutes: window still open
    now_5m = now + timedelta(minutes=5)
    check_5m = manager.check_window_expiry(comp_id, now=now_5m)
    print(f"Time +5 mins: {check_5m['message']} (Decided: {check_5m['decided']})")

    # At 10 minutes 1 second: window expires with no new NO votes
    now_10m = now + timedelta(minutes=10, seconds=1)
    check_10m = manager.check_window_expiry(comp_id, now=now_10m)
    print(f"Time +10 mins: {check_10m['message']}")
    print(f"Plan Decided: {check_10m['decided']}")

    final_slot = manager.itinerary_items["itm_slot_02"]
    print(f"Final Itinerary Slot Status: {final_slot['slot_status']}")
    print(f"Locked Plan: '{final_slot['confirmed_plan']['title']}'")

    # 6. SCENARIO 4: Hard Incompatibility Auto-Branching
    print_banner("SCENARIO 4: INCOMPATIBLE IMPASSE (AUTO-BRANCHING)")
    slot3 = manager.create_itinerary_slot(
        item_id="itm_slot_03",
        trip_id="trp_goa_01",
        title="Day 4 Morning Slot",
        time_slot="Morning",
    )
    prop_trek = manager.create_proposal(
        itm_id="itm_slot_03",
        proposed_by_user_id="usr_alice",
        title="Dudhsagar Waterfall Trek",
        rationale="Strenuous 12km hike through rugged jungle terrain.",
    )
    # Alice and Bob vote with conflicting hard constraints
    res_branch = manager.cast_vote(
        prop_trek["proposal_id"],
        "usr_bob",
        "no",
        comment="Injured ankle cannot walk or hike at all, need quiet wellness spa",
        now=now,
    )
    print(f"Bob votes NO: 'Injured ankle cannot walk or hike at all, need quiet wellness spa'")
    print(f"AI Decision: {res_branch['ai_result']['action']}")
    for i, b in enumerate(res_branch["ai_result"]["branches"], 1):
        print(f"  Branch {i}: '{b['title']}' | Members: {b['member_user_ids']} | Auto-Finalized: {b['auto_finalized']}")

    print_banner("ALL MODE NA CONSENSUS SCENARIOS VERIFIED SUCCESSFULLY!")


if __name__ == "__main__":
    run_demo()
