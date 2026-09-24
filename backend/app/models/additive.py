# WanderMatch additive tables — extends PS-11 schema additively
from sqlalchemy import Column, String, Integer, Boolean, Numeric, DateTime, ForeignKey, Text, UniqueConstraint, JSON
from datetime import datetime
from ..database import Base

class JoinRequest(Base):
    __tablename__ = 'join_requests'
    request_id = Column(Text, primary_key=True) # jrq_ prefixed
    trip_id = Column(Text, ForeignKey('trips.trip_id'), nullable=False)
    user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    status = Column(String(50), default='pending') # 'pending' | 'approved' | 'rejected'
    message = Column(Text)
    reviewed_by = Column(Text, ForeignKey('users.user_id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint('trip_id', 'user_id', name='uq_join_request_trip_user'),)

class SlotConsensus(Base):
    __tablename__ = 'slot_consensus'
    consensus_id = Column(Text, primary_key=True) # slc_ prefixed
    item_id = Column(Text, ForeignKey('itinerary_items.item_id'), nullable=False)
    slot_status = Column(String(50), default='EMPTY') # 'EMPTY' | 'IN_CONSENSUS' | 'BRANCHED' | 'CONFIRMED'
    current_round = Column(Integer, default=1)
    consensus_cycle = Column(Integer, default=1)
    first_no_at = Column(DateTime, nullable=True) # set when first NO vote lands
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint('item_id', name='uq_slot_consensus_item'),)

class Branch(Base):
    __tablename__ = 'branches'
    branch_id = Column(Text, primary_key=True) # brc_ prefixed
    item_id = Column(Text, ForeignKey('itinerary_items.item_id'), nullable=False)
    parent_branch_id = Column(Text, ForeignKey('branches.branch_id'), nullable=True)
    title = Column(String(255), nullable=False)
    rationale = Column(Text) # NOT description
    entity_type = Column(String(50))
    entity_id = Column(Text)
    cost_delta = Column(Numeric(12, 2), default=0.00)
    currency = Column(String(10), default='USD')
    status = Column(String(50), default='OPEN') # 'OPEN' | 'FINALIZED'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class BranchMember(Base):
    __tablename__ = 'branch_members'
    member_id = Column(Text, primary_key=True) # bmb_ prefixed
    branch_id = Column(Text, ForeignKey('branches.branch_id'), nullable=False)
    user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RevisionHistory(Base):
    __tablename__ = 'revision_history'
    revision_id = Column(Text, primary_key=True) # rev_ prefixed
    item_id = Column(Text, ForeignKey('itinerary_items.item_id'), nullable=False)
    version_number = Column(Integer, nullable=False)
    snapshot_data = Column(JSON, nullable=False)
    created_by = Column(Text, nullable=False) # 'ai' | user_id
    created_at = Column(DateTime, default=datetime.utcnow)

class TripChatMessage(Base):
    __tablename__ = 'trip_chat_messages'
    message_id = Column(Text, primary_key=True) # msg_ prefixed
    trip_id = Column(Text, ForeignKey('trips.trip_id'), nullable=False)
    user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    content = Column(Text, nullable=False)
    is_proposal = Column(Boolean, default=False)
    proposal_ref_id = Column(Text, ForeignKey('proposals.proposal_id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class FaceProfile(Base):
    __tablename__ = 'face_profiles'
    profile_id = Column(Text, primary_key=True) # fcp_ prefixed
    user_id = Column(Text, ForeignKey('users.user_id'), unique=True, nullable=False)
    embedding_data = Column(JSON, nullable=False) # JSON vector data
    model_version = Column(String(50), default='VGG-Face')
    registered_at = Column(DateTime, default=datetime.utcnow)

class Photo(Base):
    __tablename__ = 'photos'
    photo_id = Column(Text, primary_key=True) # pho_ prefixed
    trip_id = Column(Text, ForeignKey('trips.trip_id'), nullable=False)
    uploader_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    photo_url = Column(Text, nullable=False)
    processing_status = Column(String(50), default='pending') # 'pending' | 'processed' | 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)

class PhotoPerson(Base):
    __tablename__ = 'photo_person'
    pp_id = Column(Text, primary_key=True) # php_ prefixed
    photo_id = Column(Text, ForeignKey('photos.photo_id'), nullable=False)
    user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    confidence = Column(Numeric(4, 3), default=0.950)

class TripInviteCode(Base):
    __tablename__ = 'trip_invite_codes'
    invite_code_id = Column(Text, primary_key=True) # tic_ prefixed
    trip_id = Column(Text, ForeignKey('trips.trip_id'), nullable=False)
    code = Column(String(50), nullable=False, index=True) # uppercase alphanumeric without ambiguous chars
    code_hash = Column(Text, nullable=True) # optional hash of normalized code
    created_by_user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

