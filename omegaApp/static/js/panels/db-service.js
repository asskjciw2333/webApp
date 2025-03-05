// DB Service - handles all database operations
export class DBService {
    static async updatePanel(panelData) {
        const response = await fetch(`${panelData.dcim_id}/edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(panelData)
        });

        if (!response.ok) {
            throw new Error(`Database error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'שגיאה בשמירת הנתונים');
        }

        return data;
    }

    static async updatePanelPorts(panelId, portsData, originalPanelData) {
        const updatedData = {
            dcim_id: panelId,
            name: originalPanelData.name,
            interface: originalPanelData.interface,
            status: originalPanelData.status,
            how_many_ports_remain: portsData,
            classification: originalPanelData.classification,
            destination: originalPanelData.destination
        };

        const response = await fetch(`${panelId}/edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            throw new Error('שגיאה בעדכון הפורטים במסד הנתונים');
        }

        return response.json();
    }
} 