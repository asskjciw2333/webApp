import { DateUtils } from '../utils/DateUtils.js';
import { NotificationManager } from '../utils/NotificationManager.js';
import { DutyRosterModals } from '../modals.js';

export class CalendarView {
    constructor(stateManager, dialogManager) {
        this.stateManager = stateManager;
        this.dialogManager = dialogManager;
    }

    async renderCalendar() {
        const calendar = document.getElementById('rosterCalendar');
        const year = this.stateManager.currentDate.getFullYear();
        const month = this.stateManager.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const totalDays = lastDay.getDate();
        const firstDayOfWeek = firstDay.getDay();

        let calendarHtml = '';

        // Add day headers
        DateUtils.getDayNames().forEach(day => {
            calendarHtml += `<div class="calendar-header">${day}</div>`;
        });

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            calendarHtml += '<div class="calendar-day empty"></div>';
        }

        // Add days of the month
        for (let day = 1; day <= totalDays; day++) {
            calendarHtml += this.renderDay(new Date(year, month, day));
        }

        calendar.innerHTML = calendarHtml;
        this.setupEventListeners(calendar);
    }

    renderDay(date) {
        // נרמול התאריך לשעה 12 בצהריים כדי להימנע מבעיות אזור זמן
        const normalizedDate = new Date(date);
        normalizedDate.setHours(12, 0, 0, 0);
        const dateStr = this.stateManager.formatDate(normalizedDate);
        const { positive, negative } = this.stateManager.getDateConstraints(normalizedDate);
        
        const regularAssignment = this.stateManager.assignments.find(a => a.date === dateStr);
        const assignedMember = regularAssignment ? 
            this.stateManager.getMember(regularAssignment.member_id) : 
            (positive.length > 0 ? this.stateManager.getMember(positive[0].member_id) : null);
        
        const isToday = DateUtils.isToday(normalizedDate);
        const isPositiveConstraint = assignedMember && positive.some(c => c.member_id === assignedMember.id);        // Prepare tooltip text
        const tooltipText = this.getConstraintsTooltip(positive, negative);

        return `
            <div class="calendar-day ${isToday ? 'today' : ''} 
                 ${assignedMember ? 'has-duty' : ''} 
                 ${isPositiveConstraint ? 'positive-constraint' : ''} 
                 ${negative.length ? 'negative-constraint' : ''}"
                 data-date="${dateStr}"
                 ${tooltipText ? `title="${tooltipText}"` : ''}>
                <span class="day-number">${date.getDate()}</span>                ${assignedMember ? `
                    <div class="day-member ${isPositiveConstraint ? 'positive-constraint' : ''}" 
                         style="background-color: ${assignedMember.color || '#3498db'}; color: white;">
                        ${assignedMember.name}
                        ${isPositiveConstraint ? '<span class="positive-badge">✓</span>' : ''}
                        <button class="btn-icon delete-assignment" title="מחק שיבוץ" data-date="${dateStr}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                ` : ''}
                ${negative.length > 0 ? `
                    <div class="negative-indicator">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </div>
                ` : ''}
            </div>`;
    }

    async handleAutomaticAssignment(dateStr, memberId) {
        try {
            const memberName = this.stateManager.getMember(memberId)?.name || 'חבר צוות';
            await this.stateManager.updateAssignment(
                dateStr, 
                memberId, 
                `שיבוץ אוטומטי - ${memberName} זמין לתאריך זה`
            );
        } catch (error) {
            console.error('Error creating automatic assignment:', error);
            const errorMessage = error.message.includes('<!doctype') ? 
                'שגיאת שרת פנימית. אנא נסה שנית מאוחר יותר.' : 
                error.message;
            
            NotificationManager.showNotification(
                `שגיאה בשיבוץ אוטומטי: ${errorMessage}`,
                'error'
            );
        }
    }

    getConstraintsTooltip(positive, negative) {
        const tooltipParts = [];
        if (positive.length) {
            const members = positive
                .map(c => this.stateManager.getMember(c.member_id)?.name)
                .filter(Boolean);
            tooltipParts.push(`זמינים: ${members.join(', ')}`);
        }
        if (negative.length) {
            const members = negative
                .map(c => this.stateManager.getMember(c.member_id)?.name)
                .filter(Boolean);
            tooltipParts.push(`לא זמינים: ${members.join(', ')}`);
        }
        return tooltipParts.join('\n');
    }    setupEventListeners(calendar) {
        calendar.querySelectorAll('.calendar-day[data-date]').forEach(day => {
            day.addEventListener('click', (event) => {
                // אם לחצו על כפתור המחיקה, לא נפתח את הדיאלוג
                if (!event.target.closest('.delete-assignment')) {
                    this.showDayAssignments(new Date(day.dataset.date));
                }
            });
        });

        calendar.querySelectorAll('.delete-assignment').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation(); // מונע פתיחת דיאלוג השיבוץ
                const date = btn.dataset.date;
                const dateObj = new Date(date);
                const memberName = this.stateManager.assignments.find(a => a.date === date)?.member_name || 'התורן';
                
                const confirmed = await this.dialogManager.showModal(
                    'מחיקת שיבוץ',
                    `<div class="confirmation-dialog">
                        <p>האם אתה בטוח שברצונך למחוק את השיבוץ של ${memberName} מתאריך ${dateObj.toLocaleDateString('he-IL')}?</p>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" data-action="cancel">ביטול</button>
                            <button type="button" class="btn btn-danger" data-action="confirm">מחק</button>
                        </div>
                    </div>`
                );

                if (confirmed) {
                    try {
                        await this.stateManager.deleteAssignment(date);
                        await this.renderCalendar();
                        NotificationManager.showNotification('השיבוץ נמחק בהצלחה', 'success');
                    } catch (error) {
                        console.error('Error deleting assignment:', error);
                        NotificationManager.showNotification(error.message, 'error');
                    }
                }
            });
        });
    }    async showDayAssignments(date) {
        // נרמול התאריך לשעה 12 בצהריים כדי להימנע מבעיות אזור זמן
        const normalizedDate = new Date(date);
        normalizedDate.setHours(12, 0, 0, 0);

        const members = this.stateManager.members.map(member => ({
            ...member,
            isAvailable: this.stateManager.isMemberAvailable(member.id, normalizedDate)
        }));

        const result = await this.dialogManager.showModal(
            'שיבוץ תורן',
            DutyRosterModals.assignDuty(normalizedDate, members)
        );
        
        const dateStr = this.stateManager.formatDate(normalizedDate);

        if (result) {
            try {
                if (result.memberId) {
                    // אם נבחר תורן חדש
                    await this.stateManager.updateAssignment(dateStr, result.memberId, result.notes);
                    NotificationManager.showNotification('השיבוץ נשמר בהצלחה', 'success');
                } else {
                    // אם לא נבחר תורן (מחיקת שיבוץ)
                    await this.stateManager.deleteAssignment(dateStr);
                    NotificationManager.showNotification('השיבוץ נמחק בהצלחה', 'success');
                }
                // מרענן את התצוגה של הלוח שנה
                await this.renderCalendar();
            } catch (error) {
                console.error('Error updating assignment:', error);
                NotificationManager.showNotification(error.message, 'error');
            }
        }
    }

    updateMonthDisplay() {
        document.getElementById('currentMonth').textContent = 
            `${DateUtils.getMonthNames()[this.stateManager.currentDate.getMonth()]} ${this.stateManager.currentDate.getFullYear()}`;
    }
}
