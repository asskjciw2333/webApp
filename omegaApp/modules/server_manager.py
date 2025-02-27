from flask import Blueprint, flash, redirect, render_template, request, url_for, current_app, session
from typing import Dict, Optional, Tuple
from .dcim_client import DCIMClient
from ..logger_manager import LoggerManager
from ..auth import authentication_ita

logger = LoggerManager().get_logger()
bp = Blueprint("server_manager", __name__, url_prefix="/servers")

# Mock data for development environment
MOCK_SERVERS = {
    "srv-001": {
        "id": "srv-001",
        "name": "Web Server Production",
        "serialNumber": "SRV2023001",
        "modelName": "PowerEdge R740",
        "type": "server",
        "rack": {"name": "Rack-A01"},
        "parent": {"name": "DataCenter-1"},
        "powerConsumer": {
            "estimatedLoad": 450,
            "nameplate": 750
        }
    },
    "srv-002": {
        "id": "srv-002",
        "name": "Database Server Primary",
        "serialNumber": "SRV2023002",
        "modelName": "ProLiant DL380",
        "type": "server",
        "rack": {"name": "Rack-A02"},
        "parent": {"name": "DataCenter-1"},
        "powerConsumer": {
            "estimatedLoad": 600,
            "nameplate": 1000
        }
    },
    "srv-003": {
        "id": "srv-003",
        "name": "Application Server Dev",
        "serialNumber": "SRV2023003",
        "modelName": "ThinkSystem SR650",
        "type": "server",
        "rack": {"name": "Rack-B01"},
        "parent": {"name": "DataCenter-2"},
        "powerConsumer": {
            "estimatedLoad": 350,
            "nameplate": 500
        }
    },
    "rack-001": {
        "id": "rack-001",
        "name": "Rack A01",
        "serialNumber": "RACK2023001",
        "type": "rack",
        "row": "Row-1",
        "parent": {"name": "Server Room A"},
        "powerConsumer": {
            "estimatedLoad": 2500,
            "nameplate": 4000
        }
    },
    "rack-002": {
        "id": "rack-002",
        "name": "Rack B02",
        "serialNumber": "RACK2023002",
        "type": "rack",
        "row": "Row-2",
        "parent": {"name": "Server Room B"},
        "powerConsumer": {
            "estimatedLoad": 3000,
            "nameplate": 5000
        }
    }
}

class ServerManager:
    def __init__(self):
        self._dcim_client = None
        self._is_dev_mode = None
        
    @property
    def is_dev_mode(self) -> bool:
        """Lazy check for development mode"""
        if self._is_dev_mode is None:
            self._is_dev_mode = True  # Force development mode for now
        return self._is_dev_mode
        
    @property
    def dcim_client(self) -> DCIMClient:
        """Lazy initialization of DCIM client within application context"""
        if self._dcim_client is None and not self.is_dev_mode:
            self._dcim_client = DCIMClient(
                base_url=current_app.config.get("DCIM_BASE_URL"),
                verify_ssl=current_app.config.get("VERIFY_SSL", True)
            )
        return self._dcim_client
        
    def set_auth_headers(self, auth_headers: Dict[str, str]):
        """Set authentication headers for DCIM client"""
        if not self.is_dev_mode:
            self.dcim_client.set_auth(auth_headers)
        
    def search_servers(self, query: str, search_type: str = 'server', include_power_data: bool = True) -> Tuple[Optional[str], Optional[Dict]]:
        """
        Search for servers based on query and optionally include power consumption data
        :param query: Search query (name, serial number, etc.)
        :param search_type: Type of search ('server' or 'rack')
        :param include_power_data: Whether to include power consumption data
        :return: Tuple of (error message, server data dictionary)
        """
        try:
            logger.info(f"Searching for {search_type}s with query: {query}, dev mode: {self.is_dev_mode}")
            
            if self.is_dev_mode:
                logger.info("Using mock data for search")
                return self._mock_search_servers(query, search_type)
            
            # Production code using DCIM
            search_params = {
                'q': query,
                'type': search_type,
                'include': 'custom_properties,powerConsumer'
            }
            
            servers = self.dcim_client.get_all_assets(
                type=search_type,
                include_details=True
            )
            
            if not servers:
                return f"לא נמצאו {search_type}ים התואמים לחיפוש", None
                
            filtered_servers = {}
            for server in servers:
                if (query.lower() in server.get('name', '').lower() or
                    query.lower() in server.get('serialNumber', '').lower()):
                    
                    server_id = server['id']
                    basic_data = {
                        'id': server_id,
                        'type': search_type,
                        'name': server.get('name'),
                        'parentName': server.get('parent', {}).get('name')
                    }

                    # Add specific fields based on type
                    if search_type == 'server':
                        basic_data['rackName'] = server.get('rack', {}).get('name')
                    else:  # rack
                        basic_data['row'] = server.get('row')

                    filtered_servers[server_id] = {
                        'basic_data': basic_data,
                        'data': server
                    }
                    
                    if include_power_data:
                        power_data = self._extract_power_data(server)
                        filtered_servers[server_id]['power_consumer'] = power_data
                        
            return None, filtered_servers if filtered_servers else None
            
        except Exception as e:
            logger.error(f"Error in search_servers: {str(e)}")
            return f"אירעה שגיאה בחיפוש ה{search_type}ים", None
            
    def _mock_search_servers(self, query: str, search_type: str = 'server') -> Tuple[Optional[str], Optional[Dict]]:
        """Search in mock data for development environment"""
        filtered_servers = {}
        query = query.lower()
        
        logger.info(f"Searching mock data with query: {query} for type: {search_type}")
        
        for server_id, server in MOCK_SERVERS.items():
            if server['type'] != search_type:
                continue
                
            if (query in server['name'].lower() or 
                query in server['serialNumber'].lower()):
                logger.info(f"Found matching {search_type}: {server['name']}")
                
                basic_data = {
                    'id': server_id,
                    'type': search_type,
                    'name': server['name'],
                    'parentName': server['parent']['name']
                }

                # Add specific fields based on type
                if search_type == 'server':
                    basic_data['rackName'] = server['rack']['name']
                else:  # rack
                    basic_data['row'] = server['row']

                filtered_servers[server_id] = {
                    'basic_data': basic_data,
                    'data': server,
                    'power_consumer': {
                        'estimatedLoad': server['powerConsumer']['estimatedLoad'],
                        'max': server['powerConsumer']['nameplate']
                    }
                }
        
        if not filtered_servers:
            logger.info(f"No {search_type}s found matching query")
            return f"לא נמצאו {search_type}ים התואמים לחיפוש", None
            
        logger.info(f"Found {len(filtered_servers)} matching {search_type}s")
        return None, filtered_servers
            
    def _extract_power_data(self, server_data: Dict) -> Dict:
        """
        Extract power consumption data from server data
        :param server_data: Server data dictionary
        :return: Dictionary with power consumption information
        """
        power_consumer = server_data.get('powerConsumer', {})
        return {
            'estimatedLoad': power_consumer.get('estimatedLoad', 0),
            'max': power_consumer.get('nameplate', 0)
        }

# Create a single instance of ServerManager
server_manager = ServerManager()

@bp.before_request
def setup_server_manager():
    """Set up server manager with authentication before each request"""
    if server_manager.is_dev_mode:
        logger.info("Development mode - skipping authentication")
        return  # Skip authentication in development mode
        
    try:
        # Check if we have valid authentication in session
        if not session.get('authentication'):
            # If not, try to authenticate
            auth_success, headers = authentication_ita()
            if auth_success:
                session['authentication'] = (auth_success, headers)
            else:
                logger.error("Failed to authenticate with DCIM")
                return redirect(url_for('index'))
        
        # Set auth headers from session
        auth_data = session.get('authentication')
        if isinstance(auth_data, tuple) and len(auth_data) == 2 and auth_data[0]:
            server_manager.set_auth_headers(auth_data[1])
        else:
            logger.error("Invalid authentication data in session")
            session.pop('authentication', None)  # Clear invalid auth data
            return redirect(url_for('index'))
            
    except Exception as e:
        logger.error(f"Error in setup_server_manager: {str(e)}")
        return redirect(url_for('index'))

@bp.route("/search", methods=["POST"])
def search():
    """Handle server search requests"""
    query = request.form.get("query", "")
    search_type = request.form.get("type", "server")  # Get search type from form, default to 'server'
    logger.info(f"Received search request with query: {query}, type: {search_type}")
    
    if not query:
        flash("נא להזין ערך לחיפוש")
        return redirect(url_for("index"))
        
    error, servers = server_manager.search_servers(query, search_type)
    
    if error:
        logger.warning(f"Search error: {error}")
        flash(error)
        if not server_manager.is_dev_mode:
            return redirect(url_for("index"))
    
    logger.info(f"Rendering results with {len(servers) if servers else 0} {search_type}s found")
    return render_template(
        "servers/server_list.html",
        servers=servers or {},
        search_query=query,
        search_type=search_type
    ) 
