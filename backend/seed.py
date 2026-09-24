import os
import sqlite3
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy import text
from app.database import SessionLocal, engine, Base
from app.models import (
    User, UserPreference, Trip, TripMember, Itinerary, ItineraryItem,
    Proposal, Vote, TourGuide, City, Country, Currency, Language, UserInteraction
)

def seed_database():
    Base.metadata.create_all(bind=engine)

    # Ensure additive columns exist
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE user_preferences ADD COLUMN age INTEGER;"))
            conn.commit()
    except Exception:
        pass
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE user_preferences ADD COLUMN age_group VARCHAR(20);"))
            conn.commit()
    except Exception:
        pass
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE trips ADD COLUMN mode VARCHAR(20) DEFAULT 'Mode NA';"))
            conn.commit()
    except Exception:
        pass

    target_db_path = os.path.join(os.path.dirname(__file__), "wandermatch.db")
    ps11_db_path = os.path.join(os.path.dirname(__file__), "..", "data", "PS-11.db")

    if os.path.exists(ps11_db_path):
        print(f"Seeding full dataset from {ps11_db_path}...")
        src_conn = sqlite3.connect(ps11_db_path)
        dest_conn = sqlite3.connect(target_db_path)
        
        tables_to_migrate = [
            "countries", "currencies", "languages", "cities", "users",
            "user_preferences", "tour_guides", "trips", "trip_members",
            "itineraries", "itinerary_items", "proposals", "votes", "user_interactions"
        ]

        for table in tables_to_migrate:
            try:
                dest_cursor = dest_conn.cursor()
                dest_cursor.execute(f"SELECT COUNT(*) FROM {table}")
                existing_cnt = dest_cursor.fetchone()[0]
                if existing_cnt > 0:
                    print(f"Table '{table}' already contains {existing_cnt} rows.")
                    continue

                src_cursor = src_conn.cursor()
                src_cursor.execute(f"SELECT * FROM {table}")
                rows = src_cursor.fetchall()
                col_names = [d[0] for d in src_cursor.description]
                
                placeholders = ", ".join(["?"] * len(col_names))
                cols_str = ", ".join(col_names)
                
                insert_sql = f"INSERT OR IGNORE INTO {table} ({cols_str}) VALUES ({placeholders})"
                dest_cursor.executemany(insert_sql, rows)
                dest_conn.commit()
                print(f"Seeded {len(rows)} rows into table '{table}'")
            except Exception as e:
                print(f"Error seeding table '{table}': {e}")
                
        src_conn.close()
        dest_conn.close()

    # Ensure demo user & default trip exist
    session = SessionLocal()
    if session.query(User).filter(User.user_id == "usr_demo_owner").count() == 0:
        demo_user = User(
            user_id="usr_demo_owner",
            display_name="Rahul Sharma",
            email="rahul@example.com",
            home_city_id="cty_mumbai",
            home_currency="INR",
            locale="en-IN",
            budget_band="MID_RANGE",
            travel_style="EXPLORER",
            traveller_type="SOLO",
            status="ACTIVE"
        )
        session.add(demo_user)

        demo_trip = Trip(
            trip_id="trp_goa_2026",
            owner_user_id="usr_demo_owner",
            title="Goa Getaway",
            origin_city_id="cty_mumbai",
            destination_city_id="cty_goa",
            start_date=date(2026, 10, 15),
            end_date=date(2026, 10, 20),
            party_size=4,
            is_group_trip=True,
            status="planning",
            mode="Mode NA",
            home_currency="INR"
        )
        session.add(demo_trip)
        session.commit()
        print("Demo user & trip initialized.")
    session.close()

if __name__ == "__main__":
    seed_database()
