import time
from flask import request

def register_timing(app):

    @app.before_request
    def start_timer():
        request.start_time = time.time()

    @app.after_request
    def add_header(response):
        duration = time.time() - request.start_time
        response.headers["X-Response-Time"] = f"{round(duration * 1000, 2)}ms"
        return response