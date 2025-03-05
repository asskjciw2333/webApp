import { BaseChart } from '../base/BaseChart.js';
// Chart is globally available from base.html

export class PieChart extends BaseChart {
    constructor(container, options = {}) {
        super(container, {
            plugins: {
                legend: {
                    position: 'right',
                    rtl: true,
                    labels: {
                        font: { size: 12 }
                    }
                }
            },
            cutout: '0.1%',
            ...options
        });
    }

    update(data) {
        const config = {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: Array.isArray(data.datasets) ? data.datasets : [{
                    data: data.data,
                    backgroundColor: data.colors || this.generateColors(data.data.length),
                    borderWidth: 1
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

    generateColors(count) {
        const baseColors = [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)'
        ];

        return Array.from({ length: count }, (_, i) => 
            baseColors[i % baseColors.length]);
    }
} 