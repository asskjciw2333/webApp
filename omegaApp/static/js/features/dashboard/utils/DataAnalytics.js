import { getColorPalette } from './ChartUtils.js';

export function getVendorDistribution(servers) {
    const vendors = {};
    servers.forEach(server => {
        const vendor = server.vendor || 'לא ידוע';
        vendors[vendor] = (vendors[vendor] || 0) + 1;
    });
    return {
        labels: Object.keys(vendors),
        data: Object.values(vendors),
        datasets: [{
            data: Object.values(vendors),
            backgroundColor: getColorPalette(Object.keys(vendors).length),
            borderWidth: 1,
            label: 'יצרן'
        }]
    };
}

export function getLocationDistribution(servers) {
    const locations = {};
    servers.forEach(server => {
        const location = server.location?.data_center || 'לא ידוע';
        locations[location] = (locations[location] || 0) + 1;
    });
    return {
        labels: Object.keys(locations),
        data: Object.values(locations),
        datasets: [{
            data: Object.values(locations),
            backgroundColor: getColorPalette(Object.keys(locations).length),
            borderWidth: 1,
            label: 'מיקום'
        }]
    };
}

export function getMemoryDistribution(servers) {
    const memoryRanges = {
        '0-32GB': 0,
        '32-64GB': 0,
        '64-128GB': 0,
        '128-256GB': 0,
        '256GB+': 0
    };
    
    servers.forEach(server => {
        const memory = server.memory?.total || 0;
        let range;
        
        if (memory <= 32) range = '0-32GB';
        else if (memory <= 64) range = '32-64GB';
        else if (memory <= 128) range = '64-128GB';
        else if (memory <= 256) range = '128-256GB';
        else range = '256GB+';
        
        memoryRanges[range]++;
    });

    return {
        labels: Object.keys(memoryRanges),
        data: Object.values(memoryRanges),
        datasets: [{
            data: Object.values(memoryRanges),
            backgroundColor: getColorPalette(Object.keys(memoryRanges).length),
            borderWidth: 1,
            label: 'זיכרון'
        }]
    };
}

export function getPowerDistribution(servers) {
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

    return {
        labels: Object.keys(powerRanges),
        data: Object.values(powerRanges),
        datasets: [{
            data: Object.values(powerRanges),
            backgroundColor: getColorPalette(Object.keys(powerRanges).length),
            borderWidth: 1,
            label: 'התפלגות צריכת חשמל'
        }]
    };
}

export function getStorageTypesDistribution(servers) {
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
                        const type = getStorageType(drive.model);
                        types.disks[type] = (types.disks[type] || 0) + 1;
                    });
                });
            }
            
            // Process PCIe devices
            if (server.storage.pcie) {
                Object.values(server.storage.pcie).forEach(devices => {
                    devices.forEach(device => {
                        const type = device.class || 'לא ידוע';
                        types.pcie[type] = (types.pcie[type] || 0) + 1;
                    });
                });
            }
        }
    });

    // Prepare datasets for both categories
    const diskLabels = Object.keys(types.disks);
    const pcieLabels = Object.keys(types.pcie);

    return {
        labels: [...diskLabels, ...pcieLabels],
        datasets: [
            {
                label: 'כונני דיסק',
                data: [...diskLabels.map(label => types.disks[label]), ...pcieLabels.map(() => 0)],
                backgroundColor: getColorPalette(diskLabels.length).map(color => color.replace('0.8)', '0.7)')),
                borderWidth: 1,
                stack: 'disks'
            },
            {
                label: 'התקני PCIe',
                data: [...diskLabels.map(() => 0), ...pcieLabels.map(label => types.pcie[label])],
                backgroundColor: getColorPalette(pcieLabels.length).map(color => color.replace('0.8)', '0.9)')),
                borderWidth: 1,
                stack: 'pcie'
            }
        ]
    };
}

export function getStorageCapacityDistribution(servers) {
    const capacityRanges = {
        '0-500GB': 0,
        '501GB-1TB': 0,
        '1TB-2TB': 0,
        '2TB-4TB': 0,
        '4TB+': 0
    };

    servers.forEach(server => {
        if (server.storage && server.storage.disks) {
            Object.values(server.storage.disks).forEach(drives => {
                drives.forEach(drive => {
                    const capacityGB = drive.capacity_gb || 0;
                    let range;
                    
                    if (capacityGB <= 500) range = '0-500GB';
                    else if (capacityGB <= 1000) range = '501GB-1TB';
                    else if (capacityGB <= 2000) range = '1TB-2TB';
                    else if (capacityGB <= 4000) range = '2TB-4TB';
                    else range = '4TB+';
                    
                    capacityRanges[range]++;
                });
            });
        }
    });

    return {
        labels: Object.keys(capacityRanges),
        datasets: [{
            label: 'קיבולת אחסון',
            data: Object.values(capacityRanges),
            backgroundColor: getColorPalette(Object.keys(capacityRanges).length),
            borderWidth: 1
        }]
    };
}

export function getCoresDistribution(servers) {
    const ranges = {
        '0-24': 0,
        '25-48': 0,
        '49-96': 0,
        '97+': 0
    };

    servers.forEach(server => {
        const totalCores = (server.processors?.count || 0) * (server.processors?.cores_per_cpu || 0);
        let range;
        
        if (totalCores <= 24) range = '0-24';
        else if (totalCores <= 48) range = '25-48';
        else if (totalCores <= 96) range = '49-96';
        else range = '97+';
        
        ranges[range]++;
    });

    return {
        labels: Object.keys(ranges),
        data: Object.values(ranges),
        datasets: [{
            data: Object.values(ranges),
            backgroundColor: getColorPalette(Object.keys(ranges).length),
            borderWidth: 1,
            label: 'ליבות'
        }]
    };
}

export function getTemperatureDistribution(servers) {
    const tempRanges = {
        '20-25': 0,
        '26-30': 0,
        '31-35': 0,
        '36+': 0
    };

    servers.forEach(server => {
        const avgTemp = server.temperature?.avg;
        if (!avgTemp) return;
        
        let range;
        if (avgTemp <= 25) range = '20-25';
        else if (avgTemp <= 30) range = '26-30';
        else if (avgTemp <= 35) range = '31-35';
        else range = '36+';
        
        tempRanges[range]++;
    });

    return {
        labels: Object.keys(tempRanges),
        data: Object.values(tempRanges),
        datasets: [{
            data: Object.values(tempRanges),
            backgroundColor: getColorPalette(Object.keys(tempRanges).length),
            borderWidth: 1,
            label: 'טמפרטורה'
        }]
    };
}

export function getNetworkCardsDistribution(servers) {
    const cards = {};
    servers.forEach(server => {
        if (server.internal_devices) {
            server.internal_devices
                .filter(device => device.vendor)
                .forEach(device => {
                    cards[device.vendor] = (cards[device.vendor] || 0) + 1;
                });
        }
    });
    return {
        labels: Object.keys(cards),
        data: Object.values(cards),
        datasets: [{
            data: Object.values(cards),
            backgroundColor: getColorPalette(Object.keys(cards).length),
            borderWidth: 1,
            label: 'כרטיסי רשת'
        }]
    };
}

export function getNetworkSpeedsDistribution(servers) {
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
                    let speed;
                    if (name.includes('100gb')) speed = '100GbE';
                    else if (name.includes('40gb')) speed = '40GbE';
                    else if (name.includes('25gb')) speed = '25GbE';
                    else if (name.includes('10gb')) speed = '10GbE';
                    else if (name.includes('1gb')) speed = '1GbE';
                    else return;
                    
                    speeds[speed]++;
                });
        }
    });
    return {
        labels: Object.keys(speeds),
        data: Object.values(speeds),
        datasets: [{
            data: Object.values(speeds),
            backgroundColor: getColorPalette(Object.keys(speeds).length),
            borderWidth: 1,
            label: 'מהירויות רשת'
        }]
    };
}

export function getTemperatureByServer(servers) {
    const filteredServers = servers
        .filter(server => server.temperature?.avg)
        .sort((a, b) => (b.temperature.avg || 0) - (a.temperature.avg || 0));

    const labels = filteredServers.map(s => s.hostname || s.mgmt_ip);
    const data = filteredServers.map(s => s.temperature.avg || 0);
    
    return {
        labels: labels,
        data: data,
        datasets: [{
            data: data,
            backgroundColor: getColorPalette(labels.length),
            borderWidth: 1,
            label: 'טמפרטורה לפי שרת'
        }]
    };
}

function getStorageType(model) {
    if (!model) return 'לא ידוע';
    const modelLower = model.toLowerCase();
    if (modelLower.includes('nvme')) return 'NVMe';
    if (modelLower.includes('ssd')) return 'SSD';
    if (modelLower.includes('hdd')) return 'HDD';
    return 'אחר';
}

export function getNetworkAnalysis(servers) {
    const networkData = {
        cards: {},
        speeds: {
            '1GbE': 0,
            '10GbE': 0,
            '25GbE': 0,
            '40GbE': 0,
            '100GbE': 0
        }
    };
    
    servers.forEach(server => {
        if (server.internal_devices) {
            server.internal_devices
                .filter(device => device.vendor)
                .forEach(device => {
                    // Count card types
                    const vendor = device.vendor || 'Unknown';
                    networkData.cards[vendor] = (networkData.cards[vendor] || 0) + 1;
                    
                    // Count speeds
                    const name = device.name.toLowerCase();
                    let speed;
                    if (name.includes('100gb')) speed = '100GbE';
                    else if (name.includes('40gb')) speed = '40GbE';
                    else if (name.includes('25gb')) speed = '25GbE';
                    else if (name.includes('10gb')) speed = '10GbE';
                    else if (name.includes('1gb')) speed = '1GbE';
                    
                    if (speed) {
                        networkData.speeds[speed]++;
                    }
                });
        }
    });

    return {
        cards: {
            labels: Object.keys(networkData.cards),
            datasets: [{
                data: Object.values(networkData.cards),
                backgroundColor: getColorPalette(Object.keys(networkData.cards).length),
                borderWidth: 1,
                label: 'כרטיסי רשת לפי יצרן'
            }]
        },
        speeds: {
            labels: Object.keys(networkData.speeds),
            datasets: [{
                data: Object.values(networkData.speeds),
                backgroundColor: getColorPalette(Object.keys(networkData.speeds).length),
                borderWidth: 1,
                label: 'מהירויות רשת'
            }]
        }
    };
}

export function getPowerByServer(servers) {
    const filteredServers = servers
        .filter(server => server.power?.avg)
        .sort((a, b) => (b.power.avg || 0) - (a.power.avg || 0));

    const labels = filteredServers.map(s => s.hostname || s.mgmt_ip);
    const data = filteredServers.map(s => s.power.avg || 0);
    
    return {
        labels: labels,
        data: data,
        datasets: [{
            data: data,
            backgroundColor: getColorPalette(labels.length),
            borderWidth: 1,
            label: 'צריכת חשמל לפי שרת (W)'
        }]
    };
} 