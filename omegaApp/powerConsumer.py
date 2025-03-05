from flask import (
    Blueprint,
    flash,
    redirect,
    render_template,
    request,
    url_for,
    session,
    current_app,
)

import requests

bp = Blueprint("powerConsumer", __name__, url_prefix="/powerConsumer")

MOCK_ASSETS = {
    "server1": {
        "basic_data": {
            "id": "server1",
            "type": "server",
            "rackName": "Rack-101",
            "parentName": "DataCenter-1"
        },
        "data": {
            "serialNumber": "SN123456",
            "modelName": "PowerEdge R740",
            "name": "Web Server 1",
            "powerConsumer": {
                "estimatedLoad": 450,
                "nameplate": 750
            }
        },
        "power_consumer": {
            "estimatedLoad": 450,
            "max": 750
        }
    },
    "server2": {
        "basic_data": {
            "id": "server2",
            "type": "server",
            "rackName": "Rack-102",
            "parentName": "DataCenter-1"
        },
        "data": {
            "serialNumber": "SN789012",
            "modelName": "ProLiant DL380",
            "name": "Database Server",
            "powerConsumer": {
                "estimatedLoad": 600,
                "nameplate": 1000
            }
        },
        "power_consumer": {
            "estimatedLoad": 600,
            "max": 1000
        }
    },
    "server3": {
        "basic_data": {
            "id": "server3",
            "type": "server",
            "rackName": "Rack-103",
            "parentName": "DataCenter-2"
        },
        "data": {
            "serialNumber": None,
            "modelName": "ThinkSystem SR650",
            "name": "Application Server",
            "powerConsumer": {
                "estimatedLoad": 350,
                "nameplate": 500
            }
        },
        "power_consumer": {
            "estimatedLoad": 350,
            "max": 500
        }
    }
}


@bp.route("/search", methods=("POST",))
def search():
    query = request.form["query"]
    assets_type = request.form["selectType"]
    error, assets = fetch_assets(query, assets_type)

    if error is not None:
        flash(error)
        return redirect(url_for("index"))

    if not assets:
        assets = {}
        
    return render_template("powerConsumer/powerConsumer.html", assets=assets)


def fetch_assets(query: str, assets_type: str = None):
    try:
        # For development/testing, return mock data
        if current_app.config.get('TESTING') or current_app.config.get('DEBUG'):
            # Filter mock assets based on query (case-insensitive)
            filtered_assets = {
                k: v for k, v in MOCK_ASSETS.items() 
                if query.lower() in v['data']['name'].lower() or 
                   query.lower() in (v['data']['serialNumber'] or '').lower()
            }
            return None, filtered_assets if filtered_assets else None
            
        # Original production code
        error, assets = search_assets(query, assets_type)
        if error is None and assets:
            assets_data_dict = get_all_asset_info_by_ids(assets)
            if assets_type == "server":
                assets_data_dict = get_power_consumer_items(assets_data_dict)
            return error, assets_data_dict
        return error, None
    except Exception as e:
        print(f"Error in fetch_assets: {str(e)}")
        return "אירעה שגיאה בעת אחזור הנתונים", None


def search_assets(query: str, assets_type: str = None, returnItemsLimit: int = 100):
    dcim_base_url = current_app.config["DCIM_BASE_URL"]
    error = None
    assets = []
    
    try:
        search_url = f"{dcim_base_url}assets/search?q={query}&type={assets_type}&returnItemsLimit={returnItemsLimit}"
        response = requests.get(
            search_url, headers=session.get("authentication")[1], verify=False
        )
        
        if response.status_code == 200:
            response = response.json()
            if len(response) > 0:
                for asset in response:
                    if asset["type"] not in [
                        "generic-equipment",
                        "rack-mount-pdu",
                        "rack",
                        "patch-panel",
                        "server-room",
                    ]:
                        assets.append(asset)
                    elif assets_type == asset["type"]:
                        assets.append(asset)
                print(f"  ----  Found {len(response)} items in '{query}' query")
                print(f"  ----  Found {len(assets)} relevant items")
            else:
                print(f"Not found assets of type -- {assets_type}")
                error = "לא מצאתי מה שחיפשת..."
        else:
            error = "יש לנו פה איזו בעיה  - נסה שוב"
            
    except requests.RequestException as e:
        print(f"Network error in search_assets: {str(e)}")
        error = "בעיית תקשורת - נסה שוב מאוחר יותר"
    except Exception as e:
        print(f"Error in search_assets: {str(e)}")
        error = "אירעה שגיאה - נסה שוב"
    
    return error, assets


def get_all_asset_info_by_ids(assets: list):
    assets_dict = {}

    for asset in assets:
        data = get_assete_by_id(asset["id"])
        assets_dict[asset["id"]] = {}
        assets_dict[asset["id"]]["basic_data"] = asset
        assets_dict[asset["id"]]["data"] = data

    return assets_dict


def get_assete_by_id(id: str):
    dcim_base_url = current_app.config["DCIM_BASE_URL"]
    
    try:
        url_id = f"{dcim_base_url}assets/{id}"
        response = requests.get(
            url_id, headers=session.get("authentication")[1], verify=False
        )
        response.raise_for_status()  # יזרוק חריגה אם הסטטוס לא 200
        asset_data = response.json()
        return asset_data
    except requests.RequestException as e:
        print(f"Network error in get_assete_by_id: {str(e)}")
        return {}
    except ValueError as e:
        print(f"JSON decode error in get_assete_by_id: {str(e)}")
        return {}
    except Exception as e:
        print(f"Error in get_assete_by_id: {str(e)}")
        return {}


def get_power_consumer_items(assets_data_dict: dict):

    for id in assets_data_dict:
        power_consumer = get_power_consumer(assets_data_dict[id])
        assets_data_dict[id]["power_consumer"] = power_consumer

    return assets_data_dict


def get_power_consumer(data: dict):
    try:
        power_consumer = {}
        power_consumer_data = data.get("data", {}).get("powerConsumer", {})
        power_consumer["estimatedLoad"] = power_consumer_data.get("estimatedLoad", 0)
        power_consumer["max"] = power_consumer_data.get("nameplate", 0)
        return power_consumer
    except Exception as e:
        print(f"Error in get_power_consumer: {str(e)}")
        return {"estimatedLoad": 0, "max": 0}