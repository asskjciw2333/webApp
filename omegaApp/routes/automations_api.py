from flask import Blueprint, jsonify, request, current_app
from typing import Dict
import requests
from omegaApp.db import get_db
from omegaApp.modules import update_firmware_server
from omegaApp.logger_manager import LoggerManager

logger = LoggerManager().get_logger()

bp = Blueprint("automations_api", __name__, url_prefix="/api/automations")


def generate_result(content, is_completions=True):
    try:
        url = (
            f"{current_app.config['MODEL_URL']}/v1/chat/completions"
            if is_completions
            else f"{current_app.config['MODEL_URL']}/v1/chat"
        )

        data = {
            "model": current_app.config["MODEL_NAME"],
            "messages": [
                {
                    "role": "system",
                    "content": """אתה עורך לשוני מומחה בעברית. תפקידך:
1. לתקן שגיאות כתיב ודקדוק
2. לשפר את התחביר כך שיהיה תקני ובהיר
3. לשמור על המשמעות המקורית של הטקסט
4. לא לשנות מונחים מקצועיים או ראשי תיבות
5. לא להוסיף או להסיר מידע מהותי
6. לשמור על סגנון הכתיבה המקורי 

החזר רק את הטקסט המתוקן, ללא הסברים או הערות נוספות.""",
                },
                {"role": "user", "content": content},
            ],
        }
        response = requests.post(url, json=data)
        if response.status_code == 200:
            return {
                "status": "success",
                "result": response.json()["choices"][0]["message"]["content"].strip(),
            }
        else:
            logger.error(f"API error: {response.status_code} - {response.text}")
            return {"status": "error", "message": "שגיאה בבדיקת הטקסט"}

    except Exception as e:
        logger.error(f"Error in generate_result: {str(e)}")
        return {"status": "error", "message": f"שגיאה בבדיקת הטקסט: {str(e)}"}


@bp.route("/check-text", methods=["POST"])
def check_text():
    try:
        data = request.get_json()
        text = data.get("text")

        if not text:
            return jsonify({"status": "error", "message": "לא התקבל טקסט לבדיקה"}), 400

        result = generate_result(text)
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in check_text: {str(e)}")
        return jsonify({"status": "error", "message": "שגיאה בבדיקת הטקסט"}), 500


MOCK_SERVERS = {
    "name": {
        "server1": {
            "domain": "central.cisco.com",
            "usr_lbl": "Server server1",
            "dn": "DN123456",
            "serial": "SN123",
            "name": "TLV",
            "version": "1.1.0",
        },
        "server2": {
            "domain": "central.cisco.com",
            "usr_lbl": "Server server2",
            "dn": "DN789012",
            "serial": "SN456",
            "name": "JLM",
            "version": "1.2.0",
        },
    },
    "serial_number": {
        "SN123": {
            "domain": "central.cisco.com",
            "usr_lbl": "Server server1",
            "dn": "DN123456",
            "serial": "SN123",
            "name": "TLV",
            "version": "1.1.0",
        },
        "SN456": {
            "domain": "central.cisco.com",
            "usr_lbl": "Server server2",
            "dn": "DN789012",
            "serial": "SN456",
            "name": "JLM",
            "version": "1.2.0",
        },
    },
    "location": {
        "TLV": [
            {
                "domain": "central.cisco.com",
                "usr_lbl": "Server server1",
                "dn": "DN123456",
                "serial": "SN123",
                "name": "TLV",
                "version": "1.1.0",
            }
        ],
        "JLM": [
            {
                "domain": "central.cisco.com",
                "usr_lbl": "Server server2",
                "dn": "DN789012",
                "serial": "SN456",
                "name": "JLM",
                "version": "1.2.0",
            }
        ],
    },
}

MOCK_FIRMWARE_LIST = [
    {"name": "4.2.1", "blade_bundle_version": "4.2.0", "rack_bundle_version": "4.2.0"},
    {"name": "4.2.2", "blade_bundle_version": "4.2.1", "rack_bundle_version": "4.2.1"},
    {"name": "4.2.3", "blade_bundle_version": "4.2.2", "rack_bundle_version": "4.2.2"},
]


async def search_server(criteria: str, query: str) -> Dict:
    """
    Search for a server using the specified criteria and query.
    Can be used both as a module function and through the API.
    
    Args:
        criteria: The search criteria ('name', 'id', 'serial', 'location')
        query: The search term
        
    Returns:
        Dict with status, data and response message
    """
    try:
        logger.info(f"Searching server with {criteria}={query}")
            # החזרת נתונים מדומים במקום קריאה לפונקציות האמיתיות
        if current_app.config.get("TESTING") or current_app.config.get("DEBUG"):
            if criteria in MOCK_SERVERS and query in MOCK_SERVERS[criteria]:
                return {"status": "success", "data": MOCK_SERVERS[criteria][query]}

        if criteria == "name":
            result = update_firmware_server.find_server_by_name(query)
        elif criteria == "serial_number":
            result = update_firmware_server.find_server_by_serial(query)
        elif criteria == "location":
            result = update_firmware_server.find_server_by_location(query)
        
        if result["status"] == "success":
            return {
                "status": "success",
                "data": result["data"],
                "response": f"מצאתי את השרת {result['data'].get('name', '')}"
            }
        else:
            return {
                "status": "not_found",
                "response": "לא מצאתי שרת מתאים. אנא נסה שוב עם מזהה אחר."
            }
            
    except Exception as e:
        logger.error(f"Error searching server: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בחיפוש השרת"
        }


async def get_firmware_versions() -> Dict:
    """
    Get available firmware versions for a server.
    Can be used both as a module function and through the API.

        
    Returns:
        Dict with status, data and response message
    """
    try:
        logger.info(f"Getting firmware versions")
        
        if current_app.config.get("TESTING") or current_app.config.get("DEBUG"):
            versions = MOCK_FIRMWARE_LIST
        else:
            versions = update_firmware_server.get_firmware_list()
            
        return {
            "status": "success",
            "data": versions,
            "response": f"הגרסאות הזמינות הן: {', '.join(v['name'] for v in versions)}"
        }
    except Exception as e:
        logger.error(f"Error getting firmware versions: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בקבלת גרסאות הקושחה"
        }


async def prepare_automation(automation_type: str, params: Dict) -> Dict:
    """
    Prepare server upgrade automation.
    Can be used both as a module function and through the API.
    
    Args:
        automation_type: Type of automation (e.g. 'server_upgrade')
        params: Dictionary of automation parameters
        
    Returns:
        Dict with status, data and response message
    """
    try:
        logger.info(f"Preparing {automation_type} automation with params: {params}")
        
        # Validate required parameters
        missing = []
        if "server_name" not in params:
            missing.append("server_name")
        if "firmware_version" not in params and "data" not in params:
            missing.append("firmware_version")
            
        if missing:
            return {
                "status": "error",
                "missing_params": missing,
                "response": f"חסרים הפרמטרים הבאים: {', '.join(missing)}"
            }
            
        # If data is provided instead of firmware_version, use it
        if "data" in params and "firmware_version" not in params:
            params["firmware_version"] = params["data"]
            
        # Create automation instance
        automationManager = current_app.automationManager
        server_data = automationManager.prepare_automation(automation_type, params)
        
        return {
            "status": "success",
            "data": server_data,
            "response": f"הכנתי את תהליך השדרוג עבור שרת {params['server_name']}"
        }
            
    except Exception as e:
        logger.error(f"Error preparing automation: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בהכנת תהליך השדרוג"
        }


async def start_automation(automation_type: str, instance_id: str) -> Dict:
    """
    Start server upgrade automation.
    Can be used both as a module function and through the API.
    
    Args:
        automation_type: Type of automation (e.g. 'server_upgrade')
        instance_id: ID of the automation instance to start
        
    Returns:
        Dict with status, data and response message
    """
    try:
        logger.info(f"Starting automation {instance_id} of type {automation_type}")
        
        # Start the automation process
        automationManager = current_app.automationManager
        await automationManager.start_task_automation(automation_type, instance_id)
        
        return {
            "status": "success",
            "data": {
                "instance_id": instance_id,
                "status": "running"
            },
            "response": "תהליך השדרוג החל"
        }
    except Exception as e:
        logger.error(f"Error starting automation: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בהתחלת תהליך השדרוג"
        }


@bp.route("/prepare-automation", methods=["POST"])
async def prepare_automation_api():
    """API endpoint for preparing automation"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "response": "לא התקבלו נתונים בבקשה"
            }), 400
            
        automation_type = data.get("automation_type")
        if not automation_type:
            return jsonify({
                "status": "error",
                "response": "לא צוין סוג האוטומציה"
            }), 400
            
        params = data.get("params", {})
        
        if not params or not isinstance(params, dict):
            return jsonify({
                "status": "error",
                "response": "חסרים פרמטרים נדרשים"
            }), 400
        
        logger.info(f"Preparing automation of type {automation_type} with params: {params}")
        
        result = await prepare_automation(automation_type, params)
        
        # Log the result for debugging
        logger.info(f"Prepare automation result: {result}")
        
        return jsonify(result), 200 if result["status"] == "success" else 400
            
    except Exception as e:
        logger.error(f"API error preparing automation: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בהכנת האוטומציה"
        }), 500


@bp.route("/start-automation", methods=["POST"])
async def start_automation_api():
    """API endpoint for starting automation"""
    try:
        data = request.get_json()
        automation_type = data.get("automation_type")
        instance_id = data.get("instance_id")
        
        result = await start_automation(automation_type, instance_id)
        return jsonify(result), 200 if result["status"] == "success" else 400
            
    except Exception as e:
        logger.error(f"API error starting automation: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בהתחלת האוטומציה"
        }), 500


@bp.route("/search_server", methods=["POST"])
async def search_server_api():
    """API endpoint for server search"""
    try:
        data = request.get_json()
        criteria = data.get("search_type")
        query = data.get("search_term")
        
        result = await search_server(criteria, query)
        return jsonify(result), 200 if result["status"] == "success" else 404
            
    except Exception as e:
        logger.error(f"API error searching server: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בחיפוש"
        }), 500


@bp.route("/pull-fw-list-package", methods=["GET"])
async def get_firmware_versions_api():
    """API endpoint for getting firmware versions"""
    try:
        result = await get_firmware_versions()
        return jsonify(result), 200 if result["status"] == "success" else 404
            
    except Exception as e:
        logger.error(f"API error getting firmware versions: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בקבלת גרסאות"
        }), 500


@bp.route("/list")
def get_automations():
    try:
        user_id = request.args.get("user_id", "admin")  # Default to admin if not specified
        
        logger.info(f"Getting automations for user: {user_id}")
        
        db = get_db()
        cursor = db.execute(
            "SELECT * FROM automations WHERE user_id = ? AND isTracked = ?",
            (user_id, True),
        ).fetchall()
        db.commit()

        user_automations = {
            row["instance_id"]: dict(row) for row in cursor if row["isTracked"]
        }

        return jsonify(user_automations)

    except Exception as e:
        logger.error(f"Error getting automations list: {e}")
        return jsonify({"error": f"Error getting automations: {str(e)}"}), 500


@bp.route("/unTrack_automation", methods=["POST"])
def unTrack_automation():
    instance_id = request.json.get("instance_id")

    if not instance_id:
        return jsonify({"error": "Missing instance_id"}), 400

    try:
        db = get_db()
        db.execute(
            "UPDATE automations SET isTracked = ? WHERE instance_id = ?",
            (False, instance_id),
        )
        db.commit()

        return (jsonify({"message": "Automation unTracked successfully"})), 200

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": f"Unexpected error: {str(e)}"})


@bp.route("/stop-automation", methods=["POST"])
def stop_automation():
    instance_id = request.json.get("instance_id")

    if not instance_id:
        return jsonify({"error": "Missing instance_id"}), 400

    try:
        automationManager = current_app.automationManager
        automationManager.stop_automation(instance_id)

        db = get_db()
        db.execute(
            "UPDATE automations SET status = ?, message = ? WHERE instance_id = ?",
            ("stopped", "האוטומציה נעצרה על ידי המשתמש", instance_id),
        )
        db.commit()

        return jsonify({"message": "Automation stopped successfully"}), 200

    except Exception as e:
        logger.error(f"Failed to stop automation: {str(e)}")
        return jsonify({"error": f"Failed to stop automation: {str(e)}"}), 500
