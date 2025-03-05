import { ChartContainer } from '../charts/components/ChartContainer.js';
import { DataValidator } from '../charts/data/DataValidator.js';
import { ColorSchemes } from '../charts/config/ColorSchemes.js';
import { 
    getStorageTypesDistribution,
    getStorageCapacityDistribution,
    getCoresDistribution,
    getTemperatureDistribution,
    getNetworkAnalysis,
    getPowerByServer,
    getPowerDistribution
} from '../utils/DataAnalytics.js';

export default class AdvancedAnalytics {
    constructor(container) {
        this.container = container;
        this.charts = {};
        this.lastServers = [];
        this.createLayout();
        this.initializeCharts();
        this.setupEventListeners();
    }

    createLayout() {
        this.container.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>סה"כ נפח אחסון</h3>
                    <div class="summary-value" id="totalStorage">0 TB</div>
                </div>
                <div class="summary-card">
                    <h3>ממוצע אחסון לשרת</h3>
                    <div class="summary-value" id="avgStorage">0 TB</div>
                </div>
                <div class="summary-card">
                    <h3>סה"כ ליבות</h3>
                    <div class="summary-value" id="totalCores">0</div>
                </div>
                <div class="summary-card">
                    <h3>טמפרטורה ממוצעת</h3>
                    <div class="summary-value" id="avgTemp">0°C</div>
                </div>
                <div class="summary-card">
                    <h3>צריכת חשמל ממוצעת</h3>
                    <div class="summary-value" id="avgPower">0W</div>
                </div>
                <div class="summary-card">
                    <h3>צריכת חשמל מקסימלית</h3>
                    <div class="summary-value" id="maxPower">0W</div>
                </div>
            </div>
            <div class="charts-grid">
                <div id="storageTypeChart" class="chart-container">
                    <div class="chart-header">
                        <h3>ניתוח סוגי אחסון</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
                <div id="storageCapacityChart" class="chart-container">
                    <div class="chart-header">
                        <h3>ניתוח קיבולת אחסון לפי שרת</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
                <div id="cpuChart" class="chart-container">
                    <div class="chart-header">
                        <h3>מספר ליבות לשרת</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
                <div id="tempChart" class="chart-container">
                    <div class="chart-header">
                        <h3>ניתוח טמפרטורה</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
                <div id="networkVendorChart" class="chart-container">
                    <div class="chart-header">
                        <h3>ניתוח כרטיסי רשת</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
                <div id="networkSpeedChart" class="chart-container">
                    <div class="chart-header">
                        <h3>ניתוח מהירויות רשת</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
                <div id="powerByServerChart" class="chart-container">
                    <div class="chart-header">
                        <h3>צריכת חשמל לפי שרת</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
            </div>
        `;
    }

    initializeCharts() {
        try {
            // Initialize storage type analysis chart
            this.charts.storageType = new ChartContainer('storageTypeChart', {
                title: 'ניתוח סוגי אחסון',
                metric: 'storage_type',
                allowedTypes: ['bar', 'doughnut'],
                defaultType: 'bar',
                dataTransformer: getStorageTypesDistribution,
                options: {
                    scales: {
                        x: {
                            stacked: true
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.raw} יחידות`;
                                }
                            }
                        }
                    }
                },
                onTypeChange: () => this.updateCharts(this.lastServers),
                onError: (error) => this.showError(error)
            });

            // Initialize storage capacity analysis chart
            this.charts.storageCapacity = new ChartContainer('storageCapacityChart', {
                title: 'ניתוח קיבולת אחסון לפי שרת',
                metric: 'storage_capacity',
                allowedTypes: ['bar', 'pie', 'doughnut'],
                defaultType: 'bar',
                dataTransformer: getStorageCapacityDistribution,
                options: {
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.raw} שרתים בטווח ${context.label}`;
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'התפלגות שרתים לפי נפח אחסון כולל',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'מספר שרתים',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                drawBorder: false,
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'טווח קיבולת',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    animation: {
                        duration: 500,
                        easing: 'easeInOutQuart'
                    },
                    responsive: true,
                    maintainAspectRatio: false
                },
                onTypeChange: () => this.updateCharts(this.lastServers),
                onError: (error) => this.showError(error)
            });

            // Initialize CPU analysis chart
            this.charts.cpu = new ChartContainer('cpuChart', {
                title: 'מספר ליבות לשרת',
                metric: 'cpu',
                allowedTypes: ['bar', 'line'],
                defaultType: 'bar',
                dataTransformer: getCoresDistribution,
                onTypeChange: () => this.updateCharts(this.lastServers),
                onError: (error) => this.showError(error)
            });

            // Initialize temperature analysis chart
            this.charts.temp = new ChartContainer('tempChart', {
                title: 'ניתוח טמפרטורה',
                metric: 'temperature',
                allowedTypes: ['line', 'bar'],
                defaultType: 'line',
                dataTransformer: getTemperatureDistribution,
                onTypeChange: () => this.updateCharts(this.lastServers),
                onError: (error) => this.showError(error)
            });

            // Initialize network vendor analysis chart
            this.charts.networkVendor = new ChartContainer('networkVendorChart', {
                title: 'ניתוח כרטיסי רשת',
                metric: 'network_vendor',
                allowedTypes: ['doughnut', 'pie', 'bar'],
                defaultType: 'doughnut',
                dataTransformer: (servers) => getNetworkAnalysis(servers).cards,
                onTypeChange: () => this.updateCharts(this.lastServers),
                onError: (error) => this.showError(error)
            });

            // Initialize network speed analysis chart
            this.charts.networkSpeed = new ChartContainer('networkSpeedChart', {
                title: 'ניתוח מהירויות רשת',
                metric: 'network_speed',
                allowedTypes: ['bar', 'line'],
                defaultType: 'bar',
                dataTransformer: (servers) => getNetworkAnalysis(servers).speeds,
                onTypeChange: () => this.updateCharts(this.lastServers),
                onError: (error) => this.showError(error)
            });

            // Initialize power by server chart
            this.charts.powerByServer = new ChartContainer('powerByServerChart', {
                title: 'צריכת חשמל לפי שרת',
                metric: 'power_by_server',
                allowedTypes: ['bar', 'line'],
                defaultType: 'bar',
                dataTransformer: getPowerByServer,
                onTypeChange: () => this.updateCharts(this.lastServers),
                onError: (error) => this.showError(error)
            });
        } catch (error) {
            this.showError('שגיאה באתחול התרשימים');
            console.error('Error initializing charts:', error);
        }
    }

    setupEventListeners() {
        // Add any additional event listeners here if needed
        window.addEventListener('resize', () => this.resize());
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        this.container.insertBefore(errorDiv, this.container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    update(servers) {
        if (!servers || !Array.isArray(servers)) {
            this.showError('לא נמצאו נתונים להצגה');
            return;
        }

        this.lastServers = servers;
        this.updateSummaryCards(servers);
        this.updateCharts(servers);
    }

    updateSummaryCards(servers) {
        try {
            const totalStorage = this.calculateTotalStorage(servers);
            const avgStorage = this.calculateAverageStorage(servers);
            const totalCores = this.calculateTotalCores(servers);
            const avgTemp = this.calculateAverageTemperature(servers);
            const avgPower = this.calculateAveragePower(servers);
            const maxPower = this.calculateMaxPower(servers);

            this.updateSummaryValue('totalStorage', totalStorage);
            this.updateSummaryValue('avgStorage', avgStorage);
            this.updateSummaryValue('totalCores', totalCores);
            this.updateSummaryValue('avgTemp', `${avgTemp}°C`);
            this.updateSummaryValue('avgPower', `${avgPower}W`);
            this.updateSummaryValue('maxPower', `${maxPower}W`);
        } catch (error) {
            console.error('Error updating summary cards:', error);
            this.showError('שגיאה בעדכון נתוני סיכום');
        }
    }

    updateSummaryValue(id, value) {
        const element = this.container.querySelector(`#${id}`);
        if (element) {
            element.textContent = value;
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 300);
        } else {
            console.warn(`Element with id ${id} not found`);
        }
    }

    updateCharts(servers) {
        try {
            Object.values(this.charts).forEach(chart => {
                chart.updateChart(servers);
            });
        } catch (error) {
            console.error('Error updating charts:', error);
            this.showError('שגיאה בעדכון התרשימים');
        }
    }

    resize() {
        Object.values(this.charts).forEach(chart => {
            chart.resize();
        });
    }

    destroy() {
        Object.values(this.charts).forEach(chart => {
            chart.destroy();
        });
    }

    // Helper methods for calculations
    calculateTotalStorage(servers) {
        let totalGB = 0;
        servers.forEach(server => {
            if (server.storage && server.storage.disks) {
                Object.values(server.storage.disks).forEach(drives => {
                    drives.forEach(drive => {
                        totalGB += drive.capacity_gb || 0;
                    });
                });
            }
        });
        return this.formatStorageSize(totalGB * 1024 * 1024 * 1024); // Convert GB to bytes
    }

    calculateAverageStorage(servers) {
        let totalGB = 0;
        let serverCount = 0;
        servers.forEach(server => {
            if (server.storage && server.storage.disks) {
                let serverStorage = 0;
                Object.values(server.storage.disks).forEach(drives => {
                    drives.forEach(drive => {
                        serverStorage += drive.capacity_gb || 0;
                    });
                });
                if (serverStorage > 0) {
                    totalGB += serverStorage;
                    serverCount++;
                }
            }
        });
        const avgGB = serverCount > 0 ? totalGB / serverCount : 0;
        return this.formatStorageSize(avgGB * 1024 * 1024 * 1024); // Convert GB to bytes
    }

    calculateTotalCores(servers) {
        return servers.reduce((sum, server) => {
            const cpuCount = server.processors?.count || 0;
            const coresPerCpu = server.processors?.cores_per_cpu || 0;
            return sum + (cpuCount * coresPerCpu);
        }, 0);
    }

    calculateAverageTemperature(servers) {
        const validServers = servers.filter(server => 
            server?.temperature?.avg !== undefined);
        
        if (validServers.length === 0) return 0;
        
        const total = validServers.reduce((sum, server) => 
            sum + server.temperature.avg, 0);
        return Math.round(total / validServers.length);
    }

    calculateAveragePower(servers) {
        console.log('Calculating average power for servers:', servers);
        const total = servers.reduce((sum, server) => {
            const power = server.power?.avg || 0;
            console.log(`Server ${server.hostname || server.mgmt_ip}: ${power}W`);
            return sum + power;
        }, 0);
        const average = Math.round(total / (servers.length || 1));
        console.log(`Total power: ${total}W, Average power: ${average}W`);
        return average;
    }

    calculateMaxPower(servers) {
        return Math.max(...servers
            .filter(server => server?.power?.avg !== undefined)
            .map(server => server.power.avg)
            .concat([0]));
    }

    formatStorageSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${Math.round(size * 10) / 10} ${units[unitIndex]}`;
    }
} 