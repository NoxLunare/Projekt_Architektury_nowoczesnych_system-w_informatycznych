from flask import request, jsonify

API_TOKEN = "SECRET123"

def register_auth(app):

    @app.before_request
    def check_auth():

        # Dodalem pozwolenie na OPTIONS bo mi 401 wyjebywalo
        if request.method == "OPTIONS":
            return
    
        # pomijamy publiczne endpointy
        if request.path.startswith("/api/v1/public"):
            return

        token = request.headers.get("Authorization")

        if token != f"Bearer {API_TOKEN}":
            return jsonify({
                "error": "Unauthorized",
                "message": "Brak lub niepoprawny token"
            }), 401