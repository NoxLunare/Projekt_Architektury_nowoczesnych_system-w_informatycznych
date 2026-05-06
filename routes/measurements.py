from flask import Blueprint, request, jsonify

measurements_bp = Blueprint("measurements", __name__)

@measurements_bp.route("/station/<int:station_id>", methods=["GET"])
def get_measurements(station_id):

    data = {
        "stationId": station_id,
        "values": {
            "PM2.5": 35,
            "PM10": 60,
            "NO2": 80
        }
    }

    return jsonify(data)