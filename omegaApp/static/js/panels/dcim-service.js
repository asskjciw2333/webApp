// DCIM Service - handles all DCIM operations
export class DCIMService {
    static async updatePanel(panelData) {
        const response = await fetch(`${panelData.dcim_id}/update_dcim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(panelData)
        });

        if (!response.ok) {
            throw new Error('שגיאה בעדכון ה-DCIM');
        }

        return response.json();
    }

    static async updatePanelPorts(panelId, portsData) {
        const response = await fetch(`${panelId}/update_dcim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: panelData.name,
                interface: panelData.interface,
                status: panelData.status,
                how_many_ports_remain: portsData,
                classification: panelData.classification,
                destination: panelData.destination
            })
        });

        if (!response.ok) {
            throw new Error('שגיאה בעדכון הפורטים ב-DCIM');
        }

        return response.json();
    }
} 