const modal = document.getElementById('editModal');
const closeSpan = document.getElementsByClassName("modal-close")[0];

const filterForm = document.getElementById('filter-form');
const roomSelect = document.getElementById('room-select');
const rackSelect = document.getElementById('rack-select');
const filterInput = document.getElementById('filter-input');

const redCheckbox = document.getElementById('edit-classification-red');
const blackCheckbox = document.getElementById('edit-classification-black');

const editStatus = document.getElementById('edit-status')
const radioInterface = document.getElementsByName("radio-interface")
const editForm = document.getElementById("edit-form");

const spinnerContainer = document.getElementById('loading-spinner');
const spinner = document.getElementById('spinner');

if (closeSpan) {
    closeSpan.addEventListener('click', function () {
        clearOldCheckEdit()

        modal.classList.remove("fade-in")
        modal.style.pointerEvents = "none"
    });
}

window.addEventListener('click', function (event) {
    if (event.target == modal) {
        clearOldCheckEdit()

        modal.classList.remove("fade-in")
        modal.style.pointerEvents = "none"
    }
});


// Function to update selected classifications based on checkbox states
function updateSelectedClassifications() {
    const selectedClassifications = [];
    if (redCheckbox.checked) {
        selectedClassifications.push('red');
    }
    if (blackCheckbox.checked) {
        selectedClassifications.push('black');
    }
    return selectedClassifications.join("+");
}

// Attach event listeners to update selections on checkbox change
if (redCheckbox && blackCheckbox) {

    redCheckbox.addEventListener('change', updateSelectedClassifications);
    blackCheckbox.addEventListener('change', updateSelectedClassifications);
}

function updateSelectedInterface() {
    let editInterface = ""
    if (document.getElementById(`edit-interface-SM-LC`).checked == true) {
        editInterface = "SM-LC"
    } else if (document.getElementById(`edit-interface-MM-LC`).checked == true) {
        editInterface = "MM-LC"
    } else if (document.getElementById(`edit-interface-MM-SC`).checked == true) {
        editInterface = "MM-SC"
    } else if (document.getElementById(`edit-interface-SM-SC`).checked == true) {
        editInterface = "SM-SC"
    } else if (document.getElementById(`edit-interface-RJ`).checked == true) {
        editInterface = "RJ"
    }

    console.log(editInterface);
    return editInterface;
}
if (
    document.getElementById(`edit-interface-SM-SC`),
    document.getElementById(`edit-interface-SM-LC`),
    document.getElementById(`edit-interface-MM-SC`),
    document.getElementById(`edit-interface-MM-LC`),
    document.getElementById(`edit-interface-RJ`)
) {

    document.getElementById(`edit-interface-SM-SC`).addEventListener("change", updateSelectedInterface)
    document.getElementById(`edit-interface-SM-LC`).addEventListener("change", updateSelectedInterface)
    document.getElementById(`edit-interface-MM-SC`).addEventListener("change", updateSelectedInterface)
    document.getElementById(`edit-interface-MM-LC`).addEventListener("change", updateSelectedInterface)
    document.getElementById(`edit-interface-RJ`).addEventListener("change", updateSelectedInterface)
}

if (editForm) {
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = {
            "dcimId": document.getElementById('edit-dcim-id').value,
            "name": document.getElementById('edit-name').value,
            "interface": updateSelectedInterface(),
            "status": editStatus.checked,
            "how_many_ports_remain": document.getElementById('edit-how_many_ports_remain').value,
            "classification": updateSelectedClassifications(),
            "destination": document.getElementById('edit-destination').value,
        };

        try {
            const response = await fetch(`${formData.dcimId}/edit`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log("Data saved successfully!");
                clearOldCheckEdit();
                modal.classList.remove("fade-in");
                modal.style.pointerEvents = "none";
                loadData();
                updateDCIM(formData);
            } else {
                showNotification("שגיאה בשמירת הנתונים: " + data.error, 'error');
            }
        } catch (error) {
            console.error("Error saving data:", error);
            showNotification('שגיאה בשמירת הנתונים', 'error');
        }
    });
}

function clearOldCheckEdit() {
    for (let i = 0; i < radioInterface.length; i++) {
        radioInterface[i].checked = false
    }
    redCheckbox.checked = false
    blackCheckbox.checked = false
    editStatus.checked = false
}

async function updateDCIM(formData) {
    spinner.style.display = "block";

    try {
        const response = await fetch(`${document.getElementById('edit-dcim-id').value}/update_dcim`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        spinner.style.display = "none";

        if (data.status === "success") {
            showNotification('המידע עודכן בDCIM!', 'success');
        } else {
            showNotification('שגיאה בהעברת המידע לDCIM: ' + data.message, 'error');
        }
    } catch (error) {
        spinner.style.display = "none";
        showNotification('שגיאה בהעברת המידע לDCIM.', 'error');
    }
}

if (filterForm) {
    filterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        loadData("textInput")
    })
}

if (roomSelect && rackSelect) {

    roomSelect.addEventListener("change", () => loadData("room"))
    rackSelect.addEventListener("change", () => loadData("rack"))
}

async function loadData(howChange) {
    try {
        spinnerContainer.style.display = 'flex';
        let filterRoom;
        let filterRack;
        let filterTextInput;
        
        if (howChange) {
            filterRoom = howChange == "rack" || howChange == "room" ? roomSelect.value : "";
            filterRack = howChange == "rack" ? rackSelect.value : "";
            filterTextInput = howChange == "textInput" ? filterInput.value : "";
        } else {
            filterRoom = roomSelect.value;
            filterRack = rackSelect.value;
            filterTextInput = filterInput.value;
        }

        const userFilters = {
            "filterRoom": filterRoom,
            "filterRack": filterRack,
            "filterTextInput": filterTextInput
        };

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

        if (howChange == "room") {
            updateFilterForm(data.filterData);
        }
        updatePanelsTable(data.panelsData);
        filterInput.value = "";
    } catch (error) {
        console.error("Error loading data:", error);
        showNotification('שגיאה בטעינת הנתונים', 'error');
    } finally {
        spinnerContainer.style.display = 'none';
    }
}

function updateFilterForm(filterRackData) {
    rackSelect.innerHTML = '<option value="">כל המסדים</option>'
    if (filterRackData) {
        filterRackData.forEach((rack => {
            rackSelect.insertAdjacentHTML("beforeend", `<option value="${rack}">${rack}</option>`);
        }))
    }
}

function updatePanelsTable(panelsData) {
    const tableBody = document.getElementById("panels-table");
    tableBody.innerHTML = "";

    panelsData.forEach((panel => {

        let tdhow_many_ports_remain_elElement = "";
        if (panel.how_many_ports_remain) {

            panel.how_many_ports_remain.split(',').forEach(function (destAndPorts) {
                let [dest, ports] = destAndPorts.split(': ');
                if (dest) {
                    let spanStyle = "";
                    if (parseInt(ports) < 5) {
                        spanStyle = "color:red;";
                    }

                    let spanElement = `<span style="${spanStyle}">
                      ${dest}: ${ports}
                    </span>`;
                    tdhow_many_ports_remain_elElement += spanElement;

                }
            });
        }

        let status = '<td></td>'
        if (panel.status == "1" || panel.status == "True") {
            status = '<td>✔</td>'
        }
        else if (panel.status == "0" || panel.status == "False") {
            status = '<td>❌</td> '
        }

        const row = `            <tr>
    <td>
        <button type="button" class="edit-btn" data-row-id="${panel.dcim_id}">🖊</button>
    </td>
    <td style="max-width: 20px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
        title="${panel.dcim_id}">${panel.dcim_id}</td>
    <td>${panel.room}</td>
    <td>${panel.name}</td>
    <td>${panel.rack}</td>
    <td>${panel.u}</td>
    <td>${panel.interface}</td>
    <td>${panel.size}</td>
    <td>${panel.destination}</td>
    ${status}
    <td>${tdhow_many_ports_remain_elElement}</td>
    <td>${panel.classification ? panel.classification : ""}</td>
    <td>${formatDate(panel.date_created)}</td>
    <td>${formatDate(panel.date_updated) ? formatDate(panel.date_updated) : ""}</td>
</tr>`;
        tableBody.insertAdjacentHTML("beforeend", row);
    }))
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', handleEditClick);
    });
}


if (document.getElementById('edit-destination')) {
    document.getElementById('edit-destination').addEventListener("keypress", (e) => {
        if (e.key === ' ') {
            e.preventDefault();
            const cursorPosition = document.getElementById('edit-destination').selectionStart;
            const currentValue = document.getElementById('edit-destination').value;
            const newValue = currentValue.slice(0, cursorPosition) + ',' + currentValue.slice(cursorPosition);
            document.getElementById('edit-destination').value = newValue;
            // Move the cursor position to after the newly inserted comma
            document.getElementById('edit-destination').selectionStart = document.getElementById('edit-destination').selectionEnd = cursorPosition + 2;
        }
    })

    document.getElementById('edit-destination').addEventListener("change", () => {
        const destinations = document.getElementById('edit-destination').value.split(',');
        const portsInputElement = document.getElementById('edit-how_many_ports_remain');

        let remainingPortsCount = '';
        destinations.forEach((destination) => {
            if (destination != "") {
                const existingPorts = portsInputElement.value.match(new RegExp(`^${destination}: \\d+`));
                let portCount = 0;
                if (existingPorts) {
                    portCount = parseInt(existingPorts[0].split(': ')[1]);
                }
                remainingPortsCount += `${destination}: ${portCount},\n`;

            }
        });

        portsInputElement.value = remainingPortsCount.trim();
        portsInputElement.style.height = 'auto';
        portsInputElement.style.height = portsInputElement.scrollHeight + 'px';
    });

}

function formatDate(dateString) {
    if (!dateString) {
        return "";
    }
    const dateObj = new Date(dateString);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    return formattedDate;
}


const pull_all_panels = document.getElementById("pull-panel-link")
if (pull_all_panels) {
    pull_all_panels.addEventListener("click", async () => {
        spinner.style.display = "block";

        try {
            const response = await fetch("admin/pullallpanels", {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            spinner.style.display = "none";
            showNotification(data.message, 'success');
        } catch (error) {
            spinner.style.display = "none";
            showNotification("שגיאה בעדכון המידע!" + error, 'error');
        }
    });
}

async function checkPullStatus() {
    try {
        const response = await fetch('pull-status', {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        spinner.style.display = data.isUpdating ? "block" : "none";
    } catch (error) {
        console.error('Error fetching update status:', error);
    }
}

checkPullStatus();
setInterval(checkPullStatus, 5 * 60 * 1000)


function handleDownload() {
    const btn = document.getElementsByClassName('download-btn')[0];
    const btnText = btn.querySelector('span');

    btn.disabled = true;
    btn.classList.add('loading');

    try {
        downloadAsCSV();

        btn.classList.remove('loading');
        btn.classList.add('success');

        setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('success');
        }, 2000);

    } catch (error) {
        console.error('שגיאה בהורדה:', error);
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}


function downloadAsCSV() {
    const table = document.querySelector('table');
    let csv = [];

    const headers = [];
    const headerCells = table.querySelectorAll('th');
    headerCells.forEach((cell, index) => {
        if (index > 0) { // Skip the first column
            headers.push(cell.textContent.trim());
        }
    });
    // Use UTF-16LE encoding for Hebrew support
    csv.push(`\uFEFF${headers.join(',')}`);

    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length) {
            const rowData = [];
            cells.forEach((cell, index) => {
                if (index > 0) { // Skip the first cell in each row
                    rowData.push(cell.textContent.trim());
                }
            });
            csv.push(rowData.join(','));
        }
    });

    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=UTF-16LE;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'table_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add these functions to improve the UX

function showLoadingState(button) {
    const originalText = button.innerHTML;
    button.disabled = true;
    return originalText;
}

function hideLoadingState(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
}

// Improve modal animations
function openModal(modal) {
    modal.style.display = 'flex';
    modal.style.pointerEvents = "auto";
    // Force reflow
    modal.offsetHeight;
    modal.classList.add('fade-in');
}

function closeModal(modal) {
    clearOldCheckEdit();
    modal.classList.remove("fade-in");
    modal.style.display = 'none';
    modal.style.pointerEvents = "none";
}

// Add smooth scroll behavior
function scrollToSection(currentIndexView) {
    const sectionTop = generalInfoList[currentIndexView].offsetTop;
    main.scrollTo({
        top: sectionTop - offset,
        behavior: 'smooth'
    });
}

// Improve form validation
function validateForm(formData) {
    const requiredFields = ['name', 'interface', 'how_many_ports_remain'];
    return requiredFields
        .filter(field => !formData[field])
        .map(field => `השדה ${field} הוא חובה`);
}

// Update the edit button click handler
const editButtons = document.querySelectorAll('.edit-btn');

editButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
        const rowId = event.target.dataset.rowId;
        const originalText = showLoadingState(event.target);

        try {
            const response = await fetch(`${rowId}/edit`);
            const data = await response.json();
            populateEditForm(data);
            openModal(modal);
        } catch (error) {
            console.error('Error fetching data:', error);
            showNotification('שגיאה בטעינת הנתונים', 'error');
        } finally {
            hideLoadingState(event.target, originalText);
        }
    });
});

// Add form submission handler with validation
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = getFormData();
    const errors = validateForm(formData);

    if (errors.length > 0) {
        showNotification(errors.join('\n'), 'error');
        return;
    }

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = showLoadingState(submitButton);

    try {
        const response = await fetch(`${formData.dcimId}/edit`, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        const data = await response.json();

        if (data.success) {
            closeModal(modal);
            loadData();
            showNotification('הנתונים נשמרו בהצלחה', 'success');
            updateDCIM(formData);
        } else {
            showNotification('שגיאה בשמירת הנתונים', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('שגיאה בשמירת הנתונים', 'error');
    } finally {
        hideLoadingState(submitButton, originalText);
    }
});

// Update the event listeners initialization
document.addEventListener('DOMContentLoaded', function () {
    initializeUI();
    initializeEventListeners();
});

function initializeUI() {
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => button.addEventListener('click', handleEditClick));

    if (editForm) {
        editForm.addEventListener('submit', handleFormSubmission);
    }
}

function initializeEventListeners() {
    initializeFormHandlers();
    initializePullPanelLink();
    initializeModalHandlers();
}

function initializeModalHandlers() {
    if (closeSpan) {
        closeSpan.addEventListener('click', () => {
            closeModal(modal);
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal(modal);
        }
    });
}

function initializeFormHandlers() {
    if (filterForm) {
        filterForm.addEventListener("submit", handleFilterSubmit);
    }

    if (roomSelect && rackSelect) {
        roomSelect.addEventListener("change", () => loadData("room"));
        rackSelect.addEventListener("change", () => loadData("rack"));
    }
}

function initializePullPanelLink() {
    const pullPanelLink = document.getElementById("pull-panel-link");
    if (pullPanelLink) {
        pullPanelLink.addEventListener("click", handlePullPanelClick);
    }
}

async function handleEditClick(event) {
    const rowId = event.currentTarget.dataset.rowId;
    console.log("Edit button clicked for row ID:", rowId);

    try {
        const response = await fetch(`${rowId}/edit`);
        const data = await response.json();

        // Populate form fields
        populateEditForm(data);
        openModal(modal);
    } catch (error) {
        console.error('Error fetching data:', error);
        showNotification('שגיאה בטעינת הנתונים', 'error');
    }
}

async function handlePullPanelClick() {
    spinner.style.display = "block";

    try {
        const response = await fetch("admin/pullallpanels");
        const data = await response.json();

        if (data.status === "success") {
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification("שגיאה בעדכון המידע!" + error, 'error');
    } finally {
        spinner.style.display = "none";
    }
}

// Update the loadData function to handle errors better
async function loadData(howChange) {
    try {
        spinnerContainer.style.display = 'flex';

        const filterData = {
            filterRoom: howChange === "rack" || howChange === "room" ? roomSelect.value.trim() : "",
            filterRack: howChange === "rack" ? rackSelect.value.trim() : "",
            filterTextInput: howChange === "textInput" ? filterInput.value.trim() : ""
        };

        const response = await fetch('get_panels', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filterData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (howChange === "room") {
            updateFilterForm(data.filterData);
        }
        updatePanelsTable(data.panelsData);

        if (howChange === "textInput") {
            filterInput.value = "";
        }

    } catch (error) {
        console.error("Error loading data:", error);
        showNotification('שגיאה בטעינת הנתונים', 'error');
    } finally {
        spinnerContainer.style.display = 'none';
    }
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// עדכון הטיפול בשמירת הטופס
editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = {
        "dcimId": document.getElementById('edit-dcim-id').value,
        "name": document.getElementById('edit-name').value,
        "interface": updateSelectedInterface(),
        "status": editStatus.checked,
        "how_many_ports_remain": document.getElementById('edit-how_many_ports_remain').value,
        "classification": updateSelectedClassifications(),
        "destination": document.getElementById('edit-destination').value,
    };

    try {
        const response = await fetch(formData["dcimId"] + "/edit", {
            method: "POST",
            body: JSON.stringify(formData)
        });
        const data = await response.json();
        
        if (data.success) {
            clearOldCheckEdit();
            modal.classList.remove("fade-in");
            modal.style.pointerEvents = "none";
            loadData();

            // נסה לעדכן ב-DCIM
            try {
                const dcimResponse = await fetch(formData["dcimId"] + "/update_dcim", {
                    method: "POST",
                    body: JSON.stringify(formData)
                });
                const dcimData = await dcimResponse.json();

                if (dcimData.status === "success") {
                    showNotification('הנתונים נשמרו בהצלחה ועודכנו ב-DCIM', 'success');
                } else {
                    showNotification('הנתונים נשמרו מקומית, אך העדכון ב-DCIM נכשל: ' + dcimData.message, 'error');
                }
            } catch (dcimError) {
                showNotification('הנתונים נשמרו מקומית, אך יש בעיה בחיבור ל-DCIM', 'error');
            }
        } else {
            showNotification("שגיאה בשמירת הנתונים", 'error');
        }
    } catch (error) {
        showNotification("שגיאה בשמירת הנתונים", 'error');
        console.error(error);
    }
});

async function handleFormSubmission(e) {
    e.preventDefault();
    const formData = getFormData();
    const errors = validateForm(formData);

    if (errors.length) {
        showNotification(errors.join('\n'), 'error');
        return;
    }

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = showLoadingState(submitButton);

    try {
        const [saveResponse, dcimResponse] = await Promise.all([
            saveFormData(formData),
            updateDCIM(formData)
        ]);

        if (saveResponse.success) {
            closeModal(modal);
            loadData();
            handleDCIMResponse(dcimResponse);
        } else {
            showNotification('שגיאה בשמירת הנתונים', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('שגיאה בשמירת הנתונים', 'error');
    } finally {
        hideLoadingState(submitButton, originalText);
    }
}

async function saveFormData(formData) {
    const response = await fetch(`${formData.dcimId}/edit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    });
    return response.json();
}

function handleDCIMResponse(response) {
    if (response.status === "success") {
        showNotification('הנתונים נשמרו בהצלחה ועודכנו ב-DCIM', 'success');
    } else {
        showNotification('הנתונים נשמרו מקומית, אך העדכון ב-DCIM נכשל: ' + response.message, 'error');
    }
}

// Clean search input and handle form submission
function handleFilterSubmit(e) {
    e.preventDefault();
    const cleanedInput = filterInput.value.trim(); // Clean whitespace
    filterInput.value = cleanedInput;
    loadData("textInput");
}

// Improve form data handling
function getFormData() {
    return {
        dcimId: document.getElementById('edit-dcim-id').value.trim(),
        name: document.getElementById('edit-name').value.trim(),
        interface: updateSelectedInterface(),
        status: editStatus.checked,
        how_many_ports_remain: document.getElementById('edit-how_many_ports_remain').value.trim(),
        classification: updateSelectedClassifications(),
        destination: document.getElementById('edit-destination').value.trim(),
    };
}

function populateEditForm(data) {
    document.getElementById('edit-dcim-id').value = data.dcim_id;
    document.getElementById('edit-name').value = data.name;
    document.getElementById('edit-room').value = data.room;
    document.getElementById('edit-rack').value = data.rack;
    document.getElementById('edit-U').value = data.U;
    document.getElementById('edit-size').value = data.size;
    document.getElementById('edit-destination').value = data.destination;
    document.getElementById('edit-how_many_ports_remain').value = data.how_many_ports_remain;

    // Reset all interface radio buttons
    radioInterface.forEach(radio => radio.checked = false);

    // Set the correct interface
    if (data.interface) {
        const interfaceRadio = document.getElementById(`edit-interface-${data.interface}`);
        if (interfaceRadio) interfaceRadio.checked = true;
    }

    // Reset and set classification checkboxes
    redCheckbox.checked = false;
    blackCheckbox.checked = false;
    if (data.classification) {
        const classifications = data.classification.split("+");
        classifications.forEach(cls => {
            const checkbox = document.getElementById(`edit-classification-${cls}`);
            if (checkbox) checkbox.checked = true;
        });
    }

    // Set status
    editStatus.checked = data.status === "True";

    // Adjust textarea height
    const portsInput = document.getElementById('edit-how_many_ports_remain');
    portsInput.style.height = 'auto';
    portsInput.style.height = `${portsInput.scrollHeight}px`;
}