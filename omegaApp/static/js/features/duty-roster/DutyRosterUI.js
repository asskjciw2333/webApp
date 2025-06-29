import { RosterStateManager } from './services/RosterStateManager.js';
import { DialogManager } from './dialogs/DialogManager.js';
import { ConstraintDialog } from './dialogs/ConstraintDialog.js';
import { MemberDialog } from './dialogs/MemberDialog.js';
import { CalendarView } from './components/CalendarView.js';
import { MembersList } from './components/MembersList.js';
import { NotificationManager } from './utils/NotificationManager.js';
import { helpContent } from './help.js';

// Main Duty Roster UI Module
export class DutyRosterUI {
    static instance = null;
    
    constructor(containerId) {
        if (DutyRosterUI.instance) {
            return DutyRosterUI.instance;
        }
        DutyRosterUI.instance = this;
        
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id ${containerId} not found`);
            return;
        }

        // Create modal container
        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'modal-container';
        document.body.appendChild(this.modalContainer);
        
        // Initialize managers and components
        this.stateManager = new RosterStateManager();
        this.dialogManager = new DialogManager(this.modalContainer);
        this.memberDialog = new MemberDialog(this.dialogManager, this.stateManager);
        this.constraintDialog = new ConstraintDialog(this.dialogManager, this.stateManager);
        this.calendarView = new CalendarView(this.stateManager, this.dialogManager);
        this.membersList = new MembersList(this.stateManager, this.constraintDialog, this.memberDialog);

        // Set up state management
        this.stateManager.subscribe('main-ui', (state) => this.handleStateUpdate(state));
        
        this.initializeUI();
        this.setupEventListeners();
        this.loadData();
        
        // Start periodic updates
        this.stateManager.startPeriodicUpdates();
    }

    async handleStateUpdate(state) {
        switch(state.type) {
            case 'members':
            case 'assignments':
            case 'constraints':
                this.renderUI();
                break;
        }
    }

    // Initialize UI with empty state
    initializeUI() {
        this.container.innerHTML = `
            <div class="duty-roster-container">
                <div class="duty-roster-header">
                    <div>
                        <h2>ניהול תורנויות</h2>
                        <button class="btn btn-secondary" id="help-btn" title="עזרה">!</button>
                    </div>
                    <div class="header-controls">
                        <button class="btn btn-primary" id="autoScheduleBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 14l-3-3m3 3l-3 3M3 10h12c2 0 3 1 3 3"/>
                            </svg>
                            שיבוץ אוטומטי
                        </button>
                        <button class="btn btn-success" id="exportOutlookBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            ייצוא ל-Outlook
                        </button>
                        <button class="btn btn-danger" id="deleteAssignmentsBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M19 6l-1-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2L5 6"/>
                            </svg>
                            מחק שיבוצים
                        </button>
                        <button class="btn btn-primary" id="addMemberBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            הוסף חבר צוות
                        </button>
                        <div class="month-navigation">
                            <button class="btn-icon" id="prevMonth">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                            </svg>
                            </button>
                            <span id="currentMonth"></span>
                            <button class="btn-icon" id="nextMonth">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                            </button>
                            <button class="btn btn-secondary" id="todayBtn" title="היום">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12,6 12,12 16,14"/>
                                </svg>
                                היום
                            </button>
                        </div>
                    </div>
                </div>
                <div class="roster-grid">
                    <div class="roster-sidebar">
                        <h3>חברי צוות</h3>
                        <div id="membersList" class="members-list"></div>
                    </div>
                    <div class="roster-calendar" id="rosterCalendar"></div>
                </div>
                <div id="constraintsPanel" class="constraints-panel hidden">
                    <h3>הגדרת אילוצים</h3>
                    <div class="constraints-content"></div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Month navigation
        document.getElementById('prevMonth').addEventListener('click', () => this.navigateMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.navigateMonth(1));
        document.getElementById('todayBtn').addEventListener('click', () => this.jumpToToday());
        
        // Add member button
        document.getElementById('addMemberBtn').addEventListener('click', () => 
            this.memberDialog.showAddMemberDialog());

        // Auto-schedule button
        document.getElementById('autoScheduleBtn').addEventListener('click', () => 
            this.showAutoScheduleDialog());

        // Export to Outlook button
        document.getElementById('exportOutlookBtn').addEventListener('click', () => 
            this.showExportOutlookDialog());

        // Delete assignments button
        document.getElementById('deleteAssignmentsBtn').addEventListener('click', () => this.showDeleteAssignmentsDialog());

        // Help button
        document.getElementById('help-btn')?.addEventListener('click', () => this.showHelpDialog());
    }

    async loadData() {
        try {
            await Promise.all([
                this.stateManager.updateMembers(),
                this.loadAssignments(),
                this.stateManager.updateConstraints()
            ]);
            
            this.renderUI();
        } catch (error) {
            console.error('Error loading duty roster data:', error);
            NotificationManager.showNotification('שגיאה בטעינת נתוני התורנות', 'error');
        }
    }

    async loadAssignments() {
        // Fix timezone issues by using UTC dates
        const year = this.stateManager.currentDate.getFullYear();
        const month = this.stateManager.currentDate.getMonth(); // 0-11
        
        // Calculate the first day of the week that contains the first day of the month
        const firstDayOfMonth = new Date(year, month, 1);
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const daysFromPrevMonth = firstDayOfWeek;
        
        // Calculate the last day of the week that contains the last day of the month
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const lastDayOfWeek = lastDayOfMonth.getDay();
        const daysToNextMonth = 6 - lastDayOfWeek;
        
        // Create dates using UTC to avoid timezone issues
        const startDate = new Date(Date.UTC(year, month, 1 - daysFromPrevMonth));
        const endDate = new Date(Date.UTC(year, month + 1, daysToNextMonth));
        
        await this.stateManager.updateAssignments(startDate, endDate);
    }

    renderUI() {
        this.membersList.render();
        this.calendarView.renderCalendar();
        this.calendarView.updateMonthDisplay();
    }

    navigateMonth(delta) {
        this.stateManager.currentDate = new Date(
            this.stateManager.currentDate.getFullYear(),
            this.stateManager.currentDate.getMonth() + delta,
            1
        );
        this.loadAssignments().then(() => this.renderUI());
    }

    async showHelpDialog() {
        const content = `
            <div class="help-content">
                ${helpContent.sections.map(section => `
                    <section class="help-section">
                        <h3>${section.title}</h3>
                        <p>${section.content}</p>
                    </section>
                `).join('')}
            </div>
        `;
        await this.dialogManager.showModal(helpContent.title, content);
    }

    async showAutoScheduleDialog() {
        // דיאלוג בחירת חודש/חודשים בלבד
        const now = new Date();
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const content = `
            <div class="auto-schedule-dialog">
                <p>בחר חודש התחלה ומספר חודשים לשיבוץ אוטומטי:</p>
                <div class="form-group">
                    <label for="monthSelect">חודש התחלה:</label>
                    <input type="month" id="monthSelect" class="form-control" value="${defaultMonth}">
                </div>
                <div class="form-group">
                    <label for="monthsCount">מספר חודשים:</label>
                    <input type="number" id="monthsCount" class="form-control" value="1" min="1" max="12">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" data-action="confirm">שבץ</button>
                    <button class="btn btn-secondary" data-action="cancel">ביטול</button>
                </div>
            </div>
        `;
        const result = await new Promise((resolve) => {
            this.dialogManager.showModal('שיבוץ אוטומטי', content);
            setTimeout(() => {
                const modal = document.querySelector('.auto-schedule-dialog');
                if (!modal) return resolve(null);
                const confirmBtn = modal.querySelector('[data-action="confirm"]');
                const cancelBtn = modal.querySelector('[data-action="cancel"]');
                confirmBtn?.addEventListener('click', () => {
                    const month = modal.querySelector('#monthSelect')?.value;
                    const months = parseInt(modal.querySelector('#monthsCount')?.value);
                    resolve({ month, months });
                    document.body.querySelector('#modal-container').innerHTML = '';
                });
                cancelBtn?.addEventListener('click', () => {
                    resolve(null);
                    document.body.querySelector('#modal-container').innerHTML = '';
                });
            }, 0);
        });
        if (result && result.month && !isNaN(result.months) && result.months > 0) {
            try {
                NotificationManager.showNotification('מבצע שיבוץ אוטומטי...', 'info');
                const response = await fetch('/duty-roster/api/roster/auto-schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month: result.month, months: result.months })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'שגיאה בשיבוץ אוטומטי');
                NotificationManager.showNotification('השיבוץ האוטומטי הושלם בהצלחה', 'success');
                
                // Update currentDate to the month that was scheduled
                const [year, month] = result.month.split('-').map(Number);
                this.stateManager.currentDate = new Date(Date.UTC(year, month - 1, 1));
                
                await this.loadAssignments();
                this.renderUI();
            } catch (error) {
                NotificationManager.showNotification(`שגיאה בביצוע שיבוץ אוטומטי: ${error.message}`, 'error');
            }
        } else if (result) {
            NotificationManager.showNotification('נא למלא את כל השדות בצורה תקינה', 'error');
        }
    }

    async showDeleteAssignmentsDialog() {
        // דיאלוג בחירת חודש/חודשים למחיקה
        const now = new Date();
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const content = `
            <div class="delete-assignments-dialog">
                <p>בחר חודש התחלה ומספר חודשים למחיקת כל השיבוצים:</p>
                <div class="form-group">
                    <label for="monthSelectDel">חודש התחלה:</label>
                    <input type="month" id="monthSelectDel" class="form-control" value="${defaultMonth}">
                </div>
                <div class="form-group">
                    <label for="monthsCountDel">מספר חודשים:</label>
                    <input type="number" id="monthsCountDel" class="form-control" value="1" min="1" max="12">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-danger" data-action="confirm">מחק</button>
                    <button class="btn btn-secondary" data-action="cancel">ביטול</button>
                </div>
            </div>
        `;
        const result = await new Promise((resolve) => {
            this.dialogManager.showModal('מחיקת שיבוצים', content);
            setTimeout(() => {
                const modal = document.querySelector('.delete-assignments-dialog');
                if (!modal) return resolve(null);
                const confirmBtn = modal.querySelector('[data-action="confirm"]');
                const cancelBtn = modal.querySelector('[data-action="cancel"]');
                confirmBtn?.addEventListener('click', () => {
                    const month = modal.querySelector('#monthSelectDel')?.value;
                    const months = parseInt(modal.querySelector('#monthsCountDel')?.value);
                    resolve({ month, months });
                    document.body.querySelector('#modal-container').innerHTML = '';
                });
                cancelBtn?.addEventListener('click', () => {
                    resolve(null);
                    document.body.querySelector('#modal-container').innerHTML = '';
                });
            }, 0);
        });
        if (result && result.month && !isNaN(result.months) && result.months > 0) {
            try {
                NotificationManager.showNotification('מוחק שיבוצים...', 'info');
                const response = await fetch('/duty-roster/api/assignments/delete-range', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month: result.month, months: result.months })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'שגיאה במחיקת שיבוצים');
                NotificationManager.showNotification('כל השיבוצים נמחקו בהצלחה', 'success');
                await this.loadAssignments();
                this.renderUI();
            } catch (error) {
                NotificationManager.showNotification(`שגיאה במחיקת שיבוצים: ${error.message}`, 'error');
            }
        } else if (result) {
            NotificationManager.showNotification('נא למלא את כל השדות בצורה תקינה', 'error');
        }
    }

    jumpToToday() {
        this.stateManager.currentDate = new Date();
        this.loadAssignments().then(() => this.renderUI());
    }

    async showExportOutlookDialog() {
        // דיאלוג בחירת טווח תאריכים לייצוא
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
        
        const content = `
            <div class="export-outlook-dialog">
                <p>בחר שיטת ייצוא לתורנויות ל-Outlook:</p>
                
                <div class="export-tabs">
                    <button class="tab-btn active" data-tab="date-range">טווח תאריכים</button>
                    <button class="tab-btn" data-tab="month-range">טווח חודשים</button>
                </div>
                
                <div class="tab-content active" id="date-range-tab">
                    <div class="form-group">
                        <label for="startDateExport">תאריך התחלה:</label>
                        <input type="date" id="startDateExport" class="form-control" value="${now.toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label for="endDateExport">תאריך סיום:</label>
                        <input type="date" id="endDateExport" class="form-control" value="${new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]}">
                    </div>
                </div>
                
                <div class="tab-content" id="month-range-tab">
                    <div class="form-group">
                        <label for="monthSelectExport">חודש התחלה:</label>
                        <input type="month" id="monthSelectExport" class="form-control" value="${currentMonth}">
                    </div>
                    <div class="form-group">
                        <label for="monthsCountExport">מספר חודשים:</label>
                        <input type="number" id="monthsCountExport" class="form-control" value="1" min="1" max="12">
                    </div>
                </div>
                
                <div class="export-info">
                    <p><strong>הוראות ייבוא ל-Outlook:</strong></p>
                    <ol>
                        <li>לחץ על "ייצא" להורדת קובץ ה-ICS</li>
                        <li>פתח את Outlook</li>
                        <li>לך ל-File > Open & Export > Import/Export</li>
                        <li>בחר "Import an iCalendar (.ics) or vCalendar file (.vcs)"</li>
                        <li>בחר את הקובץ שהורדת ולחץ "OK"</li>
                    </ol>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-success" data-action="export">ייצא</button>
                    <button class="btn btn-secondary" data-action="cancel">ביטול</button>
                </div>
            </div>
        `;
        
        const result = await new Promise((resolve) => {
            this.dialogManager.showModal('ייצוא ל-Outlook', content);
            setTimeout(() => {
                const modal = document.querySelector('.export-outlook-dialog');
                if (!modal) return resolve(null);
                
                // Tab switching functionality
                const tabBtns = modal.querySelectorAll('.tab-btn');
                const tabContents = modal.querySelectorAll('.tab-content');
                
                tabBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const tabName = btn.dataset.tab;
                        
                        // Update active tab button
                        tabBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        
                        // Update active tab content
                        tabContents.forEach(content => content.classList.remove('active'));
                        modal.querySelector(`#${tabName}-tab`).classList.add('active');
                    });
                });
                
                const exportBtn = modal.querySelector('[data-action="export"]');
                const cancelBtn = modal.querySelector('[data-action="cancel"]');
                
                exportBtn?.addEventListener('click', () => {
                    const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
                    
                    if (activeTab === 'date-range') {
                        const startDate = modal.querySelector('#startDateExport')?.value;
                        const endDate = modal.querySelector('#endDateExport')?.value;
                        resolve({ type: 'date-range', startDate, endDate });
                    } else {
                        const month = modal.querySelector('#monthSelectExport')?.value;
                        const months = parseInt(modal.querySelector('#monthsCountExport')?.value);
                        resolve({ type: 'month-range', month, months });
                    }
                    
                    document.body.querySelector('#modal-container').innerHTML = '';
                });
                
                cancelBtn?.addEventListener('click', () => {
                    resolve(null);
                    document.body.querySelector('#modal-container').innerHTML = '';
                });
            }, 0);
        });
        
        if (result) {
            try {
                NotificationManager.showNotification('מייצא תורנויות...', 'info');
                
                let url, filename;
                
                if (result.type === 'date-range' && result.startDate && result.endDate) {
                    url = `/duty-roster/api/export/outlook?start_date=${result.startDate}&end_date=${result.endDate}`;
                    filename = `duty_roster_${result.startDate}_to_${result.endDate}.ics`;
                } else if (result.type === 'month-range' && result.month && !isNaN(result.months) && result.months > 0) {
                    url = `/duty-roster/api/export/outlook/month?month=${result.month}&months=${result.months}`;
                    filename = `duty_roster_${result.month}_${result.months}_months.ics`;
                } else {
                    NotificationManager.showNotification('נא למלא את כל השדות בצורה תקינה', 'error');
                    return;
                }
                
                // Create download link
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                NotificationManager.showNotification('הקובץ יוצא בהצלחה!', 'success');
            } catch (error) {
                NotificationManager.showNotification(`שגיאה בייצוא הקובץ: ${error.message}`, 'error');
            }
        }
    }
}
