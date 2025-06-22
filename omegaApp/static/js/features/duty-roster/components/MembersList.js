export class MembersList {
    constructor(stateManager, constraintDialog, memberDialog) {
        this.stateManager = stateManager;
        this.constraintDialog = constraintDialog;
        this.memberDialog = memberDialog;
    }

    render() {
        const membersList = document.getElementById('membersList');
        membersList.innerHTML = this.stateManager.members
            .map(member => `
                <div class="member-item" data-member-id="${member.id}">
                    <div class="member-info">
                        <span class="member-color" style="background-color: ${member.color || '#3498db'}"></span>
                        <span class="member-name">${member.name}</span>
                    </div>
                    <div class="member-actions">
                        <button class="btn-icon" data-edit-id="${member.id}" title="ערוך פרטי חבר צוות">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon" data-member-id="${member.id}" title="הגדר אילוצים">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 15v3m-3-3h6m-6 0l-3-3m12 3l-3-3m-3-9v6m-3-3h6"/>
                            </svg>
                        </button>
                        <button class="btn-icon text-danger" data-delete-id="${member.id}" title="מחק חבר צוות">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `)
            .join('');

        this.setupEventListeners(membersList);
    }

    setupEventListeners(membersList) {
        membersList.querySelectorAll('.btn-icon[data-member-id]').forEach(btn => {
            btn.addEventListener('click', () => 
                this.constraintDialog.showConstraintDialog(parseInt(btn.dataset.memberId)));
        });

        membersList.querySelectorAll('.btn-icon[data-delete-id]').forEach(btn => {
            btn.addEventListener('click', () => 
                this.memberDialog.deleteMember(parseInt(btn.dataset.deleteId)));
        });

        membersList.querySelectorAll('.btn-icon[data-edit-id]').forEach(btn => {
            btn.addEventListener('click', () => 
                this.memberDialog.editMember(parseInt(btn.dataset.editId)));
        });
    }
}
