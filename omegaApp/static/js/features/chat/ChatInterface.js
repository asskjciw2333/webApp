import ChatWindow from './components/ChatWindow.js';
import SessionManager from './services/SessionManager.js';
import RobotAnimator from './animation/RobotAnimator.js';

class ChatInterface {
    constructor() {
        this.sessionManager = new SessionManager();
        this.robotAnimator = new RobotAnimator();
        this.robotAnimator.setOnClick(() => this.handleToggleChat());
        this.chatWindow = new ChatWindow({
            onSendMessage: this.handleSendMessage.bind(this),
            onToggleChat: this.handleToggleChat.bind(this),
            onSessionSwitch: this.handleSessionSwitch.bind(this)
        });
        
        this.isProcessing = false;
        
        // Load initial state
        const lastActiveSession = this.sessionManager.getLastActiveSession();
        if (lastActiveSession) {
            this.handleSessionSwitch(lastActiveSession);
        }
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('beforeunload', () => this.sessionManager.saveCurrentState());
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.sessionManager.saveCurrentState();
            }
        });
    }

    async handleSendMessage(message) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.robotAnimator.setActiveState(true);
        
        try {
            // Add user message immediately
            this.chatWindow.addMessage(message, 'user');
            
            // Add thinking indicator
            const thinkingId = this.chatWindow.addThinkingProcess();
            
            // Send message to backend and get response
            const response = await fetch('/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    chat_history: this.sessionManager.getCurrentMessages()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            
            // Remove thinking indicator
            this.chatWindow.removeThinkingProcess(thinkingId);
            
            // Handle thinking process objects if they exist
            if (data.thinking_process) {
                this.chatWindow.addThinkingSteps(data.thinking_process);
            }
            
            // Check if response has the message property
            const botMessage = data.response || data.message;
            if (!botMessage) {
                throw new Error('Invalid response from server');
            }

            // Add bot response to chat
            this.chatWindow.addMessage(botMessage, 'bot');
            
            // Update session with new messages
            this.sessionManager.messageHistory.push(
                { role: 'user', content: message },
                { role: 'bot', content: botMessage }
            );
            this.sessionManager.saveCurrentState();

        } catch (error) {
            console.error('Error sending message:', error);
            this.chatWindow.showError('מצטער, אירעה שגיאה. אנא נסה שוב.');
        } finally {
            this.isProcessing = false;
            this.robotAnimator.setActiveState(false);
        }
    }

    handleToggleChat(isActive) {
        if (isActive === undefined) {
            isActive = this.chatWindow.toggleVisibility();
        }
        
        this.robotAnimator.setActiveState(isActive);
    }

    async handleSessionSwitch(sessionId) {
        await this.sessionManager.switchToSession(sessionId);
        this.chatWindow.updateMessages(this.sessionManager.getCurrentMessages());
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    new ChatInterface();
});