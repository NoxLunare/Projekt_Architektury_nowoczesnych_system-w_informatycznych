from flask import jsonify

def register_error_handlers(app):

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "error": "Not Found",
            "message": "Zasób nie istnieje"
        }), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            "error": "Internal Server Error",
            "message": "Coś poszło nie tak"
        }), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        return jsonify({
            "error": "Exception",
            "message": str(e)
        }), 500