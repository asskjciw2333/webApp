export function getColorPalette(count) {
    // Soft, modern color palette with good contrast
    const colors = [
        'rgba(100, 151, 177, 0.85)',   // Soft blue
        'rgba(143, 188, 143, 0.85)',   // Soft green
        'rgba(188, 143, 143, 0.85)',   // Soft rose
        'rgba(179, 168, 211, 0.85)',   // Soft purple
        'rgba(222, 184, 135, 0.85)',   // Soft tan
        'rgba(176, 196, 222, 0.85)',   // Light steel blue
        'rgba(255, 182, 193, 0.85)',   // Light pink
        'rgba(152, 251, 152, 0.85)',   // Pale green
        'rgba(221, 160, 221, 0.85)',   // Plum
        'rgba(240, 230, 140, 0.85)',   // Khaki
        'rgba(175, 238, 238, 0.85)',   // Pale turquoise
        'rgba(216, 191, 216, 0.85)'    // Thistle
    ];
    
    // For single color charts (like line charts), use these colors
    const singleColors = {
        primary: 'rgba(100, 151, 177, 1)',      // Main blue
        secondary: 'rgba(143, 188, 143, 1)',    // Main green
        warning: 'rgba(222, 184, 135, 1)',      // Warning color
        danger: 'rgba(188, 143, 143, 1)',       // Danger color
        info: 'rgba(176, 196, 222, 1)'          // Info color
    };

    if (count === 1) return [singleColors.primary];
    if (count === 2) return [singleColors.primary, singleColors.secondary];
    if (count === 3) return [singleColors.primary, singleColors.warning, singleColors.danger];

    return colors.slice(0, count);
}

export function createChartConfig(chartId, type, data, isModal = false) {
    const baseConfig = {
        type: type,
        data: {
            labels: data.labels,
            datasets: data.datasets || [{
                data: data.data,
                backgroundColor: getColorPalette(data.data.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 5,
                    bottom: 5,
                    left: 5,
                    right: 5
                }
            },
            plugins: {
                legend: {
                    position: isModal ? 'bottom' : 'right',
                    rtl: true,
                    align: 'start',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                            size: isModal ? 14 : 12
                        }
                    }
                }
            }
        }
    };

    // Special handling for pie/doughnut charts
    if (type === 'pie' || type === 'doughnut') {
        baseConfig.options = {
            ...baseConfig.options,
            layout: {
                padding: 5
            },
            plugins: {
                ...baseConfig.options.plugins,
                legend: {
                    ...baseConfig.options.plugins.legend,
                    position: isModal ? 'bottom' : 'right',
                }
            }
        };
    }

    // Special handling for radar charts
    if (type === 'radar') {
        baseConfig.options = {
            ...baseConfig.options,
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: isModal ? 14 : 12
                        }
                    },
                    pointLabels: {
                        font: {
                            size: isModal ? 14 : 12
                        }
                    },
                    grid: {
                        circular: true
                    }
                }
            }
        };
    }

    // For bar charts
    if (type === 'bar') {
        baseConfig.options = {
            ...baseConfig.options,
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: isModal ? 14 : 12
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: isModal ? 14 : 12
                        }
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            barThickness: 'flex',
            maxBarThickness: 50
        };
    }

    // For line charts
    if (type === 'line') {
        baseConfig.options = {
            ...baseConfig.options,
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: isModal ? 14 : 12
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: isModal ? 14 : 12
                        }
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
            }
        };
    }

    return baseConfig;
}

// Update the CSS
const style = document.createElement('style');
style.textContent = `
    .chart-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 300px;
        display: flex;
        align-items: center;
    }

    .chart-wrapper canvas {
        max-width: 100% !important;
        max-height: 100% !important;
    }

    .network-chart {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 250px;
        display: flex;
        align-items: center;
    }

    .network-chart canvas {
        max-width: 100% !important;
        max-height: 100% !important;
    }

    .modal-body {
        position: relative;
        width: 100%;
        height: 60vh;
        min-height: 400px;
        display: flex;
        align-items: center;
    }

    .modal-body canvas {
        max-width: 100% !important;
        max-height: 100% !important;
    }
`;
document.head.appendChild(style); 