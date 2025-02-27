from flask import Blueprint, jsonify, request, current_app
from ..chat_manager import ChatManager
from ..logger_manager import LoggerManager

logger = LoggerManager().get_logger()
bp = Blueprint('chat', __name__, url_prefix='/chat')
chat_manager = ChatManager()

@bp.route('/message', methods=['POST'])
async def handle_message():
    """Handle incoming chat messages"""
    try:
        logger.info("Received chat message request")
        data = request.get_json()
        message = data.get('message')
        chat_history = data.get('chat_history', [])
        
        if not message:
            logger.warning("No message provided in request")
            return jsonify({'error': 'No message provided'}), 400
            
        logger.info(f"Processing message: {message}")
        logger.info(f"Chat history length: {len(chat_history)}")
        
        # Handle message using simplified chat manager
        result = await chat_manager.handle_message(message, chat_history)
        logger.info(f"Chat manager result: {result}")
        
        return jsonify(result)
            
    except Exception as e:
        logger.error(f"Error handling message: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500