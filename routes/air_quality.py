from flask import Blueprint, request, jsonify
from database.connection import get_connection
from services.sync_service import sync_sensors, sync_location_latest
from datetime import date, datetime

air_quality_bp = Blueprint("air_quality", __name__)


def calculate_quality(parameter: float, ranges: tuple) -> int:
    if parameter > ranges[3]:   return 3
    if parameter > ranges[2]:   return 2
    if parameter > ranges[1]:   return 1
    if parameter > ranges[0]:   return 0
    
    return -1


def classify(score: int) -> str:
    descriptions = {idx: desc for idx, desc in zip(
            [0, 1, 2, 3], 
            ["dobra", "umiarkowana", "zła", "bardzo zła"]
        )}

    return descriptions.get(score, "Brak pomiarów")


@air_quality_bp.route("/station/<int:location_id>", methods=["GET"])
def get_air_quality(location_id):
    """
    GET /api/v1/air_quality/station/<int:location_id>

    Jakość powietrza na podstawie najnowszych pomiarów
    ?refresh=1 — odświeża sensory i location_latest z OpenAQ.
    """

    refresh = request.args.get("refresh", "0") == "1"

    if refresh:
        sync_sensors(location_id)
        sync_location_latest(location_id)

    # Najnowsze pomiary 

    conn = get_connection()

    latest = conn.execute("""
        SELECT ll.value, ll.datetime_utc, ll.datetime_local,
               pa.name AS parameter_name, pa.display_name, pa.units
        FROM location_latest ll
        JOIN parameters pa ON pa.id = ll.parameter_id
        WHERE ll.location_id = ?
    """, (location_id,)).fetchall()
    
    conn.close()

    if not latest:
        return jsonify({"error": "Not found", "message": "Lokalizacja nie istnieje albo nie posiada żadnych stacji / pomiarów"}), 404

    latest = [dict(l) for l in latest]
    latest = [l for l in latest if date.today() == datetime.fromisoformat(l.get("datetime_utc")).date()]

    pm10 = next((l for l in latest if l.get("parameter_name") == "pm10"), {})
    pm25 = next((l for l in latest if l.get("parameter_name") == "pm25"), {})
    no2 = next((l for l in latest if l.get("parameter_name") == "no2"), {})
    o3 = next((l for l in latest if l.get("parameter_name") == "o3"), {})
    co = next((l for l in latest if l.get("parameter_name") == "co"), {})
    so2 = next((l for l in latest if l.get("parameter_name") == "so2"), {})
    bc = next((l for l in latest if l.get("parameter_name") == "bc"), {})

    # Oblicz jakość metryk

    pm10_score = calculate_quality(pm10.get("value", -1), (0, 20, 50, 100))
    pm25_score = calculate_quality(pm25.get("value", -1), (0, 10, 25, 50))
    no2_score = calculate_quality(no2.get("value", -1), (0, 40, 100, 200))
    o3_score = calculate_quality(o3.get("value", -1), (0, 60, 120, 180))
    co_score = calculate_quality(co.get("value", -1), (0, 2, 5, 10))
    so2_score = calculate_quality(so2.get("value", -1), (0, 40, 125, 250))
    bc_score = calculate_quality(bc.get("value", -1), (0, 1, 3, 6))

    overall_score = max(pm25_score, pm10_score, no2_score, o3_score, co_score, so2_score, bc_score)

    return jsonify({
        "locationId": location_id,
        "overall": classify(overall_score),
        "details": {
            "PM2.5": {
                "value": pm25.get("value"),
                "quality": classify(pm25_score),
                "timeOfMeasurement": pm25.get("datetime_local")
            } if pm25 else {},
            "PM10": {
                "value": pm10.get("value"),
                "quality": classify(pm10_score),
                "timeOfMeasurement": pm10.get("datetime_local")
            } if pm10 else {},
            "NO2": {
                "value": no2.get("value"),
                "quality": classify(no2_score),
                "timeOfMeasurement": no2.get("datetime_local")
            } if no2 else {},
            "O3": {
                "value": o3.get("value"),
                "quality": classify(o3_score),
                "timeOfMeasurement": o3.get("datetime_local")
            } if o3 else {},
            "CO": {
                "value": co.get("value"),
                "quality": classify(co_score),
                "timeOfMeasurement": co.get("datetime_local")
            } if co else {},
            "SO2": {
                "value": so2.get("value"),
                "quality": classify(so2_score),
                "timeOfMeasurement": so2.get("datetime_local")
            } if so2 else {},
            "BC": {
                "value": bc.get("value"),
                "quality": classify(bc_score),
                "timeOfMeasurement": bc.get("datetime_local")
            } if bc else {},
        },
    })