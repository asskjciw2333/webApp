export class BaseChart {
    constructor(container, options = {}) {
        if (!container) {
            throw new Error('Container element is required');
        }
        
        if (!(container instanceof HTMLCanvasElement)) {
            throw new Error('Container must be a canvas element');
        }

        this.container = container;
        this.options = this.mergeDefaultOptions(options);
        this.chart = null;
        this.lastData = null;
    }

    mergeDefaultOptions(options) {
        return {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true,
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    rtl: true,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 12
                    }
                }
            },
            ...options
        };
    }

    destroy() {
        try {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
        } catch (error) {
            console.error('Error destroying chart:', error);
        }
    }

    update(data) {
        try {
            if (!data) {
                console.error('No data provided for chart update');
                return;
            }

            this.lastData = data;
            this._updateChart(data);
        } catch (error) {
            console.error('Error updating chart:', error);
            // Try to recreate the chart if update fails
            this.recreate();
        }
    }

    _updateChart(data) {
        throw new Error('_updateChart method must be implemented by child class');
    }

    resize() {
        try {
            if (this.chart) {
                this.chart.resize();
            }
        } catch (error) {
            console.error('Error resizing chart:', error);
        }
    }

    getChartInstance() {
        return this.chart;
    }

    setOptions(options) {
        try {
            this.options = this.mergeDefaultOptions(options);
            if (this.chart) {
                this.chart.options = this.options;
                this.chart.update('none'); // Update without animation
            }
        } catch (error) {
            console.error('Error setting chart options:', error);
        }
    }

    recreate() {
        try {
            this.destroy();
            if (this.lastData) {
                this._updateChart(this.lastData);
            }
        } catch (error) {
            console.error('Error recreating chart:', error);
        }
    }

    validateContainer() {
        return this.container && 
               this.container instanceof HTMLCanvasElement && 
               this.container.getContext('2d');
    }
} 