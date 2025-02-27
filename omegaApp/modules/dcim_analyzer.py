from typing import Dict, List, Optional
from enum import Enum
from ..logger_manager import LoggerManager

logger = LoggerManager().get_logger()

class DCIMMatchStatus(Enum):
    NOT_FOUND = "not_found"
    FOUND_WITH_DIFFERENCES = "found_with_differences"
    FOUND_MATCH = "found_match"
    ERROR = "error"

class DCIMAnalyzer:
    def __init__(self, dcim_client):
        self.dcim_client = dcim_client
        
    def analyze_server(self, server_data: Dict) -> Dict:
        """
        Analyze a single server against DCIM data
        Returns analysis results including match status and differences
        """
        try:
            # Search for server in DCIM using various identifiers
            dcim_server = self._find_server_in_dcim(server_data)
            
            if not dcim_server:
                return {
                    "status": DCIMMatchStatus.NOT_FOUND.value,
                    "differences": [],
                    "dcim_data": None
                }
            
            # Compare server data with DCIM data
            differences = self._compare_server_data(server_data, dcim_server)
            
            status = (DCIMMatchStatus.FOUND_MATCH.value 
                     if not differences 
                     else DCIMMatchStatus.FOUND_WITH_DIFFERENCES.value)
            
            return {
                "status": status,
                "differences": differences,
                "dcim_data": dcim_server
            }
            
        except Exception as e:
            logger.error(f"Error analyzing server against DCIM: {str(e)}")
            return {
                "status": DCIMMatchStatus.ERROR.value,
                "differences": [],
                "dcim_data": None,
                "error": str(e)
            }

    def _find_server_in_dcim(self, server_data: Dict) -> Optional[Dict]:
        """
        Try to find server in DCIM using various identifiers
        Returns DCIM server data if found, None otherwise
        """
        search_keys = [
            ("serial", server_data.get("serial")),
            ("name", server_data.get("hostname")),
            ("location", server_data.get("location", {}).get("data_center"))
        ]
        
        for key, value in search_keys:
            if not value:
                continue
                
            try:
                dcim_asset = self.dcim_client.search_asset({key: value})
                if dcim_asset:
                    return dcim_asset
            except Exception as e:
                logger.error(f"Error searching DCIM with {key}={value}: {str(e)}")
                
        return None

    def _compare_server_data(self, server_data: Dict, dcim_data: Dict) -> List[Dict]:
        """
        Compare server data with DCIM data and return list of differences
        """
        differences = []
        
        # Define fields to compare
        fields_to_compare = {
            "hostname": ("name", "שם שרת"),
            "serial": ("serial_number", "מספר סידורי"),
            "location.data_center": ("location", "מיקום"),
            "model": ("model", "דגם"),
            "vendor": ("manufacturer", "יצרן")
        }
        
        for server_field, (dcim_field, field_display) in fields_to_compare.items():
            server_value = self._get_nested_value(server_data, server_field)
            dcim_value = self._get_nested_value(dcim_data, dcim_field)
            
            if server_value and dcim_value and server_value != dcim_value:
                differences.append({
                    "field": field_display,
                    "server_value": server_value,
                    "dcim_value": dcim_value
                })
                
        return differences

    def _get_nested_value(self, data: Dict, field_path: str) -> Optional[str]:
        """
        Get value from nested dictionary using dot notation
        """
        try:
            value = data
            for key in field_path.split('.'):
                value = value.get(key, {})
            return value if value and not isinstance(value, dict) else None
        except Exception:
            return None

    def update_dcim(self, server_data: Dict, fields_to_update: List[str]) -> Dict:
        """
        Update DCIM with server data for specified fields
        Returns update status and any errors
        """
        try:
            # Find server in DCIM first
            dcim_server = self._find_server_in_dcim(server_data)
            if not dcim_server:
                raise ValueError("Server not found in DCIM")

            # Prepare update data
            update_data = {}
            field_mappings = {
                "hostname": "name",
                "serial": "serial_number",
                "location": "location",
                "model": "model",
                "vendor": "manufacturer"
            }

            for field in fields_to_update:
                if field in field_mappings:
                    dcim_field = field_mappings[field]
                    value = server_data.get(field)
                    if value:
                        update_data[dcim_field] = value

            # Perform update
            if update_data:
                self.dcim_client.update_assets(dcim_server["id"], update_data)
                return {"status": "success", "updated_fields": fields_to_update}
            else:
                return {"status": "no_updates", "message": "No valid fields to update"}

        except Exception as e:
            logger.error(f"Error updating DCIM: {str(e)}")
            return {"status": "error", "error": str(e)} 