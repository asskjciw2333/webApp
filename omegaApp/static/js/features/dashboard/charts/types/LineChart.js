import { BaseChart } from '../base/BaseChart.js';
// Chart is globally available from base.html

export class LineChart extends BaseChart {
    constructor(container, options = {}) {
        super(container, {
            scales: {
                x: {
                    ticks: {
                        font: { size: 12 }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        font: { size: 12 }
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                },
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            },
            ...options
        });
    }

    update(data) {
        const config = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: Array.isArray(data.datasets) ? data.datasets : [{
                    data: data.data,
                    borderColor: data.colors?.[0] || 'rgba(54, 162, 235, 0.8)',
                    backgroundColor: data.colors?.[0] ? `${data.colors[0].slice(0, -2)}0.1)` : 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: this.options
        };

        if (this.chart) {
            this.chart.data = config.data;
            this.chart.update();
        } else {
            const ctx = this.container.getContext('2d');
            this.chart = new Chart(ctx, config);
        }
    }
} 