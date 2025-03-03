from flask import Blueprint, jsonify, request, current_app
from ..chat_manager import ChatManager
from ..logger_manager import LoggerManager
import json

logger = LoggerManager().get_logger()
bp = Blueprint('chat', __name__, url_prefix='/chat')
chat_manager = ChatManager()

@bp.route('/message', methods=['POST'])
async def handle_message():
    """Handle incoming chat messages with enhanced autonomous capabilities"""
    try:
        logger.info("Received chat message request")
        data = request.get_json()
        message = data.get('message')
        chat_history = data.get('chat_history', [])
        
        if not message:
            logger.warning("No message provided in request")
            return jsonify({'error': 'No message provided'}), 400
            
        logger.info(f"Processing message: {message}")
        logger.debug(f"Chat history length: {len(chat_history)}")
        
        # Handle message using enhanced chat manager
        result = await chat_manager.handle_message(message, chat_history)
        logger.info("Chat manager processing complete")
        logger.debug(f"Result type: {result.get('type')}")
        
        response = {
            **result,
            'state_summary': chat_manager.conversation_state.get_state_summary()
        }
        
        return jsonify(response)
            
    except Exception as e:
        logger.error(f"Error handling message: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@bp.route('/state', methods=['GET'])
async def get_conversation_state():
    """Get the current conversation state"""
    try:
        state_summary = chat_manager.conversation_state.get_state_summary()
        return jsonify(state_summary)
    except Exception as e:
        logger.error(f"Error getting conversation state: {str(e)}")
        return jsonify({'error': 'Error retrieving state'}), 500

@bp.route('/state/clear', methods=['POST'])
async def clear_conversation_state():
    """Clear the current conversation state"""
    try:
        chat_manager.conversation_state.clear_state()
        return jsonify({'status': 'success', 'message': 'State cleared'})
    except Exception as e:
        logger.error(f"Error clearing conversation state: {str(e)}")
        return jsonify({'error': 'Error clearing state'}), 500