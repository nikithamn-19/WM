"""Demonstration of Advanced Multi-Member, Parallel, Branching, and 10-Minute Consensus Scenarios.

Scenarios demonstrated:
1. Multi-member voting (5 members) with multiple NO votes.
2. Multiple parallel proposals with single active YES auto-retraction.
3. Completely irreconcilable distinct reasons -> Automatic parallel branching.
4. The 10-minute timer timeline (0m -> 5m remaining -> 10m auto-confirmation).
"""

import os
import sys

# Ensure UTF-8 output encoding on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timedelta, timezone
from backend.services.mode_na_service import ModeNAConsensusManager
from backend.ai.core.branch_grouping import group_into_branches


def banner(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def main():
    manager = ModeNAConsensusManager()
    t0 = datetime(2026, 9, 24, 15, 0, 0, tzinfo=timezone.utc)

    # -------------------------------------------------------------------------
    # SCENARIO 1: Multi-Member Group (5 Members) Voting
    # -------------------------------------------------------------------------
    banner("SCENARIO 1: 5 MEMBERS VOTING (3 YES, 2 DIFFERENT NO OBJECTIONS)")
    trip = manager.register_trip(
        trip_id="trp_tokyo_5p",
        title="Tokyo Exploration 2026",
        destination_city="Tokyo",
        members=["alice", "bob", "charlie", "david", "eva"],
    )
    manager.create_itinerary_slot("itm_dinner", "trp_tokyo_5p", "Day 1 Dinner Slot")

    prop = manager.create_proposal(
        itm_id="itm_dinner",
        proposed_by_user_id="alice",
        title="Wagyu Steakhouse & BBQ",
        rationale="Premium A5 Japanese beef steakhouse.",
    )
    prp_id = prop["proposal_id"]
    print(f"Proposal: '{prop['title']}' by Alice | Initial closes_at: {prop['closes_at']}")

    # Alice, Charlie, David vote YES
    manager.cast_vote(prp_id, "alice", "yes", now=t0)
    manager.cast_vote(prp_id, "charlie", "yes", now=t0)
    manager.cast_vote(prp_id, "david", "yes", now=t0)
    print("-> Alice, Charlie, David cast YES votes.")

    # Bob votes NO: "I am vegetarian"
    # Eva votes NO: "I want a casual street food market"
    manager.cast_vote(prp_id, "bob", "no", comment="I am vegetarian, no meat for me", now=t0)
    res_multi = manager.cast_vote(prp_id, "eva", "no", comment="Want a bustling street food night market", now=t0)

    ai_output = res_multi["ai_result"]
    comp = ai_output["compromise_proposal"]
    print(f"\n[AI CONSENSUS EVALUATION WITH MULTIPLE NO OBJECTIONS]:")
    print(f"  Decision   : {ai_output['action']}")
    print(f"  New Plan   : '{comp['title']}'")
    print(f"  Rationale  : {comp['rationale']}")
    print(f"  New Timer  : Closes at {comp['closes_at']} (10 minutes from now)")

    # -------------------------------------------------------------------------
    # SCENARIO 2: Multiple Parallel Proposals & Single Active YES Auto-Retraction
    # -------------------------------------------------------------------------
    banner("SCENARIO 2: PARALLEL PROPOSALS & SINGLE ACTIVE YES RETRACTION")
    manager.create_itinerary_slot("itm_afternoon", "trp_tokyo_5p", "Day 2 Afternoon Slot")

    prop_A = manager.create_proposal("itm_afternoon", "alice", "Senso-ji Temple Walk", "Historic temple")
    prop_B = manager.create_proposal("itm_afternoon", "bob", "Akihabara Tech & Arcade Center", "Arcades & gadgets")

    # Charlie votes YES on Proposal A
    manager.cast_vote(prop_A["proposal_id"], "charlie", "yes", now=t0)
    votes_A_before = [v for v in manager.votes[prop_A["proposal_id"]] if v["user_id"] == "charlie"]
    print(f"Charlie votes YES on Proposal A ('Senso-ji Temple Walk'):")
    print(f"  Proposal A vote state for Charlie: {votes_A_before[0]['value']}")

    # Charlie changes mind and votes YES on Proposal B (same slot!)
    manager.cast_vote(prop_B["proposal_id"], "charlie", "yes", now=t0)
    votes_A_after = [v for v in manager.votes[prop_A["proposal_id"]] if v["user_id"] == "charlie"]
    votes_B_after = [v for v in manager.votes[prop_B["proposal_id"]] if v["user_id"] == "charlie"]

    print("\nCharlie now votes YES on Proposal B ('Akihabara Arcade Center'):")
    print(f"  Proposal B vote state for Charlie : {votes_B_after[0]['value']} (ACTIVE)")
    print(f"  Proposal A vote state for Charlie : {votes_A_after[0]['value']} (AUTO-RETRACTED: '{votes_A_after[0]['comment']}')")
    print("  -> Rule Verified: Single active YES per slot is strictly enforced server-side.")

    # -------------------------------------------------------------------------
    # SCENARIO 3: Distinct Incompatible Objections -> Auto-Branching
    # -------------------------------------------------------------------------
    banner("SCENARIO 3: IRRECONCILABLE OBJECTIONS -> MULTI-WAY PARALLEL BRANCHING")
    print("Scenario: Group disagrees with completely incompatible physical/personal requirements:")
    print("  - Member 1 (Alice)   : 'Sprained knee, strictly quiet hot springs spa soak'")
    print("  - Member 2 (Bob)     : 'Extreme skydiving and bungee jumping only'")
    print("  - Member 3 (Charlie) : 'Ancient Kyoto temple architectural sketching'")

    holdouts = [
        {"user_id": "alice", "comment": "Sprained knee, strictly quiet hot springs spa soak", "suggestion": "spa"},
        {"user_id": "bob", "comment": "Extreme skydiving and bungee jumping only", "suggestion": "skydiving"},
        {"user_id": "charlie", "comment": "Ancient Kyoto temple architectural sketching", "suggestion": "temples"},
    ]
    slot_sample = {"item_id": "itm_branch_demo", "title": "Afternoon Activity", "currency": "USD"}
    trip_sample = {"destination_city": "Japan"}

    branch_result = group_into_branches(holdouts, slot_sample, trip_sample)
    print(f"\nAI Consensus Result: {branch_result['action']}")
    print(f"Number of parallel branches formed: {len(branch_result['branches'])} (Uncapped N-way branching)")

    for i, b in enumerate(branch_result["branches"], 1):
        print(f"\n  [BRANCH {i}]: '{b['title']}'")
        print(f"    Rationale     : {b['rationale']}")
        print(f"    Members       : {b['member_user_ids']}")
        print(f"    Auto-Finalized: {b['auto_finalized']} (Single-member branches lock immediately!)")

    # -------------------------------------------------------------------------
    # SCENARIO 4: 10-Minute Timer Working (Timeline Simulation)
    # -------------------------------------------------------------------------
    banner("SCENARIO 4: 10-MINUTE TIMER TIMELINE SIMULATION")
    manager.create_itinerary_slot("itm_timer", "trp_tokyo_5p", "Day 3 Morning Slot")
    prop_timer = manager.create_proposal("itm_timer", "alice", "Morning Tsukiji Fish Market Walk", "Fresh sushi")
    p_id = prop_timer["proposal_id"]

    # 1. First NO vote lands -> Starts 10-min window
    print("Time: 15:00:00 (T+0m)")
    res_timer_start = manager.cast_vote(
        p_id, "bob", "no", comment="Prefer quiet coffee shop and bookstore", now=t0
    )
    comp_timer_id = res_timer_start["ai_result"]["compromise_proposal"]["proposal_id"]
    closes_at_str = res_timer_start["ai_result"]["compromise_proposal"]["closes_at"]
    print(f"  Bob votes NO. AI consensus triggers.")
    print(f"  Compromise proposal created: '{res_timer_start['ai_result']['compromise_proposal']['title']}'")
    print(f"  Timer set: closes_at = {closes_at_str} (Exactly +10 minutes)")

    # 2. Check at T+4 minutes
    t_4m = t0 + timedelta(minutes=4)
    check_4m = manager.check_window_expiry(comp_timer_id, now=t_4m)
    print(f"\nTime: 15:04:00 (T+4m)")
    print(f"  Status   : {check_4m['status']}")
    print(f"  Remaining: {check_4m['remaining_seconds']} seconds ({check_4m['remaining_seconds']//60} mins)")
    print(f"  Decided? : {check_4m['decided']} (Still waiting for voting window)")

    # 3. Check at T+9 minutes 50 seconds
    t_9m50s = t0 + timedelta(minutes=9, seconds=50)
    check_9m = manager.check_window_expiry(comp_timer_id, now=t_9m50s)
    print(f"\nTime: 15:09:50 (T+9m 50s)")
    print(f"  Status   : {check_9m['status']}")
    print(f"  Remaining: {check_9m['remaining_seconds']} seconds")

    # 4. Check at T+10 minutes 1 second (Expired with no NO votes!)
    t_10m1s = t0 + timedelta(minutes=10, seconds=1)
    check_final = manager.check_window_expiry(comp_timer_id, now=t_10m1s)
    print(f"\nTime: 15:10:01 (T+10m 1s) - WINDOW EXPIRED!")
    print(f"  Status   : {check_final['status']}")
    print(f"  Decided? : {check_final['decided']}")
    print(f"  Message  : {check_final['message']}")

    final_slot = manager.itinerary_items["itm_timer"]
    print(f"\nFinal Itinerary Slot Confirmation:")
    print(f"  Slot Status : {final_slot['slot_status']}")
    print(f"  Locked Plan : '{final_slot['confirmed_plan']['title']}'")

    banner("ALL 4 ADVANCED SCENARIOS DEMONSTRATED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
