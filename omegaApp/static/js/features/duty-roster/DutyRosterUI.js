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
                        <button class="btn btn-primary" id="addMemberBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            הוסף חבר צוות
                        </button>
                        <div class="month-navigation">
                            <button class="btn-icon" id="prevMonth">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M15 18l-6-6 6-6"/>
                                </svg>
                            </button>
                            <span id="currentMonth"></span>
                            <button class="btn-icon" id="nextMonth">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
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
        
        // Add member button
        document.getElementById('addMemberBtn').addEventListener('click', () => 
            this.memberDialog.showAddMemberDialog());

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
        const startDate = new Date(this.stateManager.currentDate.getFullYear(), this.stateManager.currentDate.getMonth(), 1);
        const endDate = new Date(this.stateManager.currentDate.getFullYear(), this.stateManager.currentDate.getMonth() + 1, 0);
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
}
