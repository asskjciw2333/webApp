class MessageList {
    constructor() {
        this.container = null;
    }

    initialize(container) {
        this.container = container;
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    addMessage(text, sender, isError = false) {
        if (!this.container) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message${isError ? ' error' : ''}`;
        
        if (sender === 'bot' && text && text.includes('thinking-container')) {
            this.addThinkingMessage(messageDiv, text);
        } else {
            messageDiv.innerHTML = `<div class="message-text">${this.formatMessage(text || '')}</div>`;
        }
        
        this.container.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }

    addThinkingMessage(messageDiv, content) {
        messageDiv.innerHTML = content;
        
        const thinkingContent = messageDiv.querySelector('.thinking-content');
        if (thinkingContent) {
            thinkingContent.classList.add('collapsed');
        }
        
        const thinkingHeader = messageDiv.querySelector('.thinking-header');
        if (thinkingHeader && thinkingContent) {
            thinkingHeader.addEventListener('click', () => {
                thinkingContent.classList.toggle('collapsed');
                const toggle = thinkingHeader.querySelector('.thinking-toggle');
                if (toggle) toggle.classList.toggle('expanded');
            });
        }
    }

    addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot-message typing show';
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="typing-text">חושב...</div>
        `;
        
        this.container.appendChild(typingDiv);
        this.scrollToBottom();
        
        return typingDiv;
    }

    scrollToBottom() {
        if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }

    formatMessage(text) {
        // Basic formatting for now - will be moved to MessageFormatter service
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }
}

export default MessageList; 