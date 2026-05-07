from flask import Blueprint, request, jsonify
from database.connection import get_connection
from services.sync_service import sync_measurements, sync_hourly, sync_daily

measurements_bp = Blueprint("measurements", __name__)


@measurements_bp.route("/sensor/<int:sensor_id>", methods=["GET"])
def get_measurements(sensor_id):
    limit = int(request.args.get("limit", 100))
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    refresh = request.args.get("refresh", "0") == "1"

    if refresh:
        sync_measurements(sensor_id, limit=limit)

    conn = get_connection()
    query = "SELECT * FROM measurements WHERE sensor_id = ?"
    params = [sensor_id]

    if date_from:
        query += " AND datetime_utc >= ?"
        params.append(date_from)
    if date_to:
        query += " AND datetime_utc <= ?"
        params.append(date_to)

    query += " ORDER BY datetime_utc DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@measurements_bp.route("/sensor/<int:sensor_id>/hourly", methods=["GET"])
def get_hourly(sensor_id):
    limit = int(request.args.get("limit", 168))
    refresh = request.args.get("refresh", "0") == "1"

    if refresh:
        sync_hourly(sensor_id, limit=limit)

    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM hourly_aggregates
        WHERE sensor_id = ?
        ORDER BY hour_utc DESC LIMIT ?
    """, (sensor_id, limit)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@measurements_bp.route("/sensor/<int:sensor_id>/daily", methods=["GET"])
def get_daily(sensor_id):
    limit = int(request.args.get("limit", 30))
    refresh = request.args.get("refresh", "0") == "1"

    if refresh:
        sync_daily(sensor_id, limit=limit)

    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM daily_aggregates
        WHERE sensor_id = ?
        ORDER BY day_utc DESC LIMIT ?
    """, (sensor_id, limit)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@measurements_bp.route("/location/<int:location_id>/latest", methods=["GET"])
def get_latest(location_id):
    conn = get_connection()
    rows = conn.execute("""
        SELECT ll.*, pa.name AS parameter_name, pa.display_name, pa.units
        FROM location_latest ll
        JOIN parameters pa ON pa.id = ll.parameter_id
        WHERE ll.location_id = ?
        ORDER BY pa.name
    """, (location_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])