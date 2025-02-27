import { ChartContainer } from '../dashboard/charts/components/ChartContainer.js';
import { DataTransformer } from '../dashboard/charts/data/DataTransformer.js';

export class LogCharts {
    constructor() {
        this.initializeCharts();
    }

    initializeCharts() {
        // Initialize severity distribution chart
        this.severityChart = new ChartContainer('severityChart', {
            title: 'התפלגות חומרת הלוגים',
            allowedTypes: ['pie', 'doughnut', 'bar'],
            defaultType: 'doughnut',
            metric: 'severity'
        });

        // Initialize timeline chart
        this.timelineChart = new ChartContainer('timelineChart', {
            title: 'תדירות לוגים לאורך זמן',
            allowedTypes: ['line', 'bar'],
            defaultType: 'line',
            metric: 'timeline'
        });

        // Listen for log updates
        document.addEventListener('logsUpdated', (event) => {
            this.updateCharts(event.detail);
        });
    }

    updateCharts(logData) {
        if (!logData) return;

        // Update severity chart
        const severityData = this.prepareSeverityData(logData);
        this.severityChart.updateChart(severityData);

        // Update timeline chart
        const timelineData = this.prepareTimelineData(logData);
        this.timelineChart.updateChart(timelineData);
    }

    prepareSeverityData(logData) {
        const severityCounts = {
            ERROR: 0,
            WARNING: 0,
            INFO: 0,
            DEBUG: 0
        };

        // Count occurrences of each severity
        Object.values(logData || {}).flat().forEach(log => {
            Object.keys(severityCounts).forEach(severity => {
                if (log.includes(` - ${severity} - `)) {
                    severityCounts[severity]++;
                }
            });
        });

        return {
            labels: Object.keys(severityCounts),
            datasets: [{
                data: Object.values(severityCounts),
                backgroundColor: [
                    '#dc3545', // ERROR - Red
                    '#ffc107', // WARNING - Yellow
                    '#17a2b8', // INFO - Blue
                    '#6c757d'  // DEBUG - Gray
                ]
            }]
        };
    }

    prepareTimelineData(logData) {
        const timeData = {};
        const now = new Date();
        
        // Initialize last 24 hours with 0
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now - i * 3600000);
            const hourStr = hour.getHours().toString().padStart(2, '0') + ':00';
            timeData[hourStr] = 0;
        }

        // Debug: Print first log to see format
        const firstLog = Object.values(logData || {}).flat()[0];
        console.log('First log format:', firstLog);

        let parsedCount = 0;
        let errorCount = 0;

        // Count logs per hour
        Object.values(logData || {}).flat().forEach(log => {
            try {
                // Try different date formats
                let logTime = null;
                
                // Format: YYYY-MM-DD HH:mm:ss,SSS
                const match1 = log.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2},\d{3})/);
                if (match1) {
                    logTime = new Date(match1[1].replace(',', '.'));
                }
                
                // Format: [YYYY-MM-DD HH:mm:ss]
                const match2 = log.match(/\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]/);
                if (match2 && !logTime) {
                    logTime = new Date(match2[1]);
                }
                
                // Format: YYYY-MM-DD HH:mm:ss
                const match3 = log.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
                if (match3 && !logTime) {
                    logTime = new Date(match3[1]);
                }

                if (logTime && logTime >= new Date(now - 24 * 3600000)) {
                    const hourStr = logTime.getHours().toString().padStart(2, '0') + ':00';
                    timeData[hourStr]++;
                    parsedCount++;
                }
            } catch (error) {
                errorCount++;
                console.error('Error parsing log time:', error, 'Log:', log);
            }
        });

        console.log(`Timeline stats: Parsed ${parsedCount} logs, ${errorCount} errors`);
        console.log('Timeline data:', timeData);

        return {
            labels: Object.keys(timeData),
            datasets: [{
                label: 'מספר לוגים',
                data: Object.values(timeData),
                fill: true,
                tension: 0.4,
                borderColor: '#3182ce',
                backgroundColor: 'rgba(49, 130, 206, 0.1)'
            }]
        };
    }

    destroy() {
        if (this.severityChart) {
            this.severityChart.destroy();
        }
        if (this.timelineChart) {
            this.timelineChart.destroy();
        }
    }
} 