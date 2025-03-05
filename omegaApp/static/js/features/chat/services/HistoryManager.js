class HistoryManager {
    constructor() {
        this.maxRecentSessions = 10;
    }

    getRecentSessions() {
        try {
            return JSON.parse(localStorage.getItem('recent_chat_sessions') || '[]');
        } catch {
            return [];
        }
    }

    updateRecentSessions(sessionInfo) {
        const recentSessions = this.getRecentSessions();
        
        const existingIndex = recentSessions.findIndex(s => s.id === sessionInfo.id);
        if (existingIndex !== -1) {
            recentSessions[existingIndex] = sessionInfo;
        } else {
            recentSessions.push(sessionInfo);
        }
        
        const sortedSessions = recentSessions
            .sort((a, b) => b.lastUpdate - a.lastUpdate)
            .slice(0, this.maxRecentSessions);
        
        localStorage.setItem('recent_chat_sessions', JSON.stringify(sortedSessions));
    }

    clearHistory() {
        localStorage.removeItem('recent_chat_sessions');
        Object.keys(localStorage)
            .filter(key => key.startsWith('chat_state_'))
            .forEach(key => localStorage.removeItem(key));
    }

    saveSessionState(sessionId, state) {
        localStorage.setItem(`chat_state_${sessionId}`, JSON.stringify(state));
        localStorage.setItem('last_active_session', sessionId);
    }

    loadSessionState(sessionId) {
        try {
            const savedState = localStorage.getItem(`chat_state_${sessionId}`);
            return savedState ? JSON.parse(savedState) : null;
        } catch (error) {
            console.error('Error loading chat state:', error);
            return null;
        }
    }

    createHistoryMenu(onSessionSelect, onNewChat, onClearHistory) {
        const recentSessions = this.getRecentSessions();
        
        const menu = document.createElement('div');
        menu.className = 'history-menu';
        menu.innerHTML = `
            <div class="history-header">שיחות אחרונות</div>
            <button class="new-chat-button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
                התחל שיחה חדשה
            </button>
            ${recentSessions.map(session => `
                <div class="history-item" data-session-id="${session.id}">
                    <div class="history-item-info">
                        <div class="history-item-time">${new Date(session.lastUpdate).toLocaleString()}</div>
                        <div class="history-item-count">${session.messageCount} הודעות</div>
                    </div>
                    <div class="history-item-preview">${session.lastMessage.substring(0, 50)}${session.lastMessage.length > 50 ? '...' : ''}</div>
                </div>
            `).join('')}
            ${recentSessions.length > 0 ? '<button class="clear-history-button">נקה היסטוריה</button>' : ''}
        `;

        this.setupHistoryMenuListeners(menu, onSessionSelect, onNewChat, onClearHistory);
        return menu;
    }

    setupHistoryMenuListeners(menu, onSessionSelect, onNewChat, onClearHistory) {
        menu.addEventListener('click', (e) => {
            const sessionItem = e.target.closest('.history-item');
            if (sessionItem) {
                const sessionId = sessionItem.dataset.sessionId;
                onSessionSelect(sessionId);
            }
            
            if (e.target.closest('.new-chat-button')) {
                onNewChat();
            }
            
            if (e.target.classList.contains('clear-history-button')) {
                if (confirm('האם אתה בטוח שברצונך למחוק את כל היסטוריית השיחות?')) {
                    this.clearHistory();
                    onClearHistory();
                }
            }
        });
    }
}

export default HistoryManager; 