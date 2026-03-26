from flask import Blueprint, jsonify

air_quality_bp = Blueprint("air_quality", __name__)

def classify(pm25, pm10, no2):
    if pm25 > 50 or pm10 > 100 or no2 > 200:
        return "bardzo zla"
    elif pm25 > 25 or pm10 > 50 or no2 > 100:
        return "zla"
    elif pm25 > 10:
        return "umiarkowana"
    return "dobra"

@air_quality_bp.route("/station/<int:station_id>", methods=["GET"])
def get_air_quality(station_id):

    pm25 = 35
    pm10 = 60
    no2 = 80

    quality = classify(pm25, pm10, no2)

    return jsonify({
        "stationId": station_id,
        "overall": quality,
        "details": {
            "PM2.5": pm25,
            "PM10": pm10,
            "NO2": no2
        }
    })