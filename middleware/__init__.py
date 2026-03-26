from .logging_middleware import register_logging
from .error_handler import register_error_handlers
from .auth_middleware import register_auth
from .timing_middleware import register_timing

def register_middlewares(app):
    register_logging(app)
    register_error_handlers(app)
    register_auth(app)
    register_timing(app)