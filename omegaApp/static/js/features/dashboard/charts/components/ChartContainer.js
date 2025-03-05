import { ChartManager } from '../base/ChartManager.js';
import { ChartControls } from './ChartControls.js';
import { DataTransformer } from '../data/DataTransformer.js';
import { DataValidator } from '../data/DataValidator.js';
import { ChartModal } from './ChartModal.js';

export class ChartContainer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id ${containerId} not found`);
        }

        this.options = {
            title: '',
            metric: '',
            allowedTypes: ['bar', 'line', 'pie'],
            defaultType: 'bar',
            ...options
        };

        this.chartManager = new ChartManager();
        this.modal = new ChartModal();
        this.setupContainer();
        this.addErrorHandling();
        this.setupChartClickHandler();
    }

    setupContainer() {
        // Create base structure
        this.container.innerHTML = `
            <div class="chart-header">
                <h3>${this.options.title}</h3>
            </div>
            <div class="chart-controls"></div>
            <div class="chart-content">
                <div class="chart-wrapper">
                    <canvas id="${this.container.id}Canvas"></canvas>
                </div>
                <div class="chart-error"></div>
            </div>
        `;

        // Add base class
        this.container.classList.add('chart-container');

        // Initialize controls
        this.initializeControls();

        // Create initial chart
        this.currentType = this.options.defaultType;
        this.createChart();
    }

    initializeControls() {
        const controlsElement = this.container.querySelector('.chart-controls');
        this.controls = new ChartControls(controlsElement, {
            allowedTypes: this.options.allowedTypes,
            defaultType: this.options.defaultType,
            onTypeChange: (type) => this.handleChartTypeChange(type)
        });
    }

    handleChartTypeChange(type) {
        if (type !== this.currentType) {
            this.currentType = type;
            
            // Destroy existing chart if it exists
            if (this.chart) {
                const canvas = this.container.querySelector('canvas');
                if (canvas) {
                    this.chartManager.destroyChart(canvas.id);
                }
                this.chart = null;
            }
            
            // Create new chart and update if we have data
            this.createChart();
            if (this.lastData) {
                this.updateChart(this.lastData);
            }
        }
    }

    addErrorHandling() {
        this.errorElement = this.container.querySelector('.chart-error');
    }

    showError(message) {
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.errorElement.style.display = 'block';
        }
    }

    hideError() {
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }

    createChart() {
        const canvas = this.container.querySelector('canvas');
        if (!canvas) {
            this.showError('Canvas element not found');
            return;
        }

        // Clear existing chart
        if (this.chart) {
            this.chartManager.destroyChart(canvas.id);
        }

        // Create new chart with current type
        this.chart = this.chartManager.createChart(canvas.id, this.currentType, {
            plugins: {
                title: { display: false },
                legend: {
                    position: this.currentType === 'pie' || this.currentType === 'doughnut' ? 'right' : 'bottom',
                    rtl: true,
                    labels: {
                        font: { size: 12 },
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    rtl: true,
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    padding: 10,
                    backgroundColor: 'rgba(0,0,0,0.8)'
                }
            },
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            }
        });

        if (!this.chart) {
            this.showError('Failed to create chart');
        }
    }

    updateChart(data) {
        if (!data) {
            this.showError('No data provided');
            return;
        }

        this.lastData = data;
        
        try {
            // Validate metric data
            const validation = DataValidator.validateMetricData(data, this.options.metric);
            if (!validation.isValid) {
                this.showError(validation.error);
                return;
            }

            // Transform data for chart
            const transformedData = DataTransformer.transformServerData(
                data,
                this.currentType,
                this.options.metric
            );

            if (!transformedData) {
                this.showError('Failed to transform data');
                return;
            }

            // Create chart if doesn't exist
            if (!this.chart) {
                this.createChart();
            }

            // Update chart with transformed data
            if (this.chart) {
                this.chart.update(transformedData);
                this.hideError();
            }
        } catch (error) {
            console.error('Error updating chart:', error);
            this.showError('Failed to update chart data');
        }
    }

    resize() {
        if (this.chart) {
            this.chart.resize();
        }
    }

    setupChartClickHandler() {
        const chartWrapper = this.container.querySelector('.chart-wrapper');
        chartWrapper.style.cursor = 'pointer';
        
        chartWrapper.addEventListener('click', () => {
            if (this.chart) {
                this.modal.show(this.options.title, this.chart);
            }
        });
    }

    destroy() {
        if (this.controls) {
            this.controls.destroy();
        }
        if (this.chart) {
            this.chartManager.destroyChart(this.chart.canvas.id);
        }
        if (this.modal) {
            this.modal.destroy();
        }
        this.container.innerHTML = '';
    }

    getChartInstance() {
        return this.chart;
    }
} 