import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


class ChatInterface {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.robot = null;
        this.mixer = null;
        this.messageHistory = [];
        this.isProcessing = false;
        
        // Separate models for idle and active states
        this.idleModels = [
            '/static/models/walk in circle.glb',
            '/static/models/samba dancing.glb',
            '/static/models/northern soul spin combo.glb',
        ];
        
        this.activeModels = [
            '/static/models/talking.glb',
            '/static/models/talking (1).glb',
            '/static/models/yelling.glb',
            '/static/models/standing arguing.glb',
        ];
        
        this.currentModelIndex = 0;
        this.currentAnimationDuration = 0;
        this.isActive = false;
        this.isTransitioning = false;
        this.nextModelTimer = null;
        this.toggleDebounceTimer = null;
        this.cleanupPromise = null;
        
        this.sessionId = this.getOrCreateSessionId();
        this.lastActiveSession = localStorage.getItem('last_active_session');
        
        this.currentProcess = null;
        
        this.initialize();
        
        // If there's a last active session and it's different from current, switch to it
        if (this.lastActiveSession && this.lastActiveSession !== this.sessionId) {
            this.switchSession(this.lastActiveSession);
        } else {
            this.loadChatState();
        }
        
        window.addEventListener('beforeunload', () => this.saveChatState());
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveChatState();
            }
        });
    }

    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('chat_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now();
            localStorage.setItem('chat_session_id', sessionId);
        }
        return sessionId;
    }

    saveChatState() {
        const chatState = {
            messageHistory: this.messageHistory,
            isExpanded: this.chatWindow.classList.contains('expanded'),
            isActive: this.chatWindow.classList.contains('active'),
            lastUpdate: Date.now(),
            scrollPosition: this.chatWindow.querySelector('.chat-messages').scrollTop
        };
        
        localStorage.setItem(`chat_state_${this.sessionId}`, JSON.stringify(chatState));
        localStorage.setItem('last_active_session', this.sessionId);
        
        const recentSessions = JSON.parse(localStorage.getItem('recent_chat_sessions') || '[]');
        const sessionInfo = {
            id: this.sessionId,
            lastUpdate: Date.now(),
            messageCount: this.messageHistory.length,
            lastMessage: this.messageHistory[this.messageHistory.length - 1]?.content || ''
        };
        
        const existingIndex = recentSessions.findIndex(s => s.id === this.sessionId);
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

    loadChatState() {
        try {
            const savedState = localStorage.getItem(`chat_state_${this.sessionId}`);
            if (savedState) {
                const state = JSON.parse(savedState);
                
                if (state.messageHistory && Array.isArray(state.messageHistory)) {
                    this.messageHistory = state.messageHistory;
                    const messagesContainer = this.chatWindow.querySelector('.chat-messages');
                    messagesContainer.innerHTML = ''; // Clear existing messages
                    
                    // Remove any existing typing indicators first
                    const typingIndicators = document.querySelectorAll('.chat-message.typing');
                    typingIndicators.forEach(indicator => indicator.remove());
                    
                    // Process each message in the history
                    this.messageHistory.forEach(msg => {
                        // Check if the message contains a thinking container
                        if (msg.role === 'assistant' && msg.content.includes('thinking-container')) {
                            // For messages with thinking containers, we need special handling
                            // Create a proper message div
                            const messageDiv = document.createElement('div');
                            messageDiv.className = 'chat-message bot-message thinking-container-wrapper';
                            messageDiv.innerHTML = msg.content;
                            
                            // Make sure the thinking content is collapsed by default
                            const thinkingContent = messageDiv.querySelector('.thinking-content');
                            if (thinkingContent) {
                                thinkingContent.classList.add('collapsed');
                            }
                            
                            // Add event listener to toggle the thinking content
                            const thinkingHeader = messageDiv.querySelector('.thinking-header');
                            if (thinkingHeader && thinkingContent) {
                                thinkingHeader.addEventListener('click', () => {
                                    thinkingContent.classList.toggle('collapsed');
                                    const toggle = thinkingHeader.querySelector('.thinking-toggle');
                                    if (toggle) toggle.classList.toggle('expanded');
                                });
                            }
                            
                            messagesContainer.appendChild(messageDiv);
                        } else {
                            // Regular message
                            this.addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot', false, false);
                        }
                    });
                    
                    // Restore scroll position after messages are added
                    if (state.scrollPosition) {
                        setTimeout(() => {
                            messagesContainer.scrollTop = state.scrollPosition;
                        }, 100);
                    } else {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
                
                if (state.isExpanded) {
                    this.chatWindow.classList.add('expanded');
                }
                if (state.isActive) {
                    this.chatWindow.classList.add('active');
                }
            }
        } catch (error) {
            console.error('Error loading chat state:', error);
        }
    }

    initialize() {
        const container = document.createElement('div');
        container.className = 'chat-button';
        document.body.appendChild(container);

        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
        this.camera.position.set(0, 0.2, 3.5); 
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(150, 150); 
        this.renderer.setPixelRatio(window.devicePixelRatio * 2); 
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(this.renderer.domElement);

        const mainLight = new THREE.DirectionalLight(0xffffff, 2);
        mainLight.position.set(0, 2, 2);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 10;
        this.scene.add(mainLight);
        
        const fillLight = new THREE.DirectionalLight(0xffffff, 1);
        fillLight.position.set(2, 0, 1);
        this.scene.add(fillLight);
        
        const fillLight2 = new THREE.DirectionalLight(0xffffff, 1);
        fillLight2.position.set(-2, 0, 1);
        this.scene.add(fillLight2);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        this.loadNextModel();

        const clock = new THREE.Clock();
        const animate = () => {
            requestAnimationFrame(animate);
            
            if (this.mixer) {
                this.mixer.update(clock.getDelta());
            }

            
            this.renderer.render(this.scene, this.camera);
        };
        animate();

        container.addEventListener('click', () => this.toggleChat());

        const chatWindow = document.createElement('div');
        chatWindow.className = 'chat-window';
        chatWindow.innerHTML = `
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
        document.body.appendChild(chatWindow);

        const imagePreview = document.createElement('div');
        imagePreview.className = 'image-preview';
        document.body.appendChild(imagePreview);

        const closeButton = chatWindow.querySelector('.close-button');
        const expandButton = chatWindow.querySelector('.expand-button');
        const sendButton = chatWindow.querySelector('.send-button');
        const chatInput = chatWindow.querySelector('.chat-input');

        closeButton.addEventListener('click', () => this.toggleChat());
        expandButton.addEventListener('click', () => this.toggleExpand());
        sendButton.addEventListener('click', () => {
            sendButton.classList.add('clicked');
            setTimeout(() => sendButton.classList.remove('clicked'), 600);
            this.sendMessage();
        });
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendButton.classList.add('clicked');
                setTimeout(() => sendButton.classList.remove('clicked'), 600);
                this.sendMessage();
            }
        });

        this.chatWindow = chatWindow;
        this.imagePreview = imagePreview;
        this.messagesContainer = chatWindow.querySelector('.chat-messages');
        this.inputField = chatWindow.querySelector('.chat-input');

        this.imagePreview.addEventListener('click', () => {
            this.imagePreview.classList.remove('active');
        });

        // Add history button click event listener
        const historyButton = chatWindow.querySelector('.history-button');
        historyButton.addEventListener('click', () => this.showHistoryMenu());
    }

    async toggleChat() {
        if (this.toggleDebounceTimer) {
            clearTimeout(this.toggleDebounceTimer);
        }

        if (this.cleanupPromise) {
            await this.cleanupPromise;
        }

        this.chatWindow.classList.toggle('active');
        const wasActive = this.isActive;
        this.isActive = this.chatWindow.classList.contains('active');
        
        this.toggleDebounceTimer = setTimeout(async () => {
            if (wasActive !== this.isActive) {
                this.currentModelIndex = 0;
                await this.cleanupCurrentModel();
                if (this.isActive === this.chatWindow.classList.contains('active')) {
                    this.loadNextModel();
                }
            }
        }, 100);
        
        if (this.isActive) {
            this.inputField.focus();
        }
    }

    toggleExpand() {
        this.chatWindow.classList.toggle('expanded');
    }

    async sendMessage() {
        if (this.isProcessing) return;
        
        const input = this.chatWindow.querySelector('.chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.isProcessing = true;
        input.value = '';
        
        // Add user message to history and display
        this.addMessage(message, 'user');
        
        try {
            // Add thinking indicator
            const typingIndicator = this.addTypingIndicator();
            
            // Send to server with chat history
            const response = await fetch('/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message,
                    chat_history: this.messageHistory
                })
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const result = await response.json();
            
            // Remove typing indicator
            if (typingIndicator) {
                typingIndicator.remove();
            }

            // Handle state summary if available
            if (result.state_summary) {
                this.updateStateDisplay(result.state_summary);
            }
            
            // Handle different response types with enhanced agent capabilities
            if (result.type === 'chat') {
                // Regular chat response
                this.addMessage(result.response, 'bot');
            } else if (result.type === 'action') {
                // Action response with thinking process display
                const actionContent = this.createActionResponse(result);
                this.addMessage(actionContent, 'bot', true, false);
                
                // If we need more input from the user
                if (result.requires_input && result.question) {
                    this.addQuestion(result.question);
                }
                
                // If there are next steps, display them
                if (result.next_steps) {
                    this.displayNextSteps(result.next_steps);
                }
            } else if (result.type === 'error') {
                this.addMessage(`שגיאה: ${result.message}`, 'bot', true, false);
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('מצטער, אירעה שגיאה. אנא נסה שוב.', 'bot');
            
            // Remove all typing indicators
            const allTypingIndicators = this.messagesContainer.querySelectorAll('.chat-message.typing');
            allTypingIndicators.forEach(indicator => indicator.remove());
        }
        
        this.isProcessing = false;
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    createActionResponse(result) {
        const steps = result.action_steps || [];
        const thinkingProcess = result.thinking_process || '';
        
        let content = `<div class="action-response">
            <div class="response-text">${result.response}</div>`;
            
        if (thinkingProcess) {
            content += `
            <div class="thinking-process">
                <div class="thinking-header">תהליך החשיבה שלי:</div>
                <div class="thinking-content">${thinkingProcess}</div>
            </div>`;
        }
        
        if (steps.length > 0) {
            content += `
            <div class="action-steps">
                <div class="steps-header">שלבי הפעולה:</div>
                <ul class="steps-list">
                    ${steps.map(step => `<li class="step">${step}</li>`).join('')}
                </ul>
            </div>`;
        }
        
        if (result.result) {
            content += `
            <div class="action-result">
                <div class="result-header">תוצאות:</div>
                <div class="result-content">${this.formatActionResult(result.result)}</div>
            </div>`;
        }
        
        content += '</div>';
        return content;
    }

    addQuestion(question) {
        const content = `
        <div class="chat-question">
            <div class="question-text">${question.text}</div>
            <div class="question-hint">אנא ענה לשאלה זו כדי שאוכל להמשיך</div>
        </div>`;
        this.addMessage(content, 'bot', true, false);
    }

    displayNextSteps(nextSteps) {
        if (nextSteps.next_action === 'complete') {
            this.addMessage(nextSteps.user_message, 'bot');
            return;
        }
        
        const content = `
        <div class="next-steps">
            <div class="next-step-header">הצעד הבא:</div>
            <div class="next-step-explanation">${nextSteps.explanation}</div>
            <div class="next-step-message">${nextSteps.user_message}</div>
        </div>`;
        this.addMessage(content, 'bot', true, false);
    }

    updateStateDisplay(stateSummary) {
        const stateIndicator = this.chatWindow.querySelector('.state-indicator') || 
                             this.createStateIndicator();
        
        const activeIntent = stateSummary.intent || 'שיחה';
        const actionsCount = stateSummary.executed_actions_count || 0;
        const pendingQuestions = stateSummary.pending_questions_count || 0;
        
        stateIndicator.innerHTML = `
        <div class="state-content">
            <div class="current-intent">כוונה נוכחית: ${activeIntent}</div>
            <div class="actions-count">פעולות שבוצעו: ${actionsCount}</div>
            ${pendingQuestions > 0 ? `<div class="pending-questions">שאלות ממתינות: ${pendingQuestions}</div>` : ''}
        </div>`;
    }

    createStateIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'state-indicator';
        this.chatWindow.querySelector('.chat-header').appendChild(indicator);
        return indicator;
    }

    formatActionResult(result) {
        if (typeof result === 'string') {
            return result;
        }
        
        if (Array.isArray(result)) {
            // Format array as a list if it's not too complex
            if (result.length > 0 && typeof result[0] !== 'object') {
                return `<ul>${result.map(item => `<li>${item}</li>`).join('')}</ul>`;
            }
            // Otherwise format as JSON
            return JSON.stringify(result, null, 2);
        }
        
        if (typeof result === 'object') {
            try {
                // Check if this is a server result with specific fields
                if (result.data && (result.data.name || result.data.dn)) {
                    // This appears to be a server result, format it nicely
                    // Return a placeholder that will be replaced after newline processing
                    return `__SERVER_RESULT_PLACEHOLDER__${this.formatServerResult(result)}__END_SERVER_RESULT__`;
                }
                
                // Format object with proper indentation and line breaks
                return JSON.stringify(result, null, 2);
            } catch (error) {
                // Fallback to simple key-value display if JSON.stringify fails
                return Object.entries(result)
                    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                    .join('\n');
            }
        }
        
        return String(result);
    }
    
    formatServerResult(result) {
        if (!result.data) return JSON.stringify(result, null, 2);
        
        const data = result.data;
        
        // Create a clean HTML string without unnecessary whitespace and newlines
        return `<div class="server-result"><div class="server-result-header"><h3>${data.usr_lbl || data.name || 'Server Information'}</h3><span class="server-status ${result.status}">${result.status || 'unknown'}</span></div><table class="server-details"><tbody>${data.name ? `<tr><td>Name</td><td>${data.name}</td></tr>` : ''}${data.dn ? `<tr><td>DN</td><td>${data.dn}</td></tr>` : ''}${data.domain ? `<tr><td>Domain</td><td>${data.domain}</td></tr>` : ''}${data.serial ? `<tr><td>Serial</td><td>${data.serial}</td></tr>` : ''}${data.version ? `<tr><td>Version</td><td>${data.version}</td></tr>` : ''}</tbody></table></div>`;
    }

    // Helper method to format JSON with syntax highlighting
    formatJsonWithSyntax(jsonString) {
        // This is a simple syntax highlighter for JSON
        return jsonString.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
            (match) => {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return `<span class="${cls}">${match}</span>`;
            }
        );
    }

    addMessage(text, sender, shouldSave = true, isThinking = false) {
        // Remove any existing typing indicators first
        const typingIndicators = document.querySelectorAll('.chat-message.typing');
        typingIndicators.forEach(indicator => indicator.remove());
        
        const messagesDiv = document.querySelector('.chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        
        // Check if the message contains options
        if (sender === 'bot' && text.includes('בחר אחת מהאפשרויות')) {
            const [prompt, ...options] = text.split('\n\n');
            
            messageDiv.innerHTML = `
                <div class="message-text">${this.formatMessage(prompt)}</div>
                <div class="message-options">
                    ${options.map(opt => `<button class="option-button">${opt}</button>`).join('')}
                </div>
            `;
            
            // Add click handlers for option buttons
            messageDiv.querySelectorAll('.option-button').forEach(button => {
                button.addEventListener('click', () => {
                    const input = document.querySelector('.chat-input');
                    input.value = button.textContent.trim();
                    this.sendMessage();
                });
            });
        } else if (sender === 'bot' && text.includes('<div class="server-result">')) {
            // Direct server result HTML - don't process with formatMessage
            messageDiv.innerHTML = text;
        } else {
            // Check if the message contains JSON data
            if (sender === 'bot' && (text.includes('{\n') || text.includes('[\n'))) {
                // Split the text into regular text and JSON parts
                const parts = text.split(/(\{\n[\s\S]*\}|\[\n[\s\S]*\])/g);
                
                let formattedContent = '';
                
                for (const part of parts) {
                    if (part.trim().startsWith('{') || part.trim().startsWith('[')) {
                        // This is a JSON part, format it as a code block with syntax highlighting
                        formattedContent += `<pre><code>${this.formatJsonWithSyntax(this.escapeHtml(part))}</code></pre>`;
                    } else if (part.trim()) {
                        // This is regular text
                        formattedContent += `<div class="message-text">${this.formatMessage(part)}</div>`;
                    }
                }
                
                messageDiv.innerHTML = formattedContent;
            } else {
                messageDiv.innerHTML = `<div class="message-text">${this.formatMessage(text)}</div>`;
            }
        }
        
        // Add a subtle animation for bot messages to simulate typing, but only if isThinking is true
        if (sender === 'bot' && isThinking) {
            messageDiv.classList.add('agent-thinking');
            
            // Add a subtle animation to show the agent is "thinking"
            const thinkingIndicator = document.createElement('div');
            thinkingIndicator.className = 'typing-indicator';
            thinkingIndicator.innerHTML = '<span></span><span></span><span></span>';
            messageDiv.appendChild(thinkingIndicator);
        }
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Save message to history if needed
        if (shouldSave) {
            this.messageHistory.push({
                role: sender === 'user' ? 'user' : 'assistant',
                content: text
            });
            
            // Save chat state
            this.saveChatState();
        }
        
        return messageDiv;
    }

    isTaskResponse(response) {
        try {
            const parsed = JSON.parse(response);
            return parsed.type === 'task';
        } catch {
            return false;
        }
    }

    addTaskMessage(messageDiv, taskResponse) {
        const task = JSON.parse(taskResponse);
        messageDiv.classList.add('task-message');

        const taskContent = `
            <div class="task-header">
                <div class="task-status ${task.status}">${this.getTaskStatusText(task.status)}</div>
                ${task.estimatedTime ? `<span class="task-time">זמן משוער: ${task.estimatedTime}</span>` : ''}
            </div>
            ${task.progress !== undefined ? `
                <div class="task-progress">
                    <div class="task-progress-bar" style="width: ${task.progress}%"></div>
                </div>
            ` : ''}
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            ${task.log ? `
                <div class="task-log">
                    ${this.formatTaskLog(task.log)}
                </div>
            ` : ''}
            ${task.result ? `
                <div class="task-result">
                    ${this.formatTaskResult(task.result)}
                </div>
            ` : ''}
            ${task.actions ? `
                <div class="task-actions">
                    ${task.actions.map(action => `
                        <button class="task-action-button ${action.type || ''}" 
                                onclick="window.chatInterface.handleTaskAction('${action.id}', ${JSON.stringify(task)})"
                                ${action.disabled ? 'disabled' : ''}>
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        `;

        messageDiv.innerHTML = taskContent;
        this.updateTaskProgress(messageDiv, task);
    }

    getTaskStatusText(status) {
        const statusMap = {
            'running': 'בביצוע...',
            'success': 'הושלם בהצלחה',
            'error': 'שגיאה',
            'waiting': 'ממתין',
            'cancelled': 'בוטל'
        };
        return statusMap[status] || status;
    }

    formatTaskLog(log) {
        if (Array.isArray(log)) {
            return log.map(entry => `
                <div class="${entry.level || 'info'}">
                    <span class="timestamp">${entry.timestamp || new Date().toLocaleTimeString()}</span>
                    ${entry.message}
                </div>
            `).join('');
        }
        return `<div class="info">${log}</div>`;
    }

    formatTaskResult(result) {
        if (typeof result === 'object') {
            if (result.type === 'table') {
                return this.formatTableResult(result.data);
            } else if (result.type === 'code') {
                return `<pre><code>${this.escapeHtml(result.content)}</code></pre>`;
            }
            return `<pre>${JSON.stringify(result, null, 2)}</pre>`;
        }
        return result;
    }

    formatTableResult(data) {
        if (!data || !data.headers || !data.rows) return '';
        
        return `
            <table>
                <thead>
                    <tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.rows.map(row => 
                        `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
                    ).join('')}
                </tbody>
            </table>
        `;
    }

    updateTaskProgress(messageDiv, task) {
        if (task.status === 'running' && task.progress !== undefined) {
            const progressBar = messageDiv.querySelector('.task-progress-bar');
            if (progressBar) {
                progressBar.style.width = `${task.progress}%`;
            }
        }
    }

    async handleTaskAction(actionId, task) {
        try {
            const response = await fetch('/api/task/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    actionId,
                    taskId: task.id,
                    context: task.context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.type === 'task') {
                const taskMessage = document.querySelector(`[data-task-id="${task.id}"]`);
                if (taskMessage) {
                    this.addTaskMessage(taskMessage, JSON.stringify(result));
                }
            } else {
                this.addMessage(JSON.stringify(result), 'bot');
            }
        } catch (error) {
            console.error('Error handling task action:', error);
            this.addMessage('אירעה שגיאה בביצוע הפעולה', 'bot');
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
            <div class="typing-text">Thinking...</div>
        `;
        this.messagesContainer.appendChild(typingDiv);
        
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 0);
        
        return typingDiv;
    }

    formatMessage(text) {
        // First, let's handle the markdown elements that generate HTML
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
            return `<img src="${url}" alt="${alt}" onclick="document.querySelector('.image-preview').innerHTML = '<img src=\\'${url}\\' alt=\\'${alt}\\'>'; document.querySelector('.image-preview').classList.add('active');">`;
        });

        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
            language = language || 'plaintext';
            return `<pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>`;
        });

        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Handle tables - store them temporarily with a placeholder to prevent <br> insertion
        const tables = [];
        text = text.replace(/\|(.+)\|\n\|[-\s|]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
            const headers = header.split('|').filter(cell => cell.trim());
            const tableRows = rows.trim().split('\n').map(row => 
                row.split('|').filter(cell => cell.trim())
            );

            const tableHtml = `<table>
                <thead>
                    <tr>${headers.map(h => `<th>${h.trim()}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${tableRows.map(row => 
                        `<tr>${row.map(cell => `<td>${cell.trim()}</td>`).join('')}</tr>`
                    ).join('')}
                </tbody>
            </table>`;
            
            const placeholder = `__TABLE_PLACEHOLDER_${tables.length}__`;
            tables.push(tableHtml);
            return placeholder;
        });

        // Extract server result placeholders
        const serverResults = [];
        text = text.replace(/__SERVER_RESULT_PLACEHOLDER__(.*?)__END_SERVER_RESULT__/g, (match, content) => {
            const placeholder = `__SERVER_RESULT_PLACEHOLDER_${serverResults.length}__`;
            serverResults.push(content);
            return placeholder;
        });

        // Handle lists
        text = text.replace(/^[\s-]*([•\-*]) (.+)$/gm, '<li>$2</li>');
        text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

        // Handle blockquotes
        text = text.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

        // Handle basic formatting and newlines
        text = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n{2,}/g, '<br>')
            .replace(/\n/g, '<br>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // Restore tables
        tables.forEach((table, index) => {
            text = text.replace(`__TABLE_PLACEHOLDER_${index}__`, table);
        });

        // Restore server results
        serverResults.forEach((result, index) => {
            text = text.replace(`__SERVER_RESULT_PLACEHOLDER_${index}__`, result);
        });

        return text;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showHistoryMenu() {
        const recentSessions = this.getRecentSessions();
        
        const existingMenu = document.querySelector('.history-menu');
        const existingOverlay = document.querySelector('.history-menu-overlay');
        if (existingMenu) existingMenu.remove();
        if (existingOverlay) existingOverlay.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'history-menu-overlay';
        document.body.appendChild(overlay);
        
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

        document.body.appendChild(menu);

        const closeMenu = () => {
            menu.remove();
            overlay.remove();
        };

        overlay.addEventListener('click', closeMenu);
        
        menu.addEventListener('click', (e) => {
            const sessionItem = e.target.closest('.history-item');
            if (sessionItem) {
                const sessionId = sessionItem.dataset.sessionId;
                this.switchSession(sessionId);
                closeMenu();
            }
            
            if (e.target.closest('.new-chat-button')) {
                this.startNewChat();
                closeMenu();
            }
            
            if (e.target.classList.contains('clear-history-button')) {
                if (confirm('האם אתה בטוח שברצונך למחוק את כל היסטוריית השיחות?')) {
                    localStorage.removeItem('recent_chat_sessions');
                    Object.keys(localStorage)
                        .filter(key => key.startsWith('chat_state_'))
                        .forEach(key => localStorage.removeItem(key));
                    this.clearHistory();
                    closeMenu();
                }
            }
        });
    }

    startNewChat() {
        this.saveChatState();
        
        this.sessionId = 'session_' + Date.now();
        
        this.messageHistory = [];
        this.messagesContainer.innerHTML = '';
        
        // Remove any existing typing indicators
        const typingIndicators = document.querySelectorAll('.chat-message.typing');
        typingIndicators.forEach(indicator => indicator.remove());
        
        this.addMessage('שלום! במה אוכל לעזור לך?', 'bot');
        
        this.saveChatState();
        
        if (!this.chatWindow.classList.contains('active')) {
            this.toggleChat();
        }
        
        this.inputField.focus();
    }

    clearHistory() {
        this.messageHistory = [];
        this.messagesContainer.innerHTML = '';
        this.saveChatState();
    }

    async switchSession(sessionId) {
        // Save current session before switching
        this.saveChatState();
        
        this.sessionId = sessionId;
        localStorage.setItem('last_active_session', sessionId);
        
        // Clear current messages
        this.messageHistory = [];
        const messagesContainer = this.chatWindow.querySelector('.chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // Remove any existing typing indicators
        const typingIndicators = document.querySelectorAll('.chat-message.typing');
        typingIndicators.forEach(indicator => indicator.remove());
        
        // Load the new session state
        this.loadChatState();
        
        // Update UI to reflect the session switch
        this.updateSessionIndicator();
    }

    updateSessionIndicator() {
        const sessionIndicator = this.chatWindow.querySelector('.session-indicator') || 
            this.createSessionIndicator();
        
        const recentSessions = this.getRecentSessions();
        const currentSession = recentSessions.find(s => s.id === this.sessionId);
        
        if (currentSession) {
            const date = new Date(currentSession.lastUpdate);
            sessionIndicator.textContent = `שיחה מתאריך ${date.toLocaleDateString('he-IL')}`;
        }
    }

    createSessionIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'session-indicator';
        this.chatWindow.querySelector('.chat-header').appendChild(indicator);
        return indicator;
    }

    getRecentSessions() {
        try {
            return JSON.parse(localStorage.getItem('recent_chat_sessions') || '[]');
        } catch {
            return [];
        }
    }

    async cleanupCurrentModel() {
        this.cleanupPromise = (async () => {
            if (this.nextModelTimer) {
                clearTimeout(this.nextModelTimer);
                this.nextModelTimer = null;
            }

            if (this.isTransitioning) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (this.robot) {
                if (this.mixer) {
                    this.mixer.stopAllAction();
                    this.mixer.uncacheRoot(this.robot);
                }

                this.scene.remove(this.robot);

                this.robot.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(material => {
                                    material.dispose();
                                });
                            } else {
                                child.material.dispose();
                            }
                        }
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                    }
                });
            }

            this.robot = null;
            this.mixer = null;
            this.isTransitioning = false;

            if (window.gc) {
                window.gc();
            }

            await new Promise(resolve => setTimeout(resolve, 50));
        })();

        try {
            await this.cleanupPromise;
        } finally {
            this.cleanupPromise = null;
        }
    }

    loadNextModel() {
        if (this.isTransitioning || this.cleanupPromise) {
            return;
        }

        this.isTransitioning = true;
        const currentModels = this.isActive ? this.activeModels : this.idleModels;
        const loader = new GLTFLoader();
        
        loader.load(currentModels[this.currentModelIndex], (gltf) => {
            if (this.isActive !== this.chatWindow.classList.contains('active')) {
                this.cleanupCurrentModel();
                return;
            }

            const newRobot = gltf.scene;
            
            newRobot.traverse((child) => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.metalness = 0.3;
                    child.material.roughness = 0.6;
                    child.material.envMapIntensity = 1.5;
                    
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.material.map) {
                        child.material.map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                        child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                        child.material.map.magFilter = THREE.LinearFilter;
                    }
                    
                    child.material.transparent = true;
                    child.material.opacity = 0;
                }
            });
            
            const box = new THREE.Box3().setFromObject(newRobot);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 0.8 / maxDim;
            newRobot.scale.setScalar(scale);
            
            newRobot.position.x = -center.x * scale;
            newRobot.position.y = (-center.y * scale) - 0.5;
            newRobot.position.z = -center.z * scale;
            
            const newMixer = new THREE.AnimationMixer(newRobot);
            
            this.scene.add(newRobot);
            
            let actions = [];
            let maxDuration = 0;
            
            if (gltf.animations && gltf.animations.length) {
                gltf.animations.forEach(clip => {
                    const action = newMixer.clipAction(clip);
                    maxDuration = Math.max(maxDuration, clip.duration);
                    action.play();
                    actions.push(action);
                });
                
                this.currentAnimationDuration = maxDuration * 1000;
            }
            
            this.currentModelIndex = (this.currentModelIndex + 1) % currentModels.length;
            
            this.transitionToNewModel(newRobot, newMixer, actions);
        });
    }
    
    transitionToNewModel(newRobot, newMixer, newActions) {
        if (this.isActive !== this.chatWindow.classList.contains('active')) {
            this.cleanupCurrentModel();
            return;
        }

        const TRANSITION_DURATION = 1.5;
        const FADE_START_DELAY = 0.3;
        let transitionTime = 0;
        let startTime = performance.now();
        let animationStartTime = startTime;
        
        const oldRobot = this.robot;
        const oldMixer = this.mixer;
        
        newActions.forEach(action => {
            action.play();
        });
        
        const animate = () => {
            if (this.isActive !== this.chatWindow.classList.contains('active')) {
                this.cleanupCurrentModel();
                return;
            }

            const currentTime = performance.now();
            const deltaTime = (currentTime - startTime) / 1000;
            startTime = currentTime;
            
            transitionTime += deltaTime;
            
            if (oldMixer) oldMixer.update(deltaTime);
            if (newMixer) newMixer.update(deltaTime);
            
            if (transitionTime > FADE_START_DELAY) {
                const fadeTime = transitionTime - FADE_START_DELAY;
                const alpha = Math.min(fadeTime / (TRANSITION_DURATION - FADE_START_DELAY), 1.0);
                
                const eased = this.easeInOutCubic(alpha);
                
                if (oldRobot) {
                    oldRobot.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material.transparent = true;
                            child.material.opacity = 1 - eased;
                        }
                    });
                }
                
                newRobot.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.transparent = true;
                        child.material.opacity = eased;
                    }
                });
                
                if (alpha < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    if (oldRobot) {
                        this.scene.remove(oldRobot);
                        oldRobot.traverse((child) => {
                            if (child.isMesh) {
                                if (child.material) {
                                    if (Array.isArray(child.material)) {
                                        child.material.forEach(material => {
                                            material.dispose();
                                        });
                                    } else {
                                        child.material.dispose();
                                    }
                                }
                                if (child.geometry) {
                                    child.geometry.dispose();
                                }
                            }
                        });
                    }
                    if (oldMixer) {
                        oldMixer.stopAllAction();
                        oldMixer.uncacheRoot(oldRobot);
                    }
                    
                    this.robot = newRobot;
                    this.mixer = newMixer;
                    
                    if (this.nextModelTimer) {
                        clearTimeout(this.nextModelTimer);
                    }
                    
                    this.nextModelTimer = setTimeout(() => {
                        this.isTransitioning = false;
                        const currentModels = this.isActive ? this.activeModels : this.idleModels;
                        if (this.isActive === (currentModels === this.activeModels)) {
                            this.loadNextModel();
                        }
                    }, this.currentAnimationDuration + 500);
                }
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatInterface();
});