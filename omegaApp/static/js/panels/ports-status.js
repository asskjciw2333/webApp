import { elements } from './panels-main.js';
import { showNotification } from './ui-utils.js';
import { handleEditClick } from './modal.js';

export class PortsStatusManager {
    constructor() {
        this.modal = document.getElementById('portsStatusModal');
        this.statusList = this.modal.querySelector('.ports-status-list');
        this.closeBtn = this.modal.querySelector('.modal-close');
        
        this.initializeEventListeners();
        
        // Store scroll position for restoration
        this.lastScrollPosition = 0;
        
        // Add event delegation for edit buttons
        this.statusList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-panel-btn')) {
                const dcimId = e.target.dataset.dcimId;
                // Create mock event object with required data
                const mockEvent = {
                    currentTarget: {
                        dataset: {
                            rowId: dcimId
                        }
                    }
                };
                
                // Close current modal
                this.closeModal();
                
                // Call existing edit function
                await handleEditClick(mockEvent);
            }
        });
    }

    initializeEventListeners() {
        const statusBtn = document.querySelector('.ports-status-btn');
        statusBtn?.addEventListener('click', () => this.showPortsStatus());
        
        this.closeBtn?.addEventListener('click', () => this.closeModal());
        
        // Close modal when clicking outside
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    async showPortsStatus() {
        try {
            elements.spinnerContainer.style.display = 'flex';
            
            const response = await fetch('get_panels', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filterRoom: "",
                    filterRack: "",
                    filterTextInput: ""
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.updatePortsStatusList(data.panelsData);
            this.openModal();

        } catch (error) {
            showNotification('שגיאה בטעינת נתוני הפורטים', 'error');
        } finally {
            elements.spinnerContainer.style.display = 'none';
        }
    }

    updatePortsStatusList(panelsData) {
        const criticalPanels = [];
        const warningPanels = [];

        panelsData.forEach(panel => {
            if (!panel.how_many_ports_remain) return;

            const portsByDest = this.parsePortsRemaining(panel.how_many_ports_remain);
            
            portsByDest.forEach(({ dest, ports }) => {
                const panelInfo = {
                    dcimId: panel.dcim_id,
                    name: panel.name,
                    room: panel.room,
                    rack: panel.rack,
                    destination: dest,
                    portsRemaining: ports
                };

                // Categorize panels based on remaining ports
                if (ports < 5) {
                    criticalPanels.push(panelInfo);
                } else if (ports < 10) {
                    warningPanels.push(panelInfo);
                }
            });
        });

        this.renderStatusList(criticalPanels, warningPanels);
    }

    parsePortsRemaining(portsStr) {
        return portsStr.split(',')
            .map(part => {
                const [dest, ports] = part.split(':').map(s => s.trim());
                return {
                    dest,
                    ports: parseInt(ports) || 0
                };
            })
            .filter(({ dest, ports }) => dest && !isNaN(ports));
    }

    renderStatusList(criticalPanels, warningPanels) {
        this.statusList.innerHTML = `
            ${this.renderPanelSection('פאנלים במצב קריטי', criticalPanels, 'critical')}
            ${this.renderPanelSection('פאנלים במצב אזהרה', warningPanels, 'warning')}
        `;
    }

    renderPanelSection(title, panels, className) {
        if (!panels.length) return '';

        return `
            <div class="ports-status-section ${className}">
                <h3>${title} (${panels.length})</h3>
                <div class="panels-grid">
                    ${panels.map(panel => `
                        <div class="panel-card">
                            <div class="panel-card-header">
                                <span class="panel-name">${panel.name || panel.dcimId}</span>
                                <span class="ports-count">${panel.portsRemaining} פורטים</span>
                            </div>
                            <div class="panel-card-body">
                                <div>אולם: ${panel.room}</div>
                                <div>מסד: ${panel.rack}</div>
                                <div>יעד: ${panel.destination}</div>
                            </div>
                            <button class="edit-panel-btn" data-dcim-id="${panel.dcimId || panel.id}">
                                ערוך פאנל
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    openModal() {
        this.modal.style.display = 'flex';
        this.modal.classList.add('fade-in');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
        
        // Reset scroll position
        const modalBody = this.modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.scrollTop = 0;
        }
    }

    closeModal() {
        this.modal.classList.remove('fade-in');
        this.modal.classList.add('fade-out');
        document.body.style.overflow = ''; // Restore background scroll
        
        // Store current scroll position before closing
        const modalBody = this.modal.querySelector('.modal-body');
        if (modalBody) {
            this.lastScrollPosition = modalBody.scrollTop;
        }
        
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.modal.classList.remove('fade-out');
        }, 300);
    }

    // Method to restore previous scroll position
    restoreScrollPosition() {
        const modalBody = this.modal.querySelector('.modal-body');
        if (modalBody && this.lastScrollPosition) {
            modalBody.scrollTop = this.lastScrollPosition;
        }
    }
} 