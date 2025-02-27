export default class RackView {
    constructor(container) {
        this.container = container;
        this.servers = [];
        this.UNITS_PER_RACK = 42; // סטנדרט של גובה ארון שרתים
        this.initializeModal();
    }

    show(servers) {
        this.servers = servers;
        this.container.classList.remove('hidden');
        this.render();
    }

    hide() {
        this.container.classList.add('hidden');
    }

    render() {
        const rackGroups = this.groupServersByRack();
        
        this.container.innerHTML = `
            <div class="legend-toggle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                </svg>
            </div>
            <div class="rack-view-controls">
                <div class="color-scales">
                    <div class="scale-container temperature">
                        <span class="scale-title">טמפרטורה</span>
                        <div class="scale-items">
                            ${this.renderTemperatureScale()}
                        </div>
                    </div>
                    <div class="scale-container power">
                        <span class="scale-title">צריכת חשמל</span>
                        <div class="scale-items">
                            ${this.renderPowerScale()}
                        </div>
                    </div>
                </div>
            </div>
            <div class="rack-view-container">
                ${Object.entries(rackGroups).map(([rackId, rackData]) => this.renderRack(rackId, rackData)).join('')}
            </div>
        `;

        this.setupEventListeners();
    }

    renderTemperatureScale() {
        const scaleItems = [
            { value: '>75°', color: 'var(--temp-critical)' },
            { value: '60-75°', color: 'var(--temp-high)' },
            { value: '45-60°', color: 'var(--temp-medium)' },
            { value: '30-45°', color: 'var(--temp-low)' },
            { value: '<30°', color: 'var(--temp-minimal)' }
        ];

        return this.renderScaleItems(scaleItems);
    }

    renderPowerScale() {
        const scaleItems = [
            { value: '>90%', color: 'var(--power-critical)' },
            { value: '70-90%', color: 'var(--power-high)' },
            { value: '50-70%', color: 'var(--power-medium)' },
            { value: '30-50%', color: 'var(--power-low)' },
            { value: '<30%', color: 'var(--power-minimal)' }
        ];

        return this.renderScaleItems(scaleItems);
    }

    renderScaleItems(items) {
        return items.map(item => `
            <div class="scale-item">
                <div class="color-box" style="background-color: ${item.color}"></div>
                <span class="scale-label">${item.value}</span>
            </div>
        `).join('');
    }

    groupServersByRack() {
        const racks = {};
        this.servers.forEach(server => {
            if (!server.location) return;
            
            // Create a unique rack identifier that includes room and row
            const rackId = this.createUniqueRackId(server.location);
            if (!racks[rackId]) {
                racks[rackId] = {
                    servers: [],
                    location: {
                        dataCenter: server.location.data_center || 'Unknown',
                        room: server.location.room || 'Unknown',
                        row: server.location.row || 'Unknown',
                        rack: server.location.rack || 'Unknown'
                    }
                };
            }
            racks[rackId].servers.push(server);
        });
        return racks;
    }

    createUniqueRackId(location) {
        // Create a unique identifier combining room, row, and rack
        return `${location.room || 'Unknown'}_${location.row || 'Unknown'}_${location.rack || 'Unknown'}`;
    }

    renderRack(rackId, rackData) {
        const { servers, location } = rackData;
        console.log('Rendering rack with servers:', servers);
        
        const rackUnits = new Array(this.UNITS_PER_RACK).fill(null);
        
        // Sort servers by U position to handle conflicts
        const sortedServers = [...servers].sort((a, b) => {
            return parseInt(b.location?.u || 0) - parseInt(a.location?.u || 0);
        });
        
        // Validate and assign server positions
        sortedServers.forEach(server => {
            const position = parseInt(server.location?.u) || 0;
            const size = parseInt(server.size) || 1;
            
            // Validate position and size
            if (position <= 0 || position > this.UNITS_PER_RACK || 
                size <= 0 || position + size - 1 > this.UNITS_PER_RACK) {
                console.warn(`Invalid server position/size for ${server.hostname}: U${position}, Size: ${size}`);
                return;
            }
            
            // Check for conflicts
            let hasConflict = false;
            const startIndex = this.UNITS_PER_RACK - (position + size - 1);
            for (let i = 0; i < size; i++) {
                if (rackUnits[startIndex + i] !== null) {
                    hasConflict = true;
                    console.warn(`Position conflict at U${position + i} for server ${server.hostname}`);
                    break;
                }
            }
            
            // Only place server if no conflicts
            if (!hasConflict) {
                for (let i = 0; i < size; i++) {
                    rackUnits[startIndex + i] = server;
                }
            }
        });

        return `
            <div class="rack-cabinet" data-rack-id="${rackId}">
                <div class="rack-header">
                    <h3>ארון ${location.rack}</h3>
                    <div class="rack-location">
                        <span class="room">חדר: ${location.room}</span>
                        <span class="row">שורה: ${location.row}</span>
                    </div>
                    <div class="rack-stats">
                        <span class="power-stat">צריכת חשמל: ${this.calculateTotalPower(servers)}W</span>
                        <span class="temp-stat">טמפ׳ ממוצעת: ${this.calculateAverageTemp(servers)}°C</span>
                    </div>
                </div>
                <div class="rack-frame">
                    <div class="rack-numbers">
                        ${this.renderUnitNumbers()}
                    </div>
                    <div class="rack-units">
                        ${this.renderRackUnits(rackUnits)}
                    </div>
                </div>
            </div>
        `;
    }

    renderRackUnits(rackUnits) {
        return rackUnits.map((server, index) => {
            if (!server) {
                return `<div class="rack-unit empty" data-unit="${this.UNITS_PER_RACK - index}"></div>`;
            }
            
            const statusClass = this.getStatusClass(server);
            const tempClass = this.getTemperatureClass(server);
            const powerClass = this.getPowerClass(server);
            const size = server.size || 1;
            
            return `
                <div class="rack-unit server ${statusClass}" 
                     data-server-id="${server.id}"
                     data-unit="${this.UNITS_PER_RACK - index}">
                    <div class="server-split-view">
                        <div class="server-side temperature ${tempClass}">
                            <span class="metric-value">${server.temperature?.avg || 'N/A'}°C</span>
                        </div>
                        <div class="server-model">${server.Model ? this.formatModelName(server.Model) : ''}</div>
                        <div class="server-side power ${powerClass}">
                            <span class="metric-value">${server.power?.avg || 'N/A'}W</span>
                        </div>
                    </div>
                    <div class="server-tooltip">
                        <div class="tooltip-header">
                            <span class="server-name">${server.hostname || server.HostName}</span>
                            <span class="server-unit-number">U${server.location?.u}</span>
                        </div>
                        <div class="tooltip-content">
                            <div class="tooltip-section">
                                <div class="section-title">מפרט</div>
                                <div class="spec-item">
                                    <span class="spec-label">דגם:</span>
                                    <span class="spec-value">${server.Model || 'N/A'}</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label">מעבדים:</span>
                                    <span class="spec-value">${server.Processors?.CPUCount || 'N/A'} x ${server.Processors?.CorePerCPU || 'N/A'} Cores</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label">זיכרון:</span>
                                    <span class="spec-value">${server.TotalSystemMemoryGiB || 'N/A'} GB</span>
                                </div>
                            </div>
                            <div class="tooltip-section">
                                <div class="section-title">ניטור</div>
                                <div class="metric-item">
                                    <span class="metric-label">צריכת חשמל:</span>
                                    <span class="metric-value">${this.formatPowerMetrics(server.power)}</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-label">טמפרטורה:</span>
                                    <span class="metric-value">${this.formatTempMetrics(server.temperature)}</span>
                                </div>
                            </div>
                            <div class="tooltip-section">
                                <div class="section-title">רשת</div>
                                <div class="network-item">
                                    <span class="network-label">רשת:</span>
                                    <span class="network-value">${server.Network || 'N/A'}</span>
                                </div>
                                <div class="network-item">
                                    <span class="network-label">ILO:</span>
                                    <span class="network-value">${server.ILO_IP || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatModelName(model) {
        // מקצר את שם הדגם לתצוגה קומפקטית
        return model.replace(/ProLiant |Server |Generation /gi, '')
                   .replace(/Gen(\d+)/i, 'G$1')
                   .trim();
    }

    formatPowerMetrics(power) {
        if (!power) return 'N/A';
        return `${power.avg}W (${power.min}W - ${power.max}W)`;
    }

    formatTempMetrics(temp) {
        if (!temp) return 'N/A';
        return `${temp.avg}°C (${temp.min}°C - ${temp.max}°C)`;
    }

    renderUnitNumbers() {
        return Array.from({length: this.UNITS_PER_RACK}, (_, i) => 
            `<div class="unit-number">${this.UNITS_PER_RACK - i}</div>`
        ).join('');
    }

    renderStatusIndicators(server) {
        const powerStatus = this.getPowerStatus(server);
        const tempStatus = this.getTemperatureStatus(server);
        const networkStatus = this.getNetworkStatus(server);

        return `
            <div class="status-indicator power ${powerStatus}" title="צריכת חשמל: ${server.power?.avg || 'N/A'}W"></div>
            <div class="status-indicator temp ${tempStatus}" title="טמפרטורה: ${server.temperature?.avg || 'N/A'}°C"></div>
            <div class="status-indicator network ${networkStatus}" title="סטטוס רשת"></div>
        `;
    }

    getPowerStatus(server) {
        const power = server.power?.avg || 0;
        if (power === 0) return 'critical';
        if (power > (server.power?.max || 0) * 0.9) return 'warning';
        return 'normal';
    }

    getTemperatureStatus(server) {
        const temp = server.temperature?.avg || 0;
        if (temp >= 75) return 'critical';
        if (temp >= 60) return 'warning';
        return 'normal';
    }

    getNetworkStatus(server) {
        return server.network_status || 'normal';
    }

    getStatusClass(server) {
        if (!server.power?.avg || server.power.avg === 0) return 'status-offline';
        if (this.getTemperatureStatus(server) === 'critical' || 
            this.getPowerStatus(server) === 'critical') return 'status-warning';
        return 'status-online';
    }

    getTemperatureClass(server) {
        const temp = server.temperature?.avg || 0;
        if (temp >= 75) return 'temp-critical';
        if (temp >= 60) return 'temp-high';
        if (temp >= 45) return 'temp-medium';
        if (temp >= 30) return 'temp-low';
        return 'temp-minimal';
    }

    getPowerClass(server) {
        const power = server.power?.avg || 0;
        const maxPower = server.power?.max || power;
        const percentage = (power / maxPower) * 100;
        
        if (percentage >= 90) return 'power-critical';
        if (percentage >= 70) return 'power-high';
        if (percentage >= 50) return 'power-medium';
        if (percentage >= 30) return 'power-low';
        return 'power-minimal';
    }

    calculateTotalPower(servers) {
        return servers.reduce((total, server) => total + (server.power?.avg || 0), 0).toFixed(0);
    }

    calculateAverageTemp(servers) {
        const temps = servers.filter(s => s.temperature?.avg).map(s => s.temperature.avg);
        if (temps.length === 0) return 'N/A';
        const avg = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
        return avg.toFixed(1);
    }

    initializeModal() {
        // Add modal HTML to the document body
        const modalTemplate = `
            <div id="rack-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">פרטי ארון</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="rack-modal-content"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalTemplate);
        
        // Setup modal close button
        const modal = document.getElementById('rack-modal');
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeModal());
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    openModal(rackId, servers) {
        const modal = document.getElementById('rack-modal');
        const modalContent = document.getElementById('rack-modal-content');
        
        if (!modal || !modalContent) {
            console.error('Modal elements not found');
            return;
        }

        // Get location info from the first server in rack
        const referenceServer = servers[0];
        if (!referenceServer?.location) {
            console.error('No valid server location found');
            return;
        }

        // Update modal content with detailed rack view
        modalContent.innerHTML = this.renderDetailedRackView(rackId, servers);
        
        // Show modal with animation
        modal.style.display = 'flex';
        modal.classList.add('fade-in');
        modal.classList.remove('fade-out');
    }

    closeModal() {
        const modal = document.getElementById('rack-modal');
        if (!modal) return;
        
        modal.classList.remove('fade-in');
        modal.classList.add('fade-out');
        
        // Hide modal after animation
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }

    renderDetailedRackView(rackId, servers) {
        if (!servers || servers.length === 0) return '';

        const referenceServer = servers[0];
        const location = referenceServer.location;
        
        const totalPower = this.calculateTotalPower(servers);
        const avgTemp = this.calculateAverageTemp(servers);
        
        const locationDetails = `
            <div class="metric">
                <span class="metric-label">מרכז נתונים:</span>
                <span class="metric-value">${location.data_center || 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">חדר:</span>
                <span class="metric-value">${location.room || 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">שורה:</span>
                <span class="metric-value">${location.row || 'N/A'}</span>
            </div>
        `;
        
        return `
            <div class="detailed-rack-view">
                <div class="rack-summary">
                    <h3>סיכום ארון ${location.rack}</h3>
                    <div class="rack-metrics">
                        ${locationDetails}
                        <div class="metric">
                            <span class="metric-label">מספר שרתים:</span>
                            <span class="metric-value">${servers.length}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">סה"כ צריכת חשמל:</span>
                            <span class="metric-value">${totalPower}W</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">טמפרטורה ממוצעת:</span>
                            <span class="metric-value">${avgTemp}°C</span>
                        </div>
                    </div>
                </div>
                <div class="detailed-rack-frame">
                    ${this.renderRack(rackId, { servers, location })}
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const serverUnits = this.container.querySelectorAll('.rack-unit.server');
        serverUnits.forEach(unit => {
            unit.addEventListener('click', () => {
                const serverId = unit.dataset.serverId;
                const server = this.servers.find(s => s.id === serverId);
                if (server) {
                    this.onServerSelect?.(server);
                }
            });
        });

        // Add legend toggle functionality
        const legendToggle = this.container.querySelector('.legend-toggle');
        const controls = this.container.querySelector('.rack-view-controls');
        
        if (legendToggle && controls) {
            legendToggle.addEventListener('mouseenter', () => {
                controls.classList.add('visible');
                legendToggle.classList.add('active');
            });

            controls.addEventListener('mouseenter', () => {
                controls.classList.add('visible');
                legendToggle.classList.add('active');
            });

            controls.addEventListener('mouseleave', () => {
                controls.classList.remove('visible');
                legendToggle.classList.remove('active');
            });

            legendToggle.addEventListener('mouseleave', (e) => {
                // Check if we're not moving to the controls
                const rect = controls.getBoundingClientRect();
                if (!(e.clientX >= rect.left && e.clientX <= rect.right && 
                    e.clientY >= rect.top && e.clientY <= rect.bottom)) {
                    controls.classList.remove('visible');
                    legendToggle.classList.remove('active');
                }
            });
        }

        // Add click event listeners for rack cabinets
        const rackCabinets = this.container.querySelectorAll('.rack-cabinet');
        rackCabinets.forEach(rack => {
            rack.addEventListener('click', (e) => {
                // Don't open modal if clicking on a server
                if (!e.target.closest('.rack-unit')) {
                    const rackId = rack.dataset.rackId;
                    const [room, row, rackNum] = rackId.split('_');
                    
                    // Filter servers that belong to this specific rack location
                    const serversInRack = this.servers.filter(server => 
                        server.location &&
                        server.location.room === room &&
                        server.location.row === row &&
                        server.location.rack === rackNum
                    );
                    
                    if (serversInRack.length > 0) {
                        this.openModal(rackId, serversInRack);
                    }
                }
            });
        });
    }
} 