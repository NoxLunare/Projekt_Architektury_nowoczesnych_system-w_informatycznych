from flask import Blueprint, request, jsonify
from database.connection import get_connection
from services.sync_service import sync_locations, sync_sensors, sync_location_latest

stations_bp = Blueprint("stations", __name__)


@stations_bp.route("", methods=["GET"])
def get_stations():
    """
    GET /api/v1/stations?city=Poznan&country=PL&refresh=1

    Zwraca lokalizacje (stacje) z opcjonalnym filtrem po mieście (locality).
    """
    city = request.args.get("city", "").strip()
    country = request.args.get("country", "PL").upper()
    refresh = request.args.get("refresh", "0") == "1"

    if refresh:
        sync_locations(country_code=country)

    conn = get_connection()
    query = """
        SELECT
            l.id, l.name, l.locality, l.timezone, l.country_code,
            l.is_mobile, l.is_monitor,
            l.latitude, l.longitude,
            l.datetime_first, l.datetime_last,
            o.name AS owner_name,
            p.name AS provider_name
        FROM locations l
        LEFT JOIN owners    o ON o.id = l.owner_id
        LEFT JOIN providers p ON p.id = l.provider_id
        WHERE l.country_code = ?
    """
    params = [country]

    if city:
        query += " AND LOWER(l.locality) LIKE ?"
        params.append(f"%{city.lower()}%")

    query += " ORDER BY l.locality, l.name"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows])


@stations_bp.route("/<int:location_id>", methods=["GET"])
def get_station(location_id):
    """
    GET /api/v1/stations/<location_id>

    Szczegóły lokalizacji wraz z listą sensorów i najnowszymi pomiarami.
    ?refresh=1 — odświeża sensory i location_latest z OpenAQ.
    """
    refresh = request.args.get("refresh", "0") == "1"

    if refresh:
        sync_sensors(location_id)
        sync_location_latest(location_id)

    conn = get_connection()

    # Lokalizacja
    loc = conn.execute("""
        SELECT
            l.*, o.name AS owner_name, p.name AS provider_name
        FROM locations l
        LEFT JOIN owners    o ON o.id = l.owner_id
        LEFT JOIN providers p ON p.id = l.provider_id
        WHERE l.id = ?
    """, (location_id,)).fetchone()

    if not loc:
        conn.close()
        return jsonify({"error": "Not found", "message": "Lokalizacja nie istnieje"}), 404

    # Sensory z parametrami
    sensors = conn.execute("""
        SELECT s.id, s.name, s.last_value, s.last_datetime,
               s.coverage_percent_complete,
               pa.name AS parameter_name, pa.display_name, pa.units
        FROM sensors s
        JOIN parameters pa ON pa.id = s.parameter_id
        WHERE s.location_id = ?
        ORDER BY pa.name
    """, (location_id,)).fetchall()

    # Najnowsze pomiary
    latest = conn.execute("""
        SELECT ll.value, ll.datetime_utc, ll.datetime_local,
               pa.name AS parameter_name, pa.display_name, pa.units
        FROM location_latest ll
        JOIN parameters pa ON pa.id = ll.parameter_id
        WHERE ll.location_id = ?
        ORDER BY pa.name
    """, (location_id,)).fetchall()

    conn.close()

    return jsonify({
        "location": dict(loc),
        "sensors": [dict(s) for s in sensors],
        "latest": [dict(m) for m in latest],
    })