import asyncio
from omegaApp.logger_manager import LoggerManager
from omegaApp.server_upgrade import ServerUpgrade
import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS


import urllib3
import threading
from .llm_client import LLMClient


def create_app(test_config=None):
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    app = Flask(__name__, instance_relative_config=True)
    CORS(app=app, origins="*")
    load_dotenv()

    app.config.from_mapping(
        SECRET_KEY="dev",
        DATABASE=os.path.join(app.instance_path, "omegaapp.sqlite"),
        IP_CENTRAL=os.environ.get("CENTRAL"),
        USER_NAME_CENTRAL=os.environ.get("CENTRAL_USER_NAME"),
        PASSWORD_CENTRAL=os.getenv("CENTRAL_PASSWORD"),
        DCIM_BASE_URL=os.getenv("DCIM_BASE_URL"),
        DCIM_PASSWORD=os.getenv("DCIM_PASSWORD"),
        DCIM_USER=os.getenv("DCIM_USER"),
        MODEL_NAME=os.getenv("MODEL_NAME"),
        MODEL_URL=os.getenv("MODEL_URL"),
        ROOM_NAMES=os.getenv("ROOM_NAMES", ""),
        SERVERS_DATA_DIR=os.getenv("SERVERS_DATA_DIR", os.path.join(os.path.dirname(__file__), 'data', 'servers')),
        API_KEY=os.getenv('MODEL_API_KEY', 'YOUR_API_KEY_HERE'),
    )

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile("config.py", silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    logger_mamager = LoggerManager(log_file="omegaApp.log")
    logger = logger_mamager.get_logger()

    logger.info("Aplication started!!")

    from . import db

    db.init_app(app)

    # Initialize translations after DB is ready
    def initialize_translations():
        with app.app_context():
            try:
                query = "SELECT DISTINCT room FROM panels WHERE room IS NOT NULL"
                rooms = db.get_db().execute(query).fetchall()
                rooms = [row['room'] for row in rooms]
                
                from .automations import translation_manager
                translation_manager.initialize_translations(rooms)
            except Exception as e:
                app.logger.error(f"Failed to initialize translations: {e}")
    
    # Run initialization in a background thread to not block server startup
    from threading import Thread
    Thread(target=initialize_translations).start()

    from . import panel

    app.register_blueprint(panel.bp)

    from . import powerConsumer

    app.register_blueprint(powerConsumer.bp)

    from . import automations

    app.register_blueprint(automations.bp)

    from . import omega

    app.register_blueprint(omega.bp)

    from .routes.server_dashboard import server_dashboard
    app.register_blueprint(server_dashboard)

    from .routes.dcim_api import dcim_api
    app.register_blueprint(dcim_api)

    from .routes.automations_api import bp as automations_api_bp
    app.register_blueprint(automations_api_bp)

    app.add_url_rule("/", endpoint="index")

    from .websocket_server import WebSocketServer
    from .automation_manager import AutomationManager

    automationManager = AutomationManager()

    automationManager.register_automation("server_upgrade", ServerUpgrade)

    app.automationManager = automationManager

    def run_automations(appContext):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Initialize the AutomationManager
        loop.run_until_complete(automationManager.initialize(appContext))
        
        # Keep the loop running for future automations
        try:
            loop.run_forever()
        except Exception as e:
            logger.error(f"Automation loop error: {e}")
        finally:
            loop.close()

    # Create and start the automations thread
    automations_thread = threading.Thread(
        target=run_automations, 
        args=(app.app_context(),),
        daemon=True
    )
    automations_thread.start()
    # automations_thread.join()

    logger.info("Automations thread finished")

    from .modules import issues
    app.register_blueprint(issues.bp)

    from .modules import server_manager
    app.register_blueprint(server_manager.bp)

    from .routes.log_viewer import log_viewer
    app.register_blueprint(log_viewer)

    # Initialize LLM client
    with app.app_context():
        app.llm_client = LLMClient(
            api_key=app.config['API_KEY'],
            model_name=app.config['MODEL_NAME']
        )

    # Register blueprints
    from .routes import chat
    app.register_blueprint(chat.bp)

    return app
