import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", "airq.db")


def get_connection() -> sqlite3.Connection:
    """Zwraca połączenie z bazą SQLite z włączonymi kluczami obcymi."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # dostęp do kolumn po nazwie: row["name"]
    conn.execute("PRAGMA foreign_keys = ON")
    return conn