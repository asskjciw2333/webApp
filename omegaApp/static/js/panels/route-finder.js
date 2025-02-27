import { elements } from './panels-main.js';
import { showSpinner, hideSpinner, handleError, showNotification } from './ui-utils.js';
import { DBService } from './db-service.js';
import { DCIMService } from './dcim-service.js';

export class RouteFinder {
    constructor() {
        this.modal = null;
        this.form = null;
        this.startRackSelect = null;
        this.endRackSelect = null;
        this.resultsContainer = null;
        this.routesCount = null;
        this.expandButton = null;
    }

    async initialize() {
        await this.createModal();
        this.modal = document.getElementById('routeSearchModal');
        this.form = document.getElementById('route-search-form');
        this.startRackSelect = document.getElementById('start-rack');
        this.endRackSelect = document.getElementById('end-rack');
        this.resultsContainer = document.getElementById('routes-results');
        this.routesCount = document.getElementById('routes-count');
        this.expandButton = document.getElementById('expand-form-button');
        this.initializeEventListeners();
        return this;
    }

    initializeEventListeners() {
        const routeSearchBtn = document.querySelector('.route-search-btn');
        if (routeSearchBtn && !routeSearchBtn.hasEventListener) {
            routeSearchBtn.addEventListener('click', () => this.openModal());
            routeSearchBtn.hasEventListener = true;
        }

        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleRouteSearch(e));
        }
    }

    async createModal() {
        const modalHTML = `
            <div id="routeSearchModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">חיפוש מסלול בין פאנלים</h2>
                        <span class="modal-close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <button id="expand-form-button" class="expand-button hidden">
                            <span>הצג טופס חיפוש</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <form id="route-search-form">
                            <div class="form-group">
                                <label>מסד התחלה</label>
                                <select name="start-rack" id="start-rack" class="form-control-select" required>
                                    <option value="">בחר מסד התחלה</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>מסד יעד</label>
                                <select name="end-rack" id="end-rack" class="form-control-select" required>
                                    <option value="">בחר מסד יעד</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>סוג ממשק</label>
                                <div id="interfac-radio-container">
                                    <div class="interface-radio">
                                        <input type="radio" name="radio-interface" id="interface-SM" value="SM">
                                        <label for="interface-SM">SM</label>
                                    </div>
                                    <div class="interface-radio">
                                        <input type="radio" name="radio-interface" id="interface-MM" value="MM">
                                        <label for="interface-MM">MM</label>
                                    </div>
                                    <div class="interface-radio">
                                        <input type="radio" name="radio-interface" id="interface-RJ" value="RJ" checked>
                                        <label for="interface-RJ">RJ</label>
                                    </div>
                                </div>
                            </div>
                            <div class="form-row">

                                <div class="form-group-controls">
                                    <div class="form-group">
                                        <label>מינימום פורטים פנויים</label>
                                        <input type="number" id="min-ports" value="1" min="1">
                                    </div>
                                    <div class="form-group">
                                        <label>סיווג</label>
                                        <div class="classification-checkboxes">
                                            <div id="route-classification-black" class="checkbox-container">
                                                <input type="checkbox" id="route-classification-black-input" value="BLACK">
                                            </div>
                                            <div id="route-classification-red" class="checkbox-container">
                                                <input type="checkbox" id="route-classification-red-input" value="RED">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>מספר קפיצות מקסימלי</label>
                                        <input type="number" id="max-hops" value="3" min="1" max="10">
                                    </div>
                                </div>
                                <div class="form-group form-group-half">
                                    <label>אולמות מועדפים</label>
                                    <select id="preferred-rooms" multiple class="form-control-select">
                                        <option value="">טוען חדרים...</option>
                                    </select>
                                    <small class="form-text">ניתן לבחור מספר אולמות (Ctrl + click)</small>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <span>חפש מסלול</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </form>
                        <div id="routes-count" class="routes-count hidden"></div>
                        <div id="routes-results"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add rooms loading when modal is created
        await this.loadPreferredRooms();

        const expandButton = document.getElementById('expand-form-button');
        expandButton.addEventListener('click', () => {
            const searchForm = document.getElementById('route-search-form');
            const routesResults = document.getElementById('routes-results');
            expandButton.classList.toggle('expanded');
            
            if (searchForm.classList.contains('collapsed')) {
                // Expand the form
                searchForm.classList.remove('collapsed');
                searchForm.classList.add('expanded');
                expandButton.classList.add('hidden');
                // Collapse results area
                routesResults.classList.add('compact');
            } else {
                // Collapse the form
                searchForm.classList.remove('expanded');
                searchForm.classList.add('collapsed');
                // Expand results area
                routesResults.classList.remove('compact');
            }
        });
    }

    async loadPreferredRooms() {
        try {
            const response = await fetch('/panels/api/rooms');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const rooms = await response.json();
            const preferredRoomsSelect = document.getElementById('preferred-rooms');
            
            if (!preferredRoomsSelect) return;
            
            // Clear loading state
            preferredRoomsSelect.innerHTML = '';
            
            // Add rooms to select element
            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.value || room;
                option.textContent = room.label || room;
                preferredRoomsSelect.appendChild(option);
            });

        } catch (error) {
            handleError(error, 'שגיאה בטעינת רשימת החדרים');
            // Set error state in select
            const preferredRoomsSelect = document.getElementById('preferred-rooms');
            if (preferredRoomsSelect) {
                preferredRoomsSelect.innerHTML = '<option value="">שגיאה בטעינת החדרים</option>';
            }
        }
    }

    openModal() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.modal.classList.add('fade-in');
            document.body.style.overflow = 'hidden';
            this.updateRackSelects();
            // Refresh rooms list when modal opens
            this.loadPreferredRooms();
        }
    }

    clearModalState() {
        // Reset form
        this.form.reset();
        
        // Reset preferred rooms selection
        const preferredRooms = document.getElementById('preferred-rooms');
        if (preferredRooms) {
            Array.from(preferredRooms.options).forEach(option => option.selected = false);
        }
        
        // Reset classification checkboxes
        const redCheckbox = document.getElementById('route-classification-red-input');
        const blackCheckbox = document.getElementById('route-classification-black-input');
        if (redCheckbox) redCheckbox.checked = false;
        if (blackCheckbox) blackCheckbox.checked = false;
        
        // Reset default values
        const minPorts = document.getElementById('min-ports');
        const maxHops = document.getElementById('max-hops');
        if (minPorts) minPorts.value = '1';
        if (maxHops) maxHops.value = '3';
        
        // Reset interface to default
        const defaultInterface = document.getElementById('interface-RJ');
        if (defaultInterface) defaultInterface.checked = true;
        
        // Clear results
        if (this.resultsContainer) this.resultsContainer.innerHTML = '';
        if (this.routesCount) {
            this.routesCount.innerHTML = '';
            this.routesCount.classList.add('hidden');
        }
        
        // Restore form to expanded state
        this.form.classList.remove('collapsed');
        if (this.expandButton) {
            this.expandButton.classList.add('hidden');
            this.expandButton.classList.remove('expanded');
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('fade-in');
            this.modal.classList.add('fade-out');
            setTimeout(() => {
                this.modal.style.display = 'none';
                document.body.style.overflow = '';
                this.clearModalState();
                this.modal.classList.remove('fade-out');
            }, 300);
        }
    }

    async updateRackSelects() {
        try {
            showSpinner(elements.spinnerContainer);

            const response = await fetch('get_panels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filterRoom: "", filterRack: "", filterTextInput: "" })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const racks = [...new Set(data.panelsData.map(panel => panel.rack))].sort();

            [this.startRackSelect, this.endRackSelect].forEach(select => {
                select.innerHTML = '<option value="">בחר מסד</option>';
                racks.forEach(rack => {
                    select.insertAdjacentHTML('beforeend', `<option value="${rack}">${rack}</option>`);
                });
            });

        } catch (error) {
            handleError(error, 'שגיאה בטעינת רשימת המסדים');
        } finally {
            hideSpinner(elements.spinnerContainer);
        }
    }

    getSelectedClassification() {
        const redChecked = document.getElementById('route-classification-red-input').checked;
        const blackChecked = document.getElementById('route-classification-black-input').checked;

        if (redChecked && blackChecked) return 'RED+BLACK';
        if (redChecked) return 'RED';
        if (blackChecked) return 'BLACK';
        return null;
    }

    getSelectedInterface() {
        const radioButtons = document.querySelectorAll('input[name="radio-interface"]');
        for (const rb of radioButtons) {
            if (rb.checked) {
                return rb.value;
            }
        }
        return null;
    }

    async handleRouteSearch(e) {
        e.preventDefault();

        // Add interface validation check
        const selectedInterface = this.getSelectedInterface();
        if (!selectedInterface) {
            showNotification('יש לבחור סוג ממשק', 'error');
            return;
        }

        try {
            showSpinner(elements.spinnerContainer);

            const preferredRooms = Array.from(document.getElementById('preferred-rooms').selectedOptions)
                .map(option => option.value);

            const formData = {
                startRack: this.startRackSelect.value,
                endRack: this.endRackSelect.value,
                interfaceType: selectedInterface,
                minPorts: document.getElementById('min-ports').value,
                classification: this.getSelectedClassification(),
                maxHops: document.getElementById('max-hops').value,
                preferredRooms: preferredRooms.length > 0 ? preferredRooms : null
            };

            const response = await fetch('find_routes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const routes = await response.json();
            this.displayRoutes(routes);

        } catch (error) {
            handleError(error, 'שגיאה בחיפוש מסלולים');
        } finally {
            hideSpinner(elements.spinnerContainer);
        }
    }

    displayRoutes(routes) {
        if (!this.resultsContainer) return;
        const routesCount = document.getElementById('routes-count');
        const searchForm = document.getElementById('route-search-form');
        const expandButton = document.getElementById('expand-form-button');

        // Get search parameters for display
        const startRack = this.startRackSelect.value;
        const endRack = this.endRackSelect.value;
        const interfaceType = document.querySelector('input[name="radio-interface"]:checked').value;

        // Handle case when no routes are found
        if (!routes.length) {
            routesCount.innerHTML = `
                <div class="results-header">
                    <div class="results-info">
                        <div class="search-params">
                            <span class="search-param">מקור: ${startRack}</span>
                            <span class="search-param">יעד: ${endRack}</span>
                            <span class="search-param">ממשק: ${interfaceType}</span>
                        </div>
                        <span class="count-badge count-empty">לא נמצאו מסלולים</span>
                    </div>
                    <button class="toggle-results-btn hidden" title="הרחב/צמצם תוצאות">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `;
            routesCount.classList.remove('hidden');
            return;
        }

        // Collapse search form and show expand button
        searchForm.classList.add('collapsed');
        searchForm.classList.remove('expanded');
        expandButton.classList.remove('hidden');

        // Display routes count and search parameters
        routesCount.innerHTML = `
            <div class="results-header">
                <div class="results-info">
                    <div class="search-params">
                        <span class="search-param">מקור: ${startRack}</span>
                        <span class="search-param">יעד: ${endRack}</span>
                        <span class="search-param">ממשק: ${interfaceType}</span>
                    </div>
                    <span class="count-badge count-success">נמצאו ${routes.length} מסלולים אפשריים</span>
                </div>
                <button class="toggle-results-btn" title="הרחב/צמצם תוצאות">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;
        routesCount.classList.remove('hidden');

        // Generate HTML for each route
        const routesHTML = routes.map((route, index) => {
            const uniqueSteps = route.length === 2 && route[0].panelId === route[1].panelId 
                ? [route[0]] 
                : route;

            const steps = uniqueSteps.map(step => `
                <div class="route-step">
                    <div class="step-details">
                        <div class="step-location">
                            <span class="step-label">מיקום:</span>
                            <span class="location">${step.location}</span>
                        </div>
                        <div class="step-destination">
                            <span class="step-label">יעד:</span>
                            <span class="destination">${step.destination || 'לא צוין'}</span>
                        </div>
                        <div class="step-interface">
                            <span class="interface-type badge badge-${step.interfaceType.toLowerCase()}">${step.interfaceType}</span>
                        </div>
                    </div>
                </div>
            `).join('<div class="route-arrow">←</div>');

            return `
                <div class="route" data-route-index="${index}" role="button" tabindex="0">
                    <div class="route-header">מסלול ${index + 1}</div>
                    <div class="route-steps">
                        ${steps}
                    </div>
                    <div class="route-select-hint"></div>
                </div>
            `;
        }).join('');

        this.resultsContainer.innerHTML = routesHTML;

        // Add click handlers to routes
        const routeElements = this.resultsContainer.querySelectorAll('.route');
        routeElements.forEach((routeEl, index) => {
            routeEl.addEventListener('click', () => this.handleRouteSelection(routes[index]));
        });

        // Add toggle functionality for results expansion
        const toggleResultsBtn = routesCount.querySelector('.toggle-results-btn');
        toggleResultsBtn.addEventListener('click', () => {
            this.resultsContainer.classList.toggle('expanded');
            toggleResultsBtn.classList.toggle('expanded');
        });
    }

    async handleRouteSelection(route) {
        const minPorts = parseInt(document.getElementById('min-ports').value) || 1;
        
        const result = await this.showConfirmationModal(route, minPorts);
        if (result) {
            try {
                showSpinner(elements.spinnerContainer);
                await this.reservePorts(route, minPorts);
                
                // Combined message - both success and refresh notification
                showNotification('הפורטים נתפסו בהצלחה! רענן את הטבלה כדי לראות את הנתונים המעודכנים', 'success');
                
                this.closeModal();
            } catch (error) {
                handleError(error, 'שגיאה בתפיסת הפורטים');
            } finally {
                hideSpinner(elements.spinnerContainer);
            }
        }
    }

    showConfirmationModal(route, portsCount) {
        return new Promise((resolve) => {
            // Filter unique panels by panelId
            const uniquePanels = route.filter((step, index, self) => 
                index === self.findIndex(s => s.panelId.split('_')[0] === step.panelId.split('_')[0])
            );

            const modalHTML = `
                <div class="confirmation-modal modal fade-in">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>אישור תפיסת פורטים</h3>
                            <span class="modal-close">&times;</span>
                        </div>
                        <div class="modal-body">
                            <p>האם ברצונך לתפוס ${portsCount} פורטים במסלול זה?</p>
                            <div class="route-summary">
                                ${uniquePanels.map(step => `
                                    <div class="summary-step">
                                        <span class="step-location">${step.location}</span>
                                        <span class="step-ports">${portsCount} פורטים</span>
                                    </div>
                                `).join('<div class="summary-arrow">→</div>')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary cancel-btn">ביטול</button>
                            <button class="btn btn-primary confirm-btn">אישור</button>
                        </div>
                    </div>
                </div>
            `;

            const modalElement = document.createElement('div');
            modalElement.innerHTML = modalHTML;
            document.body.appendChild(modalElement);

            const modal = modalElement.querySelector('.confirmation-modal');
            const closeBtn = modal.querySelector('.modal-close');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const confirmBtn = modal.querySelector('.confirm-btn');

            const closeModal = () => {
                modal.classList.remove('fade-in');
                modal.classList.add('fade-out');
                setTimeout(() => {
                    document.body.removeChild(modalElement);
                }, 300);
            };

            closeBtn.addEventListener('click', () => {
                closeModal();
                resolve(false);
            });

            cancelBtn.addEventListener('click', () => {
                closeModal();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                closeModal();
                resolve(true);
            });
        });
    }

    async reservePorts(route, portsCount) {
        try {
            const updatedPanelIds = new Set();

            for (const step of route) {
                const panelId = step.panelId.split('_')[0];
                
                if (updatedPanelIds.has(panelId)) continue;
                
                const currentPanelData = await this.getCurrentPorts(panelId);
                const updatedPorts = this.calculateUpdatedPorts(
                    currentPanelData.how_many_ports_remain, 
                    portsCount,
                    step.destination
                );

                const updatedPanelData = {
                    ...currentPanelData,
                    how_many_ports_remain: updatedPorts
                };

                await Promise.all([
                    DBService.updatePanelPorts(panelId, updatedPorts, currentPanelData)
                        .catch(error => {
                            throw new Error(`שגיאה בעדכון DB: ${error.message}`);
                        }),
                    DCIMService.updatePanel(updatedPanelData)
                        .catch(error => {
                            console.warn(`DCIM update warning for panel ${panelId}:`, error);
                            showNotification('הנתונים נשמרו בDB, אך נכשל עדכון הDCIM', 'warning');
                        })
                ]);

                updatedPanelIds.add(panelId);
            }
        } catch (error) {
            throw new Error(`שגיאה בתפיסת הפורטים: ${error.message}`);
        }
    }

    async getCurrentPorts(panelId) {
        const response = await fetch(`${panelId}/edit`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('שגיאה בקבלת נתוני הפאנל');
        }

        return response.json();
    }

    calculateUpdatedPorts(currentPorts, portsToReserve, destination) {
        const portsMap = new Map();
        
        if (currentPorts) {
            const portPairs = currentPorts.split(',');
            for (const pair of portPairs) {
                const [dest, count] = pair.split(':').map(s => s.trim());
                portsMap.set(dest, parseInt(count));
            }
        }

        if (!portsMap.has(destination)) {
            throw new Error(`היעד ${destination} לא קיים בפאנל`);
        }

        const currentCount = portsMap.get(destination);
        if (currentCount >= portsToReserve) {
            portsMap.set(destination, currentCount - portsToReserve);
        } else {
            throw new Error(`אין מספיק פורטים פנויים ליעד ${destination}. נדרש: ${portsToReserve}, קיים: ${currentCount}`);
        }

        return Array.from(portsMap)
            .map(([dest, count]) => `${dest}: ${count}`)
            .join(',\n');
    }
} 