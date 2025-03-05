from flask import Blueprint, jsonify, render_template, current_app, request, session
from ..modules.server_dashboard import ServerDataManager
from ..modules.dcim_manager import DCIMManager
from ..logger_manager import LoggerManager
import os

server_dashboard = Blueprint('server_dashboard', __name__)
server_manager = None
dcim_manager = DCIMManager()  # Singleton instance
logger = LoggerManager().get_logger()

def get_server_manager():
    """Get or create the ServerDataManager singleton"""
    global server_manager
    if server_manager is None:
        try:
            # Get data directory configuration
            data_dir = current_app.config.get('SERVERS_DATA_DIR')
            if not data_dir:
                raise ValueError("SERVERS_DATA_DIR must be configured")

            # Initialize server manager
            server_manager = ServerDataManager(data_dir)
            
            # Initialize DCIM if configured
            dcim_base_url = current_app.config.get('DCIM_BASE_URL')
            if dcim_base_url:
                dcim_manager.initialize(dcim_base_url, verify_ssl=False)
            
            logger.info("ServerDataManager initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing server manager: {str(e)}")
            raise
            
    return server_manager

@server_dashboard.route('/dashboard')
def index():
    """Render the server dashboard page"""
    dcim_manager.refresh_auth()  # Just refresh auth status
    return render_template('dashboard/index.html')

@server_dashboard.route('/api/servers', methods=['GET'])
def get_servers():
    """Get all servers"""
    try:
        servers = get_server_manager().get_all_assets()
        return jsonify({"status": "success", "data": servers})
    except Exception as e:
        logger.error(f"Error getting servers: {str(e)}")
        return jsonify({"status": "error", "error": str(e)}), 500

@server_dashboard.route('/api/servers/<mgmt_ip>', methods=['GET'])
def get_server(mgmt_ip):
    """Get specific server data"""
    server_data = get_server_manager().get_server(mgmt_ip)
    if not server_data:
        return jsonify({
            'status': 'error',
            'message': f'Server with IP {mgmt_ip} not found'
        }), 404
    
    return jsonify({
        'status': 'success',
        'data': server_data
    })

@server_dashboard.route('/api/servers/<mgmt_ip>/dcim/analyze', methods=['GET'])
def analyze_server_dcim(mgmt_ip):
    """Analyze a single server against DCIM"""
    try:
        if not dcim_manager.refresh_auth():
            return jsonify({
                "status": "error",
                "error": "DCIM authentication required"
            }), 401
            
        server_data = get_server_manager().get_server(mgmt_ip)
        if not server_data:
            return jsonify({
                "status": "error",
                "error": f"Server {mgmt_ip} not found"
            }), 404
            
        result = dcim_manager.analyze_server(server_data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error analyzing server {mgmt_ip}: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@server_dashboard.route('/api/servers/dcim/analyze', methods=['POST'])
def analyze_servers_dcim():
    """Analyze multiple servers against DCIM"""
    try:
        if not dcim_manager.refresh_auth():
            return jsonify({
                "status": "error",
                "error": "DCIM authentication required"
            }), 401
            
        data = request.get_json()
        mgmt_ips = data.get('mgmt_ips')
        
        # Get servers data
        servers_data = {}
        if mgmt_ips:
            for ip in mgmt_ips:
                server_data = get_server_manager().get_server(ip)
                if server_data:
                    servers_data[ip] = server_data
        else:
            servers_data = get_server_manager().servers_data
            
        results = dcim_manager.analyze_servers(servers_data)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error analyzing servers: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@server_dashboard.route('/api/servers/<mgmt_ip>/dcim/update', methods=['POST'])
def update_server_dcim(mgmt_ip):
    """Update DCIM with server data"""
    try:
        if not dcim_manager.refresh_auth():
            return jsonify({
                "status": "error",
                "error": "DCIM authentication required"
            }), 401
            
        data = request.get_json()
        fields = data.get('fields', [])
        if not fields:
            return jsonify({
                "status": "error",
                "error": "No fields specified"
            }), 400
            
        server_data = get_server_manager().get_server(mgmt_ip)
        if not server_data:
            return jsonify({
                "status": "error",
                "error": f"Server {mgmt_ip} not found"
            }), 404
            
        result = dcim_manager.update_server(server_data, fields)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error updating DCIM for server {mgmt_ip}: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@server_dashboard.route('/api/servers/dcim/update', methods=['POST'])
def update_servers_dcim():
    """Update DCIM with multiple servers data"""
    try:
        if not dcim_manager.refresh_auth():
            return jsonify({
                "status": "error",
                "error": "DCIM authentication required"
            }), 401
            
        data = request.get_json()
        updates = data.get('updates', {})
        if not updates:
            return jsonify({
                "status": "error",
                "error": "No updates specified"
            }), 400
            
        # Prepare updates with server data
        server_updates = {}
        for ip, fields in updates.items():
            server_data = get_server_manager().get_server(ip)
            if server_data:
                server_updates[ip] = {
                    'server_data': server_data,
                    'fields': fields
                }
            
        results = dcim_manager.update_servers(server_updates)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error updating servers in DCIM: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500 