from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from .logger_manager import LoggerManager

logger = LoggerManager().get_logger()

@dataclass
class ActionResult:
    """Represents the result of an executed action"""
    action_name: str
    result: Dict[str, Any]
    status: str
    timestamp: datetime = field(default_factory=datetime.now)
    description: str = ""
    error: str = ""

class ConversationState:
    """Manages the state of a conversation including actions and their results"""
    def __init__(self):
        self.current_intent: Optional[Dict[str, Any]] = None
        self.executed_actions: List[str] = []
        self.action_results: Dict[str, ActionResult] = {}
        self.pending_questions: List[Dict[str, Any]] = []
        self.context: Dict[str, Any] = {}
        self.logger = LoggerManager().get_logger()

    def set_current_intent(self, intent: Dict[str, Any]) -> None:
        """Set the current active intent"""
        self.current_intent = intent
        self.logger.debug(f"Set current intent to: {intent}")

    def add_action_result(self, action_name: str, result: Dict[str, Any], status: str, description: str = "", error: str = "") -> None:
        """Add a result for an executed action"""
        self.action_results[action_name] = ActionResult(
            action_name=action_name,
            result=result,
            status=status,
            description=description,
            error=error
        )
        self.executed_actions.append(action_name)
        self.logger.debug(f"Added result for action {action_name}: {result}")

    def get_action_result(self, action_name: str) -> Optional[ActionResult]:
        """Get the result of a specific action"""
        return self.action_results.get(action_name)

    def add_pending_question(self, question: Dict[str, Any]) -> None:
        """Add a question that needs to be answered by the user"""
        self.pending_questions.append(question)
        self.logger.debug(f"Added pending question: {question}")

    def has_pending_questions(self) -> bool:
        """Check if there are any pending questions"""
        return len(self.pending_questions) > 0

    def get_next_question(self) -> Optional[Dict[str, Any]]:
        """Get the next question to ask the user"""
        return self.pending_questions.pop(0) if self.pending_questions else None

    def update_context(self, key: str, value: Any) -> None:
        """Update the conversation context with new information"""
        self.context[key] = value
        self.logger.debug(f"Updated context {key}: {value}")

    def get_context_for_next_action(self) -> Dict[str, Any]:
        """Get context information for the next action"""
        return {
            "current_intent": self.current_intent,
            "executed_actions": self.executed_actions,
            "additional_context": self.context
        }

    def get_state_summary(self) -> Dict[str, Any]:
        """Get a summary of the current state"""
        return {
            "intent": self.current_intent["name"] if self.current_intent else None,
            "executed_actions_count": len(self.executed_actions),
            "pending_questions_count": len(self.pending_questions),
            "context_keys": list(self.context.keys())
        }

    def clear_state(self) -> None:
        """Clear all state information"""
        self.current_intent = None
        self.executed_actions.clear()
        self.action_results.clear()
        self.pending_questions.clear()
        self.context.clear()
        self.logger.debug("Cleared conversation state")