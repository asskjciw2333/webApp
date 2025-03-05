from flask import Blueprint, jsonify, request, current_app, session
from ..modules.dcim_manager import DCIMManager
from ..logger_manager import LoggerManager
from typing import Dict

logger = LoggerManager().get_logger()
dcim_api = Blueprint('dcim_api', __name__, url_prefix='/api/dcim')
dcim_manager = DCIMManager()

def _ensure_dcim_auth():
    """Ensure DCIM is authenticated"""
    if not dcim_manager.refresh_auth():
        return {
            "status": "error",
            "error": "DCIM authentication required",
            "response": "נדרשת הזדהות מול מערכת ה-DCIM"
        }
    return None

def search_assets(query: str, search_type: str = None, include_details: bool = True) -> Dict:
    """
    Search for assets in DCIM using various parameters.
    Can be used both as a module function and through the API.
    
    Args:
        query: Search term
        search_type: Type of asset to search for (e.g. 'server')
        include_details: Whether to include full asset details
        
    Returns:
        Dict with status, data and response message
    """
    try:
        # Check authentication when used as module
        auth_error = _ensure_dcim_auth()
        if auth_error:
            return auth_error
            
        search_params = {
            'q': query,
            'type': search_type if search_type else 'server'
        }
        
        result = dcim_manager.client.search_asset(search_params, include_details)
        if result:
            return {
                "status": "success",
                "data": result,
                "response": f"מצאתי את השרת {result.get('name', '')}"
            }
        else:
            return {
                "status": "not_found",
                "message": "לא נמצאו שרתים מתאימים",
                "response": "לא מצאתי שרתים שתואמים לחיפוש שלך"
            }
            
    except Exception as e:
        logger.error(f"Error searching DCIM assets: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בחיפוש השרת"
        }

def search_servers(query: str) -> Dict:
    """
    Legacy function - Search specifically for servers.
    Can be used both as a module function and through the API.
    """
    return search_assets(query, search_type='server')

# API Routes that use the module functions
@dcim_api.route('/assets/search', methods=['POST'])
def search_assets_api():
    """API endpoint for asset search"""
    try:
        data = request.get_json()
        query = data.get('query')
        search_type = data.get('type')
        include_details = data.get('include_details', True)
        
        result = search_assets(query, search_type, include_details)
        return jsonify(result), 200 if result["status"] == "success" else 404
            
    except Exception as e:
        logger.error(f"API error searching assets: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בחיפוש"
        }), 500

@dcim_api.route('/servers/search', methods=['POST'])
def search_servers_api():
    """API endpoint for server search"""
    try:
        data = request.get_json()
        query = data.get('query')
        
        result = search_servers(query)
        return jsonify(result), 200 if result["status"] == "success" else 404
            
    except Exception as e:
        logger.error(f"API error searching servers: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "response": "אירעה שגיאה בחיפוש"
        }), 500

@dcim_api.route('/assets', methods=['GET'])
def get_all_assets():
    """Get all assets from DCIM with filtering options"""
    auth_error = _ensure_dcim_auth()
    if auth_error:
        return auth_error
        
    try:
        # Get parameters with defaults
        limit = request.args.get('limit', 1000, type=int)
        asset_type = request.args.get('type')
        include_details = request.args.get('include_details', False, type=bool)
        
        result = dcim_manager.client.get_all_assets(
            limit=limit,
            type=asset_type,
            include_details=include_details
        )
        
        if result:
            return jsonify({
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "status": "not_found",
                "message": "No assets found"
            }), 404
            
    except Exception as e:
        logger.error(f"Error getting all DCIM assets: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@dcim_api.route('/assets/<asset_id>', methods=['GET'])
def get_asset_details(asset_id):
    """Get detailed information about a specific asset"""
    auth_error = _ensure_dcim_auth()
    if auth_error:
        return auth_error
        
    try:
        result = dcim_manager.client.get_asset_details(asset_id)
        if result:
            return jsonify({
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "status": "not_found",
                "message": f"Asset {asset_id} not found"
            }), 404
            
    except Exception as e:
        logger.error(f"Error getting DCIM asset details: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@dcim_api.route('/assets/<asset_id>', methods=['PATCH'])
def update_asset(asset_id):
    """Update asset information in DCIM"""
    auth_error = _ensure_dcim_auth()
    if auth_error:
        return auth_error
        
    try:
        update_data = request.get_json()
        if not update_data:
            return jsonify({
                "status": "error",
                "error": "No update data provided"
            }), 400
            
        result = dcim_manager.client.update_asset(asset_id, update_data)
        return jsonify({
            "status": "success",
            "data": result
        })
            
    except Exception as e:
        logger.error(f"Error updating DCIM asset: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

# New route for bulk asset operations
@dcim_api.route('/assets/bulk/search', methods=['POST'])
def bulk_search_assets():
    """Search for multiple assets using different criteria"""
    auth_error = _ensure_dcim_auth()
    if auth_error:
        return auth_error
        
    try:
        data = request.get_json()
        search_criteria_list = data.get('search_criteria', [])
        include_details = data.get('include_details', False)
        
        if not search_criteria_list:
            return jsonify({
                "status": "error",
                "error": "No search criteria provided"
            }), 400
            
        results = []
        for criteria in search_criteria_list:
            result = dcim_manager.client.search_asset(criteria, include_details)
            if result:
                results.append(result)
                
        return jsonify({
            "status": "success",
            "data": results,
            "total_found": len(results)
        })
            
    except Exception as e:
        logger.error(f"Error in bulk asset search: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500