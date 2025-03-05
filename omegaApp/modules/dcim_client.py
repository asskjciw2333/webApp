import requests
from typing import Dict, Optional
from ..logger_manager import LoggerManager

logger = LoggerManager().get_logger()

class DCIMClient:
    def __init__(self, base_url: Optional[str] = None, verify_ssl: bool = True):
        """
        Initialize DCIM client
        :param base_url: Base URL of the DCIM API
        :param verify_ssl: Whether to verify SSL certificates
        """
        if base_url is None:
            logger.warning(f"No DCIM base URL provided")
            raise ValueError(f"No DCIM base URL provided")
                        
        self.base_url = base_url.rstrip('/')
        self.verify_ssl = verify_ssl
        self.session = requests.Session()
        self.session.verify = verify_ssl
        self._auth_headers = None
        
    def set_auth(self, auth_headers: Dict[str, str]):
        """Set authentication headers for DCIM API"""
        self._auth_headers = auth_headers
        self.session.headers.update(auth_headers)
        
    def _ensure_authenticated(self):
        """Ensure we have valid authentication"""
        if not self._auth_headers:
            raise ValueError("No authentication headers set. Call set_auth() first")
            
        try:
            response = self.session.get(f'{self.base_url}/assets/search', params={'returnItemsLimit': 1})
            if response.status_code == 401:  # Unauthorized
                raise ValueError("Invalid or expired authentication")
        except requests.exceptions.RequestException as e:
            raise ValueError(f"DCIM connection error: {str(e)}")

    def search_asset(self, search_params: Dict, include_details: bool = True) -> Optional[Dict]:
        """
        Search for a asset in DCIM using various parameters
        :param search_params: Dictionary of search parameters (e.g., {'serial': '123'})
        :param include_details: Whether to fetch full details for found assets
        :return: Asset data if found, None otherwise
        """
        self._ensure_authenticated()
        try:
            params = {k: v for k, v in search_params.items() if v}
            params['returnItemsLimit'] = params.get('limit', 100)  # Add default limit
            params['include'] = 'custom_properties'  # Always include custom properties
            if 'limit' in params:
                del params['limit']
            
            response = self.session.get(f'{self.base_url}/assets/search', params=params)
            response.raise_for_status()
            
            data = response.json()
            if not data or len(data) == 0:
                return None

            # If a server is found and full details were requested, fetch all information about it
            if include_details and len(data) > 0:
                asset_id = data[0]['id']
                return self.get_asset_details(asset_id)
            
            return data[0]
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching DCIM: {str(e)}")
            return None

    def get_all_assets(self, limit: int = 1000, type: str = None, include_details: bool = False) -> Optional[list]:
        """
        Get all assets from DCIM with their custom properties
        :param limit: Maximum number of assets to return
        :param type: Optional type of assets to filter by (e.g., 'server', 'patch-panel')
        :param include_details: Whether to fetch full details for each asset
        :return: List of asset data if found, None otherwise
        """
        self._ensure_authenticated()
        try:
            params = {
                'returnItemsLimit': limit,
                'include': 'custom_properties'
            }
            
            if type:
                params['type'] = type
                
            response = self.session.get(f'{self.base_url}/assets/search', params=params)
            response.raise_for_status()
            
            data = response.json()
            if not data or len(data) == 0:
                return None

            # If full details were requested, fetch all information about each asset
            if include_details:
                detailed_assets = []
                for asset in data:
                    asset_details = self.get_asset_details(asset['id'])
                    if asset_details:
                        detailed_assets.append(asset_details)
                return detailed_assets
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting all assets from DCIM: {str(e)}")
            return None

    def update_asset(self, asset_id: str, update_data: Dict) -> Dict:
        """
        Update asset data in DCIM
        :param asset_id: ID of the asset in DCIM
        :param update_data: Dictionary of fields to update
        :return: Updated asset data
        """
        self._ensure_authenticated()
        try:
            response = self.session.patch(
                f'{self.base_url}/assets/{asset_id}?include=custom_properties',
                json=update_data
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error updating DCIM asset {asset_id}: {str(e)}")
            raise ValueError(f"Failed to update DCIM: {str(e)}")

    def get_asset_details(self, asset_id: str) -> Optional[Dict]:
        """
        Get detailed asset information from DCIM
        :param asset_id: ID of the asset in DCIM
        :return: Detailed asset data if found, None otherwise
        """
        self._ensure_authenticated()
        try:
            response = self.session.get(f'{self.base_url}/assets/{asset_id}?include=custom_properties')
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting DCIM asset details {asset_id}: {str(e)}")
            return None 