"""WanderMatch Consensus Service and State Machine (Mode A & Mode NA).

Handles the end-to-end consensus lifecycle for both modes:
- Mode A (Admin-Led):
    1. Trip owner (admin) retains final decision authority.
    2. Closes timer is NEVER set automatically (closes_at stays None).
    3. AI provides advisory recommendations (advisory: True).
    4. Admin actions:
       - invoke_mode_a_ai: Triggers AI reconciliation advice.
       - admin_accept: Approves compromise plan or proposal into itinerary (slot_status = CONFIRMED).
       - admin_force_branch: Overrides and forces parallel branches (slot_status = BRANCHED).
       - admin_extend: Extends rounds beyond advisory round cap without auto-branching.
       - admin_direct_confirm: Directly confirms any proposal without waiting.

- Mode NA (Collaborative / Automatic):
    1. Unanimous fast-path: if all members vote YES, immediately confirm.
    2. First NO vote automatically invokes Mode NA AI reconcile.
    3. Sets 10-minute voting window (closes_at = now + 10 mins).
    4. Expiry check: if 10 mins pass with no NO votes -> auto-CONFIRMED in itinerary.
    5. Subsequent NO votes trigger next round re-synthesis or auto-branching at round 3.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
from typing import Any, Dict, List, Optional

from backend.ai.modes.mode_a_orchestrator import run_mode_a_round
from backend.ai.modes.mode_na_orchestrator import run_mode_na_round


def generate_id(prefix: str) -> str:
    """Generate opaque ID with required prefix e.g. prp_a1b2c3d4."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class ModeNAConsensusManager:
    """In-memory state engine for Mode A and Mode NA trips, proposals, votes, and consensus loops."""

    def __init__(self):
        self.trips: Dict[str, Dict[str, Any]] = {}
        self.itinerary_items: Dict[str, Dict[str, Any]] = {}
        self.proposals: Dict[str, Dict[str, Any]] = {}
        self.votes: Dict[str, List[Dict[str, Any]]] = {}  # prp_id -> list of votes
        self.revision_history: Dict[str, List[Dict[str, Any]]] = {}  # itm_id -> snapshots
        self.branches: Dict[str, List[Dict[str, Any]]] = {}  # itm_id -> branches

    def register_trip(
        self,
        trip_id: str,
        destination_city: str,
        members: List[str],
        title: str = "Group Trip",
        mode: str = "Mode NA",
        owner_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Registers a trip with members, trip mode ('Mode A' or 'Mode NA'), and owner."""
        effective_owner = owner_id or (members[0] if members else None)
        trip = {
            "trip_id": trip_id,
            "title": title,
            "destination_city": destination_city,
            "mode": mode,
            "owner_id": effective_owner,
            "members": members,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.trips[trip_id] = trip
        return trip

    def create_itinerary_slot(
        self,
        item_id: str,
        trip_id: str,
        title: str,
        time_slot: str = "Morning",
        cost: str = "0.00",
        currency: str = "USD",
    ) -> Dict[str, Any]:
        """Creates an itinerary item slot initialized to EMPTY."""
        slot = {
            "item_id": item_id,
            "trip_id": trip_id,
            "title": title,
            "time_slot": time_slot,
            "slot_status": "EMPTY",
            "cost": f"{Decimal(cost):.2f}",
            "currency": currency,
            "current_round": 0,
            "consensus_cycle": 1,
            "confirmed_plan": None,
            "admin_recommendation": None,
        }
        self.itinerary_items[item_id] = slot
        self.revision_history[item_id] = []
        return slot

    def create_proposal(
        self,
        itm_id: str,
        proposed_by_user_id: str,
        title: str,
        rationale: str,
        cost_delta: str = "0.00",
        currency: str = "USD",
        entity_type: str = "poi",
        entity_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates an initial proposal.
        Per contract: closes_at=None on creation, status='open', current_round=1.
        """
        slot = self.itinerary_items.get(itm_id)
        if not slot:
            raise ValueError(f"Itinerary item {itm_id} not found")

        prp_id = generate_id("prp")
        created_time = datetime.now(timezone.utc).isoformat()
        proposal = {
            "proposal_id": prp_id,
            "parent_proposal_id": None,
            "superseded_by": None,
            "itm_id": itm_id,
            "trp_id": slot["trip_id"],
            "proposed_by_user_id": proposed_by_user_id,
            "title": title,
            "rationale": rationale,
            "cost_delta": f"{Decimal(cost_delta):.2f}",
            "currency": currency,
            "entity_type": entity_type,
            "entity_id": entity_id or f"poi_{uuid.uuid4().hex[:6]}",
            "closes_at": None,  # NULL initially
            "status": "open",
            "current_round": 1,
            "created_at": created_time,
            "resolved_at": None,
        }
        self.proposals[prp_id] = proposal
        self.votes[prp_id] = []
        slot["slot_status"] = "IN_CONSENSUS"
        slot["current_round"] = 1
        slot["active_proposal_id"] = prp_id

        # Record initial revision
        rev_id = generate_id("rev")
        self.revision_history.setdefault(itm_id, []).append({
            "rev_id": rev_id,
            "itm_id": itm_id,
            "proposal_id": prp_id,
            "parent_proposal_id": None,
            "version_number": 1,
            "event_type": "PROPOSAL_CREATED",
            "title": title,
            "rationale": rationale,
            "proposed_by": proposed_by_user_id,
            "created_at": created_time,
        })
        return proposal

    def cast_vote(
        self,
        prp_id: str,
        user_id: str,
        value: str,
        comment: Optional[str] = None,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Casts a vote on a proposal.
        Enforces:
        - Rule 1: value in ('yes', 'no')
        - Rule 2: NO requires non-empty typed comment
        - Rule 3: Single active YES per slot (retracts other yes votes for same slot)
        - Fast Path: If ALL members of the trip vote YES, confirm immediately without waiting
        - Mode NA trigger: On first NO vote, automatically trigger AI reconcile and set 10-minute window
        - Mode A trigger: On NO vote, closes timer is NEVER set automatically. Advisory recommendation generated for admin.
        """
        curr_time = now or datetime.now(timezone.utc)
        proposal = self.proposals.get(prp_id)
        if not proposal:
            raise ValueError(f"Proposal {prp_id} not found")

        val = value.strip().lower()
        if val not in ("yes", "no"):
            raise ValueError("Vote value must be 'yes' or 'no'")

        if val == "no" and (not comment or not comment.strip()):
            raise ValueError("A 'no' vote REQUIRES a typed reason or suggestion in the comment field.")

        itm_id = proposal["itm_id"]
        slot = self.itinerary_items[itm_id]
        trip = self.trips[slot["trip_id"]]

        if slot.get("slot_status") in ("CONFIRMED", "BRANCHED"):
            return {
                "vote": None,
                "status": slot["slot_status"],
                "message": f"Voting is closed. Slot is already {slot['slot_status']}.",
                "slot_status": slot["slot_status"],
            }

        if proposal.get("status") == "replaced":
            active_id = slot.get("active_proposal_id")
            active_title = self.proposals.get(active_id, {}).get("title", active_id)
            raise ValueError(
                f"Proposal '{prp_id}' has already been superseded by active recommendation '{active_title}' ({active_id}). "
                f"Please cast your vote on '{active_id}', or omit 'prp_id' to vote on the active proposal automatically."
            )

        if proposal.get("status") == "accepted":
            raise ValueError(f"Proposal '{prp_id}' has already been accepted and confirmed into the itinerary.")

        # Rule 3: Retract other active YES votes by this user on the same slot
        if val == "yes":
            for other_prp_id, other_prp in self.proposals.items():
                if other_prp["itm_id"] == itm_id and other_prp_id != prp_id:
                    for v in self.votes.get(other_prp_id, []):
                        if v["user_id"] == user_id and v["value"] == "yes":
                            v["value"] = "no"
                            v["comment"] = "Retracted — voted yes on another proposal"
                            v["updated_at"] = curr_time.isoformat()

        # Upsert vote
        vote_list = self.votes.setdefault(prp_id, [])
        existing_vote = next((v for v in vote_list if v["user_id"] == user_id), None)
        if existing_vote:
            existing_vote["value"] = val
            existing_vote["comment"] = comment.strip() if comment else None
            existing_vote["updated_at"] = curr_time.isoformat()
            vote_obj = existing_vote
        else:
            vote_obj = {
                "vote_id": generate_id("vot"),
                "proposal_id": prp_id,
                "user_id": user_id,
                "value": val,
                "comment": comment.strip() if comment else None,
                "cast_at": curr_time.isoformat(),
            }
            vote_list.append(vote_obj)

        # FAST PATH: Check if all members voted YES (Applies to both Mode A and Mode NA)
        all_members = set(trip["members"])
        yes_voters = {v["user_id"] for v in vote_list if v["value"] == "yes"}
        no_voters = [v for v in vote_list if v["value"] == "no" and not v.get("comment", "").startswith("Retracted")]

        if all_members and yes_voters == all_members and not no_voters:
            self._confirm_proposal(proposal, slot, curr_time)
            return {
                "vote": vote_obj,
                "status": "CONFIRMED",
                "message": "All trip members voted YES! Plan is confirmed immediately.",
                "proposal": proposal,
                "slot_status": slot["slot_status"],
            }

        # Handle NO vote
        if val == "no":
            is_mode_a = trip.get("mode") == "Mode A"
            if is_mode_a:
                # In Mode A: Closes timer is NEVER set automatically.
                # A yes/no vote does NOT invoke AI consensus; only the trip admin can invoke AI consensus.
                return {
                    "vote": vote_obj,
                    "status": "VOTE_RECORDED",
                    "mode": "Mode A",
                    "message": (
                        "NO vote recorded in Mode A (Admin-Led). A yes/no vote does NOT invoke AI consensus; "
                        "only the admin can invoke AI consensus."
                    ),
                    "proposal": proposal,
                    "slot_status": slot["slot_status"],
                }
            else:
                # In Mode NA: AI automatically reconciles and starts 10-minute window
                ai_result = self._trigger_mode_na_ai(proposal, slot, trip, curr_time)
                action = ai_result.get("action")
                if action == "BRANCHED":
                    return {
                        "vote": vote_obj,
                        "status": "BRANCHED",
                        "message": "AI Consensus detected persistent impasse or non-negotiable requirement. Auto-branched into parallel activities.",
                        "branches": ai_result.get("branches", []),
                        "ai_result": ai_result,
                        "proposal": proposal,
                        "slot_status": slot["slot_status"],
                    }
                else:
                    new_prp = ai_result.get("compromise_proposal")
                    new_prp_id = new_prp["proposal_id"] if new_prp else None
                    return {
                        "vote": vote_obj,
                        "status": "AI_RECONCILED",
                        "message": (
                            f"NO vote recorded. AI generated a new recommendation: '{new_prp['title'] if new_prp else 'Branches'}'. "
                            f"A NEW VOTE is now open for this recommendation (Proposal ID: {new_prp_id}). "
                            f"If anyone votes NO on this new recommendation, another AI round will be invoked automatically."
                        ),
                        "next_proposal_id_to_vote_on": new_prp_id,
                        "active_proposal_title": new_prp["title"] if new_prp else None,
                        "current_round": new_prp.get("current_round") if new_prp else None,
                        "ai_result": ai_result,
                        "proposal": proposal,
                        "slot_status": slot["slot_status"],
                    }

        return {
            "vote": vote_obj,
            "status": "VOTE_RECORDED",
            "message": "Vote recorded.",
            "proposal": proposal,
            "slot_status": slot["slot_status"],
        }

    def cast_votes_batch(
        self,
        votes_data: List[Dict[str, Any]],
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Submits multiple votes at once (from multiple members) in a single batch.
        - Records each vote.
        - Handles single active YES retraction per user.
        - If all members voted YES: confirms immediately.
        - If any NO votes were submitted: triggers consensus reconcile based on trip mode.
        """
        curr_time = now or datetime.now(timezone.utc)
        if not votes_data:
            raise ValueError("No votes provided in batch")

        recorded_votes = []
        any_no = False
        target_prp = None
        target_slot = None
        target_trip = None

        for item in votes_data:
            prp_id = item.get("prp_id")
            itm_id = item.get("itm_id")

            if not prp_id and itm_id:
                slot = self.itinerary_items.get(itm_id)
                if slot:
                    prp_id = slot.get("active_proposal_id")

            if not prp_id:
                raise ValueError("Each vote must specify 'prp_id' or an 'itm_id' with an active proposal")

            proposal = self.proposals.get(prp_id)
            if not proposal:
                raise ValueError(f"Proposal {prp_id} not found")

            val = item.get("value", "").strip().lower()
            if val not in ("yes", "no"):
                raise ValueError(f"Vote value must be 'yes' or 'no', got '{val}' for user {item.get('user_id')}")

            comment = item.get("comment")
            if val == "no" and (not comment or not comment.strip()):
                raise ValueError(f"A 'no' vote REQUIRES a typed reason or suggestion in the comment field (user: {item.get('user_id')}).")

            user_id = item.get("user_id")
            if not user_id:
                raise ValueError("user_id is required for each vote")

            target_prp = proposal
            target_slot = self.itinerary_items[proposal["itm_id"]]
            target_trip = self.trips[target_slot["trip_id"]]

            if target_slot.get("slot_status") in ("CONFIRMED", "BRANCHED"):
                return {
                    "votes": recorded_votes,
                    "status": target_slot["slot_status"],
                    "message": f"Voting is closed. Slot is already {target_slot['slot_status']}.",
                    "slot_status": target_slot["slot_status"],
                }

            if proposal.get("status") == "replaced":
                active_id = target_slot.get("active_proposal_id")
                active_title = self.proposals.get(active_id, {}).get("title", active_id)
                raise ValueError(
                    f"Proposal '{prp_id}' has already been superseded by active recommendation '{active_title}' ({active_id}). "
                    f"Please cast your vote on '{active_id}', or omit 'prp_id' to vote on the active proposal automatically."
                )

            # Rule 3: Retract other active YES votes
            if val == "yes":
                for other_prp_id, other_prp in self.proposals.items():
                    if other_prp["itm_id"] == proposal["itm_id"] and other_prp_id != prp_id:
                        for v in self.votes.get(other_prp_id, []):
                            if v["user_id"] == user_id and v["value"] == "yes":
                                v["value"] = "no"
                                v["comment"] = "Retracted — voted yes on another proposal"
                                v["updated_at"] = curr_time.isoformat()

            # Upsert vote
            vote_list = self.votes.setdefault(prp_id, [])
            existing_vote = next((v for v in vote_list if v["user_id"] == user_id), None)
            if existing_vote:
                existing_vote["value"] = val
                existing_vote["comment"] = comment.strip() if comment else None
                existing_vote["updated_at"] = curr_time.isoformat()
                v_obj = existing_vote
            else:
                v_obj = {
                    "vote_id": generate_id("vot"),
                    "proposal_id": prp_id,
                    "user_id": user_id,
                    "value": val,
                    "comment": comment.strip() if comment else None,
                    "cast_at": curr_time.isoformat(),
                }
                vote_list.append(v_obj)

            recorded_votes.append(v_obj)
            if val == "no":
                any_no = True

        # FAST PATH: Check if all members voted YES
        all_members = set(target_trip["members"])
        vote_list = self.votes.get(target_prp["proposal_id"], [])
        yes_voters = {v["user_id"] for v in vote_list if v["value"] == "yes"}
        no_voters = [v for v in vote_list if v["value"] == "no" and not v.get("comment", "").startswith("Retracted")]

        if all_members and yes_voters == all_members and not no_voters:
            self._confirm_proposal(target_prp, target_slot, curr_time)
            return {
                "votes": recorded_votes,
                "status": "CONFIRMED",
                "message": "All trip members voted YES! Plan is confirmed immediately.",
                "proposal": target_prp,
                "slot_status": target_slot["slot_status"],
            }

        # Handle NO votes
        if any_no:
            is_mode_a = target_trip.get("mode") == "Mode A"
            if is_mode_a:
                return {
                    "votes": recorded_votes,
                    "status": "VOTE_RECORDED",
                    "mode": "Mode A",
                    "message": (
                        "Batch votes recorded in Mode A (Admin-Led). A yes/no vote does NOT invoke AI consensus; "
                        "only the admin can invoke AI consensus."
                    ),
                    "proposal": target_prp,
                    "slot_status": target_slot["slot_status"],
                }
            else:
                ai_result = self._trigger_mode_na_ai(target_prp, target_slot, target_trip, curr_time)
                action = ai_result.get("action")
                if action == "BRANCHED":
                    return {
                        "votes": recorded_votes,
                        "status": "BRANCHED",
                        "message": "AI Consensus detected persistent impasse or non-negotiable requirement. Auto-branched into parallel activities.",
                        "branches": ai_result.get("branches", []),
                        "ai_result": ai_result,
                        "proposal": target_prp,
                        "slot_status": target_slot["slot_status"],
                    }
                else:
                    new_prp = ai_result.get("compromise_proposal")
                    new_prp_id = new_prp["proposal_id"] if new_prp else None
                    return {
                        "votes": recorded_votes,
                        "status": "AI_RECONCILED",
                        "message": (
                            f"Batch votes recorded. AI reconciled multiple objections into: '{new_prp['title']}'. "
                            f"A NEW VOTE is now open for this recommendation (Proposal ID: {new_prp_id})."
                        ),
                        "next_proposal_id_to_vote_on": new_prp_id,
                        "active_proposal_title": new_prp["title"] if new_prp else None,
                        "current_round": new_prp.get("current_round") if new_prp else None,
                        "ai_result": ai_result,
                        "proposal": target_prp,
                        "slot_status": target_slot["slot_status"],
                    }

        return {
            "votes": recorded_votes,
            "status": "VOTE_RECORDED",
            "message": f"{len(recorded_votes)} votes recorded.",
            "proposal": target_prp,
            "slot_status": target_slot["slot_status"],
        }

    def _trigger_mode_na_ai(
        self,
        current_proposal: Dict[str, Any],
        slot: Dict[str, Any],
        trip: Dict[str, Any],
        curr_time: datetime,
    ) -> Dict[str, Any]:
        """Invokes the Mode NA AI consensus engine, generates compromise/branches, and sets 10-minute timer."""
        no_votes = [
            {
                "user_id": v["user_id"],
                "comment": v["comment"],
                "round": current_proposal.get("current_round", 1),
            }
            for v in self.votes.get(current_proposal["proposal_id"], [])
            if v["value"] == "no"
            and v.get("comment")
            and not v["comment"].startswith("Retracted")
        ]

        trip_context = {
            "destination_city": trip.get("destination_city", "Goa"),
            "mode": "Mode NA",
            "members": trip.get("members", []),
        }

        ai_output = run_mode_na_round(
            proposal=current_proposal,
            no_votes=no_votes,
            itinerary_item=slot,
            trip_context=trip_context,
            current_round=current_proposal["current_round"],
        )

        if ai_output.get("action") == "BLENDED":
            blended = ai_output["blended_plan"]
            next_round = current_proposal["current_round"] + 1

            new_prp_id = generate_id("prp")
            closes_at = (curr_time + timedelta(minutes=10)).isoformat()
            compromise_proposal = {
                "proposal_id": new_prp_id,
                "parent_proposal_id": current_proposal["proposal_id"],
                "superseded_by": None,
                "itm_id": slot["item_id"],
                "trp_id": trip["trip_id"],
                "proposed_by_user_id": "ai_consensus_agent",
                "title": blended["title"],
                "rationale": blended["rationale"],
                "cost_delta": blended.get("cost_delta", "0.00"),
                "currency": blended.get("currency", slot.get("currency", "USD")),
                "entity_type": blended.get("entity_type", "poi"),
                "entity_id": blended.get("entity_id", "poi_compromise"),
                "closes_at": closes_at,  # Exactly 10 minutes from now
                "status": "open",
                "current_round": next_round,
                "created_at": curr_time.isoformat(),
                "resolved_at": None,
            }
            self.proposals[new_prp_id] = compromise_proposal
            self.votes[new_prp_id] = []

            rev_id = generate_id("rev")
            self.revision_history.setdefault(slot["item_id"], []).append({
                "rev_id": rev_id,
                "itm_id": slot["item_id"],
                "proposal_id": new_prp_id,
                "parent_proposal_id": current_proposal["proposal_id"],
                "version_number": next_round,
                "event_type": "AI_COMPROMISE_CREATED",
                "title": blended["title"],
                "rationale": blended["rationale"],
                "proposed_by": "ai_consensus_agent",
                "snapshot_data": blended,
                "reconciled_from_votes": no_votes,
                "created_at": curr_time.isoformat(),
            })

            current_proposal["status"] = "replaced"
            current_proposal["resolved_at"] = curr_time.isoformat()
            current_proposal["superseded_by"] = new_prp_id
            slot["current_round"] = next_round
            slot["slot_status"] = "IN_CONSENSUS"
            slot["active_proposal_id"] = new_prp_id

            return {
                "action": "BLENDED",
                "compromise_proposal": compromise_proposal,
                "closes_at": closes_at,
                "current_round": next_round,
                "voting_status": f"A new vote is now OPEN for '{blended['title']}'. Casting a NO vote will invoke the AI again.",
            }

        elif ai_output.get("action") == "BRANCHED":
            branches = ai_output.get("branches", [])
            slot["slot_status"] = "BRANCHED"
            current_proposal["status"] = "branched"
            current_proposal["resolved_at"] = curr_time.isoformat()
            self.branches[slot["item_id"]] = branches

            rev_id = generate_id("rev")
            self.revision_history.setdefault(slot["item_id"], []).append({
                "rev_id": rev_id,
                "itm_id": slot["item_id"],
                "proposal_id": current_proposal["proposal_id"],
                "parent_proposal_id": current_proposal.get("parent_proposal_id"),
                "version_number": current_proposal.get("current_round", 1),
                "event_type": "BRANCHED",
                "title": f"Branched into {len(branches)} parallel groups",
                "branches": branches,
                "created_at": curr_time.isoformat(),
            })

            all_final = all(b.get("auto_finalized", False) for b in branches)
            if all_final:
                slot["slot_status"] = "CONFIRMED"

            return {
                "action": "BRANCHED",
                "branches": branches,
            }

        return ai_output

    def _trigger_mode_a_ai(
        self,
        current_proposal: Dict[str, Any],
        slot: Dict[str, Any],
        trip: Dict[str, Any],
        curr_time: datetime,
        admin_action: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Invokes Mode A AI consensus in advisory mode or executes an admin override action."""
        no_votes = [
            {
                "user_id": v["user_id"],
                "comment": v["comment"],
                "round": current_proposal.get("current_round", 1),
            }
            for v in self.votes.get(current_proposal["proposal_id"], [])
            if v["value"] == "no"
            and v.get("comment")
            and not v["comment"].startswith("Retracted")
        ]

        trip_context = {
            "destination_city": trip.get("destination_city", "Goa"),
            "mode": "Mode A",
            "members": trip.get("members", []),
        }

        ai_output = run_mode_a_round(
            proposal=current_proposal,
            no_votes=no_votes,
            itinerary_item=slot,
            trip_context=trip_context,
            current_round=current_proposal.get("current_round", 1),
            admin_action=admin_action,
        )

        rev_id = generate_id("rev")
        self.revision_history.setdefault(slot["item_id"], []).append({
            "rev_id": rev_id,
            "itm_id": slot["item_id"],
            "proposal_id": current_proposal["proposal_id"],
            "parent_proposal_id": current_proposal.get("parent_proposal_id"),
            "version_number": current_proposal.get("current_round", 1),
            "event_type": "MODE_A_AI_ADVISORY" if not admin_action else f"ADMIN_ACTION_{admin_action.upper()}",
            "title": f"Mode A Advisory: {ai_output.get('admin_recommendation', 'AI Evaluated')}",
            "admin_action": admin_action,
            "advisory": ai_output.get("advisory", False),
            "ai_output": ai_output,
            "created_at": curr_time.isoformat(),
        })

        return ai_output

    def _is_admin(self, trip: Dict[str, Any], user_id: str) -> bool:
        """Checks if user_id is authorized as trip admin."""
        owner = trip.get("owner_id")
        if not owner:
            return True
        if user_id == owner:
            return True
        # For default demo trips, allow panchami / panch or alice as recognized admins
        if trip.get("trip_id") in ("trp_demo", "trp_bali_mode_a") and user_id in ("alice", "panch", "usr_panchami"):
            return True
        return False

    def invoke_mode_a_ai(
        self,
        itm_id: str,
        user_id: str,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Admin explicitly invokes AI consensus for a slot in Mode A.
        Gathers all previous proposals for this slot (base proposal + members' alternative proposals)
        and all member objections/votes, synthesizes a compromise proposal, and opens it for voting.
        """
        curr_time = now or datetime.now(timezone.utc)
        slot = self.itinerary_items.get(itm_id)
        if not slot:
            raise ValueError(f"Itinerary item {itm_id} not found")

        trip = self.trips[slot["trip_id"]]
        if not self._is_admin(trip, user_id):
            raise PermissionError(f"User '{user_id}' is not the trip owner/admin ({trip.get('owner_id')})")

        slot_proposals = [p for p in self.proposals.values() if p["itm_id"] == itm_id]
        if not slot_proposals:
            raise ValueError(f"No proposals found for slot {itm_id}")

        # Determine base proposal (the slot's active proposal or first proposal)
        active_prp_id = slot.get("active_proposal_id")
        base_proposal = self.proposals.get(active_prp_id) or slot_proposals[0]

        # Gather all alternative proposals created by members on this slot
        alternative_proposals = [
            {
                "proposal_id": p["proposal_id"],
                "title": p["title"],
                "rationale": p["rationale"],
                "proposed_by": p.get("proposed_by_user_id"),
                "cost_delta": p.get("cost_delta", "0.00"),
                "currency": p.get("currency", "USD"),
                "votes": self.votes.get(p["proposal_id"], []),
            }
            for p in slot_proposals
            if p["proposal_id"] != base_proposal["proposal_id"]
        ]

        # Gather all NO votes and objections across all proposals in this slot
        all_no_votes = []
        seen_comments = set()
        for p in slot_proposals:
            for v in self.votes.get(p["proposal_id"], []):
                if v["value"] == "no" and v.get("comment") and not v["comment"].startswith("Retracted"):
                    key = (v["user_id"], v["comment"])
                    if key not in seen_comments:
                        seen_comments.add(key)
                        all_no_votes.append({
                            "user_id": v["user_id"],
                            "comment": v["comment"],
                            "proposal_title": p.get("title"),
                            "round": p.get("current_round", 1),
                        })

        trip_context = {
            "destination_city": trip.get("destination_city", "Goa"),
            "mode": "Mode A",
            "members": trip.get("members", []),
        }

        ai_output = run_mode_a_round(
            proposal=base_proposal,
            no_votes=all_no_votes,
            itinerary_item=slot,
            trip_context=trip_context,
            current_round=slot.get("current_round", 1),
            admin_action=None,
            alternative_proposals=alternative_proposals,
        )

        slot["admin_recommendation"] = ai_output
        compromise_proposal = None

        # When AI produces a blended plan, create a new compromise proposal on this slot for members to vote on
        if ai_output.get("action") == "BLENDED" or "blended_plan" in ai_output:
            blended = ai_output.get("blended_plan", ai_output)
            next_round = slot.get("current_round", 1) + 1
            new_prp_id = generate_id("prp")
            compromise_proposal = {
                "proposal_id": new_prp_id,
                "parent_proposal_id": base_proposal["proposal_id"],
                "superseded_by": None,
                "itm_id": itm_id,
                "trp_id": trip["trip_id"],
                "proposed_by_user_id": "ai_consensus_agent",
                "title": blended["title"],
                "rationale": blended["rationale"],
                "cost_delta": blended.get("cost_delta", "0.00"),
                "currency": blended.get("currency", slot.get("currency", "USD")),
                "entity_type": blended.get("entity_type", "poi"),
                "entity_id": blended.get("entity_id", "poi_compromise"),
                "closes_at": None,  # In Mode A, timer is not auto-closed
                "status": "open",
                "current_round": next_round,
                "created_at": curr_time.isoformat(),
                "resolved_at": None,
            }
            self.proposals[new_prp_id] = compromise_proposal
            self.votes[new_prp_id] = []
            slot["current_round"] = next_round
            slot["active_proposal_id"] = new_prp_id

            rev_id = generate_id("rev")
            self.revision_history.setdefault(itm_id, []).append({
                "rev_id": rev_id,
                "itm_id": itm_id,
                "proposal_id": new_prp_id,
                "parent_proposal_id": base_proposal["proposal_id"],
                "version_number": next_round,
                "event_type": "AI_COMPROMISE_CREATED",
                "title": blended["title"],
                "rationale": blended["rationale"],
                "proposed_by": "ai_consensus_agent",
                "snapshot_data": blended,
                "alternative_proposals_considered": [p["title"] for p in alternative_proposals],
                "reconciled_from_votes": all_no_votes,
                "created_at": curr_time.isoformat(),
            })

        return {
            "status": "AI_RECOMMENDATION_READY",
            "mode": "Mode A",
            "message": (
                f"AI Consensus synthesized a compromise plan from all proposal data: '{compromise_proposal['title']}'. "
                f"Members can now vote on this proposal (Proposal ID: {compromise_proposal['proposal_id']})."
                if compromise_proposal else "AI generated advisory recommendations for admin review."
            ),
            "advisory": True,
            "compromise_proposal": compromise_proposal,
            "new_proposal_id_to_vote_on": compromise_proposal["proposal_id"] if compromise_proposal else None,
            "admin_recommendation": ai_output.get("admin_recommendation"),
            "ai_result": ai_output,
            "proposals_evaluated": len(slot_proposals),
            "slot_status": slot["slot_status"],
        }

    def admin_accept(
        self,
        itm_id: str,
        user_id: str,
        proposal_id: Optional[str] = None,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Admin approves/accepts recommendation or proposal, locking it into the itinerary."""
        curr_time = now or datetime.now(timezone.utc)
        slot = self.itinerary_items.get(itm_id)
        if not slot:
            raise ValueError(f"Itinerary item {itm_id} not found")

        trip = self.trips[slot["trip_id"]]
        if not self._is_admin(trip, user_id):
            raise PermissionError(f"User '{user_id}' is not the trip owner/admin ({trip.get('owner_id')})")

        rec = slot.get("admin_recommendation")

        # If proposal_id explicitly specified: confirm that proposal
        if proposal_id:
            target_prp = self.proposals.get(proposal_id)
            if not target_prp:
                raise ValueError(f"Proposal {proposal_id} not found")
            self._confirm_proposal(target_prp, slot, curr_time)
            return {
                "status": "CONFIRMED",
                "message": f"Admin accepted proposal '{target_prp['title']}'. Confirmed in itinerary.",
                "confirmed_plan": slot["confirmed_plan"],
                "slot_status": slot["slot_status"],
            }

        # If recommendation contains a blended plan, create confirmed proposal from it
        if rec and rec.get("action") == "BLENDED" and "blended_plan" in rec:
            blended = rec["blended_plan"]
            new_prp_id = generate_id("prp")
            confirmed_proposal = {
                "proposal_id": new_prp_id,
                "parent_proposal_id": slot.get("active_proposal_id"),
                "superseded_by": None,
                "itm_id": slot["item_id"],
                "trp_id": trip["trip_id"],
                "proposed_by_user_id": "ai_consensus_agent",
                "title": blended["title"],
                "rationale": blended["rationale"],
                "cost_delta": blended.get("cost_delta", "0.00"),
                "currency": blended.get("currency", slot.get("currency", "USD")),
                "entity_type": blended.get("entity_type", "poi"),
                "entity_id": blended.get("entity_id", "poi_confirmed"),
                "closes_at": curr_time.isoformat(),
                "status": "accepted",
                "current_round": slot.get("current_round", 1),
                "created_at": curr_time.isoformat(),
                "resolved_at": curr_time.isoformat(),
            }
            self.proposals[new_prp_id] = confirmed_proposal
            self._confirm_proposal(confirmed_proposal, slot, curr_time)
            return {
                "status": "CONFIRMED",
                "message": f"Admin accepted blended compromise plan '{blended['title']}'. Confirmed in itinerary.",
                "confirmed_plan": slot["confirmed_plan"],
                "slot_status": slot["slot_status"],
            }

        # If recommendation was to branch, confirm branching
        if rec and rec.get("action") == "BRANCHED" and "branches" in rec:
            branches = rec["branches"]
            self.branches[itm_id] = branches
            slot["slot_status"] = "BRANCHED"
            active_prp_id = slot.get("active_proposal_id")
            if active_prp_id and active_prp_id in self.proposals:
                self.proposals[active_prp_id]["status"] = "branched"
                self.proposals[active_prp_id]["resolved_at"] = curr_time.isoformat()
            return {
                "status": "BRANCHED",
                "message": "Admin accepted branch recommendation.",
                "branches": branches,
                "slot_status": slot["slot_status"],
            }

        # Fallback to active proposal
        active_prp_id = slot.get("active_proposal_id")
        target_prp = self.proposals.get(active_prp_id)
        if not target_prp:
            raise ValueError(f"No active proposal or recommendation to accept for slot {itm_id}")
        self._confirm_proposal(target_prp, slot, curr_time)
        return {
            "status": "CONFIRMED",
            "message": f"Admin accepted plan '{target_prp['title']}'. Confirmed in itinerary.",
            "confirmed_plan": slot["confirmed_plan"],
            "slot_status": slot["slot_status"],
        }

    def admin_force_branch(
        self,
        itm_id: str,
        user_id: str,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Admin forces immediate parallel branching for this slot."""
        curr_time = now or datetime.now(timezone.utc)
        slot = self.itinerary_items.get(itm_id)
        if not slot:
            raise ValueError(f"Itinerary item {itm_id} not found")

        trip = self.trips[slot["trip_id"]]
        if not self._is_admin(trip, user_id):
            raise PermissionError(f"User '{user_id}' is not the trip owner/admin ({trip.get('owner_id')})")

        active_prp_id = slot.get("active_proposal_id")
        proposal = self.proposals.get(active_prp_id)
        if not proposal:
            raise ValueError(f"No proposal found for slot {itm_id}")

        ai_result = self._trigger_mode_a_ai(proposal, slot, trip, curr_time, admin_action="force_branch")
        branches = ai_result.get("branches", [])
        self.branches[itm_id] = branches
        slot["slot_status"] = "BRANCHED"
        proposal["status"] = "branched"
        proposal["resolved_at"] = curr_time.isoformat()

        all_final = all(b.get("auto_finalized", False) for b in branches)
        if all_final:
            slot["slot_status"] = "CONFIRMED"

        return {
            "status": "BRANCHED",
            "message": "Admin forced slot to branch into parallel groups.",
            "branches": branches,
            "slot_status": slot["slot_status"],
        }

    def admin_extend(
        self,
        itm_id: str,
        user_id: str,
        extend_minutes: Optional[int] = None,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Admin extends the voting round beyond the advisory round cap."""
        curr_time = now or datetime.now(timezone.utc)
        slot = self.itinerary_items.get(itm_id)
        if not slot:
            raise ValueError(f"Itinerary item {itm_id} not found")

        trip = self.trips[slot["trip_id"]]
        if not self._is_admin(trip, user_id):
            raise PermissionError(f"User '{user_id}' is not the trip owner/admin ({trip.get('owner_id')})")

        active_prp_id = slot.get("active_proposal_id")
        proposal = self.proposals.get(active_prp_id)
        if not proposal:
            raise ValueError(f"No proposal found for slot {itm_id}")

        ai_result = self._trigger_mode_a_ai(proposal, slot, trip, curr_time, admin_action="extend")
        next_round = slot.get("current_round", 1) + 1
        slot["current_round"] = next_round
        proposal["current_round"] = next_round

        if extend_minutes is not None:
            proposal["closes_at"] = (curr_time + timedelta(minutes=extend_minutes)).isoformat()

        return {
            "status": "EXTENDED",
            "message": f"Voting extended to Round {next_round} by admin.",
            "current_round": next_round,
            "closes_at": proposal.get("closes_at"),
            "slot_status": slot["slot_status"],
        }

    def admin_direct_confirm(
        self,
        itm_id: str,
        user_id: str,
        proposal_id: Optional[str] = None,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Admin directly confirms any open proposal without waiting for voting consensus."""
        curr_time = now or datetime.now(timezone.utc)
        slot = self.itinerary_items.get(itm_id)
        if not slot:
            raise ValueError(f"Itinerary item {itm_id} not found")

        trip = self.trips[slot["trip_id"]]
        if not self._is_admin(trip, user_id):
            raise PermissionError(f"User '{user_id}' is not the trip owner/admin ({trip.get('owner_id')})")

        target_prp_id = proposal_id or slot.get("active_proposal_id")
        target_prp = self.proposals.get(target_prp_id)
        if not target_prp:
            raise ValueError(f"Proposal '{target_prp_id}' not found")

        self._confirm_proposal(target_prp, slot, curr_time)
        return {
            "status": "CONFIRMED",
            "message": f"Admin directly confirmed '{target_prp['title']}' into itinerary slot.",
            "confirmed_plan": slot["confirmed_plan"],
            "slot_status": slot["slot_status"],
        }

    def update_trip_mode(
        self,
        trp_id: str,
        mode: str,
        requesting_user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Toggles or updates trip mode between Mode A and Mode NA."""
        trip = self.trips.get(trp_id)
        if not trip:
            raise ValueError(f"Trip {trp_id} not found")

        if requesting_user_id and not self._is_admin(trip, requesting_user_id):
            raise PermissionError(f"Only trip owner ({trip.get('owner_id')}) can change the trip mode")

        if mode not in ("Mode A", "Mode NA"):
            raise ValueError("Trip mode must be 'Mode A' or 'Mode NA'")

        trip["mode"] = mode
        return {"message": f"Trip mode updated to {mode}", "trip": trip}

    def check_window_expiry(
        self,
        prp_id: str,
        now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates the 10-minute voting window for a proposal (Mode NA).
        If closes_at <= now AND no NO votes were cast on this proposal,
        the plan is automatically DECIDED and CONFIRMED in the itinerary!
        """
        curr_time = now or datetime.now(timezone.utc)
        proposal = self.proposals.get(prp_id)
        if not proposal:
            raise ValueError(f"Proposal {prp_id} not found")

        if proposal["status"] != "open":
            return {
                "status": proposal["status"],
                "decided": proposal["status"] == "accepted",
                "message": f"Proposal is already {proposal['status']}.",
            }

        if proposal["closes_at"] is None:
            return {
                "status": "OPEN",
                "decided": False,
                "message": "Voting window is open indefinitely (no closes_at set).",
            }

        closes_at_dt = datetime.fromisoformat(proposal["closes_at"])
        if curr_time < closes_at_dt:
            remaining_seconds = (closes_at_dt - curr_time).total_seconds()
            return {
                "status": "IN_CONSENSUS",
                "decided": False,
                "remaining_seconds": int(remaining_seconds),
                "message": f"Voting window open. {int(remaining_seconds)}s remaining.",
            }

        # Timer has expired! Check if any NO votes exist on this proposal
        vote_list = self.votes.get(prp_id, [])
        no_votes = [v for v in vote_list if v["value"] == "no" and not v.get("comment", "").startswith("Retracted")]
        slot = self.itinerary_items[proposal["itm_id"]]

        if not no_votes:
            # 10 minutes expired without any NO votes -> Auto-CONFIRM!
            self._confirm_proposal(proposal, slot, curr_time)
            return {
                "status": "CONFIRMED",
                "decided": True,
                "message": "10-minute window expired with zero NO votes. Plan is officially decided and confirmed!",
                "proposal": proposal,
                "slot_status": slot["slot_status"],
            }
        else:
            # NO votes were received -> AI triggered again
            trip = self.trips[slot["trip_id"]]
            ai_result = self._trigger_mode_na_ai(proposal, slot, trip, curr_time)
            return {
                "status": "RE_RECONCILED",
                "decided": False,
                "message": "Window expired with objections. AI has re-reconciled.",
                "ai_result": ai_result,
            }

    def _confirm_proposal(
        self,
        proposal: Dict[str, Any],
        slot: Dict[str, Any],
        curr_time: datetime,
    ) -> None:
        """Helper to lock confirmed plan into itinerary slot."""
        proposal["status"] = "accepted"
        proposal["resolved_at"] = curr_time.isoformat()
        slot["slot_status"] = "CONFIRMED"
        slot["confirmed_proposal_id"] = proposal["proposal_id"]
        slot["confirmed_plan"] = {
            "proposal_id": proposal["proposal_id"],
            "title": proposal["title"],
            "rationale": proposal["rationale"],
            "cost": str(Decimal(slot["cost"]) + Decimal(proposal["cost_delta"])),
            "currency": proposal["currency"],
            "entity_type": proposal["entity_type"],
            "entity_id": proposal["entity_id"],
            "confirmed_at": curr_time.isoformat(),
        }

        rev_id = generate_id("rev")
        self.revision_history.setdefault(slot["item_id"], []).append({
            "rev_id": rev_id,
            "itm_id": slot["item_id"],
            "proposal_id": proposal["proposal_id"],
            "parent_proposal_id": proposal.get("parent_proposal_id"),
            "version_number": proposal.get("current_round", 1),
            "event_type": "CONFIRMED",
            "title": proposal["title"],
            "rationale": proposal["rationale"],
            "created_at": curr_time.isoformat(),
        })

    def get_slot_history(self, itm_id: str) -> Dict[str, Any]:
        """
        Returns full structured audit history for an itinerary slot:
        - All proposals in chronological order
        - For each proposal: proposal_id, parent_proposal_id, title, rationale, proposed_by, created_at, resolved_at, status
        - All votes attached to each proposal with vote_id, user_id, value, comment, and cast_at
        - Admin advisory recommendation (if any)
        - Full revision history snapshots
        - Branches (if branched)
        """
        slot = self.itinerary_items.get(itm_id)
        if not slot:
            raise ValueError(f"Itinerary item {itm_id} not found")

        slot_proposals = [p for p in self.proposals.values() if p["itm_id"] == itm_id]
        slot_proposals.sort(key=lambda p: (p.get("current_round", 1), p.get("created_at", "")))

        timeline = []
        for prop in slot_proposals:
            p_id = prop["proposal_id"]
            votes = self.votes.get(p_id, [])
            timeline.append({
                "round": prop.get("current_round", 1),
                "proposal_id": p_id,
                "parent_proposal_id": prop.get("parent_proposal_id"),
                "superseded_by": prop.get("superseded_by"),
                "title": prop["title"],
                "rationale": prop["rationale"],
                "proposed_by": prop.get("proposed_by_user_id"),
                "status": prop.get("status"),
                "created_at": prop.get("created_at"),
                "resolved_at": prop.get("resolved_at"),
                "closes_at": prop.get("closes_at"),
                "votes_count": len(votes),
                "votes": votes,
            })

        return {
            "item_id": itm_id,
            "slot_title": slot["title"],
            "slot_status": slot["slot_status"],
            "active_proposal_id": slot.get("active_proposal_id"),
            "current_round": slot.get("current_round", 1),
            "admin_recommendation": slot.get("admin_recommendation"),
            "proposals_count": len(slot_proposals),
            "timeline": timeline,
            "revision_history": self.revision_history.get(itm_id, []),
            "branches": self.branches.get(itm_id, []),
        }

    def get_slot_proposals(self, itm_id: str) -> Dict[str, Any]:
        """
        Returns all proposals created for an itinerary slot (initial, alternatives, and AI compromises)
        along with structured vote breakdowns (yes_count, no_count, yes_voters, no_voters).
        """
        slot = self.itinerary_items.get(itm_id)
        if not slot:
            raise ValueError(f"Itinerary item {itm_id} not found")

        slot_proposals = [p for p in self.proposals.values() if p["itm_id"] == itm_id]
        slot_proposals.sort(key=lambda p: (p.get("current_round", 1), p.get("created_at", "")))

        proposals_data = []
        for p in slot_proposals:
            p_id = p["proposal_id"]
            votes = self.votes.get(p_id, [])
            yes_voters = [v["user_id"] for v in votes if v["value"] == "yes"]
            no_voters = [v["user_id"] for v in votes if v["value"] == "no" and not v.get("comment", "").startswith("Retracted")]
            proposals_data.append({
                "proposal_id": p_id,
                "parent_proposal_id": p.get("parent_proposal_id"),
                "title": p["title"],
                "rationale": p["rationale"],
                "proposed_by": p.get("proposed_by_user_id"),
                "status": p.get("status"),
                "current_round": p.get("current_round", 1),
                "closes_at": p.get("closes_at"),
                "created_at": p.get("created_at"),
                "resolved_at": p.get("resolved_at"),
                "cost_delta": p.get("cost_delta", "0.00"),
                "currency": p.get("currency", "USD"),
                "votes_summary": {
                    "yes_count": len(yes_voters),
                    "no_count": len(no_voters),
                    "yes_voters": yes_voters,
                    "no_voters": no_voters,
                },
                "votes": votes,
            })

        return {
            "item_id": itm_id,
            "slot_title": slot["title"],
            "slot_status": slot["slot_status"],
            "active_proposal_id": slot.get("active_proposal_id"),
            "current_round": slot.get("current_round", 1),
            "proposals_count": len(proposals_data),
            "proposals": proposals_data,
        }


# Alias for clean architectural naming
ConsensusManager = ModeNAConsensusManager
