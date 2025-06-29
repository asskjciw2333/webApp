import { NotificationManager } from '../utils/NotificationManager.js';
import { DutyRosterModals } from '../modals.js';

export class MemberDialog {
    constructor(dialogManager, stateManager) {
        this.dialogManager = dialogManager;
        this.stateManager = stateManager;
    }

    async handleFormDialog(title, content, apiEndpoint, successMessage) {
        try {
            console.log(`Opening ${title}...`);
            const result = await this.dialogManager.showModal(title, content);
              if (result) {
                console.log("Form submitted:", result);
                const mappedData = {
                    name: result.memberName,
                    employee_number: result.employeeNumber,
                    color: result.memberColor
                };
                const isEdit = apiEndpoint.includes('/members/');
                const response = await fetch(apiEndpoint, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mappedData)
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Request failed');
                }

                await this.stateManager.updateMembers();
                NotificationManager.showNotification(successMessage, 'success');
            }
        } catch (error) {
            console.error(`Error in ${title}:`, error);
            NotificationManager.showNotification(error.message, 'error');
        }
    }

    async showAddMemberDialog() {
        await this.handleFormDialog(
            'הוספת חבר צוות',
            DutyRosterModals.addMember(),
            '/duty-roster/api/members',
            'חבר הצוות נוסף בהצלחה'
        );
    }

    async editMember(memberId) {
        const member = this.stateManager.getMember(memberId);
        if (!member) {
            NotificationManager.showNotification('חבר הצוות לא נמצא', 'error');
            return;
        }

        await this.handleFormDialog(
            'עריכת חבר צוות',
            DutyRosterModals.editMember(member),
            `/duty-roster/api/members/${memberId}`,
            'פרטי חבר הצוות עודכנו בהצלחה'
        );
    }

    async deleteMember(memberId) {
        const member = this.stateManager.getMember(memberId);
        if (!member) {
            NotificationManager.showNotification('חבר הצוות לא נמצא', 'error');
            return;
        }

        const confirmation = await this.dialogManager.showModal(
            'מחיקת חבר צוות',
            `<p>האם אתה בטוח שברצונך למחוק את ${member.name}?</p>
             <div class="modal-actions">
                <button class="btn-secondary" data-action="cancel">ביטול</button>
                <button class="btn-base btn-danger" data-action="confirm">מחק</button>
             </div>`
        );

        if (confirmation) {
            try {
                await fetch(`/duty-roster/api/members/${memberId}`, { method: 'DELETE' });
                await this.stateManager.updateMembers();
                NotificationManager.showNotification('חבר הצוות נמחק בהצלחה', 'success');
            } catch (error) {
                console.error('Error deleting member:', error);
                NotificationManager.showNotification('שגיאה במחיקת חבר הצוות', 'error');
            }
        }
    }
}
