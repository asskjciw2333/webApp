import { NotificationManager } from '../utils/NotificationManager.js';
import { DialogManager } from './DialogManager.js';
import { DutyRosterModals } from '../modals.js';

export class ConstraintDialog {
    constructor(dialogManager, stateManager) {
        this.dialogManager = dialogManager;
        this.stateManager = stateManager;
    }

    async showConstraintDialog(memberId) {
        const member = this.stateManager.getMember(memberId);
        if (!member) {
            NotificationManager.showNotification('חבר הצוות לא נמצא', 'error');
            return;
        }

        const modalWrapper = document.createElement('div');
        modalWrapper.className = 'modal';
        
        const setupConstraintTypeHandler = () => {
            const constraintType = modalWrapper.querySelector('#constraintType');
            const fixedFields = modalWrapper.querySelector('#fixedConstraintFields');
            const dateFields = modalWrapper.querySelector('#dateConstraintFields');
            const dayOfWeekField = modalWrapper.querySelector('select[name="day_of_week"]');
            const specificDateField = modalWrapper.querySelector('input[name="specific_date"]');

            if (constraintType) {
                constraintType.addEventListener('change', function() {
                    if (this.value === 'fixed') {
                        fixedFields.style.display = 'block';
                        dateFields.style.display = 'none';
                        dayOfWeekField.required = true;
                        specificDateField.required = false;
                    } else {
                        fixedFields.style.display = 'none';
                        dateFields.style.display = 'block';
                        dayOfWeekField.required = false;
                        specificDateField.required = true;
                    }
                });

                constraintType.dispatchEvent(new Event('change'));
            }
        };

        const handleConstraintDelete = async (constraintId) => {
            try {
                await this.stateManager.deleteConstraint(constraintId);
                NotificationManager.showNotification('האילוץ נמחק בהצלחה', 'success');
                modalWrapper.querySelector('.modal-content').innerHTML = 
                    DutyRosterModals.editConstraints(member, this.stateManager.constraints);
            } catch (error) {
                console.error('Error deleting constraint:', error);
                NotificationManager.showNotification(error.message, 'error');
            }
        };
        
        const handleClick = async (e) => {
            const deleteBtn = e.target.closest('[data-action="delete"]');
            if (deleteBtn) {
                e.preventDefault();
                await handleConstraintDelete(deleteBtn.dataset.constraintId);
                return;
            }
        };

        modalWrapper.addEventListener('click', handleClick);
        modalWrapper.innerHTML = `
            <div class="modal-content">
                ${DutyRosterModals.editConstraints(member, this.stateManager.constraints)}
            </div>
        `;
        
        this.dialogManager.modalContainer.appendChild(modalWrapper);
        requestAnimationFrame(() => {
            modalWrapper.classList.add('show');
            modalWrapper.classList.add('fade-in');
            setupConstraintTypeHandler();
        });

        return new Promise((resolve) => {
            const closeModal = (result) => {
                modalWrapper.removeEventListener('click', handleClick);
                modalWrapper.classList.remove('show');
                modalWrapper.classList.remove('fade-in');
                setTimeout(() => {
                    this.dialogManager.modalContainer.innerHTML = '';
                    resolve(result);
                }, 300);
            };

            modalWrapper.addEventListener('click', (e) => {
                if (e.target === modalWrapper) closeModal(false);
                
                const actionButton = e.target.closest('[data-action]');
                if (!actionButton || actionButton.dataset.action === 'delete') return;

                e.preventDefault();
                const action = actionButton.dataset.action;
                
                if (action === 'save') {
                    const form = modalWrapper.querySelector('form');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }
                    const formData = Object.fromEntries(new FormData(form));
                    if (formData) {
                        this.stateManager.updateMemberConstraints(memberId, formData)
                            .then(() => {
                                NotificationManager.showNotification('האילוצים נשמרו בהצלחה', 'success');
                                closeModal(formData);
                            })
                            .catch(error => {
                                console.error('Error updating constraints:', error);
                                NotificationManager.showNotification(error.message, 'error');
                            });
                    }
                } else if (action === 'cancel') {
                    closeModal(false);
                }
            });
        });
    }
}
