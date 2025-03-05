class TaskManager {
    constructor() {
        this.tasks = new Map();
    }

    createTask(taskData) {
        const taskContent = `
            <div class="task-container" data-task-id="${taskData.id}">
                <div class="task-header">
                    <span class="task-title">${taskData.title}</span>
                    <span class="task-status ${taskData.status}">${this.getTaskStatusText(taskData.status)}</span>
                </div>
                ${taskData.description ? `<div class="task-description">${taskData.description}</div>` : ''}
                ${taskData.progress !== undefined ? `
                    <div class="task-progress">
                        <div class="task-progress-bar" style="width: ${taskData.progress}%"></div>
                    </div>
                ` : ''}
                ${taskData.log ? `
                    <div class="task-log">
                        ${this.formatTaskLog(taskData.log)}
                    </div>
                ` : ''}
                ${taskData.result ? `
                    <div class="task-result">
                        ${this.formatTaskResult(taskData.result)}
                    </div>
                ` : ''}
                ${taskData.actions ? `
                    <div class="task-actions">
                        ${taskData.actions.map(action => `
                            <button class="task-action-button ${action.type || ''}" 
                                    onclick="window.chatInterface.handleTaskAction('${action.id}', ${JSON.stringify(taskData)})"
                                    ${action.disabled ? 'disabled' : ''}>
                                ${action.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        this.tasks.set(taskData.id, taskData);
        return taskContent;
    }

    updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task) return null;

        Object.assign(task, updates);
        return this.createTask(task);
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default TaskManager; 