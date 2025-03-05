import { BarChart } from '../types/BarChart.js';
import { LineChart } from '../types/LineChart.js';
import { PieChart } from '../types/PieChart.js';
import { DoughnutChart } from '../types/DoughnutChart.js';
import { DataValidator } from '../data/DataValidator.js';

export class ChartManager {
    constructor() {
        this.charts = new Map();
        this.chartTypes = {
            bar: BarChart,
            line: LineChart,
            pie: PieChart,
            doughnut: DoughnutChart
        };

        // Bind window resize event
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    createChart(containerId, type, options = {}) {
        try {
            // Clean up existing chart if any
            this.destroyChart(containerId);

            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Container with id ${containerId} not found`);
                return null;
            }

            // Ensure container is a canvas element
            if (!(container instanceof HTMLCanvasElement)) {
                console.error(`Element ${containerId} must be a canvas element`);
                return null;
            }

            const ChartClass = this.chartTypes[type];
            if (!ChartClass) {
                console.error(`Chart type ${type} not supported`);
                return null;
            }

            const chart = new ChartClass(container, options);
            this.charts.set(containerId, chart);
            return chart;
        } catch (error) {
            console.error(`Error creating chart ${containerId}:`, error);
            return null;
        }
    }

    getChart(containerId) {
        return this.charts.get(containerId);
    }

    destroyChart(containerId) {
        try {
            const chart = this.charts.get(containerId);
            if (chart) {
                chart.destroy();
                this.charts.delete(containerId);
            }
        } catch (error) {
            console.error(`Error destroying chart ${containerId}:`, error);
        }
    }

    updateChart(containerId, data) {
        try {
            const chart = this.charts.get(containerId);
            if (!chart) {
                console.error(`Chart ${containerId} not found`);
                return;
            }

            const type = chart.constructor.name.toLowerCase().replace('chart', '');
            const validation = DataValidator.validateChartData(data, type);
            
            if (!validation.isValid) {
                console.error(`Invalid data for chart ${containerId}:`, validation.error);
                return;
            }

            chart.update(data);
        } catch (error) {
            console.error(`Error updating chart ${containerId}:`, error);
        }
    }

    destroyAll() {
        try {
            this.charts.forEach((chart, id) => {
                try {
                    chart.destroy();
                } catch (error) {
                    console.error(`Error destroying chart ${id}:`, error);
                }
            });
            this.charts.clear();
        } catch (error) {
            console.error('Error destroying all charts:', error);
        }
    }

    registerChartType(type, ChartClass) {
        if (typeof type !== 'string' || !type) {
            throw new Error('Chart type must be a non-empty string');
        }
        if (typeof ChartClass !== 'function') {
            throw new Error('ChartClass must be a constructor');
        }
        this.chartTypes[type] = ChartClass;
    }

    handleResize() {
        // Debounce resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.resizeAll();
        }, 250);
    }

    resizeAll() {
        this.charts.forEach((chart, id) => {
            try {
                chart.resize();
            } catch (error) {
                console.error(`Error resizing chart ${id}:`, error);
            }
        });
    }

    recreateChart(containerId) {
        const chart = this.charts.get(containerId);
        if (chart) {
            try {
                chart.recreate();
            } catch (error) {
                console.error(`Error recreating chart ${containerId}:`, error);
            }
        }
    }

    recreateAll() {
        this.charts.forEach((chart, id) => {
            try {
                chart.recreate();
            } catch (error) {
                console.error(`Error recreating chart ${id}:`, error);
            }
        });
    }
} 