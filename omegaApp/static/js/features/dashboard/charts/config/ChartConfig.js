import { ColorSchemes } from './ColorSchemes.js';

export const ChartConfig = {
    defaults: {
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
        }
    },

    bar: {
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
        }
    },

    line: {
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
        }
    },

    pie: {
        plugins: {
            legend: {
                position: 'right',
                rtl: true,
                labels: {
                    font: { size: 12 }
                }
            }
        }
    },

    doughnut: {
        plugins: {
            legend: {
                position: 'right',
                rtl: true,
                labels: {
                    font: { size: 12 }
                }
            }
        },
        cutout: '70%'
    },

    getConfig(type, customOptions = {}) {
        const baseConfig = {
            ...this.defaults,
            ...(this[type] || {}),
            ...customOptions
        };

        return {
            type,
            options: baseConfig
        };
    },

    getDatasetConfig(type, data, colors) {
        const baseDataset = {
            data: data,
            backgroundColor: colors || ColorSchemes.getColors(data.length)
        };

        switch (type) {
            case 'line':
                return {
                    ...baseDataset,
                    borderColor: colors?.[0] || ColorSchemes.getColor(0),
                    borderWidth: 2,
                    fill: true
                };
            case 'bar':
                return {
                    ...baseDataset,
                    borderWidth: 1
                };
            case 'pie':
            case 'doughnut':
                return {
                    ...baseDataset,
                    borderWidth: 1
                };
            default:
                return baseDataset;
        }
    }
}; 