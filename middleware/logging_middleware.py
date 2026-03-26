from flask import request
import time

def register_logging(app):

    @app.before_request
    def start_timer():
        request.start_time = time.time()

    @app.after_request
    def log_request(response):
        duration = time.time() - request.start_time

        log = f"""
        [{request.method}] {request.path}
        Status: {response.status_code}
        Duration: {round(duration * 1000, 2)} ms
        """

        print(log)

        return response