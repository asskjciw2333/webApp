import { ChartContainer } from '../charts/components/ChartContainer.js';
import { DataValidator } from '../charts/data/DataValidator.js';
import { ColorSchemes } from '../charts/config/ColorSchemes.js';

export default class BasicAnalytics {
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
                    <h3>סה"כ שרתים</h3>
                    <div class="summary-value" id="totalServers">0</div>
                </div>
                <div class="summary-card">
                    <h3>סה"כ זיכרון</h3>
                    <div class="summary-value" id="totalMemory">0 GB</div>
                </div>
                <div class="summary-card">
                    <h3>סה"כ מעבדים</h3>
                    <div class="summary-value" id="totalCPUs">0</div>
                </div>
                <div class="summary-card">
                    <h3>צריכת חשמל ממוצעת</h3>
                    <div class="summary-value" id="avgPower">0 W</div>
                </div>
            </div>
            <div class="charts-grid">
                <div id="vendorChart" class="chart-container">
                    <div class="chart-header">
                        <h3>התפלגות לפי יצרן</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
                <div id="locationChart" class="chart-container">
                    <div class="chart-header">
                        <h3>התפלגות לפי מיקום</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
                <div id="memoryChart" class="chart-container">
                    <div class="chart-header">
                        <h3>התפלגות זיכרון</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
                <div id="basicPowerChart" class="chart-container">
                    <div class="chart-header">
                        <h3>התפלגות צריכת חשמל</h3>
                        <div class="chart-controls"></div>
                    </div>
                    <div class="chart-content">
                        <div class="chart-placeholder">טוען נתונים...</div>
                    </div>
                </div>
            </div>
        `;

        // Add CSS for better layout and animations
        const style = document.createElement('style');
        style.textContent = `
            .chart-container {
                position: relative;
                min-height: 350px;
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
            }
            
            .chart-container:hover {
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                transform: translateY(-2px);
            }

            .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid #eee;
            }

            .chart-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 500;
                color: #495057;
            }

            .chart-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .chart-content {
                flex: 1;
                position: relative;
                min-height: 250px;
            }

            .chart-placeholder {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #6c757d;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .chart-placeholder:before {
                content: '';
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #6c757d;
                border-right-color: transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 24px;
                padding: 24px;
                background: #f8f9fa;
                border-radius: 12px;
                margin-top: 24px;
            }

            .summary-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 24px;
                padding: 24px;
                background: #f8f9fa;
                border-radius: 12px;
            }

            .summary-card {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                text-align: center;
                transition: all 0.3s ease;
            }

            .summary-card:hover {
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                transform: translateY(-2px);
            }

            .summary-card h3 {
                margin: 0 0 12px 0;
                color: #495057;
                font-size: 14px;
                font-weight: 500;
            }

            .summary-value {
                font-size: 28px;
                font-weight: bold;
                color: #0d6efd;
                transition: all 0.3s ease;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }

            @media (max-width: 768px) {
                .charts-grid {
                    grid-template-columns: 1fr;
                }
                
                .chart-container {
                    min-height: 300px;
                }

                .summary-cards {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (max-width: 480px) {
                .summary-cards {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    initializeCharts() {
        try {
            // Initialize vendor distribution chart
            this.charts.vendor = new ChartContainer('vendorChart', {
                title: 'התפלגות לפי יצרן',
                metric: 'vendor',
                allowedTypes: ['pie', 'bar', 'doughnut'],
                defaultType: 'pie'
            });

            // Initialize location distribution chart
            this.charts.location = new ChartContainer('locationChart', {
                title: 'התפלגות לפי מיקום',
                metric: 'location',
                allowedTypes: ['pie', 'doughnut', 'bar'],
                defaultType: 'doughnut'
            });

            // Initialize memory distribution chart
            this.charts.memory = new ChartContainer('memoryChart', {
                title: 'התפלגות זיכרון',
                metric: 'memory',
                allowedTypes: ['pie', 'bar', 'doughnut'],
                defaultType: 'pie',
                options: {
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ${context.raw} שרתים`;
                                }
                            }
                        }
                    }
                }
            });

            // Initialize power consumption chart
            this.charts.power = new ChartContainer('basicPowerChart', {
                title: 'התפלגות צריכת חשמל',
                metric: 'power',
                allowedTypes: ['pie', 'bar', 'doughnut'],
                defaultType: 'pie',
                options: {
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ${context.raw} שרתים`;
                                }
                            }
                        }
                    }
                }
            });

            // Set theme for all charts
            ColorSchemes.setTheme('default');
        } catch (error) {
            console.error('Error initializing charts:', error);
            this.showError('שגיאה באתחול הגרפים');
        }
    }

    setupEventListeners() {
        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resize();
            }, 250);
        });

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.recreateChartsIfNeeded();
            }
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'analytics-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    update(servers) {
        if (!servers) {
            this.showError('לא התקבלו נתונים מהשרת');
            return;
        }
        
        // Don't show error for empty array during initial load
        if (servers.length === 0 && this.lastServers.length > 0) {
            this.showError('לא התקבלו נתונים מהשרת');
            return;
        }
        
        try {
            this.lastServers = servers;
            this.updateSummaryCards(servers);
            this.updateCharts(servers);
        } catch (error) {
            console.error('Error updating analytics:', error);
            this.showError('שגיאה בעדכון הנתונים');
        }
    }

    updateSummaryCards(servers) {
        try {
        const totalServers = servers.length;
        const totalMemory = servers.reduce((sum, server) => 
            sum + (server.memory?.total || 0), 0);
        const totalCPUs = servers.reduce((sum, server) => 
            sum + (server.processors?.count || 0), 0);
        const avgPower = servers.reduce((sum, server) => 
            sum + (server.power?.avg || 0), 0) / (servers.length || 1);

            this.updateSummaryValue('totalServers', totalServers);
            this.updateSummaryValue('totalMemory', `${Math.round(totalMemory)} GB`);
            this.updateSummaryValue('totalCPUs', totalCPUs);
            this.updateSummaryValue('avgPower', `${Math.round(avgPower)} W`);
        } catch (error) {
            console.error('Error updating summary cards:', error);
        }
    }

    updateSummaryValue(id, value) {
        const element = this.container.querySelector(`#${id}`);
        if (element) {
            element.textContent = value;
            // Add animation effect
            element.style.animation = 'none';
            element.offsetHeight; // Trigger reflow
            element.style.animation = 'pulse 0.5s';
        }
    }

    updateCharts(servers) {
        try {
            console.log('Updating charts with servers:', servers);
            
            // Validate data before updating charts
            const validations = {
                vendor: DataValidator.validateMetricData(servers, 'vendor'),
                location: DataValidator.validateMetricData(servers, 'location'),
                memory: DataValidator.validateMetricData(servers, 'memory'),
                power: DataValidator.validateMetricData(servers, 'power')
            };
            
            console.log('Data validations:', validations);

            // Update each chart if its data is valid
            Object.entries(this.charts).forEach(([metric, chart]) => {
                console.log(`Updating ${metric} chart:`, {
                    isValid: validations[metric]?.isValid,
                    data: validations[metric]?.data,
                    error: validations[metric]?.error
                });
                
                if (validations[metric]?.isValid) {
                    chart.updateChart(validations[metric].data);
                } else {
                    console.warn(`Invalid data for ${metric} chart:`, validations[metric]?.error);
                }
            });
        } catch (error) {
            console.error('Error updating charts:', error);
            this.showError('שגיאה בעדכון הגרפים');
        }
    }

    recreateChartsIfNeeded() {
        Object.values(this.charts).forEach(chart => {
            if (!chart.getChartInstance()) {
                chart.recreateChart();
            }
        });
    }

    resize() {
        Object.values(this.charts).forEach(chart => {
            try {
                chart.resize();
            } catch (error) {
                console.error('Error resizing chart:', error);
            }
        });
    }

    destroy() {
        try {
            Object.values(this.charts).forEach(chart => chart.destroy());
            this.charts = {};
        } catch (error) {
            console.error('Error destroying charts:', error);
        }
    }
} 