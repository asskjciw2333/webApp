import aiohttp
import json
from typing import List, Dict, Any
from .logger_manager import LoggerManager
from flask import current_app
import requests

logger = LoggerManager().get_logger()

class LLMClient:
    def __init__(self, api_key: str, model_name: str = "llama-3.3-70b-versatile"):
        self.api_key = api_key
        self.model_name = model_name
        self.base_url = "https://api.groq.com/openai/v1"
        
    async def generate_response(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """
        Generate a response from the language model
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            temperature: Controls randomness in the response (0.0 to 1.0)
            
        Returns:
            The generated response text
        """
        if current_app.config.get("TESTING") or current_app.config.get("DEBUG"):
            try:
                url = f"{self.base_url}/chat/completions"
                
                payload = {
                    "model": self.model_name,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 1024,
                    "top_p": 0.95,
                    "stream": False
                }
                
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                logger.debug(f"Sending request to Groq API: {json.dumps(payload, indent=2, ensure_ascii=False)}")
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, json=payload, headers=headers) as response:
                        response_text = await response.text()
                        logger.debug(f"Received response from Groq API: {response_text}")
                        
                        if response.status != 200:
                            logger.error(f"API error: {response.status} - {response_text}")
                            raise Exception(f"API returned status {response.status}")
                        
                        data = json.loads(response_text)
                        if "choices" in data and len(data["choices"]) > 0:
                            if "message" in data["choices"][0]:
                                if "content" in data["choices"][0]["message"]:
                                    return data["choices"][0]["message"]["content"].strip()
                        
                        logger.error(f"Unexpected API response format: {json.dumps(data, indent=2)}")
                        raise Exception("Invalid response format from API")
            except Exception as e:
                logger.error(f"Error generating response: {str(e)}")
                raise Exception(f"Error generating response: {str(e)}")
        else:
            try:
                url = (
                    f"{current_app.config['MODEL_URL']}/v1/chat/completions"
                    if is_completions
                    else f"{current_app.config['MODEL_URL']}/v1/chat"
                )

                data = {
                    "model": current_app.config["MODEL_NAME"],
                    "messages": messages,
                }
                response = requests.post(url, json=data)
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"].strip()
                    
                else:
                    logger.error(f"API error: {response.status_code} - {response.text}")
                    raise Exception("Error in API response")

            except Exception as e:
                logger.error(f"Error in generating result: {str(e)}")
                raise Exception(f"Error in generating result: {str(e)}")