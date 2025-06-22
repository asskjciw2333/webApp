// Utility function to create modal content
function createModalContent(content) {
    return `
        <div class="modal-content">
            ${content}
        </div>
    `;
}

export const DutyRosterModals = {
    // Member management modals
    addMember() {
        return createModalContent(`
            <form id="memberForm" class="form">                
                <div class="form-group">
                    <label for="memberName">שם מלא</label>
                    <input type="text" id="memberName" name="memberName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="employeeNumber">מספר עובד</label>
                    <input type="text" id="employeeNumber" name="employeeNumber" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="memberColor">צבע מזהה</label>
                    <input type="color" id="memberColor" name="memberColor" class="form-control" value="#3498db">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" data-action="cancel">ביטול</button>
                    <button type="submit" class="btn btn-primary" data-action="save">שמור</button>
                </div>
            </form>
        `);
    },

    editMember(member) {
        return createModalContent(`
            <form id="memberForm" class="form">
                <div class="form-group">
                    <label for="memberName">שם מלא</label>
                    <input type="text" id="memberName" class="form-control" value="${member.name}" required>
                </div>
                <div class="form-group">
                    <label for="employeeNumber">מספר עובד</label>
                    <input type="text" id="employeeNumber" class="form-control" value="${member.employee_number}" required>
                </div>
                <div class="form-group">
                    <label for="memberColor">צבע מזהה</label>
                    <input type="color" id="memberColor" class="form-control" value="${member.color || '#3498db'}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" data-action="cancel">ביטול</button>
                    <button type="submit" class="btn btn-primary" data-action="save">שמור</button>
                </div>
            </form>
        `);
    },

    // Constraint management modals
    addConstraint(weekDays = ['א','ב','ג','ד','ה','ו','ש']) {
        return createModalContent(`
            <form id="constraintForm" class="form">
                <div class="form-group">
                    <label for="constraintType">סוג אילוץ</label>
                    <select id="constraintType" class="form-control" required>
                        <option value="fixed">אילוץ קבוע</option>
                        <option value="date">אילוץ לפי תאריך</option>
                    </select>
                </div>
                
                <div id="fixedConstraintFields" class="constraint-fields">
                    <div class="form-group">
                        <label>ימי השבוע</label>
                        <div class="weekdays-grid">
                            ${weekDays.map((day, i) => `
                                <label class="weekday-option">
                                    <input type="checkbox" value="${i}">
                                    <span>${day}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div id="dateConstraintFields" class="constraint-fields" style="display: none;">
                    <div class="form-group">
                        <label>טווח תאריכים</label>
                        <div class="date-range-inputs">
                            <input type="date" id="startDate" class="form-control">
                            <span>עד</span>
                            <input type="date" id="endDate" class="form-control">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="isAvailable">זמינות</label>
                    <select id="isAvailable" class="form-control" required>
                        <option value="1">זמין לתורנות</option>
                        <option value="0">לא זמין לתורנות</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="reason">סיבה</label>
                    <textarea id="reason" class="form-control"></textarea>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" data-action="cancel">ביטול</button>
                    <button type="submit" class="btn btn-primary" data-action="save">שמור</button>
                </div>
            </form>
        `);
    },

    editConstraints(member, existingConstraints) {
        const memberConstraints = existingConstraints.filter(c => c.member_id === member.id);
        
        return createModalContent(`
            <div class="constraints-editor">
                <h4>${member.name} - הגדרת אילוצים</h4>
                
                <div class="current-constraints">
                    <h5>אילוצים קיימים</h5>
                    ${memberConstraints.length ? `
                        <div class="constraints-list">
                            ${memberConstraints.map(c => `
                                <div class="constraint-item">
                                    <div class="constraint-info">
                                        <span class="constraint-type">
                                            ${c.constraint_type === 'fixed' ? 'אילוץ קבוע' : 'אילוץ לפי תאריך'}:
                                        </span>
                                        <span class="constraint-details">
                                            ${c.constraint_type === 'fixed' 
                                                ? `יום ${['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][c.day_of_week]}`
                                                : `תאריך ${c.specific_date}`
                                            }
                                        </span>
                                        <span class="constraint-availability">
                                            ${c.is_available ? '✓ זמין' : '✗ לא זמין'}
                                        </span>
                                    </div>
                                    <button type="button" class="btn-icon" data-action="delete" data-constraint-id="${c.id}">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>אין אילוצים</p>'}
                </div>

                <form id="constraintForm" class="form">
                    <input type="hidden" name="member_id" value="${member.id}">
                    <div class="form-group">
                        <label for="constraintType">הוסף אילוץ חדש</label>
                        <select id="constraintType" name="constraint_type" class="form-control" required>
                            <option value="fixed">אילוץ קבוע (לפי יום בשבוע)</option>
                            <option value="date">אילוץ לפי תאריך</option>
                        </select>
                    </div>

                    <div id="fixedConstraintFields" class="constraint-fields">
                        <div class="form-group">
                            <label>יום בשבוע</label>
                            <select name="day_of_week" class="form-control">
                                <option value="0">ראשון</option>
                                <option value="1">שני</option>
                                <option value="2">שלישי</option>
                                <option value="3">רביעי</option>
                                <option value="4">חמישי</option>
                                <option value="5">שישי</option>
                                <option value="6">שבת</option>
                            </select>
                        </div>
                    </div>

                    <div id="dateConstraintFields" class="constraint-fields" style="display: none;">
                        <div class="form-group">
                            <label for="specific_date">תאריך</label>
                            <input type="date" id="specific_date" name="specific_date" class="form-control">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="isAvailable">זמינות</label>
                        <select id="isAvailable" name="is_available" class="form-control" required>
                            <option value="1">זמין לתורנות</option>
                            <option value="0">לא זמין לתורנות</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="reason">סיבה</label>
                        <textarea id="reason" name="reason" class="form-control"></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" data-action="cancel">סגור</button>
                        <button type="submit" class="btn btn-primary" data-action="save">הוסף אילוץ</button>
                    </div>
                </form>
                </script>
            </div>
        `);
    },

    // Assignment management modals
    assignDuty(date, members) {
        return `
            <form id="assignmentForm" class="form" data-action="submit">
                <div class="form-group">
                    <label for="memberId">בחר תורן</label>                    <select id="memberId" name="memberId" class="form-control">
                        <option value="">-- בחר חבר צוות (ריק למחיקת שיבוץ) --</option>
                        ${members.map(m => `
                            <option value="${m.id}">${m.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="notes">הערות</label>
                    <textarea id="notes" name="notes" class="form-control"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" data-action="cancel">ביטול</button>
                    <button type="submit" class="btn btn-primary" data-action="save">שבץ</button>
                </div>
            </form>
        `;
    },

    // Confirmation dialog
    confirm(message) {
        return createModalContent(`
            <div class="confirmation-dialog">
                <p>${message}</p>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" data-action="cancel">ביטול</button>
                    <button type="button" class="btn btn-primary" data-action="confirm">אישור</button>
                </div>
            </div>
        `);
    }
};
