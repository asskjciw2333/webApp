export default class ServerDetails {
    constructor() {
        this.initializeModal();
        ServerDetails.addStyles();
    }

    initializeModal() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('server-details-modal')) {
            const modalHtml = `
                <div id="server-details-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 class="modal-title">פרטי שרת</h2>
                            <button class="modal-close">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div class="modal-body"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Store modal elements
        this.modal = document.getElementById('server-details-modal');
        this.modalBody = this.modal.querySelector('.modal-body');
        this.modalTitle = this.modal.querySelector('.modal-title');

        // Add event listeners
        this.modal.querySelector('.modal-close').addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
    }

    show(server) {
        this.modalTitle.textContent = server.hostname || 'פרטי שרת';
        this.modalBody.innerHTML = this.createDetailsContent(server);
        this.modal.classList.add('fade-in');
    }

    hide() {
        this.modal.classList.remove('fade-in');
    }

    createDetailsContent(server) {
        return `
            <div class="server-details-content">
                ${this.createBasicInfoSection(server)}
                ${this.createLocationSection(server)}
                ${this.createHardwareSection(server)}
                ${this.createInternalDevicesSection(server)}
                ${this.createStorageSection(server)}
                ${this.createPowerSection(server)}
            </div>
        `;
    }

    createBasicInfoSection(server) {
        return `
            <div class="details-section">
                <h3>מידע בסיסי</h3>
                <div class="details-grid">
                    <div class="details-item">
                        <span class="details-label">כתובת IP</span>
                        <span class="details-value">${server.mgmt_ip || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">מספר סידורי</span>
                        <span class="details-value">${server.serial || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">דגם</span>
                        <span class="details-value">${server.model || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">יצרן</span>
                        <span class="details-value">${server.vendor || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    createLocationSection(server) {
        return `
            <div class="details-section">
                <h3>מיקום</h3>
                <div class="details-grid">
                    <div class="details-item">
                        <span class="details-label">חדר שרתים</span>
                        <span class="details-value">${server.location?.data_center || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">חדר</span>
                        <span class="details-value">${server.location?.room || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">מסד</span>
                        <span class="details-value">${server.location?.rack || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">מיקום במסד</span>
                        <span class="details-value">${server.location?.u || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    createHardwareSection(server) {
        return `
            <div class="details-section">
                <h3>חומרה</h3>
                <div class="details-grid">
                    <div class="details-item">
                        <span class="details-label">זיכרון</span>
                        <span class="details-value">${server.memory?.total || 'N/A'} GiB</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">מספר מעבדים</span>
                        <span class="details-value">${server.processors?.count || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">ליבות למעבד</span>
                        <span class="details-value">${server.processors?.cores_per_cpu || 'N/A'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">סה"כ ליבות</span>
                        <span class="details-value">${this.calculateTotalCores(server)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    createInternalDevicesSection(server) {
        if (!server.internal_devices?.length) return '';

        const devicesHtml = server.internal_devices
            .map(device => `
                <div class="details-item device-item">
                    <div class="device-info">
                        <span class="device-name">${device.name || 'N/A'}</span>
                        <span class="device-meta">${device.vendor || 'N/A'} | ${device.class || 'N/A'}</span>
                    </div>
                </div>
            `).join('');

        return `
            <div class="details-section">
                <h3>רכיבים פנימיים</h3>
                <div class="devices-grid">
                    ${devicesHtml}
                </div>
            </div>
        `;
    }

    createStorageSection(server) {
        if (!server.storage) return '';

        let storageHtml = '';

        // Handle Disks
        if (server.storage.disks) {
            storageHtml += `
                <div class="storage-section">
                    <h4>כונני דיסק</h4>
                    ${Object.entries(server.storage.disks)
                        .map(([controller, drives]) => `
                            <div class="storage-controller">
                                <h5>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 12H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                                        <line x1="6" y1="16" x2="6.01" y2="16"/>
                                        <line x1="10" y1="16" x2="10.01" y2="16"/>
                                    </svg>
                                    ${controller}
                                </h5>
                                <div class="drives-grid">
                                    ${Array.isArray(drives) ? drives.map(drive => `
                                        <div class="drive-item">
                                            <div class="drive-info">
                                                <span class="drive-model">${drive.model || 'N/A'}</span>
                                                <div class="drive-meta">
                                                    <span class="drive-id">${drive.id || 'N/A'}</span>
                                                    <span class="drive-capacity">${drive.capacity_gb || 'N/A'} GB</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('') : 'מידע לא תקין'}
                                </div>
                            </div>
                        `).join('')}
                </div>`;
        }

        // Handle PCIe devices
        if (server.storage.pcie) {
            storageHtml += `
                <div class="storage-section">
                    <h4>התקני PCIe</h4>
                    ${Object.entries(server.storage.pcie)
                        .map(([controller, devices]) => `
                            <div class="storage-controller">
                                <h5>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>
                                        <path d="M2 12h8"/>
                                        <path d="M2 16h6"/>
                                    </svg>
                                    ${controller}
                                </h5>
                                <div class="drives-grid">
                                    ${Array.isArray(devices) ? devices.map(device => `
                                        <div class="drive-item">
                                            <div class="drive-info">
                                                <span class="drive-model">${device.name || 'N/A'}</span>
                                                <div class="drive-meta">
                                                    <span class="drive-id">${device.class || 'N/A'}</span>
                                                    <span class="drive-capacity">${device.vendor || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('') : 'מידע לא תקין'}
                                </div>
                            </div>
                        `).join('')}
                </div>`;
        }

        return storageHtml ? `
            <div class="details-section">
                <h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <circle cx="12" cy="12" r="4"/>
                    </svg>
                    אחסון
                </h3>
                ${storageHtml}
            </div>
        ` : '';
    }

    createPowerSection(server) {
        if (!server.power) return '';

        return `
            <div class="details-section">
                <h3>צריכת חשמל וטמפרטורה</h3>
                <div class="metrics-grid">
                    <div class="metric-card power">
                        <div class="metric-header">
                            <h4>צריכת חשמל</h4>
                            <span class="metric-unit">W</span>
                        </div>
                        <div class="metric-values">
                            <div class="metric-item">
                                <span class="metric-label">מקסימום</span>
                                <span class="metric-value">${server.power?.max || 'N/A'}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">ממוצע</span>
                                <span class="metric-value">${server.power?.avg || 'N/A'}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">מינימום</span>
                                <span class="metric-value">${server.power?.min || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="metric-card temperature">
                        <div class="metric-header">
                            <h4>טמפרטורה</h4>
                            <span class="metric-unit">°C</span>
                        </div>
                        <div class="metric-values">
                            <div class="metric-item">
                                <span class="metric-label">מקסימום</span>
                                <span class="metric-value">${server.temperature?.max || 'N/A'}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">ממוצע</span>
                                <span class="metric-value">${server.temperature?.avg || 'N/A'}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">מינימום</span>
                                <span class="metric-value">${server.temperature?.min || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateTotalCores(server) {
        const cpuCount = server.processors?.count || 0;
        const coresPerCpu = server.processors?.cores_per_cpu || 0;
        return cpuCount * coresPerCpu || 'N/A';
    }

    static addStyles() {
        // Load external CSS file
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/static/css/features/dashboard/components/server-details.css';
        document.head.appendChild(link);
    }
} 