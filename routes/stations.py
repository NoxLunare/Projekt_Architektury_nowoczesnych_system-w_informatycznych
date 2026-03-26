from flask import Blueprint, request, jsonify

stations_bp = Blueprint("stations", __name__)

MOCK_STATIONS = [
    {"id": 1, "city": "Poznan"},
    {"id": 2, "city": "Warsaw"}
]

@stations_bp.route("", methods=["GET"])
def get_stations():
    city = request.args.get("city")

    if city:
        result = [s for s in MOCK_STATIONS if s["city"] == city]
        return jsonify(result)

    return jsonify(MOCK_STATIONS)

@stations_bp.route("/<int:station_id>", methods=["GET"])
def get_station(station_id):
    station = next((s for s in MOCK_STATIONS if s["id"] == station_id), None)

    if not station:
        return {"error": "Not found"}, 404

    return jsonify(station)