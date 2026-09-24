# PROVIDED TABLES — do not rename or re-key any column.
from sqlalchemy import Column, String, Integer, SmallInteger, Boolean, Numeric, Date, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class User(Base):
    __tablename__ = 'users'
    user_id = Column(Text, primary_key=True)
    display_name = Column(String(255))
    email = Column(String(255), unique=True, nullable=False)
    home_city_id = Column(Text)
    home_currency = Column(String(10))
    locale = Column(String(20))
    budget_band = Column(String(50))
    travel_style = Column(String(100))
    traveller_type = Column(String(50))
    segment = Column(String(50))
    status = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserPreference(Base):
    __tablename__ = 'user_preferences'
    preference_id = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    preferred_languages = Column(Text) # BCP-47 comma-separated
    guide_language = Column(Text)
    interests = Column(Text) # comma-separated
    dietary_flags = Column(Text)
    accessibility_needs = Column(Text)
    preferred_currency = Column(String(10))
    max_daily_budget = Column(Numeric(12, 2))
    max_daily_budget_currency = Column(String(10))
    pace = Column(String(50))
    age = Column(Integer, nullable=True)
    age_group = Column(String(20), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Trip(Base):
    __tablename__ = 'trips'
    trip_id = Column(Text, primary_key=True)
    owner_user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    title = Column(String(255), nullable=False)
    origin_city_id = Column(Text)
    destination_city_id = Column(Text, ForeignKey('cities.city_id'))
    start_date = Column(Date)
    end_date = Column(Date)
    party_size = Column(SmallInteger, default=1)
    adults = Column(SmallInteger, default=1)
    children = Column(SmallInteger, default=0)
    trip_type = Column(String(50))
    is_group_trip = Column(Boolean, default=True)
    status = Column(String(50), default='ACTIVE')
    mode = Column(String(20), default='Mode NA')
    visibility = Column(String(20), default='public') # 'public' | 'private'
    home_currency = Column(String(10), default='USD')
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TripMember(Base):
    __tablename__ = 'trip_members'
    member_id = Column(Text, primary_key=True)
    trip_id = Column(Text, ForeignKey('trips.trip_id'), nullable=False)
    user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    role = Column(String(20), default='viewer') # owner / editor / viewer
    joined_at = Column(DateTime, default=datetime.utcnow)
    share_weight = Column(Numeric(6, 3), default=1.000)
    invited_by_user_id = Column(Text)
    status = Column(String(50), default='active')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint('trip_id', 'user_id', name='uq_trip_user'),)

class Itinerary(Base):
    __tablename__ = 'itineraries'
    itinerary_id = Column(Text, primary_key=True)
    trip_id = Column(Text, ForeignKey('trips.trip_id'), nullable=False)
    name = Column(String(255))
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, default=True)
    generated_by = Column(String(50))
    total_cost = Column(Numeric(12, 2))
    currency = Column(String(10), default='USD')
    total_duration_minutes = Column(Integer)
    status = Column(String(50), default='ACTIVE')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ItineraryItem(Base):
    __tablename__ = 'itinerary_items'
    item_id = Column(Text, primary_key=True)
    itinerary_id = Column(Text, ForeignKey('itineraries.itinerary_id'), nullable=False)
    day_index = Column(SmallInteger, default=1)
    sort_order = Column(SmallInteger, default=1)
    starts_at = Column(DateTime)
    ends_at = Column(DateTime)
    item_type = Column(String(50))
    entity_type = Column(String(50))
    entity_id = Column(Text)
    title = Column(String(255), nullable=False)
    cost = Column(Numeric(12, 2))
    currency = Column(String(10), default='USD')
    carbon_kg = Column(Numeric(8, 3))
    duration_minutes = Column(Integer)
    source = Column(String(50))
    explanation = Column(Text)
    locked = Column(Boolean, default=False)
    status = Column(String(50), default='OPEN')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Proposal(Base):
    __tablename__ = 'proposals'
    proposal_id = Column(Text, primary_key=True)
    itinerary_id = Column(Text, ForeignKey('itineraries.itinerary_id'), nullable=False)
    proposed_by_user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    action = Column(String(50))
    target_item_id = Column(Text, ForeignKey('itinerary_items.item_id'), nullable=True)
    entity_type = Column(String(50))
    entity_id = Column(Text)
    title = Column(String(255), nullable=False)
    rationale = Column(Text)
    cost_delta = Column(Numeric(12, 2))
    currency = Column(String(10), default='USD')
    closes_at = Column(DateTime, nullable=True)
    status = Column(String(50), default='open') # open / accepted / rejected / expired
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Vote(Base):
    __tablename__ = 'votes'
    vote_id = Column(Text, primary_key=True)
    proposal_id = Column(Text, ForeignKey('proposals.proposal_id'), nullable=False)
    user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    value = Column(Text, nullable=False) # 'yes', 'no' (app ignores 'abstain')
    weight = Column(Numeric(4, 2), default=1.00)
    comment = Column(Text)
    cast_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (
        UniqueConstraint('proposal_id', 'user_id', name='uq_proposal_user_vote'),
        CheckConstraint("value IN ('yes', 'no', 'abstain')", name='chk_vote_value')
    )

class TourGuide(Base):
    __tablename__ = 'tour_guides'
    guide_id = Column(Text, primary_key=True)
    city_id = Column(Text, ForeignKey('cities.city_id'))
    display_name = Column(String(255), nullable=False)
    languages = Column(Text) # comma-separated BCP-47
    specialisation = Column(String(100))
    secondary_specialisation = Column(String(100))
    years_experience = Column(SmallInteger)
    rating = Column(Numeric(2, 1))
    review_count = Column(Integer, default=0)
    day_rate = Column(Numeric(12, 2))
    half_day_rate = Column(Numeric(12, 2))
    currency = Column(String(10), default='USD')
    certified = Column(Boolean, default=True)
    bio = Column(Text)
    status = Column(String(50), default='active')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class City(Base):
    __tablename__ = 'cities'
    city_id = Column(Text, primary_key=True)
    name = Column(String(255), nullable=False)
    state = Column(String(255))
    country_id = Column(Text, ForeignKey('countries.country_id'))
    country_code = Column(String(10))
    lat = Column(Numeric(9, 6))
    lng = Column(Numeric(9, 6))
    timezone = Column(String(50))
    region = Column(String(100))
    population = Column(Integer)
    season_profile = Column(Text)
    peak_months = Column(String(100))
    primary_language = Column(Text)
    description = Column(Text)
    status = Column(String(50), default='active')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Country(Base):
    __tablename__ = 'countries'
    country_id = Column(Text, primary_key=True)
    iso2 = Column(String(2), unique=True)
    iso3 = Column(String(3), unique=True)
    name = Column(String(255), nullable=False)
    default_currency = Column(String(10))
    calling_code = Column(String(10))
    region = Column(String(100))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Currency(Base):
    __tablename__ = 'currencies'
    currency_id = Column(Text, primary_key=True)
    iso4217 = Column(String(3), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    symbol = Column(String(10))
    minor_unit_exponent = Column(SmallInteger, default=2)
    display_locale = Column(String(20))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Language(Base):
    __tablename__ = 'languages'
    language_id = Column(Text, primary_key=True)
    bcp47 = Column(String(20), unique=True, nullable=False)
    english_name = Column(String(255), nullable=False)
    native_name = Column(String(255))
    script = Column(String(50))
    rtl = Column(Boolean, default=False)
    tts_supported = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserInteraction(Base):
    __tablename__ = 'user_interactions'
    interaction_id = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey('users.user_id'), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(Text)
    interaction_type = Column(String(50))
    occurred_at = Column(DateTime, default=datetime.utcnow)
    dwell_seconds = Column(Integer)
    position_in_list = Column(SmallInteger)
    query_text = Column(Text)
    query_language = Column(Text)
    channel = Column(String(50))
    session_id = Column(String(255))
    implicit_rating = Column(Numeric(3, 2))
