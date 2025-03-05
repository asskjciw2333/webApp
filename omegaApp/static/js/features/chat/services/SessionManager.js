class SessionManager {
    constructor() {
        this.currentSessionId = this.getOrCreateSessionId();
        this.messageHistory = [];
    }

    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('chat_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now();
            localStorage.setItem('chat_session_id', sessionId);
        }
        return sessionId;
    }

    getLastActiveSession() {
        return localStorage.getItem('last_active_session');
    }

    getCurrentMessages() {
        return this.messageHistory;
    }

    async switchToSession(sessionId) {
        // Save current session before switching
        this.saveCurrentState();
        
        this.currentSessionId = sessionId;
        localStorage.setItem('last_active_session', sessionId);
        
        // Load new session state
        await this.loadSessionState(sessionId);
    }

    saveCurrentState() {
        const chatState = {
            messageHistory: this.messageHistory,
            lastUpdate: Date.now()
        };
        
        localStorage.setItem(`chat_state_${this.currentSessionId}`, JSON.stringify(chatState));
        this.updateRecentSessions();
    }

    async loadSessionState(sessionId) {
        try {
            const savedState = localStorage.getItem(`chat_state_${sessionId}`);
            if (savedState) {
                const state = JSON.parse(savedState);
                this.messageHistory = state.messageHistory || [];
            } else {
                this.messageHistory = [];
            }
        } catch (error) {
            console.error('Error loading chat state:', error);
            this.messageHistory = [];
        }
    }

    updateRecentSessions() {
        const recentSessions = JSON.parse(localStorage.getItem('recent_chat_sessions') || '[]');
        const sessionInfo = {
            id: this.currentSessionId,
            lastUpdate: Date.now(),
            messageCount: this.messageHistory.length,
            lastMessage: this.messageHistory[this.messageHistory.length - 1]?.content || ''
        };
        
        const existingIndex = recentSessions.findIndex(s => s.id === this.currentSessionId);
        if (existingIndex !== -1) {
            recentSessions[existingIndex] = sessionInfo;
        } else {
            recentSessions.push(sessionInfo);
        }
        
        const sortedSessions = recentSessions
            .sort((a, b) => b.lastUpdate - a.lastUpdate)
            .slice(0, 10);
        
        localStorage.setItem('recent_chat_sessions', JSON.stringify(sortedSessions));
    }
}

export default SessionManager; 