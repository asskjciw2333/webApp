
class PowerChartsManager {
    constructor() {
        this.charts = new Map();
        this.currentType = 'bar';
        this.init();
    }

    init() {
        const canvases = document.querySelectorAll('[id^="powerChart_"]');
        canvases.forEach(canvas => {
            const assetId = canvas.id.split('_')[1];
            this.createChart(canvas, assetId);
        });

        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', () => this.changeChartType(btn.dataset.type));
        });
    }

    createChart(canvas, assetId) {
        const powerData = this.getPowerData(assetId);
        if (!powerData) return;

        const ctx = canvas.getContext('2d');
        const config = this.getChartConfig(powerData);

        config.options = {
            ...config.options,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(assetId, chart);
    }

    getChartConfig(powerData) {
        const configs = {
            bar: {
                type: 'bar',
                data: this.getBarData(powerData),
                options: this.getBarOptions()
            },
            line: {
                type: 'line',
                data: this.getLineData(powerData),
                options: this.getLineOptions()
            },
            pie: {
                type: 'pie',
                data: this.getPieData(powerData),
                options: this.getPieOptions()
            }
        };

        return configs[this.currentType];
    }

    getBarData(powerData) {
        return {
            labels: ['שעה', 'יום', 'חודש', 'שנה'],
            datasets: [
                {
                    label: 'עלות חשמל בלבד',
                    data: powerData.basicCosts,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'עלות כולל נלווים',
                    data: powerData.totalCosts,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
    }

    getLineData(powerData) {
        return {
            labels: ['שעה', 'יום', 'חודש', 'שנה'],
            datasets: [
                {
                    label: 'עלות חשמל בלבד',
                    data: powerData.basicCosts,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'עלות כולל נלווים',
                    data: powerData.totalCosts,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    tension: 0.4,
                    fill: false
                }
            ]
        };
    }

    getPieData(powerData) {
        return {
            labels: ['עלות חשמל בלבד', 'עלות נלווים'],
            datasets: [{
                data: [
                    powerData.basicCosts[3],
                    powerData.totalCosts[3] - powerData.basicCosts[3]
                ],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 99, 132, 0.8)'
                ]
            }]
        };
    }

    changeChartType(newType) {
        if (this.currentType === newType) return;

        this.currentType = newType;

        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === newType);
        });

        this.charts.forEach((chart, assetId) => {
            const powerData = this.getPowerData(assetId);
            const newConfig = this.getChartConfig(powerData);

            chart.destroy();
            const canvas = document.getElementById(`powerChart_${assetId}`);
            const ctx = canvas.getContext('2d');
            this.charts.set(assetId, new Chart(ctx, newConfig));
        });
    }

    getPowerData(assetId) {
        const card = document.querySelector(`[data-asset-id="${assetId}"]`);
        if (!card) return null;

        // חילוץ ערך הצריכה מהאטריביוט
        const powerValueElement = card.querySelector('.power-value');
        const powerValue = parseInt(powerValueElement.dataset.watts);

        // חישוב העלויות
        const wattsPerKw = powerValue / 1000;
        const pricePerKwh = 0.4;
        const multiplier = 1.7;

        // חישוב עלויות בסיסיות
        const hourBasic = wattsPerKw * pricePerKwh;
        const dayBasic = hourBasic * 24;
        const monthBasic = dayBasic * 30;
        const yearBasic = monthBasic * 12;

        // חישוב עלויות כולל נלווים
        const hourTotal = hourBasic * multiplier;
        const dayTotal = dayBasic * multiplier;
        const monthTotal = monthBasic * multiplier;
        const yearTotal = yearBasic * multiplier;

        return {
            basicCosts: [hourBasic, dayBasic, monthBasic, yearBasic],
            totalCosts: [hourTotal, dayTotal, monthTotal, yearTotal],
            powerValue
        };
    }

    updateVisibleChart() {
        const activeCard = document.querySelector('.result-card.active');
        if (activeCard) {
            const assetId = activeCard.dataset.assetId;
            const chart = this.charts.get(assetId);
            if (chart) {
                chart.update();
            }
        }
    }

    getBarOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'השוואת עלויות לפי תקופה',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top',
                    align: 'center',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += new Intl.NumberFormat('he-IL', {
                                style: 'currency',
                                currency: 'ILS',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }).format(context.raw);
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'עלות בש"ח'
                    },
                    ticks: {
                        callback: function (value) {
                            return new Intl.NumberFormat('he-IL', {
                                style: 'currency',
                                currency: 'ILS',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 40,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            }
        };
    }

    getLineOptions() {
        return {
            ...this.getBarOptions(),
            elements: {
                line: {
                    tension: 0.4
                }
            }
        };
    }

    getPieOptions() {
        return {
            ...this.getBarOptions(),
            plugins: {
                title: {
                    display: true,
                    text: 'התפלגות עלויות שנתית',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top',
                    padding: 20
                }
            }
        };
    }
}

function loadChartJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        try {
            await loadChartJS();
        } catch (error) {
            console.error('Error loading Chart.js:', error);
        }
        window.powerChartsManager = new PowerChartsManager();
    } catch (error) {
        console.error('Error loading Chart.js:', error);
    }
}); 