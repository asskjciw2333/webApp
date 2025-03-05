import ServerDetails from './ServerDetails.js';

export default class ServerCard {
    static serverDetails = null;

    constructor(server, onServerClick) {
        this.server = server;
        this.onServerClick = onServerClick;
        
        // Initialize ServerDetails only once
        if (!ServerCard.serverDetails) {
            ServerCard.serverDetails = new ServerDetails();
        }
    }

    render() {
        const card = document.createElement('div');
        card.className = 'server-card';
        card.dataset.mgmtIp = this.server.mgmt_ip;
        card.innerHTML = this.createCardContent();
        
        // Add click handler
        card.addEventListener('click', () => {
            ServerCard.serverDetails.show(this.server);
            if (this.onServerClick) {
                this.onServerClick(this.server);
            }
        });

        // Add hover effect handler
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--x', `${x}%`);
            card.style.setProperty('--y', `${y}%`);
        });

        return card;
    }

    createCardContent() {
        return `
            <div class="server-card-header">
                <h3 class="server-card-title">${this.server.hostname || 'Unknown'}</h3>
                <div class="server-card-ip">${this.server.mgmt_ip}</div>
            </div>
            <div class="server-card-content">
                <div class="server-info-row">
                    <div class="server-info-col">
                        <div class="info-label">דגם</div>
                        <div class="info-value">${this.formatModel(this.server.model)}</div>
                    </div>
                    <div class="server-info-col">
                        <div class="info-label">מיקום</div>
                        <div class="info-value">${this.server.location?.data_center || 'N/A'}</div>
                    </div>
                </div>
                <div class="server-info-row">
                    <div class="server-info-col">
                        <div class="info-label">זיכרון</div>
                        <div class="info-value">${this.formatMemory(this.server.memory?.total)}</div>
                    </div>
                    <div class="server-info-col">
                        <div class="info-label">מעבדים</div>
                        <div class="info-value">${this.server.processors?.count || 'N/A'}</div>
                    </div>
                </div>
            </div>
            <div class="server-status">
                <div class="status-item consumption">
                    <span class="status-label">צריכה</span>
                    <span class="status-value">${this.formatPower(this.server.power?.avg)}</span>
                </div>
                <div class="status-item temperature ${this.getTemperatureClass(this.server.temperature?.avg)}">
                    <span class="status-label">טמפרטורה</span>
                    <span class="status-value">${this.formatTemperature(this.server.temperature?.avg)}</span>
                </div>
            </div>
        `;
    }

    formatModel(model) {
        if (!model) return 'N/A';
        return model.replace('ProLiant ', '').replace('PowerEdge ', '');
    }

    formatMemory(memory) {
        if (!memory) return 'N/A';
        return `GiB ${memory}`;
    }

    formatTemperature(temp) {
        if (!temp) return 'N/A';
        return `${temp}°C`;
    }

    formatPower(power) {
        if (!power) return 'N/A';
        return `${power}W`;
    }

    getTemperatureClass(temp) {
        if (!temp) return '';
        if (temp >= 35) return 'danger';
        if (temp >= 30) return 'warning';
        return 'normal';
    }

    static init() {
        if (document.querySelector('[data-server-card-initialized]')) return;
        document.documentElement.setAttribute('data-server-card-initialized', 'true');
        
        // Initialize ServerDetails styles
        ServerDetails.addStyles();
    }
} 