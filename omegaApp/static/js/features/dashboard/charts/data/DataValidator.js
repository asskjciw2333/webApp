export class DataValidator {
    static validateChartData(data, type) {
        if (!data) return { isValid: false, error: 'No data provided' };

        switch (type) {
            case 'bar':
            case 'line':
                return this.validateAxisChartData(data);
            case 'pie':
            case 'doughnut':
                return this.validatePolarChartData(data);
            default:
                return { isValid: false, error: `Unknown chart type: ${type}` };
        }
    }

    static validateAxisChartData(data) {
        // Check for required properties
        if (!data.labels || !Array.isArray(data.labels)) {
            return { isValid: false, error: 'Labels must be an array' };
        }

        // Check datasets format
        if (Array.isArray(data.datasets)) {
            for (let i = 0; i < data.datasets.length; i++) {
                const dataset = data.datasets[i];
                if (!dataset.data || !Array.isArray(dataset.data)) {
                    return { 
                        isValid: false, 
                        error: `Dataset ${i} must have a data array` 
                    };
                }
                if (dataset.data.length !== data.labels.length) {
                    return { 
                        isValid: false, 
                        error: `Dataset ${i} length must match labels length` 
                    };
                }
            }
        } else {
            // Check single data array format
            if (!data.data || !Array.isArray(data.data)) {
                return { isValid: false, error: 'Data must be an array' };
            }
            if (data.data.length !== data.labels.length) {
                return { 
                    isValid: false, 
                    error: 'Data length must match labels length' 
                };
            }
        }

        return { isValid: true };
    }

    static validatePolarChartData(data) {
        // Check for required properties
        if (!data.labels || !Array.isArray(data.labels)) {
            return { isValid: false, error: 'Labels must be an array' };
        }

        // Check datasets format
        if (Array.isArray(data.datasets)) {
            for (let i = 0; i < data.datasets.length; i++) {
                const dataset = data.datasets[i];
                if (!dataset.data || !Array.isArray(dataset.data)) {
                    return { 
                        isValid: false, 
                        error: `Dataset ${i} must have a data array` 
                    };
                }
                if (dataset.data.length !== data.labels.length) {
                    return { 
                        isValid: false, 
                        error: `Dataset ${i} length must match labels length` 
                    };
                }
                if (!this.validateNumericArray(dataset.data)) {
                    return { 
                        isValid: false, 
                        error: `Dataset ${i} must contain only numeric values` 
                    };
                }
            }
        } else {
            // Check single data array format
            if (!data.data || !Array.isArray(data.data)) {
                return { isValid: false, error: 'Data must be an array' };
            }
            if (data.data.length !== data.labels.length) {
                return { 
                    isValid: false, 
                    error: 'Data length must match labels length' 
                };
            }
            if (!this.validateNumericArray(data.data)) {
                return { 
                    isValid: false, 
                    error: 'Data must contain only numeric values' 
                };
            }
        }

        return { isValid: true };
    }

    static validateNumericArray(arr) {
        return arr.every(val => 
            typeof val === 'number' && !isNaN(val) && isFinite(val));
    }

    static validateMetricData(servers, metric) {
        console.log(`Validating ${metric} data for servers:`, servers);
        
        switch (metric) {
            case 'vendor':
                return this.validateVendorData(servers);
            case 'location':
                return this.validateLocationData(servers);
            case 'memory':
                return this.validateMemoryData(servers);
            case 'power':
                return this.validatePowerData(servers);
            case 'storage_type':
                return this.validateStorageTypeData(servers);
            case 'storage_capacity':
                return this.validateStorageCapacityData(servers);
            case 'cpu':
                return this.validateCPUData(servers);
            case 'temperature':
                return this.validateTemperatureData(servers);
            case 'network_vendor':
                return this.validateNetworkVendorData(servers);
            case 'network_speed':
                return this.validateNetworkSpeedData(servers);
            case 'power_by_server':
                return this.validatePowerByServerData(servers);
            case 'detailed_power':
                return this.validateDetailedPowerData(servers);
            case 'severity':
                return this.validateLogSeverityData(servers);
            case 'timeline':
                return this.validateLogTimelineData(servers);
            default:
                console.error(`Unknown metric: ${metric}`);
                return { isValid: false, error: `מטריקה לא ידועה: ${metric}` };
        }
    }

    static validateVendorData(servers) {
        const validServers = servers.filter(server => 
            server.vendor !== undefined);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'No servers with valid vendor data' 
            };
        }

        // Group servers by vendor to ensure we have meaningful data
        const vendorGroups = validServers.reduce((acc, server) => {
            const vendor = server.vendor || 'Unknown';
            acc[vendor] = (acc[vendor] || 0) + 1;
            return acc;
        }, {});

        if (Object.keys(vendorGroups).length === 0) {
            return {
                isValid: false,
                error: 'No vendor distribution data available'
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateTemperatureData(servers) {
        const validServers = servers.filter(server => 
            server?.temperature?.avg !== undefined);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'No servers with valid temperature data' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validatePowerData(servers) {
        console.log('Validating power data for servers:', servers);
        
        const validServers = servers.filter(server => {
            const isValid = server?.power?.avg !== undefined;
            if (!isValid) {
                console.log('Invalid power data for server:', server);
            }
            return isValid;
        });

        console.log('Valid servers with power data:', validServers);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'No servers with valid power data' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateMemoryData(servers) {
        const validServers = servers.filter(server => 
            server?.memory?.total !== undefined);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'No servers with valid memory data' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateLocationData(servers) {
        const validServers = servers.filter(server => 
            server.location?.data_center !== undefined);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני מיקום תקינים' 
            };
        }

        // Group servers by location to ensure we have meaningful data
        const locationGroups = validServers.reduce((acc, server) => {
            const location = server.location.data_center || 'לא ידוע';
            acc[location] = (acc[location] || 0) + 1;
            return acc;
        }, {});

        if (Object.keys(locationGroups).length === 0) {
            return {
                isValid: false,
                error: 'אין נתונים זמינים להתפלגות לפי מיקום'
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateStorageData(servers) {
        if (!Array.isArray(servers)) {
            return { isValid: false, error: 'נתוני השרתים אינם בפורמט תקין' };
        }

        const validServers = servers.filter(server => 
            server && 
            server.storage && 
            (server.storage.disks || server.storage.pcie)
        );

        if (validServers.length === 0) {
            return { isValid: false, error: 'לא נמצאו שרתים עם נתוני אחסון תקינים' };
        }

        return { isValid: true, data: validServers };
    }

    static validateCPUData(servers) {
        const validServers = servers.filter(server => 
            server.processors?.count !== undefined && 
            server.processors?.cores_per_cpu !== undefined);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני מעבד תקינים' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateNetworkData(servers) {
        const validServers = servers.filter(server => 
            server.network_cards && 
            Array.isArray(server.network_cards) && 
            server.network_cards.length > 0);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני רשת תקינים' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateCarbonData(servers) { // TODO: delete this func?
        const validServers = servers.filter(server => 
            server.power?.carbon_emissions !== undefined);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני פליטות פחמן תקינים' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateEfficiencyData(servers) { // TODO: delete this func?
        const validServers = servers.filter(server => 
            server.power?.efficiency !== undefined);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני יעילות אנרגטית תקינים' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateCoolingData(servers) {
        const validServers = servers.filter(server => 
            server.cooling?.type !== undefined);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני מערכת קירור תקינים' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateStorageTypeData(servers) {
        const validation = this.validateStorageData(servers);
        if (!validation.isValid) {
            return validation;
        }

        const hasValidTypes = validation.data.some(server => {
            const hasDisks = server.storage.disks && 
                           Object.values(server.storage.disks).some(drives => 
                               drives.some(drive => drive.model));
            
            const hasPcie = server.storage.pcie && 
                          Object.values(server.storage.pcie).some(devices => 
                              devices.some(device => device.class));
            
            return hasDisks || hasPcie;
        });

        if (!hasValidTypes) {
            return { 
                isValid: false, 
                error: 'לא נמצאו שרתים עם נתוני סוגי אחסון תקינים (דיסקים או התקני PCIe)' 
            };
        }

        // בדיקה נוספת לתקינות המידע
        const invalidServers = validation.data.filter(server => {
            if (server.storage.disks) {
                const invalidDisks = Object.values(server.storage.disks).some(drives => 
                    drives.some(drive => !drive.model || !drive.capacity_gb)
                );
                if (invalidDisks) return true;
            }
            if (server.storage.pcie) {
                const invalidPcie = Object.values(server.storage.pcie).some(devices => 
                    devices.some(device => !device.class || !device.name)
                );
                if (invalidPcie) return true;
            }
            return false;
        });

        if (invalidServers.length > 0) {
            console.warn('נמצאו שרתים עם נתוני אחסון חלקיים:', 
                invalidServers.map(s => s.hostname || s.mgmt_ip));
        }

        return { isValid: true, data: validation.data };
    }

    static validateStorageCapacityData(servers) {
        const validation = this.validateStorageData(servers);
        if (!validation.isValid) {
            return validation;
        }

        // בדיקה שיש לפחות שרת אחד עם נתוני אחסון תקינים
        const hasValidCapacity = validation.data.some(server => {
            if (!server.storage?.disks) return false;
            
            // חישוב סך הקיבולת של השרת
            let totalCapacity = 0;
            let hasValidDrives = false;

            Object.values(server.storage.disks).forEach(drives => {
                drives.forEach(drive => {
                    if (drive.capacity_gb) {
                        totalCapacity += drive.capacity_gb;
                        hasValidDrives = true;
                    }
                });
            });

            return hasValidDrives && totalCapacity > 0;
        });

        if (!hasValidCapacity) {
            return { 
                isValid: false, 
                error: 'לא נמצאו שרתים עם נתוני קיבולת אחסון תקינים' 
            };
        }

        // בדיקת ערכים חריגים ברמת השרת
        const serversWithAnomalies = validation.data.filter(server => {
            if (!server.storage?.disks) return false;
            
            let totalCapacity = 0;
            Object.values(server.storage.disks).forEach(drives => {
                drives.forEach(drive => {
                    totalCapacity += drive.capacity_gb || 0;
                });
            });

            // חריג אם סך הקיבולת קטן מ-100GB או גדול מ-100TB
            return totalCapacity < 100 || totalCapacity > 102400;
        });

        if (serversWithAnomalies.length > 0) {
            console.warn('נמצאו שרתים עם ערכי קיבולת חריגים:', 
                serversWithAnomalies.map(s => ({
                    server: s.hostname || s.mgmt_ip,
                    totalCapacity: Object.values(s.storage.disks).reduce((total, drives) => 
                        total + drives.reduce((sum, drive) => sum + (drive.capacity_gb || 0), 0), 0)
                }))
            );
        }

        return { isValid: true, data: validation.data };
    }

    static validateNetworkVendorData(servers) {
        const validServers = servers.filter(server => {
            if (!server.internal_devices) return false;
            return server.internal_devices.some(device => 
                device.vendor);
        });

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני יצרני כרטיסי רשת תקינים' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateNetworkSpeedData(servers) {
        const validServers = servers.filter(server => {
            if (!server.internal_devices) return false;
            return server.internal_devices.some(device => 
                 device.name);
        });

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני מהירויות רשת תקינים' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validatePowerByServerData(servers) {
        console.log('Validating power by server data');
        
        const validServers = servers.filter(server => {
            const isValid = server?.power?.avg !== undefined;
            if (!isValid) {
                console.log('Invalid power data for server:', server);
            }
            return isValid;
        });

        console.log('Valid servers with power data:', validServers);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני צריכת חשמל תקינים' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateDetailedPowerData(servers) {
        console.log('Validating detailed power distribution data');
        
        const validServers = servers.filter(server => {
            const isValid = server?.power?.avg !== undefined;
            if (!isValid) {
                console.log('Invalid power data for server:', server);
            }
            return isValid;
        });

        console.log('Valid servers with power data:', validServers);

        if (validServers.length === 0) {
            return { 
                isValid: false, 
                error: 'אין שרתים עם נתוני צריכת חשמל תקינים' 
            };
        }

        return { isValid: true, data: validServers };
    }

    static validateLogSeverityData(data) {
        if (!data || typeof data !== 'object') {
            return { 
                isValid: false, 
                error: 'נתוני חומרת לוגים לא תקינים' 
            };
        }

        const requiredSeverities = ['ERROR', 'WARNING', 'INFO', 'DEBUG'];
        const hasAllSeverities = requiredSeverities.every(severity => 
            data.labels?.includes(severity));

        if (!hasAllSeverities) {
            return {
                isValid: false,
                error: 'חסרות רמות חומרה נדרשות'
            };
        }

        if (!data.datasets?.[0]?.data || 
            data.datasets[0].data.length !== requiredSeverities.length) {
            return {
                isValid: false,
                error: 'נתוני התפלגות חומרה לא תקינים'
            };
        }

        return { isValid: true, data };
    }

    static validateLogTimelineData(data) {
        if (!data || typeof data !== 'object') {
            return { 
                isValid: false, 
                error: 'נתוני ציר זמן לא תקינים' 
            };
        }

        if (!data.labels || !Array.isArray(data.labels)) {
            return {
                isValid: false,
                error: 'חסרים תוויות זמן'
            };
        }

        if (!data.datasets?.[0]?.data || 
            data.datasets[0].data.length !== data.labels.length) {
            return {
                isValid: false,
                error: 'נתוני התפלגות זמן לא תקינים'
            };
        }

        // Validate time format (HH:00)
        const timeFormat = /^([0-1]?[0-9]|2[0-3]):00$/;
        const validTimeFormat = data.labels.every(label => 
            timeFormat.test(label));

        if (!validTimeFormat) {
            return {
                isValid: false,
                error: 'פורמט זמן לא תקין'
            };
        }

        return { isValid: true, data };
    }
} 