from typing import Dict, List, Optional
from .dcim_client import DCIMClient
from .dcim_analyzer import DCIMAnalyzer
from ..logger_manager import LoggerManager
from ..auth import authentication_ita
from flask import session

logger = LoggerManager().get_logger()

class DCIMManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DCIMManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
        
    def __init__(self):
        if self._initialized:
            return
            
        self.client = None
        self.analyzer = None
        self._initialized = True
        
    def initialize(self, base_url: str, verify_ssl: bool = False) -> bool:
        """
        Initialize DCIM integration with the given base URL
        Returns True if initialization successful, False otherwise
        """
        try:
            # Try to get authentication
            auth = authentication_ita()
            if not auth or not auth[0]:
                logger.warning("DCIM authentication failed during initialization")
                session['authentication'] = None
                return False
                
            # Create and configure client
            self.client = DCIMClient(base_url=base_url, verify_ssl=verify_ssl)
            self.client.set_auth(auth[1])
            
            # Create analyzer
            self.analyzer = DCIMAnalyzer(self.client)
            
            # Store authentication in session
            session['authentication'] = auth
            
            logger.info("DCIM integration initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize DCIM integration: {str(e)}")
            session['authentication'] = None
            self.client = None
            self.analyzer = None
            return False
            
    def refresh_auth(self) -> bool:
        """
        Refresh DCIM authentication if needed
        Returns True if auth is valid, False otherwise
        """
        try:
            current_auth = session.get('authentication')
            new_auth = authentication_ita()
            
            # If auth status changed
            if (not current_auth and new_auth and new_auth[0]) or \
               (current_auth and new_auth and current_auth[1] != new_auth[1]):
                session['authentication'] = new_auth
                if self.client:
                    self.client.set_auth(new_auth[1])
                    logger.info("DCIM authentication refreshed successfully")
                return True
                
            return bool(current_auth and current_auth[0])
            
        except Exception as e:
            logger.error(f"Error refreshing DCIM authentication: {str(e)}")
            session['authentication'] = None
            return False
            
    def is_available(self) -> bool:
        """Check if DCIM integration is available and authenticated"""
        return bool(self.client and self.analyzer and session.get('authentication'))
            
    def analyze_server(self, server_data: Dict) -> Dict:
        """Analyze a single server against DCIM"""
        if not self.is_available():
            return {"status": "error", "error": "DCIM integration not available"}
            
        try:
            return self.analyzer.analyze_server(server_data)
        except Exception as e:
            logger.error(f"Error analyzing server in DCIM: {str(e)}")
            return {"status": "error", "error": str(e)}
            
    def analyze_servers(self, servers_data: Dict[str, Dict]) -> Dict:
        """Analyze multiple servers against DCIM"""
        if not self.is_available():
            return {"status": "error", "error": "DCIM integration not available"}
            
        results = {}
        for server_id, server_data in servers_data.items():
            results[server_id] = self.analyze_server(server_data)
            
        return {"status": "success", "results": results}
        
    def update_server(self, server_data: Dict, fields_to_update: List[str]) -> Dict:
        """Update server data in DCIM"""
        if not self.is_available():
            return {"status": "error", "error": "DCIM integration not available"}
            
        try:
            return self.analyzer.update_dcim(server_data, fields_to_update)
        except Exception as e:
            logger.error(f"Error updating server in DCIM: {str(e)}")
            return {"status": "error", "error": str(e)}
            
    def update_servers(self, updates: Dict[str, Dict]) -> Dict:
        """Update multiple servers in DCIM"""
        if not self.is_available():
            return {"status": "error", "error": "DCIM integration not available"}
            
        results = {}
        for server_id, update_data in updates.items():
            results[server_id] = self.update_server(
                update_data.get('server_data', {}),
                update_data.get('fields', [])
            )
            
        return {"status": "success", "results": results} 