import sqlite3

def run_migration():
    conn = sqlite3.connect("wandermatch.db")
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE trips ADD COLUMN mode VARCHAR(20) DEFAULT 'Mode NA'")
        print("Successfully added 'mode' column to trips table.")
    except Exception as e:
        print("Note on trips.mode column:", e)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    run_migration()
