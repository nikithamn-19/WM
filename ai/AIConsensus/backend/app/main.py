"""FastAPI Interactive Server with Swagger UI for WanderMatch AI Consensus Engine.

Provides an interactive Swagger UI at http://localhost:8000/docs to test all consensus flows:
- Mode A (Admin-Led): Admin final say, advisory AI recommendations, force branch, extend, accept
- Mode NA (Collaborative / Automatic): Automatic AI reconciliation, 10-minute countdown timer, auto-confirmation
- Voting: Unanimous fast-path, single active YES retraction, batch multi-member voting
- Direct AI compromise generator & branch grouping playground
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

# Ensure UTF-8 output encoding on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.services.consensus_service import ConsensusManager
from backend.ai.core.blended_plan_generator import generate_blended_plan
from backend.ai.core.branch_grouping import group_into_branches
from backend.ai.llm.client import get_llm_config

app = FastAPI(
    title="WanderMatch AI Consensus API",
    description=(
        "Interactive Swagger UI for WanderMatch AI Consensus Engine.\n\n"
        "Supports:\n"
        "- **Mode A (Admin-Led)**: Advisory AI recommendations, Admin Accept, Force Branch, Extend Round.\n"
        "- **Mode NA (Collaborative)**: Automatic AI reconciliation, 10-minute timer window, auto-confirmation on expiry.\n"
        "- **Voting**: Unanimous fast-path, Single-active YES retraction, Multi-member batch voting."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory consensus state manager
manager = ConsensusManager()


def _seed_demo_data():
    """Seeds both Mode NA and Mode A sample trips for instant out-of-the-box Swagger testing."""
    # 1. Mode NA (Collaborative) Trip
    manager.register_trip(
        trip_id="trp_demo",
        title="Goa Friends Trip",
        destination_city="Goa",
        members=["panch", "alice", "bob", "charlie", "david"],
        mode="Mode NA",
        owner_id="panch",
    )
    manager.create_itinerary_slot(
        item_id="itm_morning",
        trip_id="trp_demo",
        title="Day 1 Morning Slot (09:00 - 13:00)",
        time_slot="Morning",
    )
    manager.create_proposal(
        itm_id="itm_morning",
        proposed_by_user_id="panch",
        title="Baga Beach Sunbathing",
        rationale="Relaxing on the sand and swimming in the Arabian Sea.",
    )

    # 2. Mode A (Admin-Led) Trip
    manager.register_trip(
        trip_id="trp_bali_mode_a",
        title="Bali Tropical Escape (Admin Mode)",
        destination_city="Bali",
        members=["panch", "alice", "bob", "charlie", "david"],
        mode="Mode A",
        owner_id="panch",
    )
    manager.create_itinerary_slot(
        item_id="itm_bali_morning",
        trip_id="trp_bali_mode_a",
        title="Day 1 Bali Morning Slot (09:00 - 13:00)",
        time_slot="Morning",
    )
    manager.create_proposal(
        itm_id="itm_bali_morning",
        proposed_by_user_id="panch",
        title="Uluwatu Cliffside Temple Tour",
        rationale="Historic oceanfront cliff temple visit and traditional dance.",
    )


_seed_demo_data()


# --- Request / Response Models ---

class CreateTripRequest(BaseModel):
    trip_id: str = Field(default="trp_tokyo", description="Unique ID for trip e.g. trp_tokyo")
    title: str = Field(default="Tokyo Exploration", description="Trip name")
    destination_city: str = Field(default="Tokyo", description="Destination city")
    members: List[str] = Field(default=["alice", "bob", "charlie"], description="List of member user IDs")
    mode: str = Field(default="Mode A", description="'Mode A' (Admin-Led) or 'Mode NA' (Collaborative)")
    owner_id: Optional[str] = Field(default="alice", description="Trip owner / admin ID")


class CreateSlotRequest(BaseModel):
    item_id: str = Field(default="itm_dinner", description="Unique ID for itinerary slot")
    trip_id: str = Field(default="trp_bali_mode_a", description="Trip ID this slot belongs to")
    title: str = Field(default="Day 1 Dinner Slot (19:00 - 22:00)", description="Slot title")
    time_slot: str = Field(default="Night", description="Morning | Afternoon | Evening | Night")


class CreateProposalRequest(BaseModel):
    itm_id: str = Field(default="itm_bali_morning", description="Itinerary slot ID")
    proposed_by_user_id: str = Field(default="alice", description="Member proposing")
    title: str = Field(default="Jimbaran Bay Seafood Dinner", description="Activity title")
    rationale: str = Field(default="Fresh grilled catch on the beach at sunset.", description="Activity rationale")
    cost_delta: str = Field(default="0.00", description="Cost delta e.g. 0.00 or 15.00")
    currency: str = Field(default="USD", description="Currency code e.g. USD, EUR, INR")


class CastVoteRequest(BaseModel):
    prp_id: Optional[str] = Field(
        default=None,
        description="Proposal ID being voted on. If omitted, automatically targets the slot's current active proposal!"
    )
    itm_id: Optional[str] = Field(
        default="itm_bali_morning",
        description="Itinerary slot ID (used to auto-target the current active recommendation if prp_id is omitted)"
    )
    user_id: str = Field(default="bob", description="Member casting the vote")
    value: str = Field(default="no", description="'yes' or 'no'")
    comment: Optional[str] = Field(
        default="Too crowded, I prefer peaceful botanical gardens and waterfalls",
        description="Mandatory reason if value is 'no'"
    )


class SingleMemberVote(BaseModel):
    user_id: str = Field(default="bob", description="Member ID (e.g. alice, bob, charlie, david)")
    value: str = Field(default="no", description="'yes' or 'no'")
    comment: Optional[str] = Field(default="jog instead", description="Mandatory objection reason if value is 'no'")


class BatchVotesRequest(BaseModel):
    itm_id: Optional[str] = Field(default="itm_bali_morning", description="Itinerary slot ID (auto-targets active proposal)")
    prp_id: Optional[str] = Field(default=None, description="Specific proposal ID (optional if itm_id provided)")
    votes: List[SingleMemberVote] = Field(
        default=[
            SingleMemberVote(user_id="bob", value="no", comment="I want peaceful hot springs and massage"),
            SingleMemberVote(user_id="charlie", value="no", comment="I want scuba diving and watersports"),
        ],
        description="List of votes from multiple members to submit simultaneously"
    )


class ModeAInvokeRequest(BaseModel):
    itm_id: str = Field(default="itm_bali_morning", description="Itinerary slot ID")
    user_id: str = Field(default="panch", description="Admin user ID (must be trip owner)")


class ModeAAcceptRequest(BaseModel):
    itm_id: str = Field(default="itm_bali_morning", description="Itinerary slot ID")
    user_id: str = Field(default="panch", description="Admin user ID (must be trip owner)")
    proposal_id: Optional[str] = Field(default=None, description="Optional specific proposal ID to accept")


class ModeAForceBranchRequest(BaseModel):
    itm_id: str = Field(default="itm_bali_morning", description="Itinerary slot ID")
    user_id: str = Field(default="panch", description="Admin user ID (must be trip owner)")


class ModeAExtendRequest(BaseModel):
    itm_id: str = Field(default="itm_bali_morning", description="Itinerary slot ID")
    user_id: str = Field(default="panch", description="Admin user ID (must be trip owner)")
    extend_minutes: Optional[int] = Field(default=15, description="Minutes to extend the voting window")


class ModeADirectConfirmRequest(BaseModel):
    itm_id: str = Field(default="itm_bali_morning", description="Itinerary slot ID")
    user_id: str = Field(default="panch", description="Admin user ID (must be trip owner)")
    proposal_id: Optional[str] = Field(default=None, description="Specific proposal ID to directly confirm")


class UpdateTripModeRequest(BaseModel):
    mode: str = Field(default="Mode A", description="'Mode A' (Admin-Led) or 'Mode NA' (Collaborative)")
    user_id: Optional[str] = Field(default="panch", description="User ID requesting mode change (must be owner)")


class ReconcileRequest(BaseModel):
    prp_id: str = Field(description="Proposal ID to reconcile")
    user_id: Optional[str] = Field(default=None, description="Requesting user ID")


class CheckTimerRequest(BaseModel):
    prp_id: str = Field(description="Proposal ID to check timer for")
    advance_minutes: float = Field(
        default=0.0,
        description="Simulate advancing time forward by N minutes (e.g. 10.0 to trigger window expiry)"
    )


class DirectCompromiseRequest(BaseModel):
    destination_city: str = Field(default="Tokyo", description="Destination city")
    proposed_title: str = Field(default="North Indian Dinner", description="Original proposed activity")
    proposed_rationale: str = Field(default="Filling tandoori and rich curries", description="Original rationale")
    objections: List[str] = Field(
        default=["I want Japanese ramen with hot broth"],
        description="List of typed objections from NO-voters"
    )
    currency: str = Field(default="USD", description="Currency code")


class DirectBranchRequest(BaseModel):
    destination_city: str = Field(default="Goa", description="Destination city")
    activity_title: str = Field(default="Mountain Waterfall Trek", description="Activity being disagreed on")
    holdouts: List[Dict[str, str]] = Field(
        default=[
            {"user_id": "alice", "comment": "Injured ankle, need quiet wellness hot springs spa"},
            {"user_id": "bob", "comment": "Extreme skydiving and bungee jumping only"},
            {"user_id": "charlie", "comment": "Historic temple architectural photography walk"},
        ],
        description="List of members with distinct incompatible preferences"
    )


# --- General Endpoints ---

@app.get("/", tags=["General"])
def root():
    base_url, api_key, model = get_llm_config()
    provider_status = f"Live LLM Active ({model})" if api_key else "Offline Semantic Engine"
    return {
        "app": "WanderMatch AI Consensus API",
        "supported_modes": ["Mode A (Admin-Led)", "Mode NA (Collaborative)"],
        "llm_status": provider_status,
        "swagger_docs": "http://localhost:8000/docs",
        "message": "Navigate to /docs in your browser to test all scenarios interactively!"
    }


@app.get("/api/health", tags=["General"])
def health_check():
    base_url, api_key, model = get_llm_config()
    return {
        "status": "healthy",
        "supported_modes": ["Mode A", "Mode NA"],
        "llm_provider": "Groq" if "groq" in base_url else "OpenAI" if "openai" in base_url else "Google Gemini" if api_key else "Offline Heuristic",
        "model": model,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# --- Trips & Itinerary Endpoints ---

@app.post("/api/trips", tags=["Trips & Itinerary"])
def create_trip(req: CreateTripRequest):
    """Registers a trip with members, trip mode ('Mode A' or 'Mode NA'), and owner."""
    trip = manager.register_trip(
        trip_id=req.trip_id,
        title=req.title,
        destination_city=req.destination_city,
        members=req.members,
        mode=req.mode,
        owner_id=req.owner_id,
    )
    return {"message": "Trip created successfully", "trip": trip}


@app.get("/api/trips/{trp_id}", tags=["Trips & Itinerary"])
def get_trip(trp_id: str):
    """Returns full trip details with slots, active proposals, and vote status."""
    trip = manager.trips.get(trp_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    slots = [s for s in manager.itinerary_items.values() if s["trip_id"] == trp_id]
    proposals = [p for p in manager.proposals.values() if p["trp_id"] == trp_id]
    return {
        "trip": trip,
        "itinerary_slots": slots,
        "proposals": proposals,
        "all_votes": manager.votes,
    }


@app.patch("/api/trips/{trp_id}", tags=["Trips & Itinerary"])
def update_trip(trp_id: str, req: UpdateTripModeRequest):
    """Toggles or updates trip mode between Mode A (Admin) and Mode NA (Collaborative)."""
    try:
        return manager.update_trip_mode(trp_id=trp_id, mode=req.mode, requesting_user_id=req.user_id)
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/slots", tags=["Trips & Itinerary"])
def create_slot(req: CreateSlotRequest):
    """Creates a time slot in the trip itinerary (status starts as EMPTY)."""
    slot = manager.create_itinerary_slot(
        item_id=req.item_id,
        trip_id=req.trip_id,
        title=req.title,
        time_slot=req.time_slot,
    )
    return {"message": "Itinerary slot created", "slot": slot}


# --- Proposals & Voting Endpoints ---

@app.post("/api/proposals", tags=["Proposals & Voting"])
def create_proposal(req: CreateProposalRequest):
    """Submits an initial activity proposal for a slot. closes_at starts as NULL."""
    try:
        proposal = manager.create_proposal(
            itm_id=req.itm_id,
            proposed_by_user_id=req.proposed_by_user_id,
            title=req.title,
            rationale=req.rationale,
            cost_delta=req.cost_delta,
            currency=req.currency,
        )
        return {"message": "Proposal created. Status is IN_CONSENSUS.", "proposal": proposal}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/slots/{itm_id}/active-proposal", tags=["Proposals & Voting"])
def get_active_proposal_for_slot(itm_id: str):
    """Returns the current active proposal open for voting on an itinerary slot."""
    slot = manager.itinerary_items.get(itm_id)
    if not slot:
        raise HTTPException(status_code=404, detail=f"Itinerary slot '{itm_id}' not found")
    active_prp_id = slot.get("active_proposal_id")
    proposal = manager.proposals.get(active_prp_id) if active_prp_id else None
    votes = manager.votes.get(active_prp_id, []) if active_prp_id else []
    return {
        "slot_id": itm_id,
        "slot_status": slot["slot_status"],
        "current_round": slot["current_round"],
        "active_proposal_id": active_prp_id,
        "active_proposal": proposal,
        "admin_recommendation": slot.get("admin_recommendation"),
        "votes_count": len(votes),
        "votes": votes,
    }


@app.get("/api/slots/{itm_id}/proposals", tags=["Proposals & Voting"])
def get_slot_proposals(itm_id: str):
    """
    Returns all proposals for an itinerary slot (initial, member alternatives, and AI compromise proposals)
    with full vote breakdowns and counts.
    """
    try:
        return manager.get_slot_proposals(itm_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/slots/{itm_id}/history", tags=["Proposals & Voting"])
def get_slot_history(itm_id: str):
    """
    Returns full chronological proposal and voting history for an itinerary slot.
    Tracks every proposal_id, parent_proposal_id, who proposed it, all votes with comments,
    and timestamps for creation and resolution. Perfect for UI audit timeline!
    """
    try:
        return manager.get_slot_history(itm_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/votes", tags=["Proposals & Voting"])
def cast_vote(req: Union[CastVoteRequest, List[CastVoteRequest]]):
    """
    Casts one or more votes on a proposal.
    - Pass a single vote or an array of votes.
    - If all members vote YES: confirms immediately (fast-path)!
    - In Mode NA: First NO starts 10-minute timer and creates automatic AI compromise.
    - In Mode A: NO votes do NOT start a timer. AI generates an ADVISORY recommendation for admin approval.
    """
    if isinstance(req, list):
        try:
            return manager.cast_votes_batch([v.model_dump() for v in req])
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    target_prp_id = req.prp_id
    if not target_prp_id and req.itm_id:
        slot = manager.itinerary_items.get(req.itm_id)
        if slot:
            target_prp_id = slot.get("active_proposal_id")

    if not target_prp_id:
        raise HTTPException(
            status_code=400,
            detail="Please provide 'prp_id' or an 'itm_id' that has an active proposal open for voting."
        )

    try:
        result = manager.cast_vote(
            prp_id=target_prp_id,
            user_id=req.user_id,
            value=req.value,
            comment=req.comment,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/votes/batch", tags=["Proposals & Voting"])
def cast_batch_votes(req: BatchVotesRequest):
    """Submits multiple votes at once from multiple members in a single batch request."""
    votes_data = []
    for v in req.votes:
        votes_data.append({
            "itm_id": req.itm_id,
            "prp_id": req.prp_id,
            "user_id": v.user_id,
            "value": v.value,
            "comment": v.comment,
        })
    try:
        return manager.cast_votes_batch(votes_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Mode A Admin Controls ---

@app.post("/api/consensus/mode-a/invoke", tags=["Mode A Admin Controls"])
def mode_a_invoke_ai(req: ModeAInvokeRequest):
    """
    Admin explicitly triggers AI reconciliation advice for a slot in Mode A.
    Returns an ADVISORY recommendation (blended plan or branches).
    Gated to trip owner/admin only.
    """
    try:
        return manager.invoke_mode_a_ai(itm_id=req.itm_id, user_id=req.user_id)
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/consensus/mode-a/accept", tags=["Mode A Admin Controls"])
def mode_a_accept(req: ModeAAcceptRequest):
    """
    Admin accepts the AI advisory recommendation or proposal, locking it into the itinerary.
    Slot status transitions to CONFIRMED (or BRANCHED).
    Gated to trip owner/admin only.
    """
    try:
        return manager.admin_accept(
            itm_id=req.itm_id,
            user_id=req.user_id,
            proposal_id=req.proposal_id,
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/consensus/mode-a/force-branch", tags=["Mode A Admin Controls"])
def mode_a_force_branch(req: ModeAForceBranchRequest):
    """
    Admin overrides the consensus process and forces immediate parallel branching for the slot.
    Holdouts are clustered into parallel branches with single-member auto-finalization.
    Gated to trip owner/admin only.
    """
    try:
        return manager.admin_force_branch(itm_id=req.itm_id, user_id=req.user_id)
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/consensus/mode-a/extend", tags=["Mode A Admin Controls"])
def mode_a_extend_round(req: ModeAExtendRequest):
    """
    Admin extends the voting round beyond the advisory round cap without auto-branching.
    Gated to trip owner/admin only.
    """
    try:
        return manager.admin_extend(
            itm_id=req.itm_id,
            user_id=req.user_id,
            extend_minutes=req.extend_minutes,
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/consensus/mode-a/direct-confirm", tags=["Mode A Admin Controls"])
def mode_a_direct_confirm(req: ModeADirectConfirmRequest):
    """
    Admin directly confirms any open proposal into the itinerary slot without waiting.
    Gated to trip owner/admin only.
    """
    try:
        return manager.admin_direct_confirm(
            itm_id=req.itm_id,
            user_id=req.user_id,
            proposal_id=req.proposal_id,
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/consensus/reconcile", tags=["Mode A & Mode NA Consensus"])
def consensus_reconcile(req: ReconcileRequest):
    """
    Unified consensus reconciliation endpoint per PANCHAMI.md line 771.
    Dispatches to Mode A or Mode NA depending on trip mode.
    """
    proposal = manager.proposals.get(req.prp_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    slot = manager.itinerary_items.get(proposal["itm_id"])
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    trip = manager.trips.get(slot["trip_id"])
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.get("mode") == "Mode A":
        user_id = req.user_id or trip.get("owner_id")
        try:
            return manager.invoke_mode_a_ai(itm_id=slot["item_id"], user_id=user_id)
        except PermissionError as pe:
            raise HTTPException(status_code=403, detail=str(pe))
    else:
        curr_time = datetime.now(timezone.utc)
        return manager._trigger_mode_na_ai(proposal, slot, trip, curr_time)


# --- 10-Minute Timer Simulation (Mode NA) ---

@app.post("/api/proposals/check-timer", tags=["10-Minute Timer Simulation"])
def check_timer(req: CheckTimerRequest):
    """
    Evaluates the 10-minute voting window for a proposal (Mode NA).
    Use 'advance_minutes' to simulate advancing the clock forward (e.g. 10.0 minutes)
    to verify automatic confirmation when no NO votes were cast!
    """
    try:
        simulated_time = datetime.now(timezone.utc) + timedelta(minutes=req.advance_minutes)
        result = manager.check_window_expiry(prp_id=req.prp_id, now=simulated_time)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- AI Playgrounds ---

@app.post("/api/ai/direct-compromise", tags=["AI Playground"])
def direct_compromise_playground(req: DirectCompromiseRequest):
    """
    Directly test the AI Consensus Compromise generator with ANY custom inputs!
    Returns a real-life spot in the destination city that reconciles the desires.
    """
    current_prop = {
        "title": req.proposed_title,
        "rationale": req.proposed_rationale,
        "currency": req.currency,
        "entity_type": "poi",
        "entity_id": "poi_custom",
        "cost_delta": "0.00",
    }
    no_comments = [{"user_id": f"u_{i}", "comment": c} for i, c in enumerate(req.objections, 1)]
    trip_ctx = {"destination_city": req.destination_city}

    result = generate_blended_plan(
        current_proposal=current_prop,
        no_vote_comments=no_comments,
        itinerary_item={"currency": req.currency, "cost": "0.00"},
        trip_context=trip_ctx,
        current_round=1,
    )
    return result


@app.post("/api/ai/direct-branch", tags=["AI Playground"])
def direct_branch_playground(req: DirectBranchRequest):
    """
    Directly test the AI Multi-Way Branch Grouping engine with irreconcilable inputs!
    Returns parallel branches with single-member auto-finalization.
    """
    trip_ctx = {"destination_city": req.destination_city}
    slot_info = {"item_id": "itm_branch", "title": req.activity_title, "currency": "USD"}
    result = group_into_branches(req.holdouts, slot_info, trip_ctx)
    return result


@app.post("/api/reset", tags=["General"])
def reset_state():
    """Resets all in-memory data to default seed state with Mode NA and Mode A trips."""
    global manager
    manager = ConsensusManager()
    _seed_demo_data()
    return {"message": "State reset to default seed with Mode NA (trp_demo) and Mode A (trp_bali_mode_a) active proposals."}


# --- DeepFace & Memories Service Unification (Forwarder to DeepFace Service on Port 8001) ---
import httpx
from fastapi import Request, Response

DEEPFACE_SERVICE_URL = os.getenv("DEEPFACE_SERVICE_URL", "http://127.0.0.1:8001")

@app.api_route("/api/face/{path:path}", methods=["GET", "POST", "PUT", "DELETE"], tags=["DeepFace & Face Recognition"])
@app.api_route("/api/photos", methods=["GET", "POST"], tags=["DeepFace & Photos"])
@app.api_route("/api/photos/{path:path}", methods=["GET", "POST"], tags=["DeepFace & Photos"])
@app.api_route("/api/memories/{path:path}", methods=["GET"], tags=["DeepFace & Memories"])
@app.api_route("/static/{path:path}", methods=["GET"], tags=["Static Uploads"])
async def forward_to_deepface(request: Request, path: str = ""):
    target_url = f"{DEEPFACE_SERVICE_URL}{request.url.path}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"
    
    headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}
    body = await request.body()

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
            )
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers={k: v for k, v in resp.headers.items() if k.lower() not in ("content-length", "content-encoding", "transfer-encoding")},
                media_type=resp.headers.get("content-type"),
            )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"DeepFace service unreachable at {DEEPFACE_SERVICE_URL}: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
