import sqlite3

def run_migration():
    conn = sqlite3.connect("wandermatch.db")
    cursor = conn.cursor()

    columns_to_add = [
        ("trips", "mode", "VARCHAR(20) DEFAULT 'Mode NA'"),
        ("trips", "visibility", "VARCHAR(20) DEFAULT 'public'"),
        ("users", "avatar_url", "TEXT"),
        ("users", "bio", "TEXT"),
        ("users", "age", "INTEGER"),
        ("users", "age_group", "VARCHAR(20)"),
        ("user_preferences", "hashtags", "TEXT"),
        ("user_preferences", "preferred_mode", "VARCHAR(20) DEFAULT 'Mode NA'"),
        ("user_preferences", "trip_type_preference", "VARCHAR(20) DEFAULT 'both'"),
        ("user_preferences", "same_age_group_only", "BOOLEAN DEFAULT 0"),
        ("user_preferences", "further_preferences", "TEXT")
    ]

    for table, col, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
            print(f"Successfully added '{col}' column to {table} table.")
        except Exception as e:
            print(f"Note on {table}.{col} column:", e)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    run_migration()
