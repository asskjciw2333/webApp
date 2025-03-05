export class DataTransformer {
    static transformServerData(servers, type, metric) {
        switch (metric) {
            case 'temperature':
                return this.transformTemperatureData(servers, type);
            case 'power':
                return this.transformPowerData(servers, type);
            case 'memory':
                return this.transformMemoryData(servers, type);
            case 'location':
                return this.transformLocationData(servers, type);
            case 'vendor':
                return this.transformVendorData(servers, type);
            case 'storage_type':
                return this.transformStorageTypeData(servers, type);
            case 'storage_capacity':
                return this.transformStorageCapacityData(servers, type);
            case 'cpu':
                return this.transformCpuData(servers, type);
            case 'network_vendor':
                return this.transformNetworkVendorData(servers, type);
            case 'network_speed':
                return this.transformNetworkSpeedData(servers, type);
            case 'carbon':
                return this.transformCarbonData(servers, type);
            case 'efficiency':
                return this.transformEfficiencyData(servers, type);
            case 'cooling':
                return this.transformCoolingData(servers, type);
            case 'power_by_server':
                return this.transformPowerByServerData(servers, type);
            case 'detailed_power':
                return this.transformDetailedPowerData(servers, type);
            case 'severity':
                return this.transformLogSeverityData(servers, type);
            case 'timeline':
                return this.transformLogTimelineData(servers, type);
            default:
                console.error(`Unknown metric: ${metric}`);
                return null;
        }
    }

    static transformTemperatureData(servers, type) {
        const validServers = servers.filter(server => 
            server?.temperature?.avg !== undefined);

        if (type === 'line') {
            return {
                labels: validServers.map(server => server.hostname || server.mgmt_ip),
                datasets: [
                    {
                        label: 'מקסימום',
                        data: validServers.map(server => server.temperature.max),
                        borderColor: 'rgba(255, 99, 132, 0.8)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        fill: true
                    },
                    {
                        label: 'ממוצע',
                        data: validServers.map(server => server.temperature.avg),
                        borderColor: 'rgba(54, 162, 235, 0.8)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        fill: true
                    },
                    {
                        label: 'מינימום',
                        data: validServers.map(server => server.temperature.min),
                        borderColor: 'rgba(75, 192, 192, 0.8)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        fill: true
                    }
                ]
            };
        }

        // For bar chart
        return {
            labels: validServers.map(server => server.hostname || server.mgmt_ip),
            data: validServers.map(server => server.temperature.avg)
        };
    }

    static transformPowerData(servers, type) {
        console.log('Transforming power data:', { servers, type });
        
        const validServers = servers.filter(server => 
            server?.power?.avg !== undefined);
            
        console.log('Valid servers for power data:', validServers);

        // Define power consumption ranges (in Watts)
        const powerRanges = {
            '(0-100W)': validServers.filter(s => (s.power?.avg || 0) >= 0 && (s.power?.avg || 0) < 100).length,
            '(100-300W)': validServers.filter(s => (s.power?.avg || 0) >= 100 && (s.power?.avg || 0) < 300).length,
            '(300-500W)': validServers.filter(s => (s.power?.avg || 0) >= 300 && (s.power?.avg || 0) < 500).length,
            '(500W+)': validServers.filter(s => (s.power?.avg || 0) >= 500).length
        };

        if (type === 'pie' || type === 'doughnut') {
            const chartData = {
                labels: Object.keys(powerRanges),
                datasets: [{
                    data: Object.values(powerRanges),
                    backgroundColor: this.generateColors(Object.keys(powerRanges).length)
                }]
            };
            console.log('Generated pie/doughnut chart data:', chartData);
            return chartData;
        }

        // For bar chart
        const chartData = {
            labels: Object.keys(powerRanges),
            datasets: [{
                label: 'מספר שרתים',
                data: Object.values(powerRanges),
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderWidth: 1
            }]
        };
        console.log('Generated bar chart data:', chartData);
        return chartData;
    }

    static transformMemoryData(servers, type) {
        const validServers = servers.filter(server => 
            server?.memory?.total !== undefined);

        // Define memory ranges in GB
        const memoryRanges = {
            '128-256GB': validServers.filter(s => (s.memory?.total || 0) >= 128 && (s.memory?.total || 0) < 256).length,
            '256-512GB': validServers.filter(s => (s.memory?.total || 0) >= 256 && (s.memory?.total || 0) < 512).length,
            '512-768GB': validServers.filter(s => (s.memory?.total || 0) >= 512 && (s.memory?.total || 0) < 768).length,
            '768GB+': validServers.filter(s => (s.memory?.total || 0) >= 768).length
        };

        if (type === 'pie' || type === 'doughnut') {
            return {
                labels: Object.keys(memoryRanges),
                datasets: [{
                    data: Object.values(memoryRanges),
                    backgroundColor: this.generateColors(Object.keys(memoryRanges).length)
                }]
            };
        }

        // For bar chart
        return {
            labels: Object.keys(memoryRanges),
            datasets: [{
                label: 'מספר שרתים',
                data: Object.values(memoryRanges),
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderWidth: 1
            }]
        };
    }

    static transformLocationData(servers, type) {
        const locationCount = servers.reduce((acc, server) => {
            const location = server.location?.data_center || 'לא ידוע';
            acc[location] = (acc[location] || 0) + 1;
            return acc;
        }, {});

        if (type === 'pie' || type === 'doughnut') {
            return {
                labels: Object.keys(locationCount),
                datasets: [{
                    data: Object.values(locationCount),
                    backgroundColor: this.generateColors(Object.keys(locationCount).length)
                }]
            };
        }

        return {
            labels: Object.keys(locationCount),
            data: Object.values(locationCount)
        };
    }

    static transformVendorData(servers, type) {
        const vendorCount = servers.reduce((acc, server) => {
            const vendor = server.vendor || 'לא ידוע';
            acc[vendor] = (acc[vendor] || 0) + 1;
            return acc;
        }, {});

        if (type === 'pie' || type === 'doughnut') {
            return {
                labels: Object.keys(vendorCount),
                datasets: [{
                    data: Object.values(vendorCount),
                    backgroundColor: this.generateColors(Object.keys(vendorCount).length)
                }]
            };
        }

        return {
            labels: Object.keys(vendorCount),
            data: Object.values(vendorCount)
        };
    }

    static transformStorageTypeData(servers, type) {
        const types = {
            disks: {},
            pcie: {}
        };
        
        servers.forEach(server => {
            if (server.storage) {
                // Process Disks
                if (server.storage.disks) {
                    Object.values(server.storage.disks).forEach(drives => {
                        drives.forEach(drive => {
                            const driveType = this.getStorageType(drive.model);
                            types.disks[driveType] = (types.disks[driveType] || 0) + 1;
                        });
                    });
                }
                
                // Process PCIe devices
                if (server.storage.pcie) {
                    Object.values(server.storage.pcie).forEach(devices => {
                        devices.forEach(device => {
                            const deviceType = device.class || 'לא ידוע';
                            types.pcie[deviceType] = (types.pcie[deviceType] || 0) + 1;
                        });
                    });
                }
            }
        });

        // Prepare datasets based on chart type
        if (type === 'bar') {
            const diskLabels = Object.keys(types.disks);
            const pcieLabels = Object.keys(types.pcie);
            return {
                labels: [...diskLabels, ...pcieLabels],
                datasets: [
                    {
                        label: 'כונני דיסק',
                        data: [...diskLabels.map(label => types.disks[label]), ...pcieLabels.map(() => 0)],
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderWidth: 1,
                        stack: 'disks'
                    },
                    {
                        label: 'התקני PCIe',
                        data: [...diskLabels.map(() => 0), ...pcieLabels.map(label => types.pcie[label])],
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderWidth: 1,
                        stack: 'pcie'
                    }
                ]
            };
        } else {
            // For doughnut/pie charts, combine all types
            const allTypes = {
                ...Object.keys(types.disks).reduce((acc, key) => ({
                    ...acc,
                    [`דיסק - ${key}`]: types.disks[key]
                }), {}),
                ...Object.keys(types.pcie).reduce((acc, key) => ({
                    ...acc,
                    [`PCIe - ${key}`]: types.pcie[key]
                }), {})
            };

            return {
                labels: Object.keys(allTypes),
                datasets: [{
                    data: Object.values(allTypes),
                    backgroundColor: this.generateColors(Object.keys(allTypes).length),
                    borderWidth: 1
                }]
            };
        }
    }

    static transformStorageCapacityData(servers, type) {
        const capacityRanges = {
            '0-1TB': 0,
            '1-2TB': 0,
            '2-4TB': 0,
            '4-8TB': 0,
            '8TB+': 0
        };

        servers.forEach(server => {
            if (server.storage && server.storage.disks) {
                // Calculate total storage for this server
                let serverTotalGB = 0;
                Object.values(server.storage.disks).forEach(drives => {
                    drives.forEach(drive => {
                        serverTotalGB += drive.capacity_gb || 0;
                    });
                });
                
                // Convert to TB for range classification
                const serverTotalTB = serverTotalGB / 1024;
                
                // Classify server based on total capacity
                if (serverTotalTB <= 1) capacityRanges['0-1TB']++;
                else if (serverTotalTB <= 2) capacityRanges['1-2TB']++;
                else if (serverTotalTB <= 4) capacityRanges['2-4TB']++;
                else if (serverTotalTB <= 8) capacityRanges['4-8TB']++;
                else capacityRanges['8TB+']++;
            }
        });

        const colors = [
            'rgba(54, 162, 235, 0.8)',   // כחול
            'rgba(255, 99, 132, 0.8)',   // אדום
            'rgba(75, 192, 192, 0.8)',   // טורקיז
            'rgba(255, 206, 86, 0.8)',   // צהוב
            'rgba(153, 102, 255, 0.8)'   // סגול
        ];

        if (type === 'pie' || type === 'doughnut') {
            return {
                labels: Object.keys(capacityRanges),
                datasets: [{
                    label: 'מספר שרתים',
                    data: Object.values(capacityRanges),
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            };
        }

        // For bar chart
        return {
            labels: Object.keys(capacityRanges),
            datasets: [{
                label: 'מספר שרתים',
                data: Object.values(capacityRanges),
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.8', '1')),
                borderWidth: 1
            }]
        };
    }

    static transformCpuData(servers, type) {
        const validServers = servers.filter(server => 
            server.processors?.count !== undefined && 
            server.processors?.cores_per_cpu !== undefined);

        if (type === 'line') {
            return {
                labels: validServers.map(server => server.hostname || server.mgmt_ip),
                datasets: [{
                    label: 'מספר ליבות כולל',
                    data: validServers.map(server => 
                        server.processors.count * server.processors.cores_per_cpu),
                    borderColor: 'rgba(54, 162, 235, 0.8)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true
                }]
            };
        }

        // For bar chart
        return {
            labels: validServers.map(server => server.hostname || server.mgmt_ip),
            data: validServers.map(server => 
                server.processors.count * server.processors.cores_per_cpu)
        };
    }

    static transformNetworkVendorData(servers, type) {
        const vendors = {};
        servers.forEach(server => {
            if (server.internal_devices) {
                server.internal_devices
                    .filter(device => device.vendor)
                    .forEach(device => {
                        const vendor = device.vendor || 'לא ידוע';
                        vendors[vendor] = (vendors[vendor] || 0) + 1;
                    });
            }
        });

        if (type === 'pie' || type === 'doughnut') {
            return {
                labels: Object.keys(vendors),
                datasets: [{
                    data: Object.values(vendors),
                    backgroundColor: this.generateColors(Object.keys(vendors).length),
                    label: 'יצרני כרטיסי רשת'
                }]
            };
        }

        return {
            labels: Object.keys(vendors),
            datasets: [{
                label: 'מספר כרטיסים',
                data: Object.values(vendors),
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderWidth: 1
            }]
        };
    }

    static transformNetworkSpeedData(servers, type) {
        const speeds = {
            '1GbE': 0,
            '10GbE': 0,
            '25GbE': 0,
            '40GbE': 0,
            '100GbE': 0
        };

        servers.forEach(server => {
            if (server.internal_devices) {
                server.internal_devices
                    .filter(device => device.vendor)
                    .forEach(device => {
                        const name = device.name.toLowerCase();
                        if (name.includes('100gb')) speeds['100GbE']++;
                        else if (name.includes('40gb')) speeds['40GbE']++;
                        else if (name.includes('25gb')) speeds['25GbE']++;
                        else if (name.includes('10gb')) speeds['10GbE']++;
                        else if (name.includes('1gb')) speeds['1GbE']++;
                    });
            }
        });

        if (type === 'pie' || type === 'doughnut') {
            return {
                labels: Object.keys(speeds),
                datasets: [{
                    data: Object.values(speeds),
                    backgroundColor: this.generateColors(Object.keys(speeds).length),
                    label: 'מהירויות רשת'
                }]
            };
        }

        return {
            labels: Object.keys(speeds),
            datasets: [{
                label: 'מספר כרטיסים',
                data: Object.values(speeds),
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderWidth: 1
            }]
        };
    }

    static transformCarbonData(servers, type) { // TODO: delete this func
        const validServers = servers.filter(server => 
            server?.power?.carbon_emissions !== undefined);

        if (type === 'line') {
            return {
                labels: validServers.map(server => server.hostname || server.mgmt_ip),
                datasets: [{
                    label: 'פליטות פחמן',
                    data: validServers.map(server => server.power.carbon_emissions),
                    borderColor: 'rgba(75, 192, 192, 0.8)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    fill: true
                }]
            };
        }

        return {
            labels: validServers.map(server => server.hostname || server.mgmt_ip),
            data: validServers.map(server => server.power.carbon_emissions)
        };
    }

    static transformEfficiencyData(servers, type) { // TODO: delete this func?
        const efficiencyRanges = {
            'מצוינת (80%+)': servers.filter(s => (s.power?.efficiency || 0) >= 80).length,
            'טובה (60-80%)': servers.filter(s => (s.power?.efficiency || 0) >= 60 && (s.power?.efficiency || 0) < 80).length,
            'בינונית (40-60%)': servers.filter(s => (s.power?.efficiency || 0) >= 40 && (s.power?.efficiency || 0) < 60).length,
            'נמוכה (20-40%)': servers.filter(s => (s.power?.efficiency || 0) >= 20 && (s.power?.efficiency || 0) < 40).length,
            'נמוכה מאוד (<20%)': servers.filter(s => (s.power?.efficiency || 0) < 20).length
        };

        if (type === 'pie' || type === 'doughnut') {
            return {
                labels: Object.keys(efficiencyRanges),
                datasets: [{
                    data: Object.values(efficiencyRanges),
                    backgroundColor: this.generateColors(Object.keys(efficiencyRanges).length)
                }]
            };
        }

        return {
            labels: Object.keys(efficiencyRanges),
            data: Object.values(efficiencyRanges)
        };
    }

    static transformCoolingData(servers, type) {
        const coolingTypes = servers.reduce((acc, server) => {
            const coolingType = server.cooling?.type || 'לא ידוע';
            acc[coolingType] = (acc[coolingType] || 0) + 1;
            return acc;
        }, {});

        if (type === 'pie' || type === 'doughnut') {
            return {
                labels: Object.keys(coolingTypes),
                datasets: [{
                    data: Object.values(coolingTypes),
                    backgroundColor: this.generateColors(Object.keys(coolingTypes).length)
                }]
            };
        }

        return {
            labels: Object.keys(coolingTypes),
            data: Object.values(coolingTypes)
        };
    }

    static getStorageType(model) {
        if (!model) return 'לא ידוע';
        const modelLower = model.toLowerCase();
        if (modelLower.includes('nvme')) return 'NVMe';
        if (modelLower.includes('ssd')) return 'SSD';
        if (modelLower.includes('hdd')) return 'HDD';
        return 'אחר';
    }

    static generateColors(count) {
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

    static transformPowerByServerData(servers, type) {
        console.log('Transforming power by server data:', { servers, type });
        
        const validServers = servers
            .filter(server => server?.power?.avg !== undefined)
            .sort((a, b) => (b.power.avg || 0) - (a.power.avg || 0));

        const labels = validServers.map(s => s.hostname || s.mgmt_ip);
        const data = validServers.map(s => s.power.avg || 0);

        if (type === 'line') {
            return {
                labels: labels,
                datasets: [{
                    label: 'צריכת חשמל לפי שרת',
                    data: data,
                    borderColor: 'rgba(75, 192, 192, 0.8)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    fill: true
                }]
            };
        }

        // For bar chart
        return {
            labels: labels,
            datasets: [{
                label: 'צריכת חשמל לפי שרת',
                data: data,
                backgroundColor: this.generateColors(data.length),
                borderWidth: 1
            }]
        };
    }

    static transformDetailedPowerData(servers, type) {
        console.log('Transforming detailed power data:', { servers, type });
        
        const powerRanges = {
            '0-200W': 0,
            '201-400W': 0,
            '401-600W': 0,
            '600W+': 0
        };

        servers.forEach(server => {
            const power = server.power?.avg || 0;
            let range;
            
            if (power <= 200) range = '0-200W';
            else if (power <= 400) range = '201-400W';
            else if (power <= 600) range = '401-600W';
            else range = '600W+';
            
            powerRanges[range]++;
        });

        if (type === 'pie' || type === 'doughnut') {
            return {
                labels: Object.keys(powerRanges),
                datasets: [{
                    data: Object.values(powerRanges),
                    backgroundColor: this.generateColors(Object.keys(powerRanges).length)
                }]
            };
        }

        // For bar chart
        return {
            labels: Object.keys(powerRanges),
            datasets: [{
                label: 'התפלגות צריכת חשמל',
                data: Object.values(powerRanges),
                backgroundColor: this.generateColors(Object.keys(powerRanges).length),
                borderWidth: 1
            }]
        };
    }

    static transformLogSeverityData(data, chartType) {
        try {
            // For severity data, we can use it as is since it's already in the correct format
            // Just add some styling based on the chart type
            const baseColors = {
                ERROR: '#dc3545',
                WARNING: '#ffc107',
                INFO: '#17a2b8',
                DEBUG: '#6c757d'
            };

            const transformedData = {
                labels: data.labels,
                datasets: [{
                    data: data.datasets[0].data,
                    backgroundColor: data.labels.map(label => baseColors[label] || '#6c757d'),
                    borderColor: chartType === 'bar' ? 'transparent' : '#fff',
                    borderWidth: chartType === 'bar' ? 0 : 2,
                    hoverOffset: 4
                }]
            };

            return transformedData;
        } catch (error) {
            console.error('Error transforming severity data:', error);
            return null;
        }
    }

    static transformLogTimelineData(data, chartType) {
        try {
            const baseColor = '#3182ce';
            const transformedData = {
                labels: data.labels,
                datasets: [{
                    label: 'מספר לוגים',
                    data: data.datasets[0].data,
                    borderColor: baseColor,
                    backgroundColor: chartType === 'bar' 
                        ? baseColor 
                        : 'rgba(49, 130, 206, 0.1)',
                    fill: chartType === 'line',
                    tension: chartType === 'line' ? 0.4 : 0,
                    borderWidth: chartType === 'bar' ? 0 : 2
                }]
            };

            return transformedData;
        } catch (error) {
            console.error('Error transforming timeline data:', error);
            return null;
        }
    }
} 