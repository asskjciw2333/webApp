from omegaApp.auth import authentication_ita
from omegaApp.automations import translation_manager
from omegaApp.logger_manager import LoggerManager
from omegaApp.modules.panel_networkX import (
    DataCenterMap,
    Panel,
    Location,
    InterfaceType,
    ClassificationType,
    RouteConstraints,
)

from typing import List
import json
import requests

from flask import (
    Blueprint,
    flash,
    render_template,
    request,
    session,
    jsonify,
    current_app,
)
from werkzeug.exceptions import abort

from omegaApp.db import get_db, execute_query, execute_write_query, DatabaseError


bp = Blueprint("panels", __name__, url_prefix="/panels")

logger = LoggerManager().get_logger()

isUpdating = False


@bp.route("/")
def index():
    try:
        auth = authentication_ita()
        if auth is None:
            flash("בעיית אימות מול DCIM - נא לנסות שוב מאוחר יותר")
            session["authentication"] = None
        else:
            session["authentication"] = auth
            if not auth[0]:  # אם האימות נכשל
                flash("יש לנו בעיה עם החיבור לDCIM - נסה לרענן את הדף")
    except Exception as e:
        logger.error(f"Error in index: {str(e)}")
        flash("יש לנו בעיה עם החיבור לDCIM - נסה לרענן את הדף")
        session["authentication"] = None

    return render_template("panels/index.html")


@bp.route(
    "/get_panels",
    methods=[
        "POST",
    ],
)
def get_panels():
    try:
        if request.is_json:
            body = request.get_json()
        else:
            body = request.form.to_dict()
        # Base query
        base_query = """
            SELECT dcim_id, "name", room, rack, U, interface, size, 
                   status, how_many_ports_remain, classification, 
                   destination, date_created, date_updated 
            FROM panels
        """

        # Build query based on filters
        if body["filterRoom"] and len(body["filterRack"]) > 0:
            query = f"{base_query} WHERE room = ? AND rack = ?"
            params = (body["filterRoom"], body["filterRack"])
        elif body["filterRoom"]:
            query = f"{base_query} WHERE room = ?"
            params = (body["filterRoom"],)
        elif body["filterRack"]:
            query = f"{base_query} WHERE rack = ?"
            params = (body["filterRack"],)
        elif body["filterTextInput"]:
            query = f"{base_query} WHERE room = ? OR rack = ? OR (name LIKE ?)"
            params = (
                body["filterTextInput"],
                body["filterTextInput"],
                f"%{body['filterTextInput']}%",
            )
        else:
            query = base_query
            params = ()

        # Execute query
        filtered_panels = execute_query(query, params)

        # Process results
        filtered_panels = sorted(filtered_panels, key=lambda x: x["rack"])
        filtered_panels_dict = [dict(row) for row in filtered_panels]

        # Get unique racks if needed
        unique_racks_in_room = set()
        if len(body["filterRack"]) == 0:
            unique_racks_in_room = sorted({row["rack"] for row in filtered_panels})

        return {
            "filterData": unique_racks_in_room if unique_racks_in_room else "",
            "panelsData": filtered_panels_dict,
        }

    except DatabaseError as e:
        logger.error(f"Database error in get_panels: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        logger.error(f"Error in get_panels: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500


@bp.route("/<id>/edit", methods=("GET", "POST"))
def edit(id):
    if request.method == "POST":
        try:
            if request.is_json:
                body = request.get_json()
            else:
                body = request.form.to_dict()
            update_query = """
                UPDATE panels 
                SET name = ?, 
                    interface = ?, 
                    status = ?, 
                    how_many_ports_remain = ?, 
                    classification = ?, 
                    destination = ?,
                    date_updated = CURRENT_TIMESTAMP
                WHERE dcim_id = ?
            """

            params = (
                body.get("name"),
                body.get("interface"),
                body.get("status"),
                body.get("how_many_ports_remain"),
                body.get("classification"),
                body.get("destination"),
                body.get("dcim_id"),
            )

            execute_write_query(update_query, params)

            logger.info(
                f"Edit panel - dcim_id: {body.get('dcimId')}, name: {body.get('name')}"
            )
            return {"success": True}

        except DatabaseError as e:
            logger.error(f"Database error in edit panel: {str(e)}")
            return jsonify({"error": "Database error occurred"}), 500
        except Exception as e:
            logger.error(f"Error in edit panel: {str(e)}")
            return jsonify({"error": f"An unexpected error occurred : {e}"}), 500

    # GET request handling
    try:
        query = """
            SELECT dcim_id, name, room, rack, U, interface, 
                   size, status, how_many_ports_remain, 
                   classification, destination, 
                   date_created, date_updated
            FROM panels
            WHERE dcim_id = ?
        """

        panel = execute_query(query, (id,))

        if not panel:
            abort(404, f"Panel id {id} doesn't exist.")

        panel = panel[0]  # Get first row since we expect only one result

        return {
            "dcim_id": panel["dcim_id"],
            "name": panel["name"],
            "room": panel["room"],
            "rack": panel["rack"],
            "U": panel["U"],
            "interface": panel["interface"],
            "size": panel["size"],
            "status": "True" if panel["status"] in ("1", "True") else "False",
            "how_many_ports_remain": panel["how_many_ports_remain"],
            "classification": panel["classification"],
            "destination": panel["destination"],
            "date_created": panel["date_created"],
            "date_updated": panel["date_updated"],
        }

    except DatabaseError as e:
        logger.error(f"Database error in get panel: {str(e)}")
        abort(500, "Database error occurred")
    except Exception as e:
        logger.error(f"Error in get panel: {str(e)}")
        abort(500, "An unexpected error occurred")


@bp.route("/<id>/update_dcim", methods=("POST",))
def update_dcim(id):
    try:
        body = request.data.decode("UTF-8")
        body = json.loads(body)

        logger.info(f"Update DCIM asset - data: {body}")

        name = body["name"]
        body.pop("dcim_id")
        body.pop("name")

        data_list = []
        patch_operation = {"op": "add", "path": "/name", "value": f"{name}"}
        data_list.append(patch_operation)

        for key, value in body.items():
            if value or key == "status":
                patch_operation = {
                    "op": "add",
                    "path": f"/customProperty/{key}",
                    "value": f"{value}",
                }
                data_list.append(patch_operation)
            else:
                if value == "":
                    patch_operation = {"op": "remove", "path": f"/customProperty/{key}"}
                    data_list.append(patch_operation)

        data = json.dumps(data_list)
        dcim_base_url = current_app.config.get("DCIM_BASE_URL")

        if not dcim_base_url:
            return jsonify({"status": "error", "message": "לא הוגדר חיבור ל-DCIM"}), 503

        url_id = f"{dcim_base_url}assets/{id}?include=custom_properties"

        # בדוק אם יש אימות תקף
        if not session.get("authentication"):
            return (
                jsonify({"status": "error", "message": "אין חיבור מאומת ל-DCIM"}),
                401,
            )

        response_custom_properties = requests.patch(
            url_id, headers=session.get("authentication")[1], verify=False, data=data
        )

        if response_custom_properties.status_code == 200:
            return jsonify({"success": True, "message": "המידע עודכן בהצלחה"})
        else:
            logger.error(f"DCIM update failed: {response_custom_properties.text}")
            return (
                jsonify(
                    {
                        "success": False,
                        "message": f"שגיאה בעדכון DCIM: {response_custom_properties.text}",
                    }
                ),
                response_custom_properties.status_code,
            )

    except Exception as e:
        logger.error(f"Error in update_dcim: {str(e)}")
        return (
            jsonify({"success": False, "message": f"שגיאה בלתי צפויה: {str(e)}"}),
            500,
        )


# @bp.route('/<int:id>/delete', methods=('POST',))
# def delete(id):
#     get_panel(id)
#     db = get_db()
#     db.execute('DELETE FROM panel WHERE id = ?', (id,))
#     db.commit()
#     return redirect(url_for('blog.index'))


@bp.route("/admin/pullallpanels", methods=("GET",))
def get_all_panel_from_dcim():
    logger.info("Get all panels from DCIM")
    global isUpdating
    isUpdating = True

    try:
        # קבלת כל הפאנלים מה-DCIM
        allPatchPanel = search_assets("*", "patch-panel", 10000)
        
        # עדכון הנתונים במסד הנתונים
        panels_to_update = []
        for panels in allPatchPanel.values():
            for panel in panels:
                if not any(tap in panel["name"].lower() for tap in ["tap", "חד סיב"]):
                    patchPanel = create_patch_panel_item(panel)
                    panels_to_update.append(patchPanel)

        update_data_panels_to_db(panels_to_update)

        isUpdating = False
        return {"status": "success", "message": "כל המידע עודכן!"}
    except Exception as e:
        isUpdating = False
        logger.error(f"Error in get_all_panel_from_dcim: {str(e)}")
        return {"status": "error", "message": f"שגיאה במשיכת המידע! {str(e)}"}


def update_data_panels_to_db(panels):
    db = get_db()

    existing_ids = fetch_existing_data()

    for row in panels:
        # Extract relevant data elements from the DCIM response (adjust based on your API structure)
        dcim_id = row.get("dcim_id")
        name = row.get("name")
        room = row.get("room")
        rack = row.get("rack")
        U = row.get("U")
        interface = row.get("interface")
        size = row.get("size")
        status = row.get("status")
        how_many_ports_remain = row.get("how_many_ports_remain")
        classification = row.get("classification")
        destination = row.get("destination")

        if dcim_id in existing_ids:
            sql = """UPDATE panels SET name = ?, room = ?, rack = ?, U = ?, interface = ?, size = ?, status = ?, how_many_ports_remain = ?, classification = ?, destination = ? WHERE dcim_id = ?"""
            db.execute(
                sql,
                (
                    name,
                    room,
                    rack,
                    U,
                    interface,
                    size,
                    status,
                    how_many_ports_remain,
                    classification,
                    destination,
                    dcim_id,
                ),
            )
        else:
            sql = """INSERT INTO panels (dcim_id, name, room, rack, U, interface, size, status, how_many_ports_remain, classification, destination) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
            db.execute(
                sql,
                (
                    dcim_id,
                    name,
                    room,
                    rack,
                    U,
                    interface,
                    size,
                    status,
                    how_many_ports_remain,
                    classification,
                    destination,
                ),
            )

    db.commit()


def fetch_existing_data():
    db = get_db()

    data = db.execute("SELECT dcim_id FROM panels")
    existing_ids = {row[0] for row in data.fetchall()}
    db.commit()

    return existing_ids


def search_assets(query: str, assets_type: str = None, returnItemsLimit: int = 100):
    logger.info(f"Beginning a search for - {query}")
    dcim_base_url = current_app.config["DCIM_BASE_URL"]

    if assets_type:
        search_url = f"{dcim_base_url}assets/search?q={query}&type={assets_type}&returnItemsLimit={returnItemsLimit}"
    else:
        search_url = f"{dcim_base_url}assets/search?q={query}s&returnItemsLimit={returnItemsLimit}"

    response = requests.get(
        search_url, headers=session.get("authentication")[1], verify=False
    )

    if response.status_code == 200:
        response = response.json()
        if len(response) > 0:
            # יצירת מילון דינמי של חדרים
            assets = {}
            for asset in response:
                room_name = asset["roomName"]
                if room_name:  # בדיקה שיש שם חדר
                    if room_name not in assets:
                        assets[room_name] = []
                    assets[room_name].append(asset)

            logger.info(f"Found {len(response)} total items for query: {query}")
            logger.info(f"Found items in {len(assets)} different rooms")
            return assets
        else:
            logger.info(f"Not found assets of type -- {assets_type}")
            return {}
    else:
        logger.error(f"Failed to fetch assets: {response.status_code}")
        return {}


def create_patch_panel_item(item):
    location = item["location"].split("/")
    if len(location) > 6:
        location.pop(1)

    interface = ""
    status = ""
    how_many_ports_remain = ""
    classification = ""
    destination = ""

    more_data = get_all_info_by_ids([item])
    size = more_data[item["id"]]["rackMounted"]["unitHeight"]
    custom_propertie = more_data[item["id"]].get("customProperties")
    if (
        "interface"
        or "status"
        or "how_many_ports_remain"
        or "classification"
        or "destination" in custom_propertie.keys()
    ):
        for key, value in custom_propertie.items():
            if key == "interface":
                interface = value.get("value")
            elif key == "status":
                status = value.get("value")
            elif key == "how_many_ports_remain":
                how_many_ports_remain = value.get("value")
            elif key == "classification":
                classification = value.get("value")
            elif key == "destination":
                destination = value.get("value")

    if interface == "":
        if (
            "RJ" in item["name"]
            or "copper" in item["name"]
            or "COPPER" in item["name"]
            or "RIT" in item["name"]
            or "rit" in item["name"]
            or "Rit" in item["name"]
        ):
            interface = "RJ"
        elif "mm" in item["name"] or "MM" in item["name"]:
            interface = "MM"
        elif "sm" in item["name"] or "SM" in item["name"]:
            interface = "SM"

    if destination == "":
        destination = (
            item["name"].split(" to ")[1] if len(item["name"].split(" to ")) > 1 else ""
        )
    if destination == "":
        destination = (
            item["name"].split(" TO ")[1] if len(item["name"].split(" TO ")) > 1 else ""
        )

    patchPanel = {
        "room": location[1],
        "dcim_id": item["id"],
        "name": item["name"],
        "rack": location[3],
        "U": location[4],
        "size": size,
        "interface": interface,
        "status": status,
        "how_many_ports_remain": how_many_ports_remain,
        "classification": classification,
        "destination": destination,
    }

    return patchPanel


def get_all_info_by_ids(ids: List[str]):
    data_dict = {}

    for item_id in ids:
        data = get_assete_by_id(item_id["id"])
        # logger.info(json.dumps(data, indent=2, sort_keys=True))

        data_dict[item_id["id"]] = data

    return data_dict


def get_assete_by_id(id: str):
    dcim_base_url = current_app.config["DCIM_BASE_URL"]

    url_id = f"{dcim_base_url}assets/{id}?include=custom_properties"

    response = requests.get(
        url_id, headers=session.get("authentication")[1], verify=False
    )
    response = response.json()
    return response


def get_panel(id):
    panel = (
        get_db()
        .execute(
            "SELECT dcim_id, name, room, rack, U, interface, size, status, how_many_ports_remain, classification, destination, date_created, date_updated"
            " FROM panels"
            " WHERE dcim_id = ?",
            (id,),
        )
        .fetchone()
    )

    if panel is None:
        abort(404, f"panel id {id} doesn't exist.")

    return panel


@bp.route("/pull-status", methods=("GET",))
def pull_status():
    global isUpdating
    return jsonify({"isUpdating": isUpdating})


@bp.route("/find_routes", methods=["POST"])
def find_routes():
    try:
        data = request.get_json()
        logger.warning(f"Received route search request: {data}")

        dc_map = DataCenterMap()
        db = get_db()

        # בניית שאילתה דינמית לפי הפרמטרים
        query = """
            SELECT * FROM panels 
            WHERE (status = "True" OR status = "1" OR status = 1)
            AND interface LIKE ?
        """
        params = [f"{data['interfaceType']}%"]  # משתמשים ב-% כדי לתפוס גם MM-LC וכו'

        # הוספת תנאי סיווג אם נבחר סיווג ספציפי
        if data["classification"] and data["classification"].lower() != "red+black":
            query += " AND classification = ?"
            params.append(data["classification"].lower())
        elif data["classification"] and data["classification"].lower() == "red+black":
            query += ' AND (classification = "red" OR classification = "black" OR classification = "red+black")'

        panels = db.execute(query, params).fetchall()

        logger.warning(f"Found {len(panels)} matching panels")

        # Add panels to map
        for panel in panels:
            try:
                interface_type = InterfaceType(panel["interface"].split("-")[0])

                # טיפול בסיווג
                classification = None
                if panel["classification"]:
                    if "red+black" in panel["classification"]:
                        classification = None
                    else:
                        try:
                            classification = ClassificationType(
                                panel["classification"].upper()
                            )
                        except ValueError:
                            classification = None

                # פיצול היעדים והפורטים
                destinations = (
                    [
                        dest.strip()
                        for dest in panel["destination"].split(",")
                        if dest.strip()
                    ]
                    if panel["destination"]
                    else []
                )
                ports_remain_str = (
                    panel["how_many_ports_remain"]
                    if panel["how_many_ports_remain"]
                    else ""
                )
                ports_dict = {}

                # פירוק מחרוזת הפורטים ליעדים
                if ":" in ports_remain_str:
                    port_pairs = [pair.strip() for pair in ports_remain_str.split(",")]
                    for pair in port_pairs:
                        if ":" in pair:
                            dest, ports = pair.split(":")
                            dest = dest.strip()
                            try:
                                ports_dict[dest] = int(ports.strip())
                            except ValueError:
                                ports_dict[dest] = 0
                else:
                    try:
                        default_ports = (
                            int(ports_remain_str) if ports_remain_str.isdigit() else 0
                        )
                        for dest in destinations:
                            ports_dict[dest] = default_ports
                    except ValueError:
                        default_ports = 0
                        for dest in destinations:
                            ports_dict[dest] = default_ports

                # יצירת פאנל נפרד לכל יעד
                for dest in destinations:
                    panel_id = f"{panel['dcim_id']}_{dest}"
                    ports = ports_dict.get(dest, 0)

                    p = Panel(
                        id=panel_id,
                        room=panel["room"],
                        location=Location(panel["rack"], panel["U"]),
                        interface_type=interface_type,
                        status=True,
                        how_many_ports_remain=ports,
                        classification=classification,
                        destination=dest,
                    )
                    dc_map.add_panel(p)
                    logger.warning(f"Added panel {panel_id} to map: {p}")

            except (ValueError, KeyError, AttributeError) as e:
                logger.warning(f"Skipping panel {panel['dcim_id']}: {str(e)}")
                continue

        # Connect panels
        dc_map.connect_panels()
        logger.warning("Panels connected")

        # Create constraints from request
        try:
            interface_type = InterfaceType(data["interfaceType"])
            min_ports = int(data["minPorts"])
            classification = None  # ברירת מחדל - מתאים לכל סיווג

            # טיפול בערך ברירת המחדל של max_hops
            max_hops = 3  # ערך ברירת מחדל
            if "maxHops" in data:
                try:
                    max_hops = int(data["maxHops"])
                    max_hops = min(max(1, max_hops), 10)  # הגבלה בין 1 ל-10
                except (ValueError, TypeError):
                    pass

            # טיפול באולמות מועדפים
            preferred_rooms = None
            if "preferredRooms" in data and data["preferredRooms"]:
                preferred_rooms = data["preferredRooms"]

            if data["classification"]:
                if data["classification"].lower() != "red+black":
                    classification = ClassificationType(data["classification"])

            constraints = RouteConstraints(
                interface_type=interface_type,
                min_free_ports=min_ports,
                classification=classification,
                max_hops=max_hops,
                preferred_rooms=preferred_rooms,
            )
            logger.warning(f"Created constraints: {constraints}")

            # Find routes
            routes = dc_map.find_all_routes(
                data["startRack"], data["endRack"], constraints
            )

            logger.warning(f"Found {len(routes)} possible routes")

            # Format routes for response
            formatted_routes = []
            for route in routes:
                route_steps = []
                for panel1_id, panel2_id in route:
                    panel1 = dc_map.panels[panel1_id]
                    panel2 = dc_map.panels[panel2_id]
                    route_steps.append(
                        {
                            "panelId": panel1_id,
                            "location": str(panel1.location),
                            "destination": panel1.destination,
                            "interfaceType": panel1.interface_type.value,
                        }
                    )
                    if panel2_id == route[-1][1]:  # Add last panel
                        route_steps.append(
                            {
                                "panelId": panel2_id,
                                "location": str(panel2.location),
                                "destination": panel2.destination,
                                "interfaceType": panel2.interface_type.value,
                            }
                        )
                formatted_routes.append(route_steps)

            return jsonify(formatted_routes)

        except Exception as e:
            logger.error(f"Error in route finding process: {str(e)}", exc_info=True)
            return jsonify({"error": f"Error finding routes: {str(e)}"}), 500

    except Exception as e:
        logger.error(f"Error in find_routes: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@bp.route('/api/rooms', methods=['GET'])
def get_rooms():
    try:
        logger.info("Fetching rooms from database...")
        # הוספת תנאי לסינון חדרי טסט
        query = """
            SELECT DISTINCT room 
            FROM panels 
            WHERE room IS NOT NULL 
              AND LOWER(room) != 'test'  
              AND room NOT LIKE '%test%' 
            ORDER BY room
        """
        db = get_db()
        rooms = db.execute(query).fetchall()
        
        if not rooms:
            logger.warning("No rooms found in database")
            return jsonify([])
            
        rooms = [row['room'] for row in rooms]
        logger.info(f"Found {len(rooms)} rooms: {rooms}")
        
        try:
            # ניסיון להשתמש בתרגומים
            translated_rooms = []
            for room in rooms:
                translation = translation_manager.get_translation(room)
                translated_rooms.append({
                    'value': room,
                    'label': translation
                })
            return jsonify(translated_rooms)
            
        except Exception as translation_error:
            logger.error(f"Translation error: {translation_error}")
            # במקרה של שגיאה בתרגום, החזרת השמות המקוריים
            return jsonify([{'value': room, 'label': room} for room in rooms])
            
    except Exception as e:
        logger.error(f"Error fetching rooms: {str(e)}", exc_info=True)
        return jsonify({'error': 'שגיאה בטעינת רשימת החדרים'}), 500


@bp.route('/api/rooms/refresh-translations', methods=['POST'])
def refresh_translations():
    try:
        query = "SELECT DISTINCT room FROM panels WHERE room IS NOT NULL"
        db = get_db()
        rooms = db.execute(query).fetchall()
        rooms = [row['room'] for row in rooms]
        
        # שימוש במתודה החדשה
        translation_manager.refresh_translations()
        translation_manager.initialize_translations(rooms)
        
        return jsonify({'status': 'success', 'message': 'התרגומים עודכנו בהצלחה'})
    except Exception as e:
        logger.error(f"Error refreshing translations: {str(e)}")
        return jsonify({'error': 'שגיאה בעדכון התרגומים'}), 500

@bp.route("/get_panel_statistics", methods=["GET"])
def get_panel_statistics():
    try:
        db = get_db()
        cursor = db.cursor()

        # Get room statistics
        room_stats = {}
        cursor.execute("""
            SELECT 
                room,
                COUNT(*) as panel_count,
                SUM(CASE WHEN status = 'True' OR status = '1' THEN 1 ELSE 0 END) as active_panels,
                COUNT(*) * 24 as total_ports,
                SUM(CAST(COALESCE(NULLIF(how_many_ports_remain, ''), '0') AS INTEGER)) as ports_remain,
                COUNT(DISTINCT rack) as rack_count,
                COUNT(DISTINCT classification) as classification_count,
                AVG(CAST(COALESCE(NULLIF(size, ''), '0') AS INTEGER)) as avg_size,
                GROUP_CONCAT(DISTINCT interface) as interfaces,
                GROUP_CONCAT(DISTINCT classification) as classifications,
                SUM(CASE WHEN interface LIKE 'MM%' THEN 1 ELSE 0 END) as mm_count,
                SUM(CASE WHEN interface LIKE 'SM%' THEN 1 ELSE 0 END) as sm_count,
                SUM(CASE WHEN interface LIKE 'RJ%' THEN 1 ELSE 0 END) as rj_count,
                MIN(CAST(COALESCE(NULLIF(size, ''), '0') AS INTEGER)) as min_size,
                MAX(CAST(COALESCE(NULLIF(size, ''), '0') AS INTEGER)) as max_size,
                COUNT(DISTINCT CASE WHEN destination IS NOT NULL AND destination != '' THEN destination END) as destinations_count,
                GROUP_CONCAT(how_many_ports_remain) as all_ports_remain
            FROM panels 
            WHERE room IS NOT NULL 
            GROUP BY room
            ORDER BY panel_count DESC
        """)
        
        for row in cursor.fetchall():
            total_ports = row['total_ports']
            
            # Parse how_many_ports_remain more carefully
            available_ports = 0
            ports_remain_str = row['all_ports_remain']
            if ports_remain_str:
                for entry in ports_remain_str.split(','):
                    entry = entry.strip()
                    if ':' in entry:  # Format: "ROOM:24"
                        try:
                            port_num = entry.split(':')[1].strip()
                            if port_num.isdigit():
                                available_ports += int(port_num)
                        except (IndexError, ValueError):
                            continue
                    elif entry.isdigit():  # Simple number
                        available_ports += int(entry)
            
            used_ports = total_ports - available_ports
            port_utilization = (used_ports / total_ports * 100) if total_ports > 0 else 0
            interfaces = row['interfaces'].split(',') if row['interfaces'] else []
            classifications = row['classifications'].split(',') if row['classifications'] else []
            
            room_stats[row['room']] = {
                'panelCount': row['panel_count'],
                'activePanels': row['active_panels'],
                'totalPorts': total_ports,
                'usedPorts': used_ports,
                'availablePorts': available_ports,
                'rackCount': row['rack_count'],
                'classificationCount': row['classification_count'],
                'avgSize': round(row['avg_size'], 1) if row['avg_size'] else 0,
                'minSize': row['min_size'] or 0,
                'maxSize': row['max_size'] or 0,
                'interfaces': list(set(filter(None, interfaces))),
                'classifications': list(set(filter(None, classifications))),
                'mmCount': row['mm_count'] or 0,
                'smCount': row['sm_count'] or 0,
                'rjCount': row['rj_count'] or 0,
                'destinationsCount': row['destinations_count'] or 0,
                'portUtilization': round(port_utilization, 1)
            }

        # Get interface type statistics with classification breakdown
        cursor.execute("""
            SELECT 
                interface,
                classification,
                COUNT(*) as type_count,
                SUM(CASE WHEN status = 'True' OR status = '1' THEN 1 ELSE 0 END) as active_count
            FROM panels 
            WHERE interface IS NOT NULL 
            GROUP BY interface, classification
            ORDER BY interface, classification
        """)
        type_stats = {}
        for row in cursor.fetchall():
            interface = row['interface'] or 'לא מוגדר'
            if interface not in type_stats:
                type_stats[interface] = {
                    'total': 0,
                    'active': 0,
                    'classifications': {}
                }
            type_stats[interface]['total'] += row['type_count']
            type_stats[interface]['active'] += row['active_count']
            if row['classification']:
                type_stats[interface]['classifications'][row['classification']] = row['type_count']

        # Get classification statistics
        cursor.execute("""
            SELECT 
                classification,
                COUNT(*) as count,
                COUNT(DISTINCT room) as room_count,
                COUNT(DISTINCT rack) as rack_count,
                SUM(CASE WHEN status = 'True' OR status = '1' THEN 1 ELSE 0 END) as active_count
            FROM panels 
            WHERE classification IS NOT NULL
            GROUP BY classification
        """)
        classification_stats = {
            row['classification']: {
                'count': row['count'],
                'roomCount': row['room_count'],
                'rackCount': row['rack_count'],
                'activeCount': row['active_count']
            } for row in cursor.fetchall()
        }

        # Get time-based statistics (panels added per month)
        cursor.execute("""
            SELECT 
                strftime('%Y-%m', date_created) as month,
                COUNT(*) as panel_count
            FROM panels 
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        """)
        time_stats = {
            row['month']: row['panel_count'] for row in cursor.fetchall()
        }

        # Get overall port statistics
        cursor.execute("""
            SELECT 
                COUNT(*) * 24 as total_ports,
                GROUP_CONCAT(how_many_ports_remain) as all_ports_remain,
                COUNT(DISTINCT room) as total_rooms,
                COUNT(DISTINCT rack) as total_racks,
                COUNT(DISTINCT classification) as total_classifications,
                COUNT(DISTINCT interface) as total_interfaces,
                AVG(CAST(COALESCE(NULLIF(size, ''), '0') AS INTEGER)) as avg_panel_size,
                COUNT(*) as total_panels,
                SUM(CASE WHEN status = 'True' OR status = '1' THEN 1 ELSE 0 END) as active_panels
            FROM panels
        """)
        summary_data = cursor.fetchone()
        total_ports = summary_data['total_ports'] if summary_data['total_ports'] else 0
        
        # Parse how_many_ports_remain for summary
        available_ports = 0
        ports_remain_str = summary_data['all_ports_remain']
        if ports_remain_str:
            for entry in ports_remain_str.split(','):
                entry = entry.strip()
                if ':' in entry:  # Format: "ROOM:24"
                    try:
                        port_num = entry.split(':')[1].strip()
                        if port_num.isdigit():
                            available_ports += int(port_num)
                    except (IndexError, ValueError):
                        continue
                elif entry.isdigit():  # Simple number
                    available_ports += int(entry)
        
        used_ports = total_ports - available_ports
        
        summary_stats = {
            'totalPanels': summary_data['total_panels'],
            'activePanels': summary_data['active_panels'],
            'totalRooms': summary_data['total_rooms'],
            'totalRacks': summary_data['total_racks'],
            'totalClassifications': summary_data['total_classifications'],
            'totalInterfaces': summary_data['total_interfaces'],
            'avgPanelSize': round(summary_data['avg_panel_size'], 1) if summary_data['avg_panel_size'] else 0,
            'ports': {
                'total': total_ports,
                'used': used_ports,
                'available': available_ports,
                'utilization': round(((used_ports) / total_ports * 100), 1) if total_ports > 0 else 0
            }
        }

        return jsonify({
            'roomStats': room_stats,
            'typeStats': type_stats,
            'classificationStats': classification_stats,
            'timeStats': time_stats,
            'summaryStats': summary_stats
        })

    except Exception as e:
        current_app.logger.error(f"Error getting panel statistics: {str(e)}")
        return jsonify({'error': str(e)}), 500  