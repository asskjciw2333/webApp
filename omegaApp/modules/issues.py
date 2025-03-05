from flask import Blueprint, request, jsonify, g, render_template, current_app
from ..db import get_db
from datetime import datetime
import sqlite3
from .jira_integration import JiraIntegration
from ..logger_manager import LoggerManager

logger = LoggerManager().get_logger()

# Register a custom timestamp converter
def adapt_datetime(ts):
    return ts.strftime("%Y-%m-%d %H:%M:%S")


def convert_datetime(val):
    try:
        if isinstance(val, bytes):
            val = val.decode()
        # Attempt to parse ISO format first
        try:
            return datetime.fromisoformat(val)
        except ValueError:
            # Fallback to existing logic if ISO parsing fails
            if " " not in val:
                val += " 00:00:00"
            return datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError) as e:
        print(f"Warning: Could not parse timestamp {val}: {e}")
        return None


sqlite3.register_adapter(datetime, adapt_datetime)
sqlite3.register_converter("timestamp", convert_datetime)

bp = Blueprint("issues", __name__, url_prefix="/issues")


@bp.route("/")
def index():
    print("Accessing issues index route")  # Server-side logging
    return render_template("issues/index.html")


@bp.route("/create", methods=["POST"])
def create_issue():
    data = request.get_json()
    required_fields = ["server_name", "location", "description", "created_by"]

    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        db = get_db()
        cursor = db.execute(
            """INSERT INTO issues 
               (server_name, location, template, serial_number, ticket_number, 
                network, description, priority, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data.get("server_name"),
                data.get("location"),
                data.get("template"),
                data.get("serial_number"),
                data.get("ticket_number"),
                data.get("network"),
                data.get("description"),
                data.get("priority", "medium"),
                data.get("created_by"),
            ),
        )
        db.commit()
        return jsonify({"success": True, "id": cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/list", methods=["GET"])
def list_issues():
    try:
        db = get_db()
        status = request.args.get("status", "open")
        print(f"Fetching issues with status: {status}")

        cursor = db.execute(
            """SELECT * FROM issues 
               WHERE status = ? 
               ORDER BY created_at DESC""",
            (status,),
        )

        if status == "all":
            cursor = db.execute(
                """SELECT * FROM issues 
                
                ORDER BY created_at DESC""",
            )

        # Get column names from cursor description
        columns = [desc[0] for desc in cursor.description]
        print(f"Query columns: {columns}")

        # Convert rows to dictionaries safely
        issues_list = []
        rows = cursor.fetchall()

        for row in rows:
            issue_dict = {}
            for idx, column in enumerate(columns):
                value = row[idx] if idx < len(row) else None

                # Handle timestamp fields
                if value and column in ["created_at", "updated_at", "resolved_at"]:
                    try:
                        # If the value is bytes, decode it
                        if isinstance(value, bytes):
                            value = value.decode("utf-8")
                        # If the value is just a date, append a default time
                        if " " not in str(value):
                            value = f"{value} 00:00:00"
                        # Parse the timestamp
                        dt = datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
                        value = dt.strftime("%Y-%m-%d %H:%M:%S")
                    except (ValueError, TypeError) as e:
                        print(
                            f"Warning: Could not parse timestamp {value} for column {column}: {e}"
                        )
                        value = None

                issue_dict[column] = value

            issues_list.append(issue_dict)

        return jsonify(issues_list)

    except Exception as e:
        print(f"Error in list_issues: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback

        print(f"Stack trace: {traceback.format_exc()}")
        return jsonify({"error": "Failed to fetch issues"}), 500


@bp.route("/<int:issue_id>/update", methods=["PUT"])
def update_issue(issue_id):
    data = request.get_json()
    allowed_fields = [
        "status",
        "priority",
        "resolution_notes",
        "ticket_number",
        "jira_task_id",
    ]

    updates = {k: v for k, v in data.items() if k in allowed_fields}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    # Add timestamps
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    updates["updated_at"] = current_time
    
    # If status is changing to resolved, add resolved_at timestamp
    if data.get("status") == "resolved":
        # First check if it was already resolved
        db = get_db()
        current_status = db.execute(
            "SELECT status FROM issues WHERE id = ?", (issue_id,)
        ).fetchone()
        
        if current_status and current_status["status"] != "resolved":
            updates["resolved_at"] = current_time
    # If status is changing from resolved to something else, clear resolved_at
    elif data.get("status") and data.get("status") != "resolved":
        updates["resolved_at"] = None

    try:
        db = get_db()
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        query = f"UPDATE issues SET {set_clause} WHERE id = ?"
        db.execute(query, (*updates.values(), issue_id))
        db.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        logger.error(f"Failed to update issue: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:issue_id>", methods=["GET"])
def get_issue(issue_id):
    try:
        db = get_db()
        issue = db.execute("SELECT * FROM issues WHERE id = ?", (issue_id,)).fetchone()
        if issue is None:
            return jsonify({"error": "Issue not found"}), 404
        return jsonify(dict(issue)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:issue_id>/create-jira", methods=["POST"])
def create_jira_ticket(issue_id):
    """Create a JIRA ticket for an existing issue"""
    try:
        db = get_db()
        cursor = db.execute("SELECT * FROM issues WHERE id = ?", (issue_id,))
        issue = cursor.fetchone()
        
        if not issue:
            return jsonify({"error": "Issue not found"}), 404

        # Get JIRA project key from request or config
        data = request.get_json()
        project_key = data.get('project_key') or current_app.config.get('JIRA_DEFAULT_PROJECT')
        hardware_type = data.get('hardware_type')  # Get hardware type from request
        
        if not project_key:
            return jsonify({"error": "JIRA project key is required"}), 400

        jira = JiraIntegration()
        
        # Create JIRA ticket with hardware type
        jira_response = jira.create_issue(
            summary=f"Server Issue: {issue['server_name']} - {issue['location']}",
            description=issue['description'],
            project_key=project_key,
            hardware_type=hardware_type  # Pass hardware type to create_issue
        )
        
        if not jira_response['success']:
            return jsonify({"error": jira_response['error']}), 500

        # Update local issue with JIRA reference
        db.execute(
            "UPDATE issues SET jira_task_id = ?, jira_url = ? WHERE id = ?",
            (jira_response['issue_key'], jira_response['url'], issue_id)
        )
        db.commit()

        return jsonify({
            "success": True,
            "jira_key": jira_response['issue_key'],
            "jira_url": jira_response['url']
        })

    except Exception as e:
        logger.error(f"Failed to create JIRA ticket: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/sync-jira", methods=["POST"])
def sync_jira_issues():
    """Sync issues from JIRA to local database"""
    try:
        # Get JIRA project key from config if not provided in request
        project_key = current_app.config.get('JIRA_DEFAULT_PROJECT')
        
        if not project_key:
            logger.error("JIRA project key not configured")
            return jsonify({"error": "JIRA project key not configured", "synced_issues": []}), 400

        jira = JiraIntegration()
        
        # Search for recent JIRA issues
        jql_extra = "AND created >= -1d AND type = Incident"  # Last 24 hours
        jira_response = jira.search_team_issues(project_key, jql_extra)
        
        if not jira_response['success']:
            logger.error(f"JIRA search failed: {jira_response.get('error')}")
            return jsonify({"error": jira_response.get('error'), "synced_issues": []}), 500

        db = get_db()
        synced_issues = []

        for jira_issue in jira_response['issues']:
            # Check if issue already exists
            cursor = db.execute(
                "SELECT id FROM issues WHERE jira_task_id = ?",
                (jira_issue['key'],)
            )
            existing = cursor.fetchone()
            
            if not existing:
                try:
                    # Create new local issue
                    cursor = db.execute(
                        """INSERT INTO issues 
                           (server_name, location, description, priority, jira_task_id, created_by)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (
                            f"JIRA Sync: {jira_issue['key']}",
                            "JIRA",  # Default location
                            jira_issue['summary'],
                            jira_issue['priority'].lower() if jira_issue['priority'] else 'medium',
                            jira_issue['key'],
                            'JIRA_SYNC'
                        )
                    )
                    db.commit()
                    synced_issues.append({
                        'id': cursor.lastrowid,
                        'jira_key': jira_issue['key']
                    })
                except Exception as e:
                    logger.error(f"Failed to insert JIRA issue {jira_issue['key']}: {str(e)}")
                    continue

        return jsonify({
            "success": True,
            "synced_issues": synced_issues
        })

    except Exception as e:
        logger.error(f"Failed to sync JIRA issues: {str(e)}")
        return jsonify({"error": str(e), "synced_issues": []}), 500


@bp.route("/user/info", methods=["GET"])
def get_user_info():
    """Get current user information including projects and groups"""
    try:
        jira = JiraIntegration()
        
        # Get user basic info
        user_info = jira.get_current_user()
        if not user_info['success']:
            return jsonify({"error": user_info['error']}), 500
            
        # Get user's projects
        projects = jira.get_user_projects()
        if not projects['success']:
            return jsonify({"error": projects['error']}), 500
            
        # Get user's groups
        groups = jira.get_user_groups()
        if not groups['success']:
            return jsonify({"error": groups['error']}), 500
            
        return jsonify({
            "success": True,
            "user": user_info['user'],
            "projects": projects['projects'],
            "groups": groups['groups']
        })
        
    except Exception as e:
        logger.error(f"Failed to get user info: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/user/permissions", methods=["GET"])
def get_user_permissions():
    """Get permissions for the current user"""
    try:
        project_key = request.args.get('project_key')
        jira = JiraIntegration()
        
        permissions = jira.get_user_permissions(project_key)
        if not permissions['success']:
            return jsonify({"error": permissions['error']}), 500
            
        return jsonify(permissions)
        
    except Exception as e:
        logger.error(f"Failed to get user permissions: {str(e)}")
        return jsonify({"error": str(e)}), 500
