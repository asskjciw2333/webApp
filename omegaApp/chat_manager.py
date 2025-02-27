import json
import os
import importlib
from typing import Dict, Any, List, Callable
from flask import current_app
from .logger_manager import LoggerManager
import asyncio
import aiohttp

logger = LoggerManager().get_logger()

class ChatManager:
    def __init__(self):
        logger.info("Initializing ChatManager")
        self.intents = self._load_json_config('intents.json')
        self.actions = self._load_json_config('actions.json')
        self.function_registry = self._initialize_function_registry()
        
    def _load_json_config(self, filename: str) -> Dict:
        """Load JSON configuration file from config directory"""
        try:
            config_path = os.path.join(os.path.dirname(__file__), 'config', filename)
            logger.info(f"Loading config file: {config_path}")
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                logger.info(f"Successfully loaded {filename}")
                return config
        except Exception as e:
            logger.error(f"Error loading {filename}: {str(e)}")
            return {}

    def _import_function(self, module_name: str, function_name: str) -> Callable:
        """Dynamically import a function from a module"""
        try:
            # Handle both absolute and relative imports
            if module_name.startswith('.'):
                module = importlib.import_module(module_name, package='omegaApp')
            else:
                module = importlib.import_module(f'omegaApp.{module_name}')
            return getattr(module, function_name)
        except Exception as e:
            logger.error(f"Error importing {function_name} from {module_name}: {str(e)}")
            return None

    def _initialize_function_registry(self) -> Dict[str, Callable]:
        """Initialize the function registry by dynamically importing functions from actions.json"""
        registry = {}
        
        # Iterate through all actions and their sub-actions
        for main_action in self.actions.get("api", {}).get("action", []):
            action_name = main_action.get("name")
            for sub_action in main_action.get("actions", []):
                func_name = sub_action.get("name")
                # The path will be used as the key in the registry
                path = sub_action.get("path")
                if path:
                    registry[path] = {
                        "name": func_name,
                        "description": sub_action.get("description", ""),
                        "parameters": sub_action.get("parameters", {})
                    }
                    logger.info(f"Registered API endpoint {path} for action {action_name}/{func_name}")

        return registry

    def _format_chat_history(self, chat_history: List[Dict[str, str]]) -> str:
        """Format chat history for LLM context"""
        return "\n".join([
            f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['content']}"
            for msg in chat_history
        ])

    def _clean_json_response(self, response: str) -> dict:
        """Clean and validate JSON from LLM response"""
        try:
            # Remove markdown if present
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            
            return json.loads(response.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {str(e)}")
            return {}

    async def detect_intent(self, message: str, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Detect the user's intent from their message using the language model"""
        try:
            formatted_history = self._format_chat_history(chat_history)
            prompt = f"""Based on the following conversation and intents, determine the most likely intent for the last user message.

Conversation history:
{formatted_history}

Available intents:
{json.dumps(self.intents, indent=2, ensure_ascii=False)}

Return only a JSON object with:
1. name: The intent name if found or unknown
2. confidence: Confidence score between 0-1
3. extracted_params: Any relevant parameters extracted from the message (e.g. server name/id)"""

            response = await current_app.llm_client.generate_response([
                {"role": "system", "content": prompt}
            ])
            
            result = self._clean_json_response(response)
            return result if result else {
                "name": "chat",
                "confidence": 1.0,
                "extracted_params": {}
            }

        except Exception as e:
            logger.error(f"Error detecting intent: {str(e)}")
            return {"name": "chat", "confidence": 1.0, "extracted_params": {}}

    async def handle_message(self, message: str, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Main entry point for handling user messages"""
        logger.info(f"Handling message: {message}")
        
        # First detect the intent
        intent = await self.detect_intent(message, chat_history)
        logger.info(f"Detected intent: {intent}")
        
        # If it's a regular chat, handle as conversation
        if intent["name"] == "chat" or intent["name"] == "unknown":
            logger.info("Handling as regular chat")
            return await self._handle_chat(message, chat_history)
            
        # For process/action intents, let LLM decide how to proceed
        logger.info("Handling as action")
        return await self._handle_action(intent, message, chat_history)
    
    async def _handle_chat(self, message: str, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Handle regular chat messages"""
        formatted_history = self._format_chat_history(chat_history)
        response = await current_app.llm_client.generate_response([
            {"role": "system", "content": f"""Previous conversation:\n{formatted_history}"""},
            {"role": "user", "content": message}
        ])
        return {
            "type": "chat",
            "response": response
        }
    
    async def _handle_action(self, intent: Dict[str, Any], message: str, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Handle process/action messages with dynamic API mapping"""
        # Find the matching action in the new structure
        matching_action = None
        for action in self.actions.get("api", {}).get("action", []):
            if action.get("name") == intent["name"]:
                matching_action = action
                break

        logger.info(f"Found action config for {intent['name']}: {matching_action is not None}")
        
        if not matching_action:
            logger.warning(f"No action found for intent {intent['name']}, falling back to chat")
            return await self._handle_chat(message, chat_history)
            
        # Ask LLM to decide what to do with this action
        formatted_history = self._format_chat_history(chat_history)
        prompt = f"""Based on this action configuration and conversation history, determine how to proceed:

Previous conversation:
{formatted_history}

Action Configuration:
{json.dumps(matching_action, indent=2, ensure_ascii=False)}

Available API Endpoints:
{json.dumps([action.get("path") for action in matching_action.get("actions", [])], indent=2, ensure_ascii=False)}

Extracted parameters from last message: {json.dumps(intent.get('extracted_params', {}), ensure_ascii=False)}

Return a JSON object with:
1. endpoint: The API endpoint path to call
2. parameters: Parameters needed for the endpoint based on its required parameters
3. response: Natural language response to show the user explaining what will be done
4. thinking_process: A detailed explanation of your thought process (e.g., "I need to search for server X to get its details")
5. action_steps: An array of steps you'll take to complete this action (e.g. ["Searching for server", "Retrieving server details", "Checking server status"])
6. requires_more_info: true if more information is needed from the user
7. missing_params: list of missing parameter names if requires_more_info is true"""

        logger.info("Sending prompt to LLM")
        response = await current_app.llm_client.generate_response([
            {"role": "system", "content": prompt}
        ])
        logger.info(f"LLM response received: {response}")
        
        result = self._clean_json_response(response)
        if not result:
            logger.error("Failed to parse LLM response as JSON")
            return {
                "type": "error",
                "message": "Could not determine how to proceed"
            }

        endpoint = result.get("endpoint")
        parameters = result.get("parameters", {})
        requires_more_info = result.get("requires_more_info", False)
        missing_params = result.get("missing_params", [])
        thinking_process = result.get("thinking_process", "")
        action_steps = result.get("action_steps", [])
        
        # If we need more information from the user
        if requires_more_info:
            return {
                "type": "action",
                "action": intent["name"],
                "response": result.get("response"),
                "thinking_process": thinking_process,
                "action_steps": action_steps,
                "requires_input": True,
                "missing_params": missing_params
            }
        
        # Execute the API call if we have all parameters
        if endpoint in self.function_registry:
            try:
                # Here you would implement the actual API call using the endpoint and parameters
                # This is a placeholder - you'll need to implement the actual API calling logic
                api_result = await self.call_api(endpoint, parameters)
                
                return {
                    "type": "action",
                    "action": intent["name"],
                    "response": result.get("response"),
                    "thinking_process": thinking_process,
                    "action_steps": action_steps,
                    "result": api_result
                }
                
            except Exception as e:
                logger.error(f"Error calling endpoint {endpoint}: {str(e)}")
                return {
                    "type": "error",
                    "message": f"Error executing action: {str(e)}"
                }
        else:
            logger.error(f"Endpoint {endpoint} not found in registry")
            return {
                "type": "error", 
                "message": f"API endpoint {endpoint} not available"
            }

    async def call_api(self, endpoint: str, parameters: dict) -> Any:
        """Call the API endpoint with the given parameters"""
        try:
            if endpoint not in self.function_registry:
                logger.error(f"Endpoint {endpoint} not found in registry")
                raise Exception(f"API endpoint {endpoint} not available")
                
            # Get the function info from registry
            func_info = self.function_registry[endpoint]
            
            # Make an HTTP request to the endpoint
            base_url = current_app.config.get("API_BASE_URL", "http://localhost:5000")
            url = f"{base_url}{endpoint}"
            
            # Check if the endpoint requires parameters
            requires_params = bool(func_info.get("parameters", {}).get("required", []))
            
            logger.info(f"Calling API endpoint: {url}" + (f" with parameters: {parameters}" if requires_params else ""))
            async with aiohttp.ClientSession() as session:
                if requires_params:
                    # Use POST for endpoints that require parameters
                    async with session.post(url, json=parameters) as response:
                        return await self._handle_response(response)
                else:
                    # Use GET for endpoints that don't require parameters
                    async with session.get(url) as response:
                        return await self._handle_response(response)
            
        except Exception as e:
            logger.error(f"Error calling API endpoint {endpoint}: {str(e)}")
            return {
                "status": "error",
                "response": f"שגיאה בקריאה ל-API: {str(e)}"
            }

    async def _handle_response(self, response):
        """Handle API response"""
        if response.status == 404:
            return {
                "status": "not_found",
                "response": "לא נמצאו תוצאות מתאימות"
            }
        elif response.status != 200:
            error_data = await response.text()
            logger.error(f"API error: {response.status} - {error_data}")
            return {
                "status": "error",
                "response": f"שגיאה בקריאה ל-API: {error_data}"
            }
        
        return await response.json()

