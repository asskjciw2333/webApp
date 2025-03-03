from flask import Blueprint
from .chat import bp as chat_bp
from .dcim_api import dcim_api
from .server_dashboard import server_dashboard
from .automations_api import bp as automations_api_bp
from .log_viewer import log_viewer

def register_blueprints(app):
    """Register all blueprints with the application"""
    app.register_blueprint(chat_bp)
    app.register_blueprint(dcim_api)
    app.register_blueprint(server_dashboard)
    app.register_blueprint(automations_api_bp)
    app.register_blueprint(log_viewer)