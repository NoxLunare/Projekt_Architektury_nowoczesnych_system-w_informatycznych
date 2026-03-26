from flask import Blueprint, request, jsonify

recommendations_bp = Blueprint("recommendations", __name__)

def get_recommendation(quality):
    if quality == "dobra":
        return "Brak ograniczeń"
    if quality == "umiarkowana":
        return "Osoby wrażliwe powinny uważać"
    if quality == "zla":
        return "Ogranicz przebywanie na zewnątrz"
    return "Zostań w domu"

@recommendations_bp.route("", methods=["GET"])
def recommendations():
    city = request.args.get("city", "Poznan")

    quality = "zla"  # mock

    return jsonify({
        "city": city,
        "quality": quality,
        "recommendation": get_recommendation(quality)
    })