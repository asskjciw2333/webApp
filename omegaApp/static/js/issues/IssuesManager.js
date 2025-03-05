import { openModal, closeModal } from '../panels/modal.js';
import { showNotification } from '../core/notifications.js';

export class IssuesManager {
    constructor() {
        console.log('=== IssuesManager Constructor Start ===');
        
        // Initialize DOM elements
        this.initializeElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        this.loadIssues();
        
        // Add JIRA sync interval
        this.startJiraSync();
        
        console.log('=== IssuesManager Constructor End ===');
    }

    initializeElements() {
        console.log('Initializing DOM elements...');
        
        this.issuesTable = document.getElementById('issues-table');
        console.log('Issues Table:', this.issuesTable);
        
        this.issueForm = document.getElementById('issue-form');
        console.log('Issue Form:', this.issueForm);
        
        this.filterStatus = document.getElementById('filter-status');
        console.log('Filter Status:', this.filterStatus);
        
        this.cardsView = document.getElementById('cards-view');
        console.log('Cards View:', this.cardsView);
        
        this.tableView = document.getElementById('table-view');
        console.log('Table View:', this.tableView);
        
        this.viewButtons = document.querySelectorAll('.view-btn');
        console.log('View Buttons:', this.viewButtons);
        
        this.modal = document.getElementById('new-issue-modal');
        console.log('Modal:', this.modal);
        
        this.newIssueBtn = document.querySelector('.header-actions .btn-primary');
        console.log('New Issue Button:', this.newIssueBtn);
        
        console.log('DOM elements initialized');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Form submit
        if (this.issueForm) {
            console.log('Adding form submit listener');
            this.issueForm.addEventListener('submit', (e) => this.handleIssueSubmit(e));
            
            // Cancel button
            const cancelBtn = this.issueForm.querySelector('.btn-secondary');
            if (cancelBtn) {
                console.log('Adding cancel button listener');
                cancelBtn.addEventListener('click', () => this.closeModal());
            }
        }
        
        // Filter change
        if (this.filterStatus) {
            console.log('Adding filter change listener');
            this.filterStatus.addEventListener('change', () => this.loadIssues());
        }
        
        // View buttons
        if (this.viewButtons.length) {
            console.log('Adding view button listeners');
            this.viewButtons.forEach(btn => {
                btn.addEventListener('click', () => this.switchView(btn.dataset.view));
            });
        }
        
        // New issue button
        if (this.newIssueBtn) {
            console.log('Adding new issue button listener');
            this.newIssueBtn.addEventListener('click', () => {
                console.log('New issue button clicked');
                this.openModal();
            });
        }
        
        // Modal close button
        const modalClose = this.modal?.querySelector('.modal-close');
        if (modalClose) {
            console.log('Adding modal close button listener');
            modalClose.addEventListener('click', () => this.closeModal());
        }
        
        // Modal background click
        if (this.modal) {
            console.log('Adding modal background click listener');
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });
        }
        
        console.log('Event listeners setup complete');
    }

    openModal() {
        console.log('Opening modal');
        if (this.modal) {
            this.modal.style.display = 'flex';
            setTimeout(() => {
                this.modal.classList.add('fade-in');
                this.modal.classList.remove('fade-out');
            }, 10);
        }
    }

    closeModal() {
        console.log('Closing modal');
        if (this.modal) {
            this.modal.classList.add('fade-out');
            this.modal.classList.remove('fade-in');
            setTimeout(() => {
                this.modal.style.display = 'none';
            }, 300);
        }
    }

    async loadIssues() {
        try {
            const status = this.filterStatus?.value || 'open';
            console.log('Loading issues for status:', status);
            
            const response = await fetch(`/issues/list?status=${status}`);
            if (!response.ok) throw new Error('Failed to load issues');
            
            const issues = await response.json();
            console.log('Loaded issues:', issues);
            
            if (!Array.isArray(issues)) {
                console.error('Expected array of issues, got:', issues);
                throw new Error('Invalid response format');
            }
            
            this.renderIssues(issues);
        } catch (error) {
            console.error('Error loading issues:', error);
            this.showNotification('שגיאה בטעינת התקלות', 'error');
        }
    }

    switchView(view) {
        this.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        if (view === 'cards') {
            this.cardsView.style.display = 'block';
            this.tableView.style.display = 'none';
        } else {
            this.cardsView.style.display = 'none';
            this.tableView.style.display = 'block';
        }
    }

    renderIssues(issues) {
        this.renderTable(issues);
        this.renderCards(issues);
    }

    renderTable(issues) {
        if (!this.issuesTable) return;
        
        this.issuesTable.innerHTML = issues.map(issue => `
            <tr class="clickable-row" onclick="if (!event.target.closest('select')) issuesManager.showIssueDetails(${issue.id})">
                <td data-label="מזהה">${issue.id}</td>
                <td data-label="שם שרת">${issue.server_name}</td>
                <td data-label="מיקום">${issue.location}</td>
                <td data-label="טמפליט">${issue.template || ''}</td>
                <td data-label="סריאל">${issue.serial_number || ''}</td>
                <td data-label="מספר קריאה">${issue.ticket_number || ''}</td>
                <td data-label="רשת">${issue.network || ''}</td>
                <td data-label="תיאור התקלה" class="truncate-cell" title="${issue.description}">
                    ${issue.description}
                </td>
                <td data-label="משימת JIRA">${issue.jira_task_id || ''}</td>
                <td data-label="סטטוס">
                    <select onclick="event.stopPropagation()" onchange="issuesManager.updateIssue(${issue.id}, {status: this.value})"
                            class="status-select status-${issue.status}">
                        <option value="open" ${issue.status === 'open' ? 'selected' : ''}>פתוח</option>
                        <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>בטיפול</option>
                        <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>נפתר</option>
                    </select>
                </td>
                <td data-label="עדיפות">
                    <select onclick="event.stopPropagation()" onchange="issuesManager.updateIssue(${issue.id}, {priority: this.value})"
                            class="priority-select priority-${issue.priority}">
                        <option value="low" ${issue.priority === 'low' ? 'selected' : ''}>נמוך</option>
                        <option value="medium" ${issue.priority === 'medium' ? 'selected' : ''}>בינוני</option>
                        <option value="high" ${issue.priority === 'high' ? 'selected' : ''}>גבוה</option>
                    </select>
                </td>
                <td data-label="תאריך יצירה">${new Date(issue.created_at).toLocaleString('he-IL')}</td>
                <td data-label="פותח התקלה">${issue.created_by}</td>
                <td data-label="הערות פתרון" class="truncate-cell" title="${issue.resolution_notes || ''}">
                    ${issue.resolution_notes || ''}
                </td>
            </tr>
        `).join('');
    }

    renderCards(issues) {
        const containers = {
            open: document.querySelector('.cards-container[data-status="open"]'),
            in_progress: document.querySelector('.cards-container[data-status="in_progress"]'),
            resolved: document.querySelector('.cards-container[data-status="resolved"]')
        };

        // Clear all containers
        Object.values(containers).forEach(container => {
            if (container) container.innerHTML = '';
        });

        // Initialize empty arrays for each status
        const groupedIssues = {
            open: [],
            in_progress: [],
            resolved: []
        };

        // Group issues by status
        issues.forEach(issue => {
            if (groupedIssues[issue.status]) {
                groupedIssues[issue.status].push(issue);
            }
        });

        // Render issues in their respective containers
        Object.entries(groupedIssues).forEach(([status, statusIssues]) => {
            const container = containers[status];
            if (!container) return;

            container.innerHTML = statusIssues.map(issue => `
                <div class="issue-card" onclick="issuesManager.showIssueDetails(${issue.id})">
                    <div class="issue-card-header">
                        <h4 class="issue-card-title">${issue.server_name}</h4>
                        <span class="issue-card-priority ${issue.priority}">
                            ${this.getPriorityLabel(issue.priority)}
                        </span>
                    </div>
                    <div class="issue-card-meta">
                        <span>${issue.location}</span>
                        ${issue.ticket_number ? `<span>| קריאה: ${issue.ticket_number}</span>` : ''}
                        <span>| פותח: ${issue.created_by}</span>
                    </div>
                    <div class="issue-card-description">
                        ${issue.description}
                    </div>
                    <div class="issue-card-footer">
                        <span class="issue-card-date">
                            ${new Date(issue.created_at).toLocaleString('he-IL')}
                        </span>
                        ${issue.jira_task_id ? `<span class="jira-link">${issue.jira_task_id}</span>` : ''}
                    </div>
                </div>
            `).join('');
        });
    }

    getPriorityLabel(priority) {
        const labels = {
            low: 'נמוך',
            medium: 'בינוני',
            high: 'גבוה'
        };
        return labels[priority] || priority;
    }

    async showIssueDetails(issueId) {
        try {
            const response = await fetch(`/issues/${issueId}`);
            const issue = await response.json();
            
            if (!response.ok) throw new Error(issue.error || 'Failed to fetch issue details');
            
            const modalContent = `
                <div class="modal-header">
                    <div class="modal-title-group">
                        <h2 class="modal-title">פרטי תקלה #${issue.id}</h2>
                        <div class="issue-status-badges">
                            <span class="status-badge status-${issue.status}">
                                ${this.getStatusLabel(issue.status)}
                            </span>
                            <span class="priority-badge priority-${issue.priority}">
                                ${this.getPriorityLabel(issue.priority)}
                            </span>
                        </div>
                    </div>
                    <div class="modal-actions-group">
                        <button class="edit-button" onclick="issuesManager.toggleEditMode(${issue.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            ערוך
                        </button>
                        <span class="modal-close">&times;</span>
                    </div>
                </div>
                <div class="modal-body">
                    <form id="edit-issue-form" class="issue-details" style="display: none;">
                        <div class="details-grid">
                            <div class="detail-group">
                                <h3>פרטי שרת</h3>
                                <div class="details-subgrid">
                                    <div class="detail-item">
                                        <label>שם שרת</label>
                                        <input type="text" name="server_name" value="${issue.server_name}" required>
                                    </div>
                                    <div class="detail-item">
                                        <label>מיקום</label>
                                        <input type="text" name="location" value="${issue.location}" required>
                                    </div>
                                    <div class="detail-item">
                                        <label>טמפליט</label>
                                        <input type="text" name="template" value="${issue.template || ''}">
                                    </div>
                                    <div class="detail-item">
                                        <label>סריאל</label>
                                        <input type="text" name="serial_number" value="${issue.serial_number || ''}">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-group">
                                <h3>פרטי תקלה</h3>
                                <div class="details-subgrid">
                                    <div class="detail-item">
                                        <label>מספר קריאה</label>
                                        <input type="text" name="ticket_number" value="${issue.ticket_number || ''}">
                                    </div>
                                    <div class="detail-item">
                                        <label>רשת</label>
                                        <input type="text" name="network" value="${issue.network || ''}">
                                    </div>
                                    <div class="detail-item">
                                        <label>סטטוס</label>
                                        <select name="status" class="status-select status-${issue.status}">
                                            <option value="open" ${issue.status === 'open' ? 'selected' : ''}>פתוח</option>
                                            <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>בטיפול</option>
                                            <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>נפתר</option>
                                        </select>
                                    </div>
                                    <div class="detail-item">
                                        <label>עדיפות</label>
                                        <select name="priority" class="priority-select priority-${issue.priority}">
                                            <option value="low" ${issue.priority === 'low' ? 'selected' : ''}>נמוך</option>
                                            <option value="medium" ${issue.priority === 'medium' ? 'selected' : ''}>בינוני</option>
                                            <option value="high" ${issue.priority === 'high' ? 'selected' : ''}>גבוה</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="detail-group">
                                <h3>אינטגרציות</h3>
                                <div class="details-subgrid">
                                    <div class="detail-item">
                                        <label>משימת JIRA</label>
                                        ${issue.jira_task_id ? `
                                            <div class="jira-link-container">
                                                <a href="${issue.jira_url}" target="_blank" class="jira-link">
                                                    ${issue.jira_task_id}
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                        <polyline points="15 3 21 3 21 9"></polyline>
                                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                                    </svg>
                                                </a>
                                            </div>
                                        ` : `
                                            <div class="create-jira-container">
                                                <button type="button" class="btn btn-primary create-jira-btn" onclick="issuesManager.createJiraTicket(${issue.id})">
                                                    צור משימת JIRA
                                                </button>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>

                            <div class="detail-group full-width">
                                <h3>תיאור ופתרון</h3>
                                <div class="details-subgrid">
                                    <div class="detail-item full-width">
                                        <label>תיאור התקלה</label>
                                        <textarea name="description" required>${issue.description}</textarea>
                                    </div>
                                    <div class="detail-item full-width">
                                        <label>הערות פתרון</label>
                                        <textarea name="resolution_notes">${issue.resolution_notes || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <span class="button-text">שמור שינויים</span>
                                <div class="spinner" style="display: none;"></div>
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="issuesManager.toggleEditMode(${issue.id})">ביטול</button>
                        </div>
                    </form>

                    <div id="view-issue-details">
                        <div class="details-grid">
                            <div class="detail-group">
                                <h3>פרטי שרת</h3>
                                <div class="details-subgrid">
                                    <div class="detail-item">
                                        <label>שם שרת</label>
                                        <span>${issue.server_name}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>מיקום</label>
                                        <span>${issue.location}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>טמפליט</label>
                                        <span>${issue.template || '-'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>סריאל</label>
                                        <span>${issue.serial_number || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="detail-group">
                                <h3>פרטי תקלה</h3>
                                <div class="details-subgrid">
                                    <div class="detail-item">
                                        <label>מספר קריאה</label>
                                        <span>${issue.ticket_number || '-'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>רשת</label>
                                        <span>${issue.network || '-'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>פותח התקלה</label>
                                        <span>${issue.created_by}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>תאריך יצירה</label>
                                        <span>${new Date(issue.created_at).toLocaleString('he-IL')}</span>
                                    </div>
                                    ${issue.resolved_at ? `
                                        <div class="detail-item">
                                            <label>תאריך פתרון</label>
                                            <span>${new Date(issue.resolved_at).toLocaleString('he-IL')}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="detail-group">
                                <h3>אינטגרציות</h3>
                                <div class="details-subgrid">
                                    <div class="detail-item">
                                        <label>משימת JIRA</label>
                                        ${issue.jira_task_id ? `
                                            <a href="${issue.jira_url}" target="_blank" class="jira-link">
                                                ${issue.jira_task_id} 
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                    <polyline points="15 3 21 3 21 9"></polyline>
                                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                                </svg>
                                            </a>
                                        ` : `
                                            <button class="btn btn-primary create-jira-btn" onclick="issuesManager.createJiraTicket(${issue.id})">
                                                צור משימת JIRA
                                            </button>
                                        `}
                                    </div>
                                </div>
                            </div>

                            <div class="detail-group full-width">
                                <h3>תיאור ופתרון</h3>
                                <div class="details-subgrid">
                                    <div class="detail-item full-width">
                                        <label>תיאור התקלה</label>
                                        <p class="description-text">${issue.description}</p>
                                    </div>
                                    <div class="detail-item full-width">
                                        <label>הערות פתרון</label>
                                        <p class="description-text">${issue.resolution_notes || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Get the existing modal and update its content
            const modal = document.getElementById('issue-details-modal');
            if (!modal) {
                console.error('Modal element not found');
                return;
            }

            const modalContentElement = modal.querySelector('.modal-content');
            if (!modalContentElement) {
                console.error('Modal content element not found');
                return;
            }

            modalContentElement.innerHTML = modalContent;

            // Add form submit handler
            const editForm = modal.querySelector('#edit-issue-form');
            if (editForm) {
                editForm.addEventListener('submit', (e) => this.handleIssueEdit(e, issue.id));
            }

            // Open modal
            modal.style.display = 'flex';
            modal.classList.add('fade-in');
            
            // Add close button handler
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    modal.classList.remove('fade-in');
                    modal.classList.add('fade-out');
                    setTimeout(() => {
                        modal.style.display = 'none';
                        modal.classList.remove('fade-out');
                    }, 300);
                };
            }

            // Add click outside handler
            modal.onclick = (e) => {
                if (e.target === modal) {
                    closeBtn.onclick();
                }
            };
            
        } catch (error) {
            console.error('Error showing issue details:', error);
            showNotification('שגיאה בטעינת פרטי התקלה', 'error');
        }
    }

    async createJiraTicket(issueId) {
        try {
            const response = await fetch(`/issues/${issueId}/create-jira`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                if (result.error?.includes('not configured')) {
                    showNotification('error', 'מערכת JIRA לא מוגדרת במערכת');
                    return;
                }
                throw new Error(result.error || 'Failed to create JIRA ticket');
            }
            
            showNotification('success', 'משימת JIRA נוצרה בהצלחה');
            
            // Refresh issue details
            this.showIssueDetails(issueId);
            
        } catch (error) {
            console.error('Error creating JIRA ticket:', error);
            showNotification('error', 'שגיאה ביצירת משימת JIRA');
        }
    }

    startJiraSync() {
        // Sync JIRA issues every 5 minutes
        this.syncJiraIssues();
        setInterval(() => this.syncJiraIssues(), 5 * 60 * 1000);
    }

    async syncJiraIssues() {
        try {
            const response = await fetch('/issues/sync-jira', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                if (result.error?.includes('not configured')) {
                    // JIRA is not configured - silently ignore
                    return;
                }
                throw new Error(result.error || 'Failed to sync JIRA issues');
            }
            
            if (result.synced_issues?.length > 0) {
                showNotification('info', `סונכרנו ${result.synced_issues.length} תקלות חדשות מ-JIRA`);
                // Refresh issues list
                this.loadIssues();
            }
            
        } catch (error) {
            console.error('Error syncing JIRA issues:', error);
            // Don't show notification for sync errors to avoid spam
            logger.error('Failed to sync JIRA issues:', error);
        }
    }

    toggleEditMode(issueId) {
        const modal = document.getElementById('issue-details-modal');
        const viewForm = modal.querySelector('#view-issue-details');
        const editForm = modal.querySelector('#edit-issue-form');
        const editButton = modal.querySelector('.edit-button');

        if (viewForm.style.display !== 'none') {
            // Switch to edit mode
            viewForm.style.display = 'none';
            editForm.style.display = 'block';
            editButton.innerHTML = '<i class="fas fa-times"></i> ביטול עריכה';
        } else {
            // Switch back to view mode
            viewForm.style.display = 'grid';
            editForm.style.display = 'none';
            editButton.innerHTML = '<i class="fas fa-edit"></i> ערוך';
        }
    }

    async handleIssueEdit(event, issueId) {
        event.preventDefault();
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const buttonText = submitBtn.querySelector('.button-text');
        const spinner = submitBtn.querySelector('.spinner');

        try {
            // Start loading state
            submitBtn.classList.add('loading');
            buttonText.style.opacity = '0';
            spinner.style.display = 'block';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const issueData = Object.fromEntries(formData.entries());

            const response = await fetch(`/issues/${issueId}/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(issueData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update issue');
            }

            showNotification('התקלה עודכנה בהצלחה', 'success');
            await this.loadIssues();
            
            // Refresh the modal content with updated data
            await this.showIssueDetails(issueId);
        } catch (error) {
            console.error('Error updating issue:', error);
            showNotification('שגיאה בעדכון התקלה', 'error');
        } finally {
            // Reset loading state
            submitBtn.classList.remove('loading');
            buttonText.style.opacity = '1';
            spinner.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    // Helper methods
    getStatusLabel(status) {
        const labels = {
            open: 'פתוח',
            in_progress: 'בטיפול',
            resolved: 'נפתר'
        };
        return labels[status] || status;
    }

    async handleIssueSubmit(event) {
        event.preventDefault();
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const buttonText = submitBtn.querySelector('.button-text');
        const spinner = submitBtn.querySelector('.spinner');

        try {
            // Start loading state
            submitBtn.classList.add('loading');
            buttonText.style.opacity = '0';
            spinner.style.display = 'block';
            submitBtn.disabled = true;

            // Get user info first
            const userResponse = await fetch('/issues/user/info');
            const userData = await userResponse.json();
            
            if (!userData.success) {
                throw new Error('Failed to get user information');
            }

            const formData = new FormData(event.target);
            const issueData = Object.fromEntries(formData.entries());
            
            // Add the user's display name as created_by
            issueData.created_by = userData.user.displayName;

            console.log('Sending issue data:', issueData);

            const response = await fetch('/issues/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prepareIssueData(issueData))
            });

            console.log('Server response:', response);
            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server error:', errorData);
                throw new Error(errorData.error || 'Failed to create issue');
            }
            
            const responseData = await response.json();
            console.log('Response data:', responseData);
            
            showNotification('התקלה נוצרה בהצלחה', 'success');
            this.issueForm.reset();
            await this.loadIssues();
            this.handleModalClose();
        } catch (error) {
            console.error('Error in handleIssueSubmit:', error);
            showNotification('שגיאה ביצירת התקלה', 'error');
        } finally {
            // Reset loading state
            submitBtn.classList.remove('loading');
            buttonText.style.opacity = '1';
            spinner.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    async updateIssue(issueId, updates) {
        try {
            const response = await fetch(`/issues/${issueId}/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update issue');
            
            showNotification('התקלה עודכנה בהצלחה', 'success');
            await this.loadIssues();
            
            // If the details modal is open, refresh its content
            const modal = document.getElementById('issue-details-modal');
            if (modal && modal.style.display === 'flex') {
                await this.showIssueDetails(issueId);
            }
        } catch (error) {
            showNotification('שגיאה בעדכון התקלה', 'error');
        }
    }

    handleModalOpen() {
        openModal();
    }

    handleModalClose() {
        closeModal();
    }
}

// Find the function that handles dates
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    
    // Convert the ISO string to a proper date format
    try {
        const date = new Date(dateTimeStr);
        return date.toISOString().replace('T', ' ').split('.')[0];
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateTimeStr;
    }
}

// Make sure to use this function when sending dates to the server
function prepareIssueData(issueData) {
    // ... existing code ...
    
    // Format dates before sending to server
    if (issueData.created_at) {
        issueData.created_at = formatDateTime(issueData.created_at);
    }
    if (issueData.updated_at) {
        issueData.updated_at = formatDateTime(issueData.updated_at);
    }
    if (issueData.resolved_at) {
        issueData.resolved_at = formatDateTime(issueData.resolved_at);
    }
    
    return issueData;
} 