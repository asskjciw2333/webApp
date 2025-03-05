import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from ..logger_manager import LoggerManager
from .dcim_analyzer import DCIMAnalyzer
from .dcim_client import DCIMClient

# Get logger from LoggerManager
logger = LoggerManager().get_logger()

class ServerDataManager:
    def __init__(self, data_directory: str, dcim_client=None):
        self.data_directory = Path(data_directory)
        self.servers_data: Dict[str, Dict] = {}
        self.dcim_client = dcim_client
        self.dcim_analyzer = DCIMAnalyzer(self.dcim_client) if self.dcim_client else None
        
        try:
            self._setup_file_watcher()
            self.load_all_data()
        except Exception as e:
            logger.error(f"Error initializing ServerDataManager: {str(e)}")

    def _setup_file_watcher(self):
        """Setup watchdog to monitor changes in the data directory"""
        try:
            if not self.data_directory.exists():
                self.data_directory.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created data directory at {self.data_directory}")

            event_handler = ServerDataFileHandler(self)
            self.observer = Observer()
            self.observer.schedule(event_handler, str(self.data_directory), recursive=False)
            self.observer.start()
            logger.info("File watcher setup successfully")
        except Exception as e:
            logger.error(f"Error setting up file watcher: {str(e)}")
            # Don't re-raise the exception, just log it

    def load_all_data(self):
        """Load all JSON files from the data directory"""
        try:
            if not self.data_directory.exists():
                logger.warning(f"Data directory {self.data_directory} does not exist")
                self.data_directory.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created data directory at {self.data_directory}")
                return

            json_files = list(self.data_directory.glob("*.json"))
            if not json_files:
                logger.warning(f"No JSON files found in {self.data_directory}")
                return

            for file_path in json_files:
                try:
                    self.load_server_data(file_path)
                    logger.debug(f"Successfully loaded data from {file_path}")
                except Exception as e:
                    logger.error(f"Error loading server data from {file_path}: {str(e)}")
                    # Continue loading other files even if one fails

        except Exception as e:
            logger.error(f"Error in load_all_data: {str(e)}")
            raise

    def load_server_data(self, file_path: Path):
        """Load server data from a single JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                file_data = json.load(f)
                
                # Handle both single server and multiple server formats
                if not isinstance(file_data, dict):
                    raise ValueError(f"Invalid data format in {file_path}")
                
                # If the top level keys are IPs, process each server
                for ip, server_data in file_data.items():
                    if isinstance(server_data, dict):
                        # Add the IP to the server data if not present
                        if 'mgmt_ip' not in server_data and 'Network' not in server_data:
                            server_data['mgmt_ip'] = ip
                        
                        # Normalize the data
                        normalized_data = self._normalize_server_data(server_data)
                        
                        # Get the final mgmt_ip (prefer normalized, fallback to original)
                        server_ip = normalized_data.get('mgmt_ip', ip)
                        
                        # Store both original and normalized data
                        self.servers_data[server_ip] = {
                            **server_data,  # Original data
                            **normalized_data  # Normalized fields
                        }
                        logger.debug(f"Loaded and normalized data for server {server_ip}")
                    else:
                        logger.warning(f"Skipping invalid server data for IP {ip} in {file_path}")
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error in {file_path}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error loading {file_path}: {str(e)}")
            raise

    def _normalize_server_data(self, data: Dict) -> Dict:
        """Normalize server data to handle flexible field names"""
        try:
            normalized = {}
            
            # Map common fields regardless of exact name
            field_mappings = {
                'serial': ['serial', 'serialNumber', 'Serial'],
                'vendor': ['vendor', 'Vendor', 'manufacturer'],
                'model': ['model', 'Model', 'SystemModel'],
                'hostname': ['hostname', 'HostName', 'host_name'],
                'mgmt_ip': ['Network', 'mgmt_ip', 'management_ip'],
            }

            # Check base level fields first
            for norm_key, possible_keys in field_mappings.items():
                # Check in root level
                for key in possible_keys:
                    if key in data:
                        normalized[norm_key] = data[key]
                        break
                
                # If not found and it's mgmt_ip, check in Network section
                if norm_key == 'mgmt_ip' and norm_key not in normalized:
                    if 'Network' in data and isinstance(data['Network'], dict):
                        for key in possible_keys:
                            if key in data['Network']:
                                normalized[norm_key] = data['Network'][key]
                                break

            # Handle nested structures
            if 'Network' in data and isinstance(data['Network'], dict):
                normalized['network'] = data['Network']

            # Handle memory
            if 'TotalSystemMemoryGiB' in data:
                normalized['memory'] = {
                    'total': data['TotalSystemMemoryGiB']
                }

            # Handle processors
            if 'Processors' in data and isinstance(data['Processors'], dict):
                normalized['processors'] = {
                    'count': data['Processors'].get('CPUCount', 0),
                    'cores_per_cpu': data['Processors'].get('CorePerCPU', 0),
                    'total_cores': data['Processors'].get('CPUCount', 0) * data['Processors'].get('CorePerCPU', 0)
                }

            # Handle storage
            if 'Storage' in data and isinstance(data['Storage'], dict):
                normalized['storage'] = {
                    'disks': data['Storage'].get('disks', {}),
                    'pcie': data['Storage'].get('pcie', {})
                }

                # Process Disks
                if 'Disks' in data['Storage']:
                    for controller, drives in data['Storage']['Disks'].items():
                        normalized['storage']['disks'][controller] = [
                            {
                                'model': drive.get('Model', 'N/A'),
                                'id': drive.get('Id', 'N/A'),
                                'capacity_gb': drive.get('CapacityGB', 0) or (drive.get('CapacityBytes', 0) / (1024 ** 3))
                            }
                            for drive in drives
                        ]

                # Process PCIe devices
                if 'PCIe' in data['Storage']:
                    for controller, devices in data['Storage']['PCIe'].items():
                        normalized['storage']['pcie'][controller] = [
                            {
                                'name': device.get('Name', 'N/A'),
                                'class': device.get('class', 'N/A'),
                                'vendor': device.get('Vendor', 'N/A')
                            }
                            for device in devices
                        ]

            # Handle location
            if 'Location' in data:
                logger.debug(f"Processing location data: {data['Location']}")
                if not isinstance(data['Location'], dict):
                    logger.error(f"Location data is not a dictionary: {type(data['Location'])}")
                    raise TypeError(f"Expected dict for Location, got {type(data['Location'])}")
                normalized['location'] = {
                    'data_center': data['Location'].get('DataCenter', 'N/A').upper(),
                    'room': data['Location'].get('Room', 'N/A').upper(),
                    'row': data['Location'].get('Row', 'N/A').upper(),
                    'rack': data['Location'].get('Rack', 'N/A').upper(),
                    'u': data['Location'].get('U', 'N/A').upper()
                }

            # Handle power and temperature
            if 'Power' in data:
                logger.debug(f"Processing power data: {data['Power']}")
                if not isinstance(data['Power'], dict):
                    logger.error(f"Power data is not a dictionary: {type(data['Power'])}")
                    raise TypeError(f"Expected dict for Power, got {type(data['Power'])}")
                normalized['power'] = {
                    'max': round(data['Power'].get('Max', 0), 2),
                    'avg': round(data['Power'].get('Avg', 0), 2),
                    'min': round(data['Power'].get('Min', 0), 2)
                }
                
            if 'Temperature' in data:
                logger.debug(f"Processing temperature data: {data['Temperature']}")
                if not isinstance(data['Temperature'], dict):
                    logger.error(f"Temperature data is not a dictionary: {type(data['Temperature'])}")
                    raise TypeError(f"Expected dict for Temperature, got {type(data['Temperature'])}")
                normalized['temperature'] = {
                    'max': round(data.get('Temperature', {}).get('Max', 0), 2),
                    'avg': round(data.get('Temperature', {}).get('Avg', 0), 2),
                    'min': round(data.get('Temperature', {}).get('Min', 0), 2)
                }

            # Handle internal devices
            internal_devices = "InternalDevices" if "InternalDevices" in data else "InternlDevices"
            if internal_devices in data:
                logger.debug(f"Processing internal devices data: {data[internal_devices]}")
                devices_data = data[internal_devices]
                if not isinstance(devices_data, list):
                    logger.error(f"Internal devices data is not a list: {type(devices_data)}")
                    raise TypeError(f"Expected list for InternalDevices, got {type(devices_data)}")
                normalized['internal_devices'] = [
                    {
                        'name': device.get('Name', 'N/A'),
                        'class': device.get('class', 'N/A'),
                        'vendor': device.get('Vendor', 'N/A')
                    }
                    for device in devices_data
                ]

            # Add original data for fields we didn't normalize
            normalized['raw_data'] = data
            normalized['last_updated'] = datetime.now().isoformat()

            return normalized
        except Exception as e:
            logger.error(f"Error normalizing server data: {str(e)}")
            raise

    def set_dcim_client(self, dcim_client):
        """Set or update DCIM client"""
        self.dcim_client = dcim_client
        self.dcim_analyzer = DCIMAnalyzer(self.dcim_client)
        
    def analyze_server_dcim(self, mgmt_ip: str) -> Dict:
        """Analyze a single server against DCIM"""
        if not self.dcim_analyzer:
            return {"status": "error", "error": "DCIM integration not configured"}
            
        server_data = self.servers_data.get(mgmt_ip)
        if not server_data:
            return {"status": "error", "error": f"Server {mgmt_ip} not found"}
            
        return self.dcim_analyzer.analyze_server(server_data)
        
    def analyze_servers_dcim(self, mgmt_ips: Optional[List[str]] = None) -> Dict:
        """Analyze multiple servers against DCIM"""
        if not self.dcim_analyzer:
            return {"status": "error", "error": "DCIM integration not configured"}
            
        results = {}
        servers_to_analyze = (
            mgmt_ips if mgmt_ips 
            else list(self.servers_data.keys())
        )
        
        for ip in servers_to_analyze:
            results[ip] = self.analyze_server_dcim(ip)
            
        return {"status": "success", "results": results}
        
    def update_dcim(self, mgmt_ip: str, fields_to_update: List[str]) -> Dict:
        """Update DCIM with server data"""
        if not self.dcim_analyzer:
            return {"status": "error", "error": "DCIM integration not configured"}
            
        server_data = self.servers_data.get(mgmt_ip)
        if not server_data:
            return {"status": "error", "error": f"Server {mgmt_ip} not found"}
            
        return self.dcim_analyzer.update_dcim(server_data, fields_to_update)
        
    def update_servers_dcim(self, updates: Dict[str, List[str]]) -> Dict:
        """Update multiple servers in DCIM"""
        if not self.dcim_analyzer:
            return {"status": "error", "error": "DCIM integration not configured"}
            
        results = {}
        for ip, fields in updates.items():
            results[ip] = self.update_dcim(ip, fields)
            
        return {"status": "success", "results": results}

    def get_all_assets(self) -> List[Dict[str, Any]]:
        """Get all servers with DCIM analysis if available"""
        try:
            if not self.servers_data:
                self.load_all_data()  # Reload data if empty
                
            servers = list(self.servers_data.values())
            
            # If DCIM analyzer is available, enrich data with DCIM information
            if self.dcim_analyzer:
                for server in servers:
                    try:
                        dcim_info = self.dcim_analyzer.analyze_server(server)
                        server.update(dcim_info)
                    except Exception as e:
                        logger.error(f"Error analyzing DCIM for server {server.get('mgmt_ip')}: {str(e)}")
                        server['dcim_status'] = 'error'
                        server['dcim_error'] = str(e)
            else:
                # If no DCIM analyzer, mark servers as DCIM not available
                for server in servers:
                    server['dcim_status'] = 'not_available'
                    server['dcim_message'] = 'DCIM integration not configured'
            
            return servers
            
        except Exception as e:
            logger.error(f"Error getting all servers: {str(e)}")
            raise

    def get_server(self, mgmt_ip: str) -> Dict:
        """Get data for a specific server"""
        try:
            return self.servers_data.get(mgmt_ip, {})
        except Exception as e:
            logger.error(f"Error getting server {mgmt_ip}: {str(e)}")
            return {}

class ServerDataFileHandler(FileSystemEventHandler):
    def __init__(self, manager: ServerDataManager):
        self.manager = manager

    def on_modified(self, event):
        if event.is_directory:
            return
        if event.src_path.endswith('.json'):
            try:
                self.manager.load_server_data(Path(event.src_path))
            except Exception as e:
                logger.error(f"Error handling file modification {event.src_path}: {str(e)}")

    def on_created(self, event):
        if event.is_directory:
            return
        if event.src_path.endswith('.json'):
            try:
                self.manager.load_server_data(Path(event.src_path))
            except Exception as e:
                logger.error(f"Error handling new file {event.src_path}: {str(e)}") 