from pydantic import BaseModel
from datetime import date
from typing import Optional, List, Dict, Any

class CreateTripPhase1Input(BaseModel):
    title: str
    destinationCityId: str
    startDate: date
    endDate: date
    partySize: int
    mode: str  # 'Mode A' | 'Mode NA'
    notes: Optional[str] = None
    saveAsDraft: bool = False  # True = status='draft', False = status='planning'

class ItineraryItemInput(BaseModel):
    dayIndex: int         # 1-based, e.g. Day 1 = 1
    sortOrder: int        # order within the day
    startsAt: Optional[str] = None # ISO-8601 or "HH:MM"
    endsAt: Optional[str] = None
    title: str
    description: Optional[str] = None # stored as explanation in itinerary_items
    entityType: Optional[str] = None  # e.g. 'poi', 'hotel', 'meal', 'free'
    entityId: Optional[str] = None
    cost: str             # money as string e.g. "65.00"
    currency: str         # ISO-4217

class AddItineraryItemsInput(BaseModel):
    items: List[ItineraryItemInput]
    expectedVersion: int  # MUST be sent — used for optimistic concurrency

class TripUpdateInput(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    mode: Optional[str] = None

class TripResponse(BaseModel):
    trpId: str
    title: str
    destinationCityId: str
    startDate: str
    endDate: str
    partySize: int
    mode: str
    status: str
    notes: Optional[str] = None
    ownerId: str
    inviteLink: Optional[str] = None # null for drafts
    itinerary: Optional[Dict[str, Any]] = None

class JoinRequestInput(BaseModel):
    message: Optional[str] = None

class JoinRequestResponse(BaseModel):
    requestId: str
    tripId: str
    userId: str
    status: str  # 'pending' | 'approved' | 'rejected'
    message: Optional[str] = None
    createdAt: str
    autoApproved: bool

class JoinByCodeInput(BaseModel):
    code: str
    message: Optional[str] = None


