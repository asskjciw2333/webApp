import { ErrorHandler } from '../../core/error-handler.js';

class ServerDashboardService {
    constructor() {
        this.baseUrl = '/api/servers';
    }

    async getAllServers() {
        try {
            const response = await ErrorHandler.retryOperation(async () => {
                const res = await fetch(this.baseUrl);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res;
            });

            const data = await response.json();
            if (data.status === 'success') {
                return data.data;
            }
            throw new Error(data.message || 'Failed to fetch servers data');
        } catch (error) {
            ErrorHandler.handleAPIError(error);
            throw error;
        }
    }

    async getServer(mgmtIp) {
        try {
            const response = await ErrorHandler.retryOperation(async () => {
                const res = await fetch(`${this.baseUrl}/${mgmtIp}`);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res;
            });

            const data = await response.json();
            if (data.status === 'success') {
                return data.data;
            }
            throw new Error(data.message || 'Failed to fetch server data');
        } catch (error) {
            ErrorHandler.handleAPIError(error);
            throw error;
        }
    }

    async bulkUpdateDCIM(updates) {
        try {
            const response = await ErrorHandler.retryOperation(async () => {
                const endpoint = updates.analyze_all ? 
                    `${this.baseUrl}/dcim/analyze` :
                    `${this.baseUrl}/dcim/update`;

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(updates)
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw Object.assign(new Error(errorData.message || `HTTP error! status: ${res.status}`), {
                        status: res.status,
                        result: errorData
                    });
                }

                return res;
            });

            const data = await response.json();

            if (data.status === 'success') {
                return {
                    success: true,
                    updatedServers: data.updatedServers || [],
                    failedServers: data.failedServers || []
                };
            } else {
                throw new Error(data.message || 'Failed to update servers in DCIM');
            }
        } catch (error) {
            ErrorHandler.handleBulkUpdateError(error, error.result);
            throw error;
        }
    }
}

export default new ServerDashboardService(); 