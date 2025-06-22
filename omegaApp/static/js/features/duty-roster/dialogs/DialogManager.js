export class DialogManager {
    constructor(modalContainer) {
        this.modalContainer = modalContainer;
    }

    async showModal(title, content) {
        console.log('Showing modal:', title);
        return new Promise((resolve) => {
            const modalWrapper = document.createElement('div');
            modalWrapper.className = 'modal';
            modalWrapper.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button type="button" class="close-button" data-action="cancel">&times;</button>
                        </div>
                        <div class="modal-body">${content}</div>
                    </div>
            `;
            
            this.modalContainer.appendChild(modalWrapper);
            requestAnimationFrame(() => {
                modalWrapper.classList.add('show');
                modalWrapper.classList.add('fade-in');
            });

            const closeModal = (result) => {
                console.log('Closing modal with result:', result);
                modalWrapper.classList.remove('show');
                modalWrapper.classList.remove('fade-in');
                setTimeout(() => {
                    this.modalContainer.innerHTML = '';
                    resolve(result);
                }, 300);
            };

            modalWrapper.addEventListener('click', (e) => {
                if (e.target === modalWrapper) {
                    closeModal(null);
                    return;
                }
                
                const actionButton = e.target.closest('[data-action]');
                if (!actionButton) return;

                const action = actionButton.dataset.action;
                  if (action === 'cancel') {
                    closeModal(null);
                    return;
                }
                
                if (action === 'confirm') {
                    closeModal(true);
                    return;
                }
            });

            // Handle form submissions
            const form = modalWrapper.querySelector('form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();                    const data = {};
                    
                    // Get all form inputs
                    form.querySelectorAll('input, select, textarea').forEach(input => {
                        const name = input.id || input.name;
                        if (name) {
                            if (name === 'memberId' && input.value) {
                                data[name] = parseInt(input.value, 10);
                            } else {
                                data[name] = input.value;
                            }
                        }
                    });                    if (form.checkValidity()) {
                        closeModal(data);
                    } else {
                        form.reportValidity();
                    }
                });
            }
        });
    }

    async showConfirmation(title, message) {
        return this.showModal(
            title,
            `<p>${message}</p>
             <div class="modal-actions">
                <button class="btn-secondary" data-action="cancel">ביטול</button>
                <button class="btn-danger" data-action="confirm">אישור</button>
             </div>`
        );
    }
}
