import ServerDashboardService from './ServerDashboardService.js';
import ServerCard from './components/ServerCard.js';
import ServerDetails from './components/ServerDetails.js';
import AnalyticsView from './components/AnalyticsView.js';
import TableView from './components/TableView.js';
import RackView from './components/RackView.js';
import { showNotification } from '../../core/notifications.js';
import {ErrorHandler} from '../../core/error-handler.js';

export default class ServerDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.servers = [];
        this.selectedServer = null;
        this.init();
    }

    async init() {
        this.createLayout();
        await this.loadServers();
        this.setupRefreshInterval();
        this.setupDCIMHandlers();
        this.viewSelect.value = 'analytics'; // Set default view
        this.switchView();
    }

    createLayout() {
        this.container.classList.add('dashboard-container');
        this.container.innerHTML = `
            <div class="dashboard-header">
                <h2>דשבורד שרתים</h2>
                <div class="header-controls">
                    <div class="search-section">
                        <div class="search-wrapper">
                            <input type="text" id="searchInput" placeholder="חיפוש לפי שם, IP או מספר סידורי..." class="search-input">
                            <svg class="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M12.25 12.25L9.71251 9.71251" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <button class="search-clear" id="searchClear" type="button" aria-label="נקה חיפוש">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11 1L1 11M1 1L11 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="filters-section">
                        <select id="filterSelect" class="filter-select">
                            <option value="">כל האתרים</option>
                        </select>
                        <select id="viewSelect" class="view-select">
                            <option value="analytics">אנליטיקה</option>
                            <option value="cards">כרטיסים</option>
                            <option value="table">טבלה</option>
                            <option value="rack">מפת ארון</option>
                        </select>
                    </div>
                </div>
                <div class="dashboard-stats">
                    <div class="stat-item">
                        <span class="stat-label">שרתים פעילים</span>
                        <span class="stat-value" id="activeServers">18</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">צריכת חשמל כוללת</span>
                        <span class="stat-value" id="totalPower">8460W</span>
                    </div>
                </div>
            </div>

            <div class="dashboard-content">
                <div id="serversGrid" class="servers-grid"></div>
                <div id="serverDetails" class="server-details hidden"></div>
                <div id="analyticsView" class="analytics-view hidden"></div>
                <div id="tableView" class="table-view hidden"></div>
                <div id="rackView" class="rack-view hidden"></div>
            </div>
        `;

        // Initialize components
        this.searchInput = document.getElementById('searchInput');
        this.searchClear = document.getElementById('searchClear');
        this.filterSelect = document.getElementById('filterSelect');
        this.viewSelect = document.getElementById('viewSelect');
        this.serversGrid = document.getElementById('serversGrid');
        this.serverDetails = new ServerDetails(document.getElementById('serverDetails'));
        this.analyticsView = new AnalyticsView(document.getElementById('analyticsView'), this.servers);
        this.tableView = new TableView(document.getElementById('tableView'));
        this.rackView = new RackView(document.getElementById('rackView'));

        // Set up server selection callback for rack view
        this.rackView.onServerSelect = (server) => this.showServerDetails(server);

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', () => {
            this.filterServers();
            this.updateSearchClearVisibility();
        });

        this.searchClear.addEventListener('click', () => {
            this.searchInput.value = '';
            this.filterServers();
            this.updateSearchClearVisibility();
            this.searchInput.focus();
        });

        this.filterSelect.addEventListener('change', () => this.filterServers());
        this.viewSelect.addEventListener('change', () => this.switchView());
    }

    async loadServers() {
        try {
            if (!document.getElementById('loading-indicator')) {
                this.showLoading();
            }
            
            const servers = await ServerDashboardService.getAllServers();
            
            if (Array.isArray(servers)) {
                this.servers = servers;
                this.updateLocationsFilter();
                this.filterServers();
                this.updateDashboardStats();
            } else {
                throw new Error('תבנית נתונים לא תקינה');
            }
        } catch (error) {
            ErrorHandler.handleAPIError(error);
        } finally {
            this.hideLoading();
        }
    }

    updateLocationsFilter() {
        const locations = new Set();
        this.servers.forEach(server => {
            if (server.location?.data_center) {
                locations.add(server.location.data_center);
            }
        });

        this.filterSelect.innerHTML = '<option value="">כל האתרים</option>' +
            Array.from(locations)
                .sort()
                .map(loc => `<option value="${loc}">${loc}</option>`)
                .join('');
    }

    filterServers() {
        const filtered = this.getFilteredServers();

        // Update all views with filtered data
        this.renderServersGrid(filtered);

        // If table view is active, update it
        if (this.viewSelect.value === 'table') {
            this.tableView.show(filtered);
        }

        // If analytics view is active, update it
        if (this.viewSelect.value === 'analytics') {
            this.analyticsView.updateServers(filtered);
        }

        // If rack view is active, update it
        if (this.viewSelect.value === 'rack') {
            this.rackView.show(filtered);
        }
    }

    renderServersGrid(servers = this.servers) {
        if (!servers || servers.length === 0) {
            this.serversGrid.innerHTML = this.createEmptyState();
            this.serverDetails.hide();
            return;
        }

        this.serversGrid.innerHTML = '';
        servers.forEach(server => {
            const card = new ServerCard(server, (server) => this.showServerDetails(server));
            this.serversGrid.appendChild(card.render());
        });
    }

    showServerDetails(server) {
        this.selectedServer = server;
        this.serverDetails.show(server);
    }

    switchView() {
        const view = this.viewSelect.value;
        const filteredServers = this.getFilteredServers();

        // Hide all views
        this.serversGrid.classList.add('hidden');
        this.serverDetails.hide();
        this.analyticsView.container.classList.add('hidden');
        this.tableView.hide();
        this.rackView.hide();

        // Show selected view with filtered data
        switch (view) {
            case 'cards':
                this.serversGrid.classList.remove('hidden');
                this.renderServersGrid(filteredServers);
                break;
            case 'analytics':
                this.analyticsView.container.classList.remove('hidden');
                this.analyticsView.updateServers(filteredServers);
                break;
            case 'table':
                this.tableView.show(filteredServers);
                break;
            case 'rack':
                this.rackView.show(filteredServers);
                break;
        }
    }

    getFilteredServers() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const locationFilter = this.filterSelect.value;

        return this.servers.filter(server => {
            const matchesSearch =
                server.hostname?.toLowerCase().includes(searchTerm) ||
                server.mgmt_ip?.toLowerCase().includes(searchTerm) ||
                server.serial?.toLowerCase().includes(searchTerm);

            const matchesLocation = !locationFilter ||
                server.location?.data_center === locationFilter;

            return matchesSearch && matchesLocation;
        });
    }

    createEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M21 9V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V9M21 9L12 3L3 9M21 9H3" />
                        <path d="M9 21V15C9 13.8954 9.89543 13 11 13H13C14.1046 13 15 13.8954 15 15V21" />
                    </svg>
                </div>
                <h3>אין נתוני שרתים</h3>
                <p>לא נמצאו קבצי JSON בתיקיית הנתונים</p>
                <p class="empty-state-path">נתיב: omegaApp/data/servers/</p>
                <div class="empty-state-help">
                    <p>כדי להתחיל:</p>
                    <ol>
                        <li>וודא שהתיקייה קיימת</li>
                        <li>הוסף קבצי JSON בפורמט הנדרש</li>
                        <li>המערכת תזהה אותם אוטומטית</li>
                    </ol>
                </div>
            </div>
        `;
    }

    setupRefreshInterval() {
        // Refresh data every 5 minutes
        setInterval(() => this.loadServers(), 5 * 60 * 1000);
    }

    setupDCIMHandlers() {
        // Set up handler for DCIM updates in table view
        this.tableView.setUpdateDCIMHandler(async (updates) => {
            try {
                const result = await ServerDashboardService.bulkUpdateDCIM(updates);
                if (result.status === 'success') {
                    // Reload servers to get updated DCIM status
                    await this.loadServers();
                    this.showSuccess('עודכן בהצלחה ב-DCIM');
                } else {
                    throw new Error(result.error || 'שגיאה בעדכון ה-DCIM');
                }
            } catch (error) {
                console.error('Error updating DCIM:', error);
                showNotification('error', error.message);
            }
        });
    }

    showError(message) {
        showNotification('error', message);
    }

    showSuccess(message) {
        showNotification('success', message);
    }

    updateDashboardStats() {
        // שרת נחשב לא פעיל אם צריכת החשמל שלו היא 0
        const activeServers = this.servers.filter(server => (server.power?.avg || 0) > 0).length;
        const totalPower = this.servers.reduce((sum, server) => sum + (server.power?.avg || 0), 0);

        document.getElementById('activeServers').textContent = activeServers;
        document.getElementById('totalPower').textContent = `${Math.round(totalPower)}W`;
    }

    updateSearchClearVisibility() {
        if (this.searchInput.value) {
            this.searchClear.style.display = 'flex';
        } else {
            this.searchClear.style.display = 'none';
        }
    }

    showLoading() {
        const existingLoader = document.getElementById('loading-indicator');
        if (existingLoader) {
            return;
        }

        const loadingEl = document.createElement('div');
        loadingEl.id = 'loading-indicator';
        loadingEl.className = 'spinner-container visible';
        loadingEl.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loadingEl); 
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading-indicator');
        if (loadingEl) {
            loadingEl.remove();
        }
    }
} 