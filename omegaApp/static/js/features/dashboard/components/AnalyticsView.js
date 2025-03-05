import BasicAnalytics from './BasicAnalytics.js';
import AdvancedAnalytics from './AdvancedAnalytics.js';
import { createChartTypeButtons } from '../utils/DomUtils.js';

export default class AnalyticsView {
    constructor(container, servers) {
        this.container = container;
        this.servers = servers;
        this.init();
    }

    init() {
        this.createLayout();
        this.basicAnalytics = new BasicAnalytics(this.container.querySelector('#basicAnalytics'));
        this.advancedAnalytics = new AdvancedAnalytics(this.container.querySelector('#advancedAnalytics'));
        this.setupEventListeners();
        this.updateAllAnalytics();
    }

    createLayout() {
        this.container.innerHTML = `
            <div class="analytics-header">
                <div class="analytics-tabs">
                    <div class="tabs-wrapper">
                        <button class="tab-btn active" data-tab="basic">
                            <svg class="tab-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 12V7M8 12V5M12 12V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            ניתוח בסיסי
                        </button>
                        <button class="tab-btn" data-tab="advanced">
                            <svg class="tab-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M13 8C13 10.7614 10.7614 13 8 13C5.23858 13 3 10.7614 3 8C3 5.23858 5.23858 3 8 3C10.7614 3 13 5.23858 13 8Z" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M9.5 6.5L6.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M6.5 6.5L9.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            ניתוח מתקדם
                        </button>
                    </div>
                </div>
                <div class="analytics-controls">
                    <div class="select-wrapper">
                        <select id="locationAnalysisType" class="analysis-select">
                            <option value="data_center">ניתוח לפי דאטה סנטר</option>
                            <option value="room">ניתוח לפי חדר</option>
                            <option value="rack">ניתוח לפי ארון</option>
                            <option value="row">ניתוח לפי שורה</option>
                        </select>
                    </div>
                    <div class="select-wrapper">
                        <select id="locationSelector" class="location-select">
                            <option value="">בחר מיקום...</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="analytics-content">
                <div id="basicAnalytics" class="tab-content active"></div>
                <div id="advancedAnalytics" class="tab-content"></div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .analytics-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-sm) var(--spacing-md);
                background: var(--background-color);
                border-bottom: 1px solid var(--border-color);
                margin-bottom: var(--spacing-md);
                position: sticky;
                top: 0;
                z-index: 10;
                backdrop-filter: blur(8px);
                background: rgba(var(--background-color-rgb), 0.85);
            }

            .analytics-tabs {
                display: flex;
                gap: var(--spacing-sm);
            }

            .tabs-wrapper {
                display: flex;
                gap: var(--spacing-xs);
                background: var(--background-color-secondary);
                padding: 3px;
                border-radius: var(--radius-lg);
            }

            .tab-btn {
                height: 32px;
                padding: 0 var(--spacing-sm);
                border: none;
                border-radius: calc(var(--radius-lg) - 2px);
                font-size: 0.8125rem;
                font-weight: 500;
                color: var(--text-color-secondary);
                background: transparent;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
            }

            .tab-icon {
                opacity: 0.7;
                transition: all 0.2s ease;
                flex-shrink: 0;
                stroke: currentColor;
            }

            .tab-btn:hover {
                color: var(--text-color-primary);
                background: var(--background-color-hover);
            }

            .tab-btn:hover .tab-icon {
                opacity: 1;
            }

            .tab-btn.active {
                color: var(--primary-color);
                background: var(--background-color);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
            }

            .tab-btn.active .tab-icon {
                opacity: 1;
                stroke: currentColor;
            }

            .analytics-controls {
                display: flex;
                gap: var(--spacing-sm);
                background: var(--background-color-secondary);
                padding: 3px;
                border-radius: var(--radius-lg);
            }

            .select-wrapper {
                position: relative;
                min-width: 200px;
                margin: 0 8px;
                background: var(--background-color);
                border: 1px solid var(--border-color);
                border-radius: 10px;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .select-wrapper:hover {
                border-color: var(--primary-color);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }

            .select-wrapper::after {
                content: '';
                position: absolute;
                right: 16px;
                top: 50%;
                width: 10px;
                height: 10px;
                border-right: 2px solid var(--text-color-secondary);
                border-bottom: 2px solid var(--text-color-secondary);
                transform: translateY(-70%) rotate(45deg);
                transition: all 0.25s ease;
                pointer-events: none;
            }

            .select-wrapper:hover::after {
                border-color: var(--primary-color);
            }

            .select-wrapper select {
                width: 100%;
                padding: 12px 40px 12px 16px;
                font-size: 14px;
                font-weight: 500;
                color: var(--text-color);
                background: transparent;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                appearance: none;
                -webkit-appearance: none;
            }

            .select-wrapper select:focus {
                outline: none;
            }

            .select-wrapper select:focus + .select-wrapper {
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px var(--primary-color-15);
            }

            .select-wrapper select option {
                padding: 12px;
                font-size: 14px;
                color: var(--text-color);
                background: var(--background-color);
            }

            .select-wrapper select option:hover {
                background: var(--primary-color-15);
            }

            /* Add focus-within state */
            .select-wrapper:focus-within {
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px var(--primary-color-15);
            }

            /* Add active state */
            .select-wrapper:active {
                transform: scale(0.98);
            }

            /* Improve disabled state */
            .select-wrapper select:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .select-wrapper:has(select:disabled) {
                opacity: 0.6;
                cursor: not-allowed;
                background: var(--background-color-disabled);
            }

            /* Add loading state */
            .select-wrapper.loading::after {
                border: 2px solid var(--primary-color);
                border-radius: 50%;
                border-right-color: transparent;
                animation: rotate 0.8s linear infinite;
                width: 16px;
                height: 16px;
                transform: translateY(-50%);
            }

            @keyframes rotate {
                from { transform: translateY(-50%) rotate(0deg); }
                to { transform: translateY(-50%) rotate(360deg); }
            }

            /* RTL Support */
            [dir="rtl"] .select-wrapper::after {
                right: auto;
                left: 16px;
            }

            [dir="rtl"] .select-wrapper select {
                padding: 12px 16px 12px 40px;
            }

            .analytics-content {
                padding: 0 var(--spacing-md);
            }

            .tab-content {
                display: none;
                animation: fadeIn 0.2s ease;
            }

            .tab-content.active {
                display: block;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* RTL Support */
            [dir="rtl"] .tab-btn {
                flex-direction: row-reverse;
            }

            [dir="rtl"] .select-icon {
                right: auto;
                left: 0.75rem;
            }

            [dir="rtl"] .analysis-select,
            [dir="rtl"] .location-select {
                padding: 0 0.875rem 0 2rem;
            }

            /* Responsive Design */
            @media (max-width: 1024px) {
                .analytics-header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: var(--spacing-sm);
                    padding: var(--spacing-sm);
                }

                .analytics-tabs {
                    order: -1;
                }

                .tabs-wrapper {
                    width: 100%;
                    justify-content: center;
                }

                .analytics-controls {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    width: 100%;
                }

                .select-wrapper {
                    min-width: 0;
                }
            }

            @media (max-width: 480px) {
                .analytics-controls {
                    grid-template-columns: 1fr;
                    gap: var(--spacing-xs);
                }

                .tab-btn {
                    flex: 1;
                    justify-content: center;
                    font-size: 0.75rem;
                }

                .tab-icon {
                    width: 14px;
                    height: 14px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        this.container.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => this.handleTabChange(button));
        });

        const locationTypeSelect = this.container.querySelector('#locationAnalysisType');
        if (locationTypeSelect) {
            locationTypeSelect.addEventListener('change', () => {
                this.updateLocationSelector();
                this.updateAnalytics();
            });
        }

        const locationSelect = this.container.querySelector('#locationSelector');
        if (locationSelect) {
            locationSelect.addEventListener('change', () => this.updateAnalytics());
        }
    }

    handleTabChange(button) {
        // Remove active class from all buttons and content
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.container.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        const tabName = button.dataset.tab;
        const content = this.container.querySelector(`#${tabName}Analytics`);
        if (content) {
            content.classList.add('active');
        }
    }

    updateLocationSelector() {
        const locationTypeSelect = this.container.querySelector('#locationAnalysisType');
        const locationSelect = this.container.querySelector('#locationSelector');
        
        if (!locationTypeSelect || !locationSelect) return;

        const locationType = locationTypeSelect.value;
        const locations = new Set();

        this.servers.forEach(server => {
            if (server.location) {
                switch (locationType) {
                    case 'data_center':
                        if (server.location.data_center) locations.add(server.location.data_center);
                        break;
                    case 'room':
                        if (server.location.room) locations.add(server.location.room);
                        break;
                    case 'rack':
                        if (server.location.rack) locations.add(server.location.rack);
                        break;
                    case 'row':
                        if (server.location.row) locations.add(server.location.row);
                        break;
                }
            }
        });

        // Update location selector options
        locationSelect.innerHTML = '<option value="">בחר מיקום...</option>';
        Array.from(locations).sort().forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationSelect.appendChild(option);
        });
    }

    getFilteredServers() {
        const locationTypeSelect = this.container.querySelector('#locationAnalysisType');
        const locationSelect = this.container.querySelector('#locationSelector');
        
        if (!locationTypeSelect || !locationSelect || !locationSelect.value) {
            return this.servers;
        }

        const locationType = locationTypeSelect.value;
        const selectedLocation = locationSelect.value;

        return this.servers.filter(server => {
            if (!server.location) return false;
            
            switch (locationType) {
                case 'data_center':
                    return server.location.data_center === selectedLocation;
                case 'room':
                    return server.location.room === selectedLocation;
                case 'rack':
                    return server.location.rack === selectedLocation;
                case 'row':
                    return server.location.row === selectedLocation;
                default:
                    return true;
            }
        });
    }

    updateAllAnalytics() {
        this.updateLocationSelector();
        this.updateAnalytics();
    }

    updateAnalytics() {
        const filteredServers = this.getFilteredServers();
        this.basicAnalytics.update(filteredServers);
        this.advancedAnalytics.update(filteredServers);
    }

    updateServers(servers) {
        this.servers = servers;
        this.updateAllAnalytics();
    }
} 