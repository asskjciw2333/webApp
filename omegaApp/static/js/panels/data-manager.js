import { elements } from './panels-main.js';
import { showNotification, handleError, formatDate } from './ui-utils.js';
import { handleEditClick } from './modal.js';

const { roomSelect, rackSelect, filterInput, spinnerContainer } = elements;


export async function loadData(howChange) {
    try {
        spinnerContainer.style.display = 'flex';
        const userFilters = buildFilters(howChange);

        const response = await fetch('get_panels', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(userFilters)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (howChange === "room") {
            updateFilterForm(data.filterData);
        }
        updatePanelsTable(data.panelsData);
        filterInput.value = "";
        
    } catch (error) {
        handleError(error, 'שגיאה בטעינת הנתונים');
    } finally {
        spinnerContainer.style.display = 'none';
    }
}

function buildFilters(howChange) {
    let filterRoom = "";
    let filterRack = "";
    let filterTextInput = "";
    
    if (howChange) {
        filterRoom = howChange === "rack" || howChange === "room" ? roomSelect.value : "";
        filterRack = howChange === "rack" ? rackSelect.value : "";
        filterTextInput = howChange === "textInput" ? filterInput.value : "";
    } else {
        filterRoom = roomSelect.value;
        filterRack = rackSelect.value;
        filterTextInput = filterInput.value;
    }

    return {
        filterRoom,
        filterRack,
        filterTextInput
    };
}

function updateFilterForm(filterRackData) {
    rackSelect.innerHTML = '<option value="">כל המסדים</option>';
    if (filterRackData) {
        filterRackData.forEach(rack => {
            rackSelect.insertAdjacentHTML("beforeend", `<option value="${rack}">${rack}</option>`);
        });
    }
}

function updatePanelsTable(panelsData) {
    const tableBody = document.getElementById("panels-table");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    panelsData.forEach(panel => {
        const row = createTableRow(panel);
        tableBody.insertAdjacentHTML("beforeend", row);
    });

    initializeEditButtons();
}

function createTableRow(panel) {
    const portsRemaining = formatPortsRemaining(panel.how_many_ports_remain);
    const status = formatStatus(panel.status);

    return `
        <tr>
            <td>
                <button type="button" class="edit-btn" data-row-id="${panel.dcim_id}">🖊</button>
            </td>
            <td style="max-width: 20px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
                title="${panel.dcim_id}">${panel.dcim_id}</td>
            <td>${panel.room || ""}</td>
            <td>${panel.name || ""}</td>
            <td>${panel.rack || ""}</td>
            <td>${panel.u || ""}</td>
            <td>${panel.interface || ""}</td>
            <td>${panel.size || ""}</td>
            <td>${panel.destination || ""}</td>
            ${status}
            <td>${portsRemaining}</td>
            <td>${panel.classification || ""}</td>
            <td>${formatDate(panel.date_created)}</td>
            <td>${formatDate(panel.date_updated)}</td>
        </tr>
    `;
}

function formatPortsRemaining(portsData) {
    if (!portsData) return "";
    
    return portsData.split(',').map(destAndPorts => {
        const [dest, ports] = destAndPorts.split(': ');
        if (!dest) return "";
        
        const style = parseInt(ports) < 5 ? "color:red;" : "";
        return `<span style="${style}">${dest}: ${ports}</span>`;
    }).join('');
}

function formatStatus(status) {
    if (status === "1" || status === "True") {
        return '<td>✔</td>';
    } else if (status === "0" || status === "False") {
        return '<td>❌</td>';
    }
    return '<td></td>';
}

function initializeEditButtons() {
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
        button.removeEventListener('click', handleEditClick); // Remove existing listeners
        button.addEventListener('click', handleEditClick);
    });
}

// CSV Export functionality
export function downloadAsCSV() {
    const table = document.querySelector('table');
    let csv = [];

    // Headers (skipping first column - edit button)
    const headers = Array.from(table.querySelectorAll('th'))
        .slice(1)
        .map(header => header.textContent.trim());
    
    csv.push(`\uFEFF${headers.join(',')}`);

    // Rows (skipping first column - edit button)
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length) {
            const rowData = Array.from(cells)
                .slice(1)
                .map(cell => cell.textContent.trim());
            csv.push(rowData.join(','));
        }
    });

    // Create and trigger download
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=UTF-16LE;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'table_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
} 