import { AutomationModel } from './models/AutomationModel.js';
import { ServerService } from './services/ServerService.js';
import { AutomationUI } from './ui/AutomationUI.js';
import { AutomationCircle } from './components/AutomationCircle.js';
import { showNotification } from '../core/notifications.js';

class AutomationManager {
    constructor() {
        this.automations = new Map();
        this.circles = new Map();
        this.userId = "admin";
        this.serverService = new ServerService(window.location.origin);
        this.ui = new AutomationUI();

        this.initializeEventListeners();
        this.startAutomationPolling();
    }

    initializeEventListeners() {
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                this.ui.showModal();
                this.handleCardClick(card.dataset.id);
            });
        });

        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.ui.hideModal();
        });

        window.addEventListener('click', (event) => {
            if (event.target === this.ui.modal) {
                this.ui.hideModal();
            }
        });
    }

    async handleCardClick(cardId) {
        try {
            const cardTitle = document.querySelector(`.card[data-id="${cardId}"] .card-title`).textContent;
            this.ui.modalTitle.textContent = cardTitle;

            if (cardId === "1") {
                this.ui.modalForm.innerHTML = this.ui.getServerUpdateTemplate();
                await this.initServerUpdateForm();
            } else if (cardId === "2") {
                this.ui.modalForm.innerHTML = this.ui.getBookmarkTemplate();
            } else if (cardId === "3") {
                this.ui.modalForm.innerHTML = this.ui.getTextCheckTemplate();
                this.ui.initializeTextCheckForm();
            }
        } catch (error) {
            console.error('Error handling card click:', error);
            showNotification('שגיאה בטעינת הנתונים', 'error');
        }
    }

    async initServerUpdateForm() {
        this.ui.showFWSpinner();

        try {
            const fwList = await this.serverService.pullFWList();
            if (!fwList) {
                throw new Error('לא התקבלה רשימת גרסאות');
            }

            this.ui.updateFWSelectOptions(fwList);
            this.ui.initializeServerUpdateForm();

            document.getElementById('firmware_version')?.addEventListener('change', () => {
                const serverData = {
                    version: document.getElementById('existing_version').textContent,
                    usr_lbl: "server " + document.getElementById('name').textContent
                };
                this.ui.updateSelectedVersion(serverData);
            });

            const updateButton = document.getElementById('fw-update-button');
            if (updateButton) {
                updateButton.addEventListener('click', () => {
                    this.ui.handleFWUpdate(this.serverService, (automation) => {
                        const newAutomation = new AutomationModel(
                            automation.instance_id,
                            automation.server_name
                        );
                        newAutomation.update(automation);
                        newAutomation.display = true;
                        this.automations.set(newAutomation.id, newAutomation);
                        showNotification('האוטומציה החלה בהצלחה', 'success');
                    });
                });
            }
        } catch (error) {
            console.error('Error initializing server update form:', error);
            showNotification(error.message || 'שגיאה בטעינת רשימת הגרסאות', 'error');
        } finally {
            this.ui.hideFWSpinner();
        }
    }

    async startAutomationPolling() {
        this.cleanup();
        try {
            await this.fetchExistingAutomations();
            setTimeout(() => this.startAutomationPolling(), 10000);
        } catch (error) {
            console.error('Polling error:', error);
            setTimeout(() => this.startAutomationPolling(), 30000);
        }
    }

    async fetchExistingAutomations() {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) loadingMessage.style.display = 'block';

        try {
            const automations = await this.serverService.fetchAutomations(this.userId);

            for (const [id, data] of Object.entries(automations)) {
                if (this.automations.has(id)) {
                    const existingAutomation = this.automations.get(id);
                    data.display = existingAutomation.display;
                } else {
                    data.display = true;  // Only set display=true for new automations
                }

                const automation = this.automations.get(id) || new AutomationModel(id, data.server_name);
                automation.update(data);
                this.automations.set(id, automation);

                if (automation.display) {
                    if (!this.circles.has(id)) {
                        this.createAutomationCircle(automation);
                    }
                    const circle = this.circles.get(id);
                    circle.update(automation.progress, automation.status);
                }
            }

        } catch (error) {
            console.error('Error fetching automations:', error);
            showNotification('שגיאה בטעינת האוטומציות הפעילות', 'error');
        } finally {
            if (loadingMessage) loadingMessage.style.display = 'none';
        }
    }

    createAutomationCircle(automation) {
        const circle = new AutomationCircle(
            automation,
            (id) => this.hideAutomation(id),
            (automation) => {
                const { deleteBtn, stopBtn } = this.ui.showAutomationModal(automation);
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        this.untrackAutomation(automation.id);
                        this.ui.hideModal();
                    });
                }
                if (stopBtn) {
                    stopBtn.addEventListener('click', async () => {
                        try {
                            await this.serverService.stopAutomation(automation.id);
                            showNotification('האוטומציה נעצרה בהצלחה', 'success');
                            this.ui.hideModal();
                        } catch (error) {
                            console.error('Failed to stop automation:', error);
                            showNotification('שגיאה בעצירת האוטומציה', 'error');
                        }
                    });
                }
            }
        );

        this.circles.set(automation.id, circle);
        document.getElementById('automation-circles-container')
            .appendChild(circle.element);
    }

    async handleAutomationUpdate(id, updateData) {
        const automation = this.automations.get(id);
        if (!automation?.display) return;

        automation.update(updateData);
        const circle = this.circles.get(id);

        if (circle) {
            // If the automation was stopped by user, set status to stopped
            if (automation.status === 'failed' && automation.error?.includes('stopped by user')) {
                automation.status = 'stopped';
            }
            
            circle.update(automation.progress, automation.status);

            if (automation.status === 'completed') {
                showNotification(`העדכון הושלם בהצלחה: ${automation.server_name}`, 'success');
            } else if (automation.status === 'failed') {
                showNotification(`שגיאה בעדכון: ${automation.error || 'שגיאה לא ידועה'}`, 'error');
            } else if (automation.status === 'stopped') {
                showNotification(`האוטומציה נעצרה: ${automation.server_name}`, 'warning');
            }
        }
    }

    hideAutomation(id) {
        const circle = this.circles.get(id);
        if (circle) {
            circle.remove();
            this.circles.delete(id);
        }

        const automation = this.automations.get(id);
        if (automation) {
            automation.display = false;
        }
    }

    async untrackAutomation(id) {
        try {
            await this.serverService.untrackAutomation(id);
            this.hideAutomation(id);
            showNotification('המעקב הוסר בהצלחה', 'success');
        } catch (error) {
            console.error('Failed to untrack automation:', error);
            showNotification('שגיאה בהסרת המעקב', 'error');
        }
    }

    cleanup() {
        const now = Date.now();
        const SEVEN_DAYS = 24 * 60 * 60 * 1000 * 7;

        for (const [id, automation] of this.automations.entries()) {
            const automationDate = new Date(automation.created_at).getTime();
            if (now - automationDate > SEVEN_DAYS && !automation.isActive) {
                this.hideAutomation(id);
            }
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.automationManager = new AutomationManager();
});

// Global copy function
window.copyCode = function () {
    const code = document.getElementById("pre-code");
    if (!code) return;

    try {
        code.select();
        document.execCommand("copy");
        document.getElementById("code-btn").innerText = "מעתיקן 🤡";
    } catch (error) {
        console.error('Copy failed:', error);
        showNotification('שגיאה בהעתקת הקוד', 'error');
    }
}; 