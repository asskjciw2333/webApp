export class PanelStatistics {
    constructor() {
        this.statsData = null;
        this.lastUpdate = null;
        this.charts = {};
        this.initializeTabHandlers();
    }

    initializeTabHandlers() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId);
                if (tabId === 'statistics' && !this.lastUpdate) {
                    this.updateStatisticsDisplay();
                }
            });
        });
    }

    switchTab(tabId) {
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });
    }

    async fetchStatistics() {
        try {
            const response = await fetch('get_panel_statistics', {
                method: "GET",
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.statsData = await response.json();
            this.lastUpdate = new Date();
            return this.statsData;
        } catch (error) {
            console.error('Error fetching statistics:', error);
            throw error;
        }
    }

    async updateStatisticsDisplay() {
        const stats = await this.fetchStatistics();
        this.renderStatistics(stats);
    }

    renderStatistics(stats) {
        const container = document.getElementById('statistics-tab');
        if (!container) return;

        container.innerHTML = `
            <div class="stats-section summary-section">
                <h3>סיכום כללי</h3>
                ${this.createSummaryStats(stats.summaryStats)}
            </div>
            <div class="stats-section">
                <h3>סטטיסטיקת חדרים</h3>
                <div class="chart-container">
                    <canvas id="roomsChart"></canvas>
                </div>
                ${this.createRoomStatistics(stats.roomStats)}
            </div>
            <div class="stats-section">
                <h3>סטטיסטיקת סוגי ממשק</h3>
                <div class="chart-container">
                    <canvas id="interfacesChart"></canvas>
                </div>
                ${this.createTypeStatistics(stats.typeStats)}
            </div>
            <div class="stats-section">
                <h3>סטטיסטיקת סיווגים</h3>
                <div class="chart-container">
                    <canvas id="classificationsChart"></canvas>
                </div>
                ${this.createClassificationStatistics(stats.classificationStats)}
            </div>
            <div class="stats-section">
                <h3>התפתחות לאורך זמן</h3>
                <div class="chart-container">
                    <canvas id="timelineChart"></canvas>
                </div>
            </div>
        `;

        // Initialize charts after DOM is ready
        this.initializeCharts(stats);
    }

    createSummaryStats(summary) {
        return `
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-title">פאנלים</div>
                    <div class="stat-main">${summary.totalPanels}</div>
                    <div class="stat-sub">פעילים: ${summary.activePanels}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">חדרים וארונות</div>
                    <div class="stat-main">${summary.totalRooms}</div>
                    <div class="stat-sub">ארונות: ${summary.totalRacks}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">פורטים</div>
                    <div class="stat-main">${summary.ports.total}</div>
                    <div class="stat-sub">פנויים: ${summary.ports.available} (${summary.ports.utilization}% בשימוש)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">סוגי ממשק</div>
                    <div class="stat-main">${summary.totalInterfaces}</div>
                    <div class="stat-sub">גודל ממוצע: ${summary.avgPanelSize ? Math.round(summary.avgPanelSize) : 'N/A'}</div>
                </div>
            </div>
        `;
    }

    createRoomStatistics(roomStats) {
        const sortedRooms = Object.entries(roomStats)
            .sort((a, b) => b[1].panelCount - a[1].panelCount);

        return `
            <div class="room-stats">
                <div class="chart-grid">
                    <div class="chart-container">
                        <h4 class="chart-title">ניצולת פורטים לפי חדר</h4>
                        <canvas id="roomPortsChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h4 class="chart-title">התפלגות סוגי ממשקים לפי חדר</h4>
                        <canvas id="roomInterfacesChart"></canvas>
                    </div>
                </div>
                <div class="table-container">
                    <h4 class="table-title">פירוט מלא לפי חדרים</h4>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>חדר</th>
                                <th>
                                    <div class="column-header">
                                        <span class="header-title">פאנלים</span>
                                        <span class="header-subtitle">סה"כ (פעילים)</span>
                                    </div>
                                </th>
                                <th>
                                    <div class="column-header">
                                        <span class="header-title">פורטים</span>
                                        <span class="header-subtitle">סה"כ (פנויים)</span>
                                    </div>
                                </th>
                                <th>
                                    <div class="column-header">
                                        <span class="header-title">ניצולת</span>
                                        <span class="header-subtitle">אחוז תפוסה</span>
                                    </div>
                                </th>
                                <th>
                                    <div class="column-header">
                                        <span class="header-title">ארונות</span>
                                        <span class="header-subtitle">כמות</span>
                                    </div>
                                </th>
                                <th>
                                    <div class="column-header">
                                        <span class="header-title">גדלים</span>
                                        <span class="header-subtitle">ממוצע (טווח)</span>
                                    </div>
                                </th>
                                <th>
                                    <div class="column-header">
                                        <span class="header-title">ממשקים</span>
                                        <span class="header-subtitle">MM / SM / RJ</span>
                                    </div>
                                </th>
                                <th>
                                    <div class="column-header">
                                        <span class="header-title">סיווגים</span>
                                        <span class="header-subtitle">סוגים</span>
                                    </div>
                                </th>
                                <th>
                                    <div class="column-header">
                                        <span class="header-title">יעדים</span>
                                        <span class="header-subtitle">כמות</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedRooms.map(([room, data]) => `
                                <tr>
                                    <td>${room}</td>
                                    <td>
                                        <div class="detail-cell">
                                            <span class="main-value">${data.panelCount}</span>
                                            <span class="sub-value">פעילים: ${data.activePanels}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="detail-cell">
                                            <span class="main-value">${data.totalPorts}</span>
                                            <span class="sub-value">פנויים: ${data.availablePorts}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="utilization-bar">
                                            <div class="utilization-fill" style="width: ${Math.min(data.portUtilization, 100)}%"></div>
                                            <span class="utilization-text">${data.portUtilization}%</span>
                                        </div>
                                    </td>
                                    <td>${data.rackCount}</td>
                                    <td>
                                        <div class="detail-cell">
                                            <span class="main-value">${data.avgSize ? Math.round(data.avgSize) : 'N/A'}</span>
                                            <span class="sub-value">${data.minSize || 'N/A'} - ${data.maxSize || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="interface-counts">
                                            ${data.mmCount ? `<span class="interface-tag mm">MM: ${data.mmCount}</span>` : ''}
                                            ${data.smCount ? `<span class="interface-tag sm">SM: ${data.smCount}</span>` : ''}
                                            ${data.rjCount ? `<span class="interface-tag rj">RJ: ${data.rjCount}</span>` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        <div class="classification-list">
                                            ${data.classifications.map(c => 
                                                `<span class="classification-tag ${c.toLowerCase()}">${c}</span>`
                                            ).join('')}
                                        </div>
                                    </td>
                                    <td>${data.destinationsCount}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    createTypeStatistics(typeStats) {
        return `
            <div class="type-stats">
                <h4 class="table-title">התפלגות סוגי ממשקים</h4>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>
                                <div class="column-header">
                                    <span class="header-title">סוג ממשק</span>
                                </div>
                            </th>
                            <th>
                                <div class="column-header">
                                    <span class="header-title">סה"כ</span>
                                    <span class="header-subtitle">כמות כוללת</span>
                                </div>
                            </th>
                            <th>
                                <div class="column-header">
                                    <span class="header-title">פעילים</span>
                                    <span class="header-subtitle">בשימוש</span>
                                </div>
                            </th>
                            <th>
                                <div class="column-header">
                                    <span class="header-title">סיווגים</span>
                                    <span class="header-subtitle">התפלגות לפי סיווג</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(typeStats).map(([type, data]) => `
                            <tr>
                                <td>${type || 'לא מוגדר'}</td>
                                <td>${data.total}</td>
                                <td>${data.active}</td>
                                <td>${Object.entries(data.classifications)
                                    .map(([cls, count]) => `${cls}: ${count}`)
                                    .join(', ') || 'אין'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    createClassificationStatistics(classStats) {
        return `
            <div class="classification-stats">
                <h4 class="table-title">התפלגות לפי סיווג</h4>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>
                                <div class="column-header">
                                    <span class="header-title">סיווג</span>
                                </div>
                            </th>
                            <th>
                                <div class="column-header">
                                    <span class="header-title">פאנלים</span>
                                    <span class="header-subtitle">כמות כוללת</span>
                                </div>
                            </th>
                            <th>
                                <div class="column-header">
                                    <span class="header-title">פעילים</span>
                                    <span class="header-subtitle">בשימוש</span>
                                </div>
                            </th>
                            <th>
                                <div class="column-header">
                                    <span class="header-title">חדרים</span>
                                    <span class="header-subtitle">מספר חדרים</span>
                                </div>
                            </th>
                            <th>
                                <div class="column-header">
                                    <span class="header-title">ארונות</span>
                                    <span class="header-subtitle">מספר ארונות</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(classStats).map(([classification, data]) => `
                            <tr>
                                <td>${classification || 'לא מוגדר'}</td>
                                <td>${data.count}</td>
                                <td>${data.activeCount}</td>
                                <td>${data.roomCount}</td>
                                <td>${data.rackCount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    initializeCharts(stats) {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};

        // Rooms chart
        const roomsCtx = document.getElementById('roomsChart').getContext('2d');
        this.charts.rooms = new Chart(roomsCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.roomStats),
                datasets: [{
                    label: 'סה"כ פאנלים',
                    data: Object.values(stats.roomStats).map(d => d.panelCount),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }, {
                    label: 'פאנלים פעילים',
                    data: Object.values(stats.roomStats).map(d => d.activePanels),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Interfaces chart
        const interfacesCtx = document.getElementById('interfacesChart').getContext('2d');
        this.charts.interfaces = new Chart(interfacesCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(stats.typeStats),
                datasets: [{
                    data: Object.values(stats.typeStats).map(d => d.total),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Classifications chart
        const classCtx = document.getElementById('classificationsChart').getContext('2d');
        this.charts.classifications = new Chart(classCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.classificationStats),
                datasets: [{
                    data: Object.values(stats.classificationStats).map(d => d.count),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Timeline chart
        const timeCtx = document.getElementById('timelineChart').getContext('2d');
        const timeLabels = Object.keys(stats.timeStats).reverse();
        const timeData = Object.values(stats.timeStats).reverse();
        
        this.charts.timeline = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'פאנלים חדשים',
                    data: timeData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1,
                    fill: true,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Room ports utilization chart
        const roomPortsCtx = document.getElementById('roomPortsChart').getContext('2d');
        this.charts.roomPorts = new Chart(roomPortsCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.roomStats),
                datasets: [{
                    label: 'פורטים בשימוש',
                    data: Object.values(stats.roomStats).map(d => d.usedPorts),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }, {
                    label: 'פורטים פנויים',
                    data: Object.values(stats.roomStats).map(d => d.availablePorts),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    }
                }
            }
        });

        // Room interfaces distribution chart
        const roomInterfacesCtx = document.getElementById('roomInterfacesChart').getContext('2d');
        this.charts.roomInterfaces = new Chart(roomInterfacesCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.roomStats),
                datasets: [{
                    label: 'MM',
                    data: Object.values(stats.roomStats).map(d => d.mmCount),
                    backgroundColor: 'rgba(255, 206, 86, 0.5)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                }, {
                    label: 'SM',
                    data: Object.values(stats.roomStats).map(d => d.smCount),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }, {
                    label: 'RJ',
                    data: Object.values(stats.roomStats).map(d => d.rjCount),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    }
                }
            }
        });
    }
} 