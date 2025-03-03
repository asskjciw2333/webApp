import json
import os
import importlib
from typing import Dict, Any, List, Callable, Optional
from flask import current_app
from .logger_manager import LoggerManager
from .conversation_state import ConversationState
import asyncio
import aiohttp

logger = LoggerManager().get_logger()

class ChatManager:
    def __init__(self):
        logger.info("Initializing ChatManager")
        self.intents = self._load_json_config('intents.json')
        self.actions = self._load_json_config('actions.json')
        self.function_registry = self._initialize_function_registry()
        self.conversation_state = ConversationState()
        
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
        
        # Check for pending questions first
        if self.conversation_state.has_pending_questions():
            question = self.conversation_state.get_next_question()
            if (question):
                # Use the answer to update context
                self.conversation_state.update_context(
                    question.get("context_key", "last_answer"), 
                    message
                )
                # Analyze if we can proceed with the next action
                return await self._continue_action_chain()
        
        # First detect the intent
        intent = await self.detect_intent(message, chat_history)
        logger.info(f"Detected intent: {intent}")
        
        # Set the current intent in conversation state
        self.conversation_state.set_current_intent(intent)
        
        # If it's a regular chat, handle as conversation
        if intent["name"] == "chat" or intent["name"] == "unknown":
            logger.info("Handling as regular chat")
            self.conversation_state.clear_state()
            return await self._handle_chat(message, chat_history)
            
        # For process/action intents, let LLM decide how to proceed
        logger.info("Handling as action")
        return await self._handle_action_with_state(intent, message, chat_history)
    
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
            
        # Get available endpoints for this action
        available_endpoints = [action.get("path") for action in matching_action.get("actions", [])]
        
        # For each endpoint, analyze required parameters and try to extract them
        best_match = None
        highest_complete_params = -1
        
        for endpoint in available_endpoints:
            # Analyze function parameters
            param_info = self._analyze_function_parameters(endpoint)
            
            # Try to extract parameters from message
            extracted = self._extract_parameters_from_message(message, param_info)
            
            # Calculate how many required parameters we found
            found_required = len(param_info["required_params"]) - len(extracted["missing_params"])
            
            # Update best match if this endpoint has more complete parameters
            if found_required > highest_complete_params:
                highest_complete_params = found_required
                best_match = {
                    "endpoint": endpoint,
                    "extracted_params": extracted["extracted_params"],
                    "missing_params": extracted["missing_params"],
                    "param_info": param_info
                }
        
        if not best_match:
            return {
                "type": "error",
                "message": "Could not find suitable endpoint for this action"
            }
            
        # If we have missing parameters, ask for them
        if best_match["missing_params"]:
            # Generate questions for missing parameters
            questions = []
            for param in best_match["missing_params"]:
                description = best_match["param_info"]["param_descriptions"].get(param, param)
                questions.append({
                    "param_name": param,
                    "question": f"Please provide {description}"
                })
                
            return {
                "type": "action",
                "action": intent["name"],
                "response": "I need some additional information to proceed",
                "requires_input": True,
                "missing_params": questions,
                "context": {
                    "endpoint": best_match["endpoint"],
                    "current_params": best_match["extracted_params"]
                }
            }
        
        # If we have all parameters, proceed with the action
        try:
            api_result = await self.call_api(best_match["endpoint"], best_match["extracted_params"])
            
            return {
                "type": "action",
                "action": intent["name"],
                "response": "Executing the requested action",
                "result": api_result
            }
            
        except Exception as e:
            logger.error(f"Error executing action: {str(e)}")
            return {
                "type": "error",
                "message": f"Error executing action: {str(e)}"
            }

    async def _handle_action_with_state(self, intent: Dict[str, Any], message: str, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        try:
            # Find action configuration
            matching_action = None
            for action in self.actions.get("api", {}).get("action", []):
                if action.get("name") == intent["name"]:
                    matching_action = action
                    break

            if not matching_action:
                logger.warning(f"No action found for intent {intent['name']}, falling back to chat")
                return await self._handle_chat(message, chat_history)

            # Get current context
            context = self.conversation_state.get_context_for_next_action()

            # Ask LLM to analyze and decide next steps
            prompt = await self._generate_action_prompt(matching_action, message, chat_history, context)

            logger.info("Sending action analysis prompt to LLM")
            response = await current_app.llm_client.generate_response([
                {"role": "system", "content": prompt}
            ])

            result = self._clean_json_response(response)
            if not result:
                logger.error("Failed to parse LLM response for action analysis")
                return {
                    "type": "error",
                    "message": "Could not determine how to proceed"
                }

            # Check if we need more information
            if result.get("requires_more_info", False):
                # Add questions to state
                for question in result.get("missing_params", []):
                    self.conversation_state.add_pending_question({
                        "text": question["question"],
                        "context_key": question["param_name"]
                    })

                return {
                    "type": "action",
                    "action": intent["name"],
                    "response": result.get("response"),
                    "thinking_process": result.get("thinking_process", ""),
                    "requires_input": True,
                    "question": self.conversation_state.get_next_question()
                }

            # Execute the decided action
            if result.get("endpoint"):
                try:
                    api_result = await self.call_api(result["endpoint"], result.get("parameters", {}))

                    # Store the result in conversation state with success status
                    self.conversation_state.add_action_result(
                        result["endpoint"],
                        api_result,
                        status="success" if api_result.get("status") != "error" else "error",
                        description=result.get("thinking_process", "")
                    )

                    # Analyze results to determine next steps
                    next_steps = await self.analyze_results(api_result)

                    return {
                        "type": "action",
                        "action": intent["name"],
                        "response": result.get("response"),
                        "thinking_process": result.get("thinking_process", ""),
                        "action_steps": result.get("action_steps", []),
                        "result": api_result,
                        "next_steps": next_steps
                    }

                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Error executing action: {error_msg}")
                    self.conversation_state.add_action_result(
                        result["endpoint"],
                        {},
                        status="error",
                        description="Error executing action",
                        error=error_msg
                    )
                    return {
                        "type": "error",
                        "message": f"Error executing action: {error_msg}"
                    }

            return {
                "type": "error",
                "message": "No endpoint specified in action result"
            }

        except Exception as e:
            logger.error(f"Error handling action: {str(e)}")
            return {
                "type": "error",
                "message": "אירעה שגיאה בביצוע הפעולה. אנא נסה שוב."
            }

    async def analyze_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze API results and determine next steps"""
        context = self.conversation_state.get_context_for_next_action()
        
        prompt = f"""Based on these API results and current context, determine what should be done next:

Current Context:
{json.dumps(context, indent=2, ensure_ascii=False)}

Latest API Results:
{json.dumps(results, indent=2, ensure_ascii=False)}

Return a JSON object with:
1. next_action: Next action to take (or "complete" if done)
2. explanation: Why this next action is needed
3. parameters: Any parameters needed for the next action
4. user_message: Message to show to the user about what's happening"""

        response = await current_app.llm_client.generate_response([
            {"role": "system", "content": prompt}
        ])
        
        result = self._clean_json_response(response)
        return result if result else {
            "next_action": "complete",
            "explanation": "Could not determine next steps",
            "parameters": {},
            "user_message": "המשימה הושלמה"
        }

    async def _continue_action_chain(self) -> Dict[str, Any]:
        """Continue executing actions after receiving user input"""
        context = self.conversation_state.get_context_for_next_action()
        current_intent = context["current_intent"]
        
        if not current_intent:
            logger.error("No current intent found when continuing action chain")
            return {
                "type": "error",
                "message": "Could not continue the process - missing context"
            }
            
        return await self._handle_action_with_state(
            current_intent,
            "",  # No new message needed as we're continuing existing flow
            []  # Empty chat history as context is in state
        )

    async def _generate_action_prompt(self, action_config: Dict[str, Any], message: str, 
                                    chat_history: List[Dict[str, str]], context: Dict[str, Any]) -> str:
        """Generate a detailed prompt for action analysis"""
        return f"""Based on this action configuration, conversation history, and current context, determine how to proceed:

Previous conversation:
{self._format_chat_history(chat_history)}

Latest message: {message}

Current Context:
{json.dumps(context, indent=2, ensure_ascii=False)}

Action Configuration:
{json.dumps(action_config, indent=2, ensure_ascii=False)}

Available API Endpoints:
{json.dumps([action.get("path") for action in action_config.get("actions", [])], indent=2, ensure_ascii=False)}

Return a JSON object with:
1. endpoint: The API endpoint path to call
2. parameters: Parameters needed for the endpoint based on its required parameters
3. response: Natural language response to show the user explaining what will be done
4. thinking_process: A detailed explanation of your thought process
5. action_steps: Array of steps you'll take to complete this action
6. requires_more_info: true if more information is needed from the user
7. missing_params: array of objects with "param_name" and "question" if requires_more_info is true"""

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

    def _analyze_function_parameters(self, endpoint: str) -> Dict[str, Any]:
        """Analyze function parameters and their requirements"""
        if endpoint not in self.function_registry:
            return {}
            
        func_info = self.function_registry[endpoint]
        return {
            "required_params": func_info.get("parameters", {}).get("required", []),
            "optional_params": [
                param for param in func_info.get("parameters", {}).get("properties", {}).keys()
                if param not in func_info.get("parameters", {}).get("required", [])
            ],
            "param_descriptions": {
                param: details.get("description", "")
                for param, details in func_info.get("parameters", {}).get("properties", {}).items()
            }
        }

    async def _extract_parameters_from_message(self, message: str, param_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract parameters from user message based on parameter requirements
        Returns found parameters and missing required parameters
        """
        extracted_params = {}
        missing_params = []
        
        # Create LLM prompt for parameter extraction
        prompt = f"""Analyze this message and extract parameters based on these requirements:

Message: {message}

Required parameters:
{json.dumps(param_info['required_params'], indent=2, ensure_ascii=False)}

Parameter descriptions:
{json.dumps(param_info['param_descriptions'], indent=2, ensure_ascii=False)}

Look for:
1. Explicitly mentioned parameter values
2. Contextual clues that imply parameter values
3. Technical terms or identifiers that match parameter descriptions

Return a JSON object with:
1. found_params: Dictionary of parameter names and their found values
2. missing_params: List of required parameters that weren't found
3. confidence: Confidence score (0-1) for each found parameter"""

        try:
            # Get LLM response for parameter extraction
            response = await current_app.llm_client.generate_response([
                {"role": "system", "content": prompt}
            ])
            
            result = self._clean_json_response(response)
            
            if result:
                extracted_params = result.get("found_params", {})
                missing_params = result.get("missing_params", [])
                # Store confidence scores for future use
                self.conversation_state.update_context("param_confidence", result.get("confidence", {}))
                
        except Exception as e:
            logger.error(f"Error extracting parameters: {str(e)}")
            missing_params = param_info["required_params"]
            
        return {
            "extracted_params": extracted_params,
            "missing_params": missing_params
        }

