import { elements } from './panels-main.js';
import { clearOldCheckEdit } from './form-handlers.js';
import { 
    showNotification, 
    handleError, 
    lockBodyScroll, 
    unlockBodyScroll,
    setTextDirection 
} from './ui-utils.js';

const { modal } = elements;

export function initializeModal() {
    const closeSpan = modal.querySelector(".modal-close");
    if (closeSpan) {
        closeSpan.addEventListener('click', () => closeModal());
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            closeModal();
        }
    });
}

export function openModal() {
    modal.style.display = 'flex';
    modal.style.pointerEvents = "auto";
    modal.classList.add('fade-in');
    modal.classList.remove('fade-out');
    lockBodyScroll();
}

export function closeModal() {
    if (!modal) return;

    modal.classList.remove('fade-in');
    modal.classList.add('fade-out');
    modal.style.pointerEvents = "none";
    unlockBodyScroll();

    // בדוק אם יש צ'קבוקס לניקוי
    const checkEdit = modal.querySelector('.check-edit');
    if (checkEdit) {
        clearOldCheckEdit(checkEdit);
    }

    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('fade-out');
    }, 300);
}

export async function handleEditClick(event) {
    const rowId = event.currentTarget.dataset.rowId;
    console.log("Edit button clicked for row ID:", rowId);

    try {
        const response = await fetch(`${rowId}/edit`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        populateEditForm(data);
        openModal();
    } catch (error) {
        handleError(error, 'שגיאה בטעינת הנתונים');
    }
}

function populateEditForm(data) {
    const formElements = {
        dcim_id: document.getElementById('edit-dcim-id'),
        name: document.getElementById('edit-name'),
        room: document.getElementById('edit-room'),
        rack: document.getElementById('edit-rack'),
        U: document.getElementById('edit-U'),
        size: document.getElementById('edit-size'),
        destination: document.getElementById('edit-destination'),
        how_many_ports_remain: document.getElementById('edit-how_many_ports_remain'),
        radioInterface: document.getElementsByName("radio-interface"),
        redCheckbox: document.getElementById('edit-classification-red'),
        blackCheckbox: document.getElementById('edit-classification-black'),
        editStatus: document.getElementById('edit-status')
    };

    // Set basic form values
    Object.entries(data).forEach(([key, value]) => {
        const element = formElements[key];
        if (element && value !== undefined && value !== null) {
            element.value = value;
            setTextDirection(element);
        }
    });

    // Handle interface radio buttons
    formElements.radioInterface.forEach(radio => radio.checked = false);
    if (data.interface) {
        const interfaceRadio = document.getElementById(`edit-interface-${data.interface}`);
        if (interfaceRadio) interfaceRadio.checked = true;
    }

    // Handle classification checkboxes
    formElements.redCheckbox.checked = false;
    formElements.blackCheckbox.checked = false;
    if (data.classification) {
        data.classification.split("+").forEach(cls => {
            const checkbox = document.getElementById(`edit-classification-${cls}`);
            if (checkbox) checkbox.checked = true;
        });
    }

    // Handle status
    formElements.editStatus.checked = data.status === "True";

    // Adjust textarea height
    const portsInput = formElements.how_many_ports_remain;
    if (portsInput) {
        portsInput.style.height = 'auto';
        portsInput.style.height = `${portsInput.scrollHeight}px`;
    }
} 