import { elements } from './panels-main.js';
import {
    showNotification,
    handleError,
    validateRequired,
    setButtonLoading,
    setButtonSuccess,
    setButtonError,
    setTextDirection
} from './ui-utils.js';
import { loadData } from './data-manager.js';
import { DBService } from './db-service.js';
import { DCIMService } from './dcim-service.js';
import { closeModal } from './modal.js';

const { filterForm, roomSelect, rackSelect, filterInput, editForm } = elements;

// DOM Elements specific to form handling
const redCheckbox = document.getElementById('edit-classification-red');
const blackCheckbox = document.getElementById('edit-classification-black');
const editStatus = document.getElementById('edit-status');
const radioInterface = document.getElementsByName("radio-interface");

export function initializeFormHandlers() {
    initializeEditForm();
    initializeFilterForm();
    initializeDestinationHandlers();
    initializeClassificationHandlers();
    initializeInterfaceHandlers();
}

function initializeEditForm() {
    if (editForm) {
        editForm.addEventListener("submit", handleFormSubmission);
    }
}

function initializeFilterForm() {
    if (filterForm) {
        filterForm.addEventListener("submit", handleFilterSubmit);
    }

    if (roomSelect && rackSelect) {
        roomSelect.addEventListener("change", () => loadData("room"));
        rackSelect.addEventListener("change", () => loadData("rack"));
    }
}

// Classification handlers
function initializeClassificationHandlers() {
    if (redCheckbox && blackCheckbox) {
        redCheckbox.addEventListener('change', updateSelectedClassifications);
        blackCheckbox.addEventListener('change', updateSelectedClassifications);
    }
}

export function updateSelectedClassifications() {
    const selectedClassifications = [];
    if (redCheckbox.checked) selectedClassifications.push('red');
    if (blackCheckbox.checked) selectedClassifications.push('black');
    return selectedClassifications.join("+");
}

// Interface handlers
function initializeInterfaceHandlers() {
    const interfaces = ['SM-SC', 'SM-LC', 'MM-SC', 'MM-LC', 'RJ'];
    interfaces.forEach(type => {
        const element = document.getElementById(`edit-interface-${type}`);
        if (element) {
            element.addEventListener("change", updateSelectedInterface);
        }
    });
}

export function updateSelectedInterface() {
    const interfaces = ['SM-LC', 'MM-LC', 'MM-SC', 'SM-SC', 'RJ'];
    for (const type of interfaces) {
        if (document.getElementById(`edit-interface-${type}`).checked) {
            return type;
        }
    }
    return "";
}

// Destination handlers
function initializeDestinationHandlers() {
    const destinationInput = document.getElementById('edit-destination');
    if (destinationInput) {
        destinationInput.addEventListener("keypress", handleDestinationKeyPress);
        destinationInput.addEventListener("change", handleDestinationChange);
        destinationInput.addEventListener("input", () => setTextDirection(destinationInput));
    }
}

function handleDestinationKeyPress(e) {
    if (e.key === ' ') {
        e.preventDefault();
        const input = e.target;
        const cursorPosition = input.selectionStart;
        const currentValue = input.value;
        const newValue = currentValue.slice(0, cursorPosition) + ',' + currentValue.slice(cursorPosition);
        input.value = newValue;
        input.selectionStart = input.selectionEnd = cursorPosition + 1;
    }
}

function handleDestinationChange(e) {
    const destinations = e.target.value.split(',');
    const portsInputElement = document.getElementById('edit-how_many_ports_remain');

    let remainingPortsCount = destinations
        .filter(dest => dest.trim())
        .map(dest => {
            const existingPorts = portsInputElement.value.match(new RegExp(`^${dest.trim()}: \\d+`));
            const portCount = existingPorts ? parseInt(existingPorts[0].split(': ')[1]) : 0;
            return `${dest.trim()}: ${portCount}`;
        })
        .join(',\n');

    portsInputElement.value = remainingPortsCount;
    portsInputElement.style.height = 'auto';
    portsInputElement.style.height = `${portsInputElement.scrollHeight}px`;
    setTextDirection(portsInputElement);
}

// Form submission handler
async function handleFormSubmission(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    const formData = getFormData();

    const errors = validateForm(formData);
    if (errors.length) {
        showNotification(errors.join('\n'), 'error');
        return;
    }

    const originalText = setButtonLoading(submitButton, 'שומר...');

    try {
        // עדכון DB
        await DBService.updatePanel(formData);
        
        // עדכון DCIM
        try {
            await DCIMService.updatePanel(formData);
            showNotification('הנתונים נשמרו בהצלחה ועודכנו ב-DCIM', 'success');
        } catch (dcimError) {
            showNotification('הנתונים נשמרו בDB, אך נכשל עדכון הDCIM', 'warning');
        }

        clearOldCheckEdit();
        setButtonSuccess(submitButton, originalText);
        closeModal();
        loadData();

    } catch (error) {
        setButtonError(submitButton, originalText, 'שגיאה');
        handleError(error, 'שגיאה בשמירת הנתונים');
    }
}

function handleFilterSubmit(e) {
    e.preventDefault();
    filterInput.value = filterInput.value.trim();
    loadData("textInput");
}

export function clearOldCheckEdit(element) {
    if (element && element.checked !== undefined) {
        element.checked = false;
    }
}

function getFormData() {
    const formData = {
        dcim_id: document.getElementById('edit-dcim-id').value.trim(),
        name: document.getElementById('edit-name').value.trim(),
        interface: updateSelectedInterface(),
        status: editStatus.checked,
        how_many_ports_remain: document.getElementById('edit-how_many_ports_remain').value.trim(),
        classification: updateSelectedClassifications(),
        destination: document.getElementById('edit-destination').value.trim(),
    };

    Object.entries(formData).forEach(([key, value]) => {
        if (typeof value === 'string') {
            formData[key] = value.trim();
        }
    });

    return formData;
}

function validateForm(formData) {
    const errors = [];

    const requiredFields = [
        { field: 'name', label: 'שם' },
        { field: 'interface', label: 'ממשק' }
    ];

    requiredFields.forEach(({ field, label }) => {
        const error = validateRequired(formData[field], label);
        if (error) errors.push(error);
    });

    return errors;
} 