import os
import sqlite3
import sys
from sqlalchemy import text
from app.database import SessionLocal, engine, Base
from app.models import *

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def seed_database():
    print("Creating all tables in database (Neon / PostgreSQL / SQLite)...", flush=True)
    Base.metadata.create_all(bind=engine)

    ps11_db_path = os.path.join(os.path.dirname(__file__), "..", "data", "PS-11.db")
    if not os.path.exists(ps11_db_path):
        ps11_db_path = os.path.join(os.path.dirname(__file__), "..", "docs", "data", "PS-11.db")

    if not os.path.exists(ps11_db_path):
        print(f"Error: Dataset not found at {ps11_db_path}", flush=True)
        return

    print(f"Loading full PS-11 dataset from {ps11_db_path}...", flush=True)
    src_conn = sqlite3.connect(ps11_db_path)
    src_cursor = src_conn.cursor()

    tables = [row[0] for row in src_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]

    # Dependency order
    dependency_order = [
        'currencies', 'languages', 'countries', 'cities', 'users', 'tour_guides', 
        'trips', 'user_preferences', 'itineraries', 'itinerary_items', 
        'proposals', 'trip_members', 'votes', 'user_interactions'
    ]

    tables_to_seed = [t for t in dependency_order if t in tables] + [t for t in tables if t not in dependency_order]
    is_postgres = not str(engine.url).startswith("sqlite")
    
    bool_cols = {
        'rtl', 'confirmed', 'is_active', 'is_group_trip', 'tts_supported', 
        'certified', 'is_proposal', 'locked', 'same_age_group_only', 'same_age_only'
    }

    for table in tables_to_seed:
        try:
            src_cursor.execute(f"SELECT * FROM {table}")
            rows = src_cursor.fetchall()
            if not rows:
                continue
            
            src_cols = [d[0] for d in src_cursor.description]

            with engine.connect() as conn:
                res = conn.execute(text(f'SELECT * FROM "{table}" LIMIT 0'))
                target_cols = list(res.keys())

            common_cols = [c for c in src_cols if c in target_cols]
            if not common_cols:
                continue

            indices = [src_cols.index(c) for c in common_cols]
            cols_str = ', '.join([f'"{c}"' for c in common_cols])
            val_params = ', '.join([f':{c}' for c in common_cols])

            if is_postgres:
                insert_sql = f'INSERT INTO "{table}" ({cols_str}) VALUES ({val_params}) ON CONFLICT DO NOTHING'
            else:
                insert_sql = f'INSERT OR IGNORE INTO "{table}" ({cols_str}) VALUES ({val_params})'

            dict_rows = []
            for row in rows:
                row_dict = {}
                for i, col_name in enumerate(common_cols):
                    val = row[indices[i]]
                    if is_postgres and col_name in bool_cols and val is not None:
                        val = bool(val)
                    row_dict[col_name] = val
                dict_rows.append(row_dict)

            chunk_size = 500
            inserted = 0
            for i in range(0, len(dict_rows), chunk_size):
                chunk = dict_rows[i:i+chunk_size]
                try:
                    with engine.begin() as conn:
                        conn.execute(text(insert_sql), chunk)
                    inserted += len(chunk)
                except Exception as chunk_err:
                    print(f"  [!] Chunk insert error on '{table}': {chunk_err}", flush=True)

            print(f"[OK] Seeded {inserted} rows into table '{table}'", flush=True)
        except Exception as e:
            print(f"[ERR] Error seeding table '{table}': {e}", flush=True)

    src_conn.close()
    print("SUCCESS: Full PS-11 dataset seeding to Neon complete!", flush=True)

if __name__ == "__main__":
    seed_database()
