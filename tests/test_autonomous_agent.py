import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from omegaApp.conversation_state import ConversationState, ActionResult
from omegaApp.chat_manager import ChatManager

@pytest.fixture
def conversation_state():
    return ConversationState()

@pytest.fixture
def chat_manager():
    return ChatManager()

def test_conversation_state_initialization(conversation_state):
    assert conversation_state.current_intent is None
    assert conversation_state.executed_actions == []
    assert conversation_state.action_results == {}
    assert conversation_state.pending_questions == []
    assert conversation_state.context == {}

def test_adding_action_result(conversation_state):
    conversation_state.add_action_result(
        "test_action",
        {"status": "success"},
        "success"
    )
    
    assert "test_action" in conversation_state.action_results
    assert conversation_state.action_results["test_action"].status == "success"
    assert "test_action" in conversation_state.executed_actions

def test_pending_questions(conversation_state):
    question = {
        "text": "What is the server name?",
        "context_key": "server_name"
    }
    conversation_state.add_pending_question(question)
    
    assert len(conversation_state.pending_questions) == 1
    assert conversation_state.has_pending_questions()
    
    next_question = conversation_state.get_next_question()
    assert next_question == question
    assert len(conversation_state.pending_questions) == 0

def test_context_management(conversation_state):
    conversation_state.update_context("server_name", "test-server")
    assert conversation_state.context["server_name"] == "test-server"
    
    context = conversation_state.get_context_for_next_action()
    assert context["additional_context"]["server_name"] == "test-server"

@pytest.mark.asyncio
async def test_chat_manager_intent_detection():
    chat_manager = ChatManager()
    
    with patch('omegaApp.chat_manager.current_app') as mock_app:
        mock_app.llm_client.generate_response = AsyncMock(
            return_value='{"name": "find_server", "confidence": 0.9, "extracted_params": {"server_name": "test-server"}}'
        )
        
        intent = await chat_manager.detect_intent(
            "Find server test-server",
            []
        )
        
        assert intent["name"] == "find_server"
        assert intent["confidence"] == 0.9
        assert intent["extracted_params"]["server_name"] == "test-server"

@pytest.mark.asyncio
async def test_chat_manager_action_handling():
    chat_manager = ChatManager()
    
    with patch('omegaApp.chat_manager.current_app') as mock_app:
        # Mock LLM response for action analysis
        mock_app.llm_client.generate_response = AsyncMock(
            return_value='''
            {
                "endpoint": "/api/dcim/search_assets",
                "parameters": {"query": "test-server"},
                "response": "I'll search for the server",
                "thinking_process": "Need to search DCIM system",
                "action_steps": ["Searching DCIM"],
                "requires_more_info": false
            }
            '''
        )
        
        # Mock API call
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_post.return_value.__aenter__.return_value.status = 200
            mock_post.return_value.__aenter__.return_value.json = AsyncMock(
                return_value={"data": {"name": "test-server"}}
            )
            
            result = await chat_manager._handle_action_with_state(
                {
                    "name": "find_server",
                    "confidence": 0.9,
                    "extracted_params": {"server_name": "test-server"}
                },
                "Find server test-server",
                []
            )
            
            assert result["type"] == "action"
            assert result["action"] == "find_server"
            assert "response" in result
            assert "thinking_process" in result
            assert "action_steps" in result
            assert "result" in result

@pytest.mark.asyncio
async def test_autonomous_conversation_flow():
    chat_manager = ChatManager()
    
    with patch('omegaApp.chat_manager.current_app') as mock_app:
        # Mock intents detection
        mock_app.llm_client.generate_response.side_effect = [
            # First detect intent
            '{"name": "upgrade_server", "confidence": 0.9, "extracted_params": {}}',
            # Then analyze action needs
            '''{
                "endpoint": "/api/dcim/search_server",
                "requires_more_info": true,
                "missing_params": [
                    {"param_name": "server_name", "question": "What is the name of the server to upgrade?"}
                ],
                "response": "I need more information",
                "thinking_process": "Need server name",
                "action_steps": ["Collecting information"]
            }''',
            # After getting server name
            '''{
                "endpoint": "/api/dcim/search_server",
                "parameters": {"query": "test-server"},
                "requires_more_info": false,
                "response": "Searching for server",
                "thinking_process": "Have server name, searching",
                "action_steps": ["Searching for server"]
            }'''
        ]
        
        # Initial message
        result = await chat_manager.handle_message(
            "I want to upgrade a server",
            []
        )
        
        assert result["type"] == "action"
        assert result["requires_input"]
        assert "question" in result
        
        # Provide server name
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_post.return_value.__aenter__.return_value.status = 200
            mock_post.return_value.__aenter__.return_value.json = AsyncMock(
                return_value={"data": {"name": "test-server"}}
            )
            
            result = await chat_manager.handle_message(
                "test-server",
                []
            )
            
            assert result["type"] == "action"
            assert "result" in result
            assert not result.get("requires_input", False)

def test_conversation_state_clear():
    state = ConversationState()
    
    # Add some data
    state.set_current_intent({"name": "test", "confidence": 1.0})
    state.add_action_result("test", {"status": "success"})
    state.add_pending_question({"text": "test?"})
    state.update_context("test", "value")
    
    # Clear state
    state.clear_state()
    
    # Verify everything is cleared
    assert state.current_intent is None
    assert len(state.executed_actions) == 0
    assert len(state.action_results) == 0
    assert len(state.pending_questions) == 0
    assert len(state.context) == 0

@pytest.mark.asyncio
async def test_error_handling():
    chat_manager = ChatManager()
    
    with patch('omegaApp.chat_manager.current_app') as mock_app:
        mock_app.llm_client.generate_response = AsyncMock(
            side_effect=Exception("LLM Error")
        )
        
        # Should fallback to chat mode on error
        result = await chat_manager.handle_message(
            "test message",
            []
        )
        
        assert result["type"] == "error"
        assert "message" in result