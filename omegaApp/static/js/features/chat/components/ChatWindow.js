import MessageList from './MessageList.js';
import MessageFormatter from '../services/MessageFormatter.js';

class ChatWindow {
    constructor({ onSendMessage, onToggleChat, onSessionSwitch }) {
        this.onSendMessage = onSendMessage;
        this.onToggleChat = onToggleChat;
        this.onSessionSwitch = onSessionSwitch;
        
        this.messageFormatter = new MessageFormatter();
        this.messageList = new MessageList();
        
        this.createChatWindow();
        this.setupEventListeners();
    }

    createChatWindow() {
        this.element = document.createElement('div');
        this.element.className = 'chat-window';
        this.element.innerHTML = `
            <div class="chat-header">
                <span>עוזר צ'אט</span>
                <div class="session-indicator"></div>
                <div class="chat-header-buttons">
                    <button class="history-button" aria-label="היסטוריית שיחות">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </button>
                    <button class="expand-button" aria-label="הגדל/הקטן חלון">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                        </svg>
                    </button>
                    <button class="close-button" aria-label="סגור צ'אט">✕</button>
                </div>
            </div>
            <div class="chat-messages"></div>
            <div class="chat-input-container">
                <input type="text" class="chat-input" placeholder="הקלד הודעה...">
                <button class="send-button" aria-label="שלח הודעה">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(this.element);
        
        // Initialize message list
        this.messageList.initialize(this.element.querySelector('.chat-messages'));
    }

    setupEventListeners() {
        const closeButton = this.element.querySelector('.close-button');
        const expandButton = this.element.querySelector('.expand-button');
        const sendButton = this.element.querySelector('.send-button');
        const input = this.element.querySelector('.chat-input');
        const historyButton = this.element.querySelector('.history-button');

        closeButton.addEventListener('click', () => this.handleToggle());
        expandButton.addEventListener('click', () => this.toggleExpand());
        sendButton.addEventListener('click', () => this.handleSend());
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSend();
            }
        });
        
        historyButton.addEventListener('click', () => this.showHistoryMenu());
    }

    async handleSend() {
        const input = this.element.querySelector('.chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        input.value = '';
        
        // First add the user message
        this.messageList.addMessage(message, 'user');
        
        // Then show typing indicator
        const typingIndicator = this.messageList.addTypingIndicator();
        
        try {
            await this.onSendMessage(message);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }
    }

    handleToggle() {
        const isActive = this.toggleVisibility();
        if (this.onToggleChat) {
            this.onToggleChat(isActive);
        }
    }

    toggleExpand() {
        this.element.classList.toggle('expanded');
    }

    toggleVisibility() {
        this.element.classList.toggle('active');
        return this.element.classList.contains('active');
    }

    updateMessages(messages) {
        this.messageList.clear();
        messages.forEach(msg => {
            this.messageList.addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot');
        });
    }

    showError(message) {
        this.messageList.addMessage(message, 'bot', true);
    }

    addMessage(text, sender, isError = false) {
        return this.messageList.addMessage(text, sender, isError);
    }

    addThinkingProcess() {
        const thinkingElement = document.createElement('div');
        thinkingElement.className = 'thinking-process';
        thinkingElement.innerHTML = `
            <div class="thinking-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
            <div class="thinking-text">חושב...</div>
        `;
        
        this.messagesContainer.appendChild(thinkingElement);
        this.scrollToBottom();
        
        return thinkingElement.id = `thinking-${Date.now()}`;
    }

    removeThinkingProcess(thinkingId) {
        const element = document.getElementById(thinkingId);
        if (element) {
            element.remove();
        }
    }

    addThinkingSteps(thinkingProcess) {
        const stepsElement = document.createElement('div');
        stepsElement.className = 'thinking-steps';
        
        // Create HTML for each thinking step
        const stepsHtml = thinkingProcess.map(step => {
            let content = '';
            
            if (step.action) {
                content = `
                    <div class="thinking-step action">
                        <div class="step-header">
                            <i class="fas fa-cog"></i>
                            <span>פעולה: ${step.action}</span>
                        </div>
                        ${step.action_steps ? `
                            <ul class="action-steps">
                                ${step.action_steps.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                `;
            } else if (step.next_steps) {
                content = `
                    <div class="thinking-step next-steps">
                        <div class="step-header">
                            <i class="fas fa-forward"></i>
                            <span>השלבים הבאים:</span>
                        </div>
                        <ul>
                            ${step.next_steps.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                `;
            } else if (step.state_summary) {
                content = `
                    <div class="thinking-step state">
                        <div class="step-header">
                            <i class="fas fa-info-circle"></i>
                            <span>סיכום מצב:</span>
                        </div>
                        <div class="state-content">
                            ${this.formatStateSummary(step.state_summary)}
                        </div>
                    </div>
                `;
            }
            
            return content;
        }).join('');
        
        stepsElement.innerHTML = stepsHtml;
        this.messagesContainer.appendChild(stepsElement);
        this.scrollToBottom();
    }

    formatStateSummary(summary) {
        return `
            <div class="state-summary">
                <div class="context-keys">
                    מפתחות הקשר: ${summary.context_keys.join(', ') || 'אין'}
                </div>
                <div class="execution-count">
                    מספר פעולות: ${summary.execution_count}
                </div>
                <div class="thinking-process">
                    תהליך חשיבה: ${summary.thinking_process}
                </div>
            </div>
        `;
    }
}

export default ChatWindow; 