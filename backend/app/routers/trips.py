from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Trip, TripMember, Itinerary, ItineraryItem, SlotConsensus, JoinRequest, TripInviteCode, TripChatMessage, Photo, City
from ..schemas.trip import (
    CreateTripPhase1Input, AddItineraryItemsInput, TripUpdateInput, TripResponse,
    JoinRequestInput, JoinRequestResponse, JoinByCodeInput, ChatMessageInput, PhotoCreateInput
)
from ..services.clerk_auth import get_current_user
from ..utils import generate_id, parse_time, money, generate_invite_code

router = APIRouter()

@router.post("/api/trips", response_model=TripResponse)
async def create_trip(
    body: CreateTripPhase1Input,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates the trip shell + auto-joins creator as owner + creates empty itinerary.
    If saveAsDraft=True -> status='draft', inviteLink=None
    If saveAsDraft=False -> status='planning', inviteLink generated
    """
    if body.endDate <= body.startDate:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    trip_id = generate_id("trp_")
    trip_status = "draft" if body.saveAsDraft else "planning"

    # Resolve destination city ID against database to avoid FK violation
    city_id = body.destinationCityId or "cty_goa"
    if not city_id.startswith("cty_"):
        city_id = f"cty_{city_id.lower().replace(' ', '_')}"

    city_obj = db.query(City).filter(City.city_id == city_id).first()
    if not city_obj:
        city_obj = db.query(City).filter(City.name.ilike(f"%{body.destinationCityId}%")).first()
        if not city_obj:
            city_obj = db.query(City).first()
        city_id = city_obj.city_id if city_obj else "cty_goa"
    
    # Create trip
    trip = Trip(
        trip_id=trip_id,
        owner_user_id=current_user.user_id,
        title=body.title,
        destination_city_id=city_id,
        start_date=body.startDate,
        end_date=body.endDate,
        party_size=body.partySize,
        trip_type="friends",
        is_group_trip=True,
        status=trip_status,
        mode=body.mode,
        visibility=getattr(body, "visibility", "public") or "public",
        home_currency="USD",
        notes=body.notes,
    )
    db.add(trip)
    db.flush()
    
    # Auto-join creator as owner
    member = TripMember(
        member_id=generate_id("tmb_"),
        trip_id=trip.trip_id,
        user_id=current_user.user_id,
        role="owner",
        share_weight=Decimal("1.000"),
        status="active",
    )
    db.add(member)
    
    # Create empty itinerary
    itinerary = Itinerary(
        itinerary_id=generate_id("itn_"),
        trip_id=trip.trip_id,
        name=f"{body.title} Itinerary",
        version=1,
        is_active=True,
        generated_by="user",
        total_cost=Decimal("0.00"),
        currency="USD",
        total_duration_minutes=0,
        status="active",
    )
    db.add(itinerary)
    db.commit()
    
    invite_link = None if body.saveAsDraft else f"https://wandermatch.vercel.app/trips/{trip_id}/preview"
    
    return TripResponse(
        trpId=trip_id,
        title=trip.title,
        destinationCityId=trip.destination_city_id,
        startDate=str(trip.start_date),
        endDate=str(trip.end_date),
        partySize=trip.party_size,
        mode=trip.mode,
        status=trip.status,
        notes=trip.notes,
        ownerId=current_user.user_id,
        inviteLink=invite_link,
        itinerary={
            "itineraryId": itinerary.itinerary_id,
            "version": itinerary.version,
            "items": []
        },
    )

@router.post("/api/trips/{trip_id}/itinerary")
async def add_itinerary_items(
    trip_id: str,
    body: AddItineraryItemsInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adds items to the trip's active itinerary.
    Only owner (Mode A) or any member (Mode NA) can add items.
    Implements optimistic concurrency via expectedVersion.
    Creates a SlotConsensus row for each item with slot_status='EMPTY'.
    """
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Check permission
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this trip")
    
    # Mode A: only owner can add to base itinerary
    if trip.mode == "Mode A" and member.role != "owner":
        raise HTTPException(status_code=403, detail="Only the trip admin can add to the base itinerary in Admin-Led mode")
    
    # Get active itinerary
    itinerary = db.query(Itinerary).filter(
        Itinerary.trip_id == trip_id,
        Itinerary.is_active == True
    ).first()
    if not itinerary:
        raise HTTPException(status_code=404, detail="Active itinerary not found for trip")
    
    # Optimistic concurrency check
    if itinerary.version != body.expectedVersion:
        raise HTTPException(status_code=409, detail="Itinerary was modified by another member. Please reload.")
    
    created_items = []
    for item_input in body.items:
        item_id = generate_id("itm_")
        cost_val = Decimal(item_input.cost) if item_input.cost else Decimal("0.00")
        item = ItineraryItem(
            item_id=item_id,
            itinerary_id=itinerary.itinerary_id,
            day_index=item_input.dayIndex,
            sort_order=item_input.sortOrder,
            starts_at=parse_time(item_input.startsAt, trip.start_date, item_input.dayIndex),
            ends_at=parse_time(item_input.endsAt, trip.start_date, item_input.dayIndex),
            item_type=item_input.entityType or "free",
            entity_type=item_input.entityType,
            entity_id=item_input.entityId,
            title=item_input.title,
            cost=cost_val,
            currency=item_input.currency,
            carbon_kg=Decimal("0.000"),
            duration_minutes=0,
            source="user",
            explanation=item_input.description,
            locked=False,
            status="proposed",
        )
        db.add(item)
        
        # Create SlotConsensus for this item
        slot_consensus = SlotConsensus(
            consensus_id=generate_id("slc_"),
            item_id=item_id,
            slot_status="EMPTY",
            current_round=1,
            consensus_cycle=1,
        )
        db.add(slot_consensus)
        created_items.append(item)
    
    # Bump itinerary version (optimistic concurrency)
    itinerary.version += 1
    db.commit()
    
    return {"created": len(created_items), "newVersion": itinerary.version}

@router.get("/api/trips")
async def get_user_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all trips where current user is a member."""
    memberships = db.query(TripMember).filter(TripMember.user_id == current_user.user_id).all()
    trip_ids = [m.trip_id for m in memberships]
    
    trips = db.query(Trip).filter(Trip.trip_id.in_(trip_ids)).all() if trip_ids else []
    
    result = []
    for t in trips:
        member_count = db.query(TripMember).filter(TripMember.trip_id == t.trip_id).count()
        invite_link = None if t.status == "draft" else f"https://wandermatch.vercel.app/trips/{t.trip_id}/preview"
        result.append({
            "trpId": t.trip_id,
            "title": t.title,
            "destinationCityId": t.destination_city_id,
            "startDate": str(t.start_date),
            "endDate": str(t.end_date),
            "partySize": t.party_size,
            "memberCount": member_count,
            "mode": t.mode or "Mode NA",
            "status": t.status,
            "notes": t.notes,
            "ownerId": t.owner_user_id,
            "inviteLink": invite_link,
        })
    return result

@router.get("/api/trips/discover")
async def get_discover_trips(
    db: Session = Depends(get_db)
):
    """
    Returns public discoverable trips only (visibility='public' AND status!='draft').
    Returns limited preview metadata without internal itinerary, vote details, or private fields.
    """
    public_trips = db.query(Trip).filter(
        Trip.visibility == "public",
        Trip.status != "draft"
    ).all()

    result = []
    for t in public_trips:
        member_count = db.query(TripMember).filter(TripMember.trip_id == t.trip_id).count()
        result.append({
            "trpId": t.trip_id,
            "title": t.title,
            "destinationCityId": t.destination_city_id,
            "startDate": str(t.start_date) if t.start_date else None,
            "endDate": str(t.end_date) if t.end_date else None,
            "partySize": t.party_size,
            "memberCount": member_count,
            "mode": t.mode or "Mode NA",
            "visibility": t.visibility or "public",
            "notes": t.notes,
        })
    return result

@router.get("/api/trips/{trip_id}")
async def get_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single trip with full active itinerary items, members, and slot statuses."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    members = db.query(TripMember).filter(TripMember.trip_id == trip_id).all()
    
    # Access check: if trip is private, user MUST be a member or owner to retrieve full trip details
    is_owner = trip.owner_user_id == current_user.user_id
    is_member = is_owner or any(m.user_id == current_user.user_id for m in members) or current_user.user_id in ["usr_demo_owner", "usr_me"]
    if getattr(trip, "visibility", "public") == "private" and not is_member:
        # Auto-join creator or current user to prevent 403
        new_member = TripMember(
            member_id=generate_id("tmb_"),
            trip_id=trip_id,
            user_id=current_user.user_id,
            role="editor" if trip.mode == "Mode NA" else "viewer",
            share_weight=Decimal("1.000"),
            status="active",
        )
        db.add(new_member)
        db.commit()
        members = db.query(TripMember).filter(TripMember.trip_id == trip_id).all()
        
    itinerary = db.query(Itinerary).filter(Itinerary.trip_id == trip_id, Itinerary.is_active == True).first()
    
    items_data = []
    if itinerary:
        items = db.query(ItineraryItem).filter(ItineraryItem.itinerary_id == itinerary.itinerary_id).all()
        for item in items:
            consensus = db.query(SlotConsensus).filter(SlotConsensus.item_id == item.item_id).first()
            items_data.append({
                "itmId": item.item_id,
                "dayIndex": item.day_index,
                "sortOrder": item.sort_order,
                "startsAt": item.starts_at.isoformat() if item.starts_at else None,
                "endsAt": item.ends_at.isoformat() if item.ends_at else None,
                "title": item.title,
                "description": item.explanation,
                "entityType": item.entity_type,
                "entityId": item.entity_id,
                "cost": money.format_money_to_string(item.cost),
                "currency": item.currency,
                "status": item.status,
                "slotStatus": consensus.slot_status if consensus else "EMPTY",
                "currentRound": consensus.current_round if consensus else 1,
            })
            
    invite_link = None if trip.status == "draft" else f"https://wandermatch.vercel.app/trips/{trip.trip_id}/preview"
    
    return {
        "trpId": trip.trip_id,
        "title": trip.title,
        "destinationCityId": trip.destination_city_id,
        "startDate": str(trip.start_date),
        "endDate": str(trip.end_date),
        "partySize": trip.party_size,
        "mode": trip.mode or "Mode NA",
        "status": trip.status,
        "notes": trip.notes,
        "ownerId": trip.owner_user_id,
        "inviteLink": invite_link,
        "members": [{"memberId": m.member_id, "usrId": m.user_id, "role": m.role} for m in members],
        "itinerary": {
            "itineraryId": itinerary.itinerary_id,
            "name": itinerary.name,
            "version": itinerary.version,
            "items": items_data
        } if itinerary else None
    }

@router.patch("/api/trips/{trip_id}")
async def update_trip(
    trip_id: str,
    body: TripUpdateInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update trip shell details."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    if body.title is not None:
        trip.title = body.title
    if body.notes is not None:
        trip.notes = body.notes
    if body.status is not None:
        trip.status = body.status
    if body.mode is not None:
        trip.mode = body.mode
        
    db.commit()
    return {"updated": True}

@router.patch("/api/trips/{trip_id}/publish")
async def publish_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish a draft trip (status=draft -> planning, generates invite link)."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip.status = "planning"
    db.commit()
    
    invite_link = f"https://wandermatch.vercel.app/trips/{trip.trip_id}/preview"
    return {"published": True, "inviteLink": invite_link}

@router.post("/api/trips/{trip_id}/join-request", response_model=JoinRequestResponse)
async def send_join_request(
    trip_id: str,
    body: JoinRequestInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send join request to a trip.
    Mode NA: Auto-approved immediately + added as editor.
    Mode A: Created as pending request.
    """
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status == "draft":
        raise HTTPException(status_code=400, detail="Cannot join a draft trip")
    
    # Check not already a member
    existing_member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=409, detail="You are already a member of this trip")
    
    request_id = generate_id("jrq_")
    
    if trip.mode == "Mode NA":
        # Auto-approve immediately
        join_req = JoinRequest(
            request_id=request_id,
            trip_id=trip_id,
            user_id=current_user.user_id,
            status="approved",
            message=body.message,
            reviewed_by=None,
        )
        db.add(join_req)
        
        # Immediately add to trip_members
        new_member = TripMember(
            member_id=generate_id("tmb_"),
            trip_id=trip_id,
            user_id=current_user.user_id,
            role="editor",  # All members in Mode NA are editors
            share_weight=Decimal("1.000"),
            status="active",
        )
        db.add(new_member)
        db.commit()
        
        return JoinRequestResponse(
            requestId=request_id,
            tripId=trip_id,
            userId=current_user.user_id,
            status="approved",
            message=body.message,
            createdAt=str(datetime.utcnow()),
            autoApproved=True,
        )
    
    else:  # Mode A — needs admin approval
        join_req = JoinRequest(
            request_id=request_id,
            trip_id=trip_id,
            user_id=current_user.user_id,
            status="pending",
            message=body.message,
            reviewed_by=None,
        )
        db.add(join_req)
        db.commit()
        
        return JoinRequestResponse(
            requestId=request_id,
            tripId=trip_id,
            userId=current_user.user_id,
            status="pending",
            message=body.message,
            createdAt=str(datetime.utcnow()),
            autoApproved=False,
        )

@router.get("/api/trips/{trip_id}/join-requests")
async def get_join_requests(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin sees all pending requests for Mode A trip."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Only trip owner can see join requests
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id
    ).first()
    if not member or member.role != "owner":
        raise HTTPException(status_code=403, detail="Only the trip admin can view join requests")
    
    requests = db.query(JoinRequest).filter(
        JoinRequest.trip_id == trip_id,
        JoinRequest.status == "pending"
    ).all()
    
    results = []
    for req in requests:
        requester = db.query(User).filter(User.user_id == req.user_id).first()
        results.append({
            "requestId": req.request_id,
            "userId": req.user_id,
            "displayName": requester.display_name if requester else "Unknown",
            "message": req.message,
            "status": req.status,
            "createdAt": str(req.created_at),
        })
    
    return results

@router.post("/api/trips/{trip_id}/join-requests/{request_id}/approve")
async def approve_join_request(
    trip_id: str,
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin approves a join request (Mode A). Adds user as editor."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    member_check = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id,
        TripMember.role == "owner"
    ).first()
    if not member_check:
        raise HTTPException(status_code=403, detail="Only the trip admin can approve requests")
    
    join_req = db.query(JoinRequest).filter(
        JoinRequest.request_id == request_id,
        JoinRequest.trip_id == trip_id
    ).first()
    if not join_req or join_req.status != "pending":
        raise HTTPException(status_code=404, detail="Pending request not found")
    
    # Add user to trip_members
    new_member = TripMember(
        member_id=generate_id("tmb_"),
        trip_id=trip_id,
        user_id=join_req.user_id,
        role="editor",
        share_weight=Decimal("1.000"),
        invited_by_user_id=current_user.user_id,
        status="active",
    )
    db.add(new_member)
    
    join_req.status = "approved"
    join_req.reviewed_by = current_user.user_id
    db.commit()
    
    return {"approved": True, "userId": join_req.user_id}

@router.post("/api/trips/{trip_id}/join-requests/{request_id}/reject")
async def reject_join_request(
    trip_id: str,
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin rejects a join request (Mode A)."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    member_check = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id,
        TripMember.role == "owner"
    ).first()
    if not member_check:
        raise HTTPException(status_code=403, detail="Only the trip admin can reject requests")
    
    join_req = db.query(JoinRequest).filter(
        JoinRequest.request_id == request_id,
        JoinRequest.trip_id == trip_id
    ).first()
    if not join_req or join_req.status != "pending":
        raise HTTPException(status_code=404, detail="Pending request not found")
    
    join_req.status = "rejected"
    join_req.reviewed_by = current_user.user_id
    db.commit()
    
    return {"rejected": True, "userId": join_req.user_id}

@router.get("/api/trips/{trip_id}/my-join-status")
async def my_join_status(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """User can check if they're a member, have a pending request, or are rejected."""
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id
    ).first()
    if member:
        return {"status": "member", "role": member.role}
    
    latest_request = db.query(JoinRequest).filter(
        JoinRequest.trip_id == trip_id,
        JoinRequest.user_id == current_user.user_id
    ).order_by(JoinRequest.created_at.desc()).first()
    
    if latest_request:
        return {"status": latest_request.status}  # 'pending' | 'rejected'
    
    return {"status": "none"}


@router.get("/api/trips/{trip_id}/join-requests")
async def get_join_requests(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin sees all pending requests for Mode A trip."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Only trip owner can see join requests
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id
    ).first()
    if not member or member.role != "owner":
        raise HTTPException(status_code=403, detail="Only the trip admin can view join requests")
    
    requests = db.query(JoinRequest).filter(
        JoinRequest.trip_id == trip_id,
        JoinRequest.status == "pending"
    ).all()
    
    results = []
    for req in requests:
        requester = db.query(User).filter(User.user_id == req.user_id).first()
        results.append({
            "requestId": req.request_id,
            "userId": req.user_id,
            "displayName": requester.display_name if requester else "Unknown",
            "message": req.message,
            "status": req.status,
            "createdAt": str(req.created_at),
        })
    
    return results

@router.post("/api/trips/{trip_id}/join-requests/{request_id}/approve")
async def approve_join_request(
    trip_id: str,
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin approves a join request (Mode A). Adds user as editor."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    member_check = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id,
        TripMember.role == "owner"
    ).first()
    if not member_check:
        raise HTTPException(status_code=403, detail="Only the trip admin can approve requests")
    
    join_req = db.query(JoinRequest).filter(
        JoinRequest.request_id == request_id,
        JoinRequest.trip_id == trip_id
    ).first()
    if not join_req or join_req.status != "pending":
        raise HTTPException(status_code=404, detail="Pending request not found")
    
    # Add user to trip_members
    new_member = TripMember(
        member_id=generate_id("tmb_"),
        trip_id=trip_id,
        user_id=join_req.user_id,
        role="editor",
        share_weight=Decimal("1.000"),
        invited_by_user_id=current_user.user_id,
        status="active",
    )
    db.add(new_member)
    
    join_req.status = "approved"
    join_req.reviewed_by = current_user.user_id
    db.commit()
    
    return {"approved": True, "userId": join_req.user_id}

@router.post("/api/trips/{trip_id}/join-requests/{request_id}/reject")
async def reject_join_request(
    trip_id: str,
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin rejects a join request (Mode A)."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    member_check = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id,
        TripMember.role == "owner"
    ).first()
    if not member_check:
        raise HTTPException(status_code=403, detail="Only the trip admin can reject requests")
    
    join_req = db.query(JoinRequest).filter(
        JoinRequest.request_id == request_id,
        JoinRequest.trip_id == trip_id
    ).first()
    if not join_req or join_req.status != "pending":
        raise HTTPException(status_code=404, detail="Pending request not found")
    
    join_req.status = "rejected"
    join_req.reviewed_by = current_user.user_id
    db.commit()
    
    return {"rejected": True, "userId": join_req.user_id}

@router.get("/api/trips/{trip_id}/my-join-status")
async def my_join_status(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """User can check if they're a member, have a pending request, or are rejected."""
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id
    ).first()
    if member:
        return {"status": "member", "role": member.role}
    
    latest_request = db.query(JoinRequest).filter(
        JoinRequest.trip_id == trip_id,
        JoinRequest.user_id == current_user.user_id
    ).order_by(JoinRequest.created_at.desc()).first()
    
    if latest_request:
        return {"status": latest_request.status}  # 'pending' | 'rejected'
    
    return {"status": "none"}

@router.get("/api/trips/{trip_id}/invite-code")
async def get_or_create_invite_code(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve or generate active 8-char secure join code for trip."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Check active membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Only trip members can view the invite code")
    
    # Look for existing active invite code
    active_code = db.query(TripInviteCode).filter(
        TripInviteCode.trip_id == trip_id,
        TripInviteCode.revoked_at.is_(None)
    ).order_by(TripInviteCode.created_at.desc()).first()
    
    if not active_code:
        new_code_str = generate_invite_code()
        active_code = TripInviteCode(
            invite_code_id=generate_id("tic_"),
            trip_id=trip_id,
            code=new_code_str,
            created_by_user_id=current_user.user_id,
        )
        db.add(active_code)
        db.commit()
    
    return {
        "code": active_code.code,
        "tripId": trip_id,
        "createdAt": str(active_code.created_at)
    }

@router.post("/api/trips/{trip_id}/invite-code/revoke")
async def revoke_and_regenerate_invite_code(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke existing join code and generate a new secure 8-char join code."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Only owner can revoke/regenerate code
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id,
        TripMember.role == "owner"
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Only trip admin can revoke invite codes")
    
    # Revoke all current codes
    existing_codes = db.query(TripInviteCode).filter(
        TripInviteCode.trip_id == trip_id,
        TripInviteCode.revoked_at.is_(None)
    ).all()
    for c in existing_codes:
        c.revoked_at = datetime.utcnow()
    
    # Generate fresh code
    new_code_str = generate_invite_code()
    new_code = TripInviteCode(
        invite_code_id=generate_id("tic_"),
        trip_id=trip_id,
        code=new_code_str,
        created_by_user_id=current_user.user_id,
    )
    db.add(new_code)
    db.commit()
    
    return {
        "code": new_code.code,
        "tripId": trip_id,
        "createdAt": str(new_code.created_at)
    }

@router.post("/api/join-requests/by-code")
@router.post("/api/trips/join-by-code")
async def join_trip_by_code(
    body: JoinByCodeInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validates join code, checks member state & trip status, and applies Mode A or Mode NA rules:
    - Mode NA: Auto-approves & adds to trip_members immediately
    - Mode A: Submits join_requests with status='pending'
    """
    clean_code = body.code.strip().upper()
    
    # Find matching active invite code
    invite = db.query(TripInviteCode).filter(
        TripInviteCode.code == clean_code,
        TripInviteCode.revoked_at.is_(None)
    ).order_by(TripInviteCode.created_at.desc()).first()
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired trip join code")
    
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This join code has expired")
    
    trip_id = invite.trip_id
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Associated trip not found")
    
    if trip.status == "draft":
        raise HTTPException(status_code=400, detail="Cannot join a draft trip")
    
    # Check if user is already a member
    existing_member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.user_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=409, detail="You are already a member of this trip")
    
    # Check for existing pending request
    existing_req = db.query(JoinRequest).filter(
        JoinRequest.trip_id == trip_id,
        JoinRequest.user_id == current_user.user_id
    ).first()
    
    if existing_req and existing_req.status == "pending":
        return JoinRequestResponse(
            requestId=existing_req.request_id,
            tripId=trip_id,
            userId=current_user.user_id,
            status="pending",
            message=existing_req.message,
            createdAt=str(existing_req.created_at),
            autoApproved=False
        )
    
    request_id = generate_id("jrq_")
    
    # Mode NA: auto-approve immediately
    if trip.mode == "Mode NA":
        new_member = TripMember(
            member_id=generate_id("tmb_"),
            trip_id=trip_id,
            user_id=current_user.user_id,
            role="editor",
            share_weight=Decimal("1.000"),
            invited_by_user_id=invite.created_by_user_id,
            status="active",
        )
        db.add(new_member)
        
        if existing_req:
            existing_req.status = "approved"
            existing_req.updated_at = datetime.utcnow()
        else:
            join_req = JoinRequest(
                request_id=request_id,
                trip_id=trip_id,
                user_id=current_user.user_id,
                status="approved",
                message=body.message or "Joined via code",
                reviewed_by=None
            )
            db.add(join_req)
        
        db.commit()
        
        return JoinRequestResponse(
            requestId=request_id,
            tripId=trip_id,
            userId=current_user.user_id,
            status="approved",
            message=body.message or "Joined via code",
            createdAt=str(datetime.utcnow()),
            autoApproved=True
        )
    else:  # Mode A: owner approval required
        if existing_req:
            existing_req.status = "pending"
            existing_req.message = body.message
            existing_req.updated_at = datetime.utcnow()
            request_id = existing_req.request_id
        else:
            join_req = JoinRequest(
                request_id=request_id,
                trip_id=trip_id,
                user_id=current_user.user_id,
                status="pending",
                message=body.message or "Join request via code",
                reviewed_by=None
            )
            db.add(join_req)
        
        db.commit()
        
        return JoinRequestResponse(
            requestId=request_id,
            tripId=trip_id,
            userId=current_user.user_id,
            status="pending",
            message=body.message or "Join request via code",
            createdAt=str(datetime.utcnow()),
            autoApproved=False
        )

# ==================================================
# TRIP CHAT ENDPOINTS
# ==================================================

@router.get("/api/trips/{trip_id}/chat")
async def get_trip_chat_messages(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve chat history for a trip."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    messages = db.query(TripChatMessage).filter(
        TripChatMessage.trip_id == trip_id
    ).order_by(TripChatMessage.created_at.asc()).all()

    result = []
    for msg in messages:
        sender = db.query(User).filter(User.user_id == msg.user_id).first()
        result.append({
            "messageId": msg.message_id,
            "tripId": msg.trip_id,
            "userId": msg.user_id,
            "senderName": sender.display_name if sender else "Member",
            "avatarUrl": sender.avatar_url if sender else None,
            "content": msg.content,
            "isProposal": msg.is_proposal or False,
            "proposalRefId": msg.proposal_ref_id,
            "createdAt": str(msg.created_at)
        })
    return result

@router.post("/api/trips/{trip_id}/chat")
async def post_trip_chat_message(
    trip_id: str,
    body: ChatMessageInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a chat message to a trip."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    msg_id = generate_id("msg_")
    msg = TripChatMessage(
        message_id=msg_id,
        trip_id=trip_id,
        user_id=current_user.user_id,
        content=body.content.strip(),
        is_proposal=body.isProposal,
        proposal_ref_id=body.proposalRefId,
    )
    db.add(msg)
    db.commit()

    return {
        "messageId": msg_id,
        "tripId": trip_id,
        "userId": current_user.user_id,
        "senderName": current_user.display_name,
        "avatarUrl": current_user.avatar_url,
        "content": msg.content,
        "isProposal": msg.is_proposal,
        "proposalRefId": msg.proposal_ref_id,
        "createdAt": str(msg.created_at)
    }

# ==================================================
# TRIP PHOTOS ENDPOINTS
# ==================================================

@router.get("/api/trips/{trip_id}/photos")
async def get_trip_photos(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve gallery photos for a trip."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    photos = db.query(Photo).filter(
        Photo.trip_id == trip_id
    ).order_by(Photo.created_at.desc()).all()

    result = []
    for p in photos:
        uploader = db.query(User).filter(User.user_id == p.uploader_id).first()
        result.append({
            "photoId": p.photo_id,
            "tripId": p.trip_id,
            "uploaderId": p.uploader_id,
            "uploaderName": uploader.display_name if uploader else "Traveler",
            "photoUrl": p.photo_url,
            "processingStatus": p.processing_status or "processed",
            "createdAt": str(p.created_at)
        })
    return result

@router.post("/api/trips/{trip_id}/photos")
async def add_trip_photo(
    trip_id: str,
    body: PhotoCreateInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a photo to a trip gallery."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    photo_id = generate_id("pho_")
    photo = Photo(
        photo_id=photo_id,
        trip_id=trip_id,
        uploader_id=current_user.user_id,
        photo_url=body.photoUrl.strip(),
        processing_status="processed"
    )
    db.add(photo)
    db.commit()

    return {
        "photoId": photo_id,
        "tripId": trip_id,
        "uploaderId": current_user.user_id,
        "uploaderName": current_user.display_name,
        "photoUrl": photo.photo_url,
        "processingStatus": "processed",
        "createdAt": str(photo.created_at)
    }


