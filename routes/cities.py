from flask import Blueprint, request, jsonify
from database.connection import get_connection
from services.sync_service import sync_locations, sync_lookup_tables

cities_bp = Blueprint("cities", __name__)


@cities_bp.route("", methods=["GET"])
def get_cities():
    """
    GET /api/v1/cities?country=PL&name=poznan&refresh=1

    Zwraca unikalne wartości pola 'locality' z tabeli locations.
    ?refresh=1 — wymusza pełną synchronizację tabel słownikowych i lokalizacji.
    """
    country = request.args.get("country", "PL").upper()
    name_filter = request.args.get("name", "").lower()
    refresh = request.args.get("refresh", "0") == "1"

    if refresh:
        sync_lookup_tables()
        sync_locations(country_code=country)

    conn = get_connection()
    query = """
        SELECT DISTINCT locality
        FROM locations
        WHERE country_code = ?
          AND locality IS NOT NULL
    """
    params = [country]

    if name_filter:
        query += " AND LOWER(locality) LIKE ?"
        params.append(f"%{name_filter}%")

    query += " ORDER BY locality"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify([r["locality"] for r in rows])