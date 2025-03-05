import { utils } from '../../core/utils.js';

export class ServerService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async findServer(searchType, searchTerm) {
        try {
            const response = await utils.fetchData(`${this.baseUrl}/api/automations/search_server`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    search_type: searchType,
                    search_term: searchTerm
                })
            });
            return response;
        } catch (error) {
            console.error('Error in findServer:', error);
            throw error;
        }
    }

    async pullFWList() {
        try {
            const response = await utils.fetchData(`${this.baseUrl}/api/automations/pull-fw-list-package`);
            if (response.status === "success") {
                return response.data;
            } else {
                console.error('Server returned error:', response);
                throw new Error(response.message || 'Failed to fetch firmware list');
            }
        } catch (error) {
            console.error('Error pulling FW list:', error);
            throw error;
        }
    }

    async startAutomation(params) {
        try {
            const prepareResponse = await this.prepareAutomation(params);
            
            await this.initiateAutomation(params.automation_type, prepareResponse.instance_id);
            
            return prepareResponse;
        } catch (error) {
            console.error('Server error:', error);
            throw new Error(error.message || 'שגיאה בהתחלת האוטומציה');
        }
    }

    async prepareAutomation(params) {
        try {
            const prepareParams = {
                automation_type: params.automation_type,
                params: {
                    server_name: params.params.server_name,
                    serial_number: params.params.serial_number,
                    data: params.params.data,
                    force_direct_upgrade: params.params.force_direct_upgrade,
                    intermediate_version: params.params.intermediate_version
                }
            };

            const response = await utils.fetchData(`${this.baseUrl}/api/automations/prepare-automation`, {
                method: 'POST',
                body: JSON.stringify(prepareParams)
            });

            if (!response || response.status !== "success") {
                throw new Error(response?.message || 'נכשלה הכנת האוטומציה');
            }

            return response.data;
        } catch (error) {
            console.error('Prepare automation error:', error);
            throw error;
        }
    }

    async initiateAutomation(automationType, instanceId) {
        console.log(automationType, instanceId);
        try {
            const response = await fetch(`${this.baseUrl}/api/automations/start-automation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    automation_type: automationType,
                    instance_id: instanceId
                })
            });

            if (!response.ok) {
                throw new Error('נכשלה התחלת האוטומציה');
            }

            return true;
        } catch (error) {
            console.error('Initiate automation error:', error);
            throw error;
        }
    }

    async fetchAutomations(userId) {
        try {
            const response = await utils.fetchData(`${this.baseUrl}/api/automations/list?user_id=${userId}`);

            const automations = {};
            for (const [id, data] of Object.entries(response)) {
                if (data.isTracked) {
                    automations[id] = {
                        ...data,
                        display: true
                    };
                }
            }
            return automations;

        } catch (error) {
            console.error('Error fetching automations:', error);
            throw error;
        }
    }

    async untrackAutomation(instanceId) {
        const response = await utils.fetchData(`${this.baseUrl}/api/automations/unTrack_automation`, {
            method: 'POST',
            body: JSON.stringify({ instance_id: instanceId })
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return response;
    }

    async stopAutomation(instanceId) {
        try {
            const response = await utils.fetchData(`${this.baseUrl}/api/automations/stop-automation`, {
                method: 'POST',
                body: JSON.stringify({ instance_id: instanceId })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            return response;
        } catch (error) {
            console.error('Stop automation error:', error);
            throw error;
        }
    }

    async pullAllCentralData() {
        try {
            const response = await utils.fetchData(`${this.baseUrl}/api/automations/admin/updateCentralServersData`);
            return response;
        } catch (error) {
            console.error('Error pulling central data:', error);
            throw error;
        }
    }
} 