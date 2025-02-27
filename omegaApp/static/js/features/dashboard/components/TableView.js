export default class TableView {
    constructor(container) {
        this.container = container;
        this.selectedServers = new Set();
        this.isLoading = false;
        this.lastServers = null;
        this.onUpdateDCIM = null;
    }

    show(servers) {
        this.lastServers = servers;
        this.container.classList.remove('hidden');
        this.render(servers);
    }

    hide() {
        this.container.classList.add('hidden');
    }

    render(servers) {
        this.container.innerHTML = `
            <div class="table-wrapper">
                <table class="servers-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="selectAllServers" ${this.isLoading ? 'disabled' : ''}></th>
                            <th>שם שרת</th>
                            <th>IP</th>
                            <th>יצרן</th>
                            <th>דגם</th>
                            <th>מיקום</th>
                            <th>זיכרון</th>
                            <th>מעבדים</th>
                            <th>צריכת חשמל</th>
                            <th>סטטוס DCIM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${servers.map(server => this.renderServerRow(server)).join('')}
                    </tbody>
                </table>
                ${this.isLoading ? '<div class="loading-overlay"><div class="spinner"></div></div>' : ''}
            </div>
            <div class="floating-action-buttons ${this.selectedServers.size === 0 ? 'single-button' : ''}">
                <button class="btn-refresh-dcim">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                    </svg>
                    רענן סטטוס DCIM
                </button>
                <div class="floating-action-button ${this.selectedServers.size === 0 ? 'hidden' : ''}" id="updateDcimBtn">
                    <span class="selected-count">${this.selectedServers.size} נבחרו</span>
                    <button class="btn-update">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                        </svg>
                        עדכן DCIM
                    </button>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    renderServerRow(server) {
        return `
            <tr data-mgmt-ip="${server.mgmt_ip}" class="${this.isLoading ? 'loading' : ''}">
                <td>
                    <input type="checkbox" class="server-select" 
                           data-mgmt-ip="${server.mgmt_ip}"
                           ${this.selectedServers.has(server.mgmt_ip) ? 'checked' : ''}
                           ${this.isLoading ? 'disabled' : ''}>
                </td>
                <td>${server.hostname || 'N/A'}</td>
                <td>${server.mgmt_ip || 'N/A'}</td>
                <td>${server.vendor || 'N/A'}</td>
                <td>${server.model || 'N/A'}</td>
                <td>${server.location?.data_center || 'N/A'}</td>
                <td>
                    <div class="specs-cell">
                        <span class="specs-primary">${server.memory?.total || 'N/A'} GB</span>
                    </div>
                </td>
                <td>
                    <div class="specs-cell">
                        <span class="specs-primary">${server.processors?.count || 'N/A'} CPU</span>
                        <span class="specs-secondary">${server.processors?.total_cores || 'N/A'} ליבות</span>
                    </div>
                </td>
                <td>
                    <div class="power-cell">
                        <span class="power-value">${server.power?.avg || 'N/A'}W</span>
                        <span class="power-range">${server.power?.min || 'N/A'}-${server.power?.max || 'N/A'}W</span>
                    </div>
                </td>
                <td>
                    ${this.renderDCIMStatus(server)}
                </td>
            </tr>
            ${this.renderDifferencesRow(server)}
        `;
    }

    renderDCIMStatus(server) {
        const statusClasses = {
            'not_found': 'dcim-not-found',
            'found_with_differences': 'dcim-differences',
            'found_match': 'dcim-match',
            'error': 'dcim-error'
        };

        const statusText = {
            'not_found': 'לא נמצא',
            'found_with_differences': 'נמצאו פערים',
            'found_match': 'תואם',
            'error': 'שגיאה'
        };

        const status = server.dcim_status || 'not_found';
        const statusClass = statusClasses[status] || '';
        const text = statusText[status] || status;

        return `
            <div class="dcim-status ${statusClass} ${this.isLoading ? 'loading' : ''}">
                <span class="status-text">${text}</span>
                ${status === 'found_with_differences' && !this.isLoading && server.dcim_differences?.length > 0 ? 
                    '<button class="btn-show-differences">הצג פערים</button>' : 
                    ''}
            </div>
        `;
    }

    renderDifferencesRow(server) {
        if (!server.dcim_differences?.length) return '';

        const differences = server.dcim_differences.map(diff => `
            <div class="difference-item">
                <span class="difference-field">${diff.field}:</span>
                <span class="server-value">${diff.server_value}</span>
                <span class="separator">→</span>
                <span class="dcim-value">${diff.dcim_value}</span>
            </div>
        `).join('');

        return `
            <tr class="differences-row hidden" data-mgmt-ip="${server.mgmt_ip}">
                <td colspan="10">
                    <div class="differences-container">
                        <h4>פערים מול DCIM:</h4>
                        ${differences}
                    </div>
                </td>
            </tr>
        `;
    }

    setupEventListeners() {
        // Select all checkbox
        const selectAllCheckbox = this.container.querySelector('#selectAllServers');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = Array.from(this.container.querySelectorAll('.server-select'));
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                    const mgmtIp = checkbox.dataset.mgmtIp;
                    if (e.target.checked) {
                        this.selectedServers.add(mgmtIp);
                    } else {
                        this.selectedServers.delete(mgmtIp);
                    }
                });

                // עדכון הכפתור הצף
                const updateButton = this.container.querySelector('.floating-action-button');
                if (updateButton) {
                    if (this.selectedServers.size > 0) {
                        updateButton.classList.remove('hidden');
                        const countElement = updateButton.querySelector('.selected-count');
                        if (countElement) {
                            countElement.textContent = `${this.selectedServers.size} נבחרו`;
                        }
                    } else {
                        updateButton.classList.add('hidden');
                    }
                }
            });
        }

        // Individual server checkboxes
        const serverCheckboxes = this.container.querySelectorAll('.server-select');
        serverCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const mgmtIp = e.target.dataset.mgmtIp;
                this.toggleServerSelection(mgmtIp, e.target.checked);
            });
        });

        // Show differences buttons
        const diffButtons = this.container.querySelectorAll('.btn-show-differences');
        diffButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                const mgmtIp = row.dataset.mgmtIp;
                const diffRow = this.container.querySelector(`.differences-row[data-mgmt-ip="${mgmtIp}"]`);
                diffRow?.classList.toggle('hidden');
            });
        });

        // Update DCIM floating button
        const updateButton = this.container.querySelector('.floating-action-button');
        updateButton?.addEventListener('click', () => {
            if (!this.isLoading && this.selectedServers.size > 0) {
                this.updateDCIM(this.getSelectedUpdates());
            }
        });

        // Add refresh DCIM status button handler
        const refreshButton = this.container.querySelector('.btn-refresh-dcim');
        refreshButton?.addEventListener('click', async () => {
            if (!this.isLoading) {
                try {
                    this.setLoading(true);
                    // Call the analyze endpoint for all servers
                    await this.onUpdateDCIM({ analyze_all: true });
                } finally {
                    this.setLoading(false);
                }
            }
        });
    }

    toggleServerSelection(mgmtIp, selected) {
        if (selected) {
            this.selectedServers.add(mgmtIp);
        } else {
            this.selectedServers.delete(mgmtIp);
        }
        
        // עדכון הצגת הכפתור הצף
        const updateButton = this.container.querySelector('.floating-action-button');
        if (updateButton) {
            if (this.selectedServers.size > 0) {
                updateButton.classList.remove('hidden');
                const countElement = updateButton.querySelector('.selected-count');
                if (countElement) {
                    countElement.textContent = `${this.selectedServers.size} נבחרו`;
                }
            } else {
                updateButton.classList.add('hidden');
            }
        }

        // עדכון מצב ה-select all checkbox
        const selectAllCheckbox = this.container.querySelector('#selectAllServers');
        if (selectAllCheckbox) {
            const allCheckboxes = this.container.querySelectorAll('.server-select');
            const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
        }
    }

    getSelectedUpdates() {
        const selectedServersArray = Array.from(this.selectedServers);
        console.log('Selected Servers:', selectedServersArray);
        
        if (selectedServersArray.length === 0) {
            throw new Error('לא נבחרו שרתים לעדכון');
        }

        const updates = {
            updates: {}
        };
        
        let serversWithDifferences = 0;
        let serversWithoutDifferences = 0;
        
        selectedServersArray.forEach(mgmtIp => {
            const server = this.lastServers.find(s => s.mgmt_ip === mgmtIp);
            if (server) {
                if (server.dcim_differences?.length > 0) {
                    updates.updates[mgmtIp] = server.dcim_differences.map(diff => diff.field);
                    serversWithDifferences++;
                } else {
                    // Include server even if it has no differences
                    updates.updates[mgmtIp] = [];
                    serversWithoutDifferences++;
                }
            }
        });
        
        // Add metadata about the update
        updates.metadata = {
            totalServers: selectedServersArray.length,
            serversWithDifferences,
            serversWithoutDifferences
        };
        
        console.log('Final updates object:', updates);
        return updates;
    }

    setUpdateDCIMHandler(handler) {
        this.onUpdateDCIM = handler;
    }

    renderPowerTrend(trend) {
        if (!trend) return '';
        const trendClass = trend > 0 ? 'trend-up' : 'trend-down';
        const trendSymbol = trend > 0 ? '↑' : '↓';
        return `<span class="power-trend ${trendClass}">${trendSymbol} ${Math.abs(trend)}%</span>`;
    }

    async updateDCIM(updates) {
        try {
            this.setLoading(true);
            
            // Get update statistics
            const stats = updates.metadata;
            if (stats.serversWithDifferences === 0) {
                showNotification('info', 'לא נמצאו פערים לעדכון בשרתים שנבחרו');
                return;
            }
            
            // Show initial notification
            if (stats.serversWithoutDifferences > 0) {
                showNotification('info', `נשלח עדכון ל-${stats.serversWithDifferences} שרתים עם פערים. ${stats.serversWithoutDifferences} שרתים ללא פערים.`);
            } else {
                showNotification('info', `נשלח עדכון ל-${stats.serversWithDifferences} שרתים.`);
            }
            
            await this.onUpdateDCIM?.(updates);
        } catch (error) {
            showNotification('error', error.message);
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.render(this.lastServers || []);
    }
} 