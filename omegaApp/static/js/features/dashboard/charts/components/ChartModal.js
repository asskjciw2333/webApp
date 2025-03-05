import { ChartManager } from '../base/ChartManager.js';

export class ChartModal {
    static instance = null;

    constructor() {
        // Singleton pattern - ensure only one modal exists
        if (ChartModal.instance) {
            return ChartModal.instance;
        }
        
        this.chartManager = new ChartManager();
        this.createModalElement();
        ChartModal.instance = this;
    }

    createModalElement() {
        // Remove any existing modal elements first
        const existingModals = document.querySelectorAll('.modal');
        existingModals.forEach(modal => modal.remove());

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'modal';
        this.modalElement.innerHTML = `
            <div class="modal-content chart-modal">
                <div class="modal-header">
                    <h2 class="modal-title"></h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="chart-modal-container">
                        <canvas id="modalChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        const closeButton = this.modalElement.querySelector('.modal-close');
        closeButton.addEventListener('click', () => this.hide());

        // Close on background click
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.hide();
            }
        });

        document.body.appendChild(this.modalElement);
    }

    show(title, chartInstance) {
        if (!chartInstance) return;

        // Set modal title
        const titleElement = this.modalElement.querySelector('.modal-title');
        titleElement.textContent = title;

        // Get the actual Chart.js instance from our chart wrapper
        const originalChart = chartInstance.getChartInstance();
        if (!originalChart) {
            console.error('No chart instance found');
            return;
        }

        // Show modal first to ensure proper rendering
        this.modalElement.classList.add('fade-in');
        this.modalElement.classList.remove('fade-out');

        // Create a new chart instance with the same configuration
        const isPieOrDoughnut = ['pie', 'doughnut'].includes(originalChart.config.type);
        
        this.currentChart = this.chartManager.createChart('modalChart', originalChart.config.type, {
            maintainAspectRatio: false,
            responsive: true,
            plugins: originalChart.config.options.plugins,
            scales: originalChart.config.options.scales,
            layout: originalChart.config.options.layout,
            elements: originalChart.config.options.elements,
            animation: {
                duration: 300, 
            }
        });

        // Update the chart with the original data
        if (this.currentChart) {
            // Deep clone the datasets to ensure we have all properties
            const datasets = originalChart.data.datasets.map(dataset => ({
                ...dataset,
                data: [...dataset.data],
                backgroundColor: Array.isArray(dataset.backgroundColor) 
                    ? [...dataset.backgroundColor]
                    : dataset.backgroundColor
            }));

            const chartData = {
                labels: [...originalChart.data.labels],
                datasets: datasets
            };

            this.currentChart.update(chartData);
        }

        // Resize chart after modal animation
        setTimeout(() => {
            if (this.currentChart) {
                this.currentChart.resize();
            }
        }, 300);
    }

    hide() {
        this.modalElement.classList.remove('fade-in');
        this.modalElement.classList.add('fade-out');

        // Cleanup chart after animation
        setTimeout(() => {
            if (this.currentChart) {
                this.chartManager.destroyChart('modalChart');
                this.currentChart = null;
            }
        }, 300);
    }

    destroy() {
        if (this.currentChart) {
            this.chartManager.destroyChart('modalChart');
        }
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.remove();
        }
        ChartModal.instance = null;
    }
} 