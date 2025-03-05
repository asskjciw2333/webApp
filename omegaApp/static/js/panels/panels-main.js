import { showSpinner, hideSpinner, handleError } from './ui-utils.js';
import { RouteFinder } from './route-finder.js';
import { PanelStatistics } from './statistics-manager.js';

// DOM Elements
export const elements = {
    modal: document.getElementById('editModal'),
    filterForm: document.getElementById('filter-form'),
    roomSelect: document.getElementById('room-select'),
    rackSelect: document.getElementById('rack-select'),
    filterInput: document.getElementById('filter-input'),
    editForm: document.getElementById("edit-form"),
    spinnerContainer: document.getElementById('loading-spinner'),
    spinner: document.getElementById('spinner'),
    portsStatusModal: document.getElementById('portsStatusModal'),
    portsStatusBtn: document.querySelector('.ports-status-btn')
};

const statistics = new PanelStatistics();

async function loadRooms() {
    try {
        console.log('Starting to load rooms...');
        const response = await fetch('/panels/api/rooms');

        if (!response.ok) {
            if (response.status === 404) {
                console.error('API endpoint not found');
                throw new Error('נתיב ה-API לא נמצא');
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'שגיאה בטעינת החדרים');
        }

        const rooms = await response.json();
        console.log('Received rooms:', rooms);

        if (!Array.isArray(rooms)) {
            throw new Error('התקבל מבנה נתונים לא תקין מהשרת');
        }

        const roomSelect = document.getElementById('room-select');
        if (!roomSelect) {
            throw new Error('לא נמצא אלמנט select של החדרים');
        }

        // Save the default option (usually "All Rooms")
        const defaultOption = roomSelect.firstElementChild;
        roomSelect.innerHTML = '';
        roomSelect.appendChild(defaultOption);

        // Sort rooms alphabetically
        const sortedRooms = [...rooms].sort((a, b) => {
            const aText = (a.label || a).toString();
            const bText = (b.label || b).toString();
            // Use Hebrew locale for proper Hebrew text sorting
            return aText.localeCompare(bText, 'he');
        });

        // Add sorted rooms to the select element
        sortedRooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.value || room;
            option.textContent = room.label || room;
            roomSelect.appendChild(option);
        });

        console.log('Successfully loaded rooms');
        return rooms;

    } catch (error) {
        console.error('Error loading rooms:', error);

        const filterForm = document.getElementById('filter-form');
        if (filterForm) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = error.message;
            // Remove any existing error messages before adding new one
            filterForm.querySelectorAll('.error-message').forEach(el => el.remove());
            filterForm.appendChild(errorMessage);
        }

        // Fallback: Load rooms without translation in case of API error
        loadDefaultRooms();
    }
}

// Function to load rooms without translation in case of error
async function loadDefaultRooms() {
    try {
        const response = await fetch('/panels/get_panels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filterRoom: '',
                filterRack: '',
                filterTextInput: ''
            })
        });

        if (!response.ok) throw new Error('שגיאה בטעינת נתוני החדרים');

        const data = await response.json();
        // Extract unique room names from panels data
        const rooms = new Set(data.panelsData.map(panel => panel.room));

        const roomSelect = document.getElementById('room-select');
        if (!roomSelect) return;

        // Save the first option "All Rooms"
        const defaultOption = roomSelect.firstElementChild;
        roomSelect.innerHTML = '';
        roomSelect.appendChild(defaultOption);

        // Add rooms without translation
        Array.from(rooms).sort().forEach(room => {
            const option = document.createElement('option');
            option.value = room;
            option.textContent = room;
            roomSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading default rooms:', error);
    }
}

export async function initializeApp() {
    try {
        showSpinner(elements.spinnerContainer);

        // Create new instance of RouteFinder
        const routeFinder = new RouteFinder();
        await routeFinder.initialize();

        // Import modules dynamically
        const [modalModule, formHandlersModule, dcimModule] = await Promise.all([
            import('./modal.js'),
            import('./form-handlers.js'),
            import('./dcim-integration.js')
        ]);

        // Initialize all modules
        await Promise.all([
            modalModule.initializeModal(elements.modal),
            formHandlersModule.initializeFormHandlers(),
            dcimModule.initializeDCIMIntegration()
        ]);

        // Initialize table scroll shadow
        updateTableScrollShadow();

        // Start periodic checks for updates
        setInterval(checkPullStatus, 5 * 60 * 1000);

        // Load rooms data
        await loadRooms();

        // Initialize remaining application functionality
        initializeEventListeners();

    } catch (error) {
        handleError(error, 'שגיאה באתחול המערכת');
    } finally {
        hideSpinner(elements.spinnerContainer);
    }
}

// Check if system is currently updating data from external sources
export async function checkPullStatus() {
    try {
        const response = await fetch('pull-status', {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        data.isUpdating ? showSpinner(elements.spinner) : hideSpinner(elements.spinner);
    } catch (error) {
        console.error('Error checking pull status:', error);
        hideSpinner(elements.spinner);
    }
}

// Add visual indication for scrollable tables
function updateTableScrollShadow() {
    const tableWrappers = document.querySelectorAll('.table-wrapper');

    tableWrappers.forEach(wrapper => {
        if (wrapper.scrollHeight > wrapper.clientHeight) {
            wrapper.classList.add('is-scrollable');
        } else {
            wrapper.classList.remove('is-scrollable');
        }
    });
}

// Initialize all event listeners for the application
function initializeEventListeners() {
    // Add required event listeners
    const filterForm = document.getElementById('filter-form');
    filterForm?.addEventListener('submit', handleFilterSubmit);

    const roomSelect = document.getElementById('room-select');
    roomSelect?.addEventListener('change', handleRoomChange);

    elements.portsStatusBtn.addEventListener('click', async () => {
        elements.portsStatusModal.style.display = 'block';
        try {
            // Load ports status data
            await loadPortsStatus();
            // Load statistics if on statistics tab
            const statisticsTab = document.querySelector('.tab-button[data-tab="statistics"]');
            if (statisticsTab.classList.contains('active')) {
                await statistics.updateStatisticsDisplay();
            }
        } catch (error) {
            handleError(error, 'שגיאה בטעינת הנתונים');
        }
    });

    // Close modal when clicking on X or outside
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// Handle form submission for filtering
function handleFilterSubmit(event) {
    // Filter handling logic
}

// Handle room selection changes
function handleRoomChange(event) {
    // Room change handling logic
}

async function loadPortsStatus() {
    // Your existing ports status loading code
}
