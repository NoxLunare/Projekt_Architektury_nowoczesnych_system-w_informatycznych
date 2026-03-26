from flask import Flask
from flask_cors import CORS

from middleware import register_middlewares

from routes.cities import cities_bp
from routes.stations import stations_bp
from routes.measurements import measurements_bp
from routes.air_quality import air_quality_bp
from routes.recommendations import recommendations_bp

app = Flask(__name__)
CORS(app)

register_middlewares(app)

app.register_blueprint(cities_bp, url_prefix="/api/v1/cities")
app.register_blueprint(stations_bp, url_prefix="/api/v1/stations")
app.register_blueprint(measurements_bp, url_prefix="/api/v1/measurements")
app.register_blueprint(air_quality_bp, url_prefix="/api/v1/air-quality")
app.register_blueprint(recommendations_bp, url_prefix="/api/v1/recommendations")

@app.route("/api/v1/public/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(debug=True)