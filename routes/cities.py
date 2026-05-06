from flask import Blueprint, request, jsonify

cities_bp = Blueprint("cities", __name__)

MOCK_CITIES = ["Poznan", "Warsaw", "Krakow"]

@cities_bp.route("", methods=["GET"])
def get_cities():
    name = request.args.get("name")

    if name:
        filtered = [c for c in MOCK_CITIES if name.lower() in c.lower()]
        return jsonify(filtered)

    return jsonify(MOCK_CITIES)