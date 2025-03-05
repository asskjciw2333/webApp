const cards = document.getElementsByClassName("card");

const cardModal = document.getElementById('modal');
const cardCloseSpan = document.getElementsByClassName("modal-close")[0];

const modalTitle = document.querySelector('.modal-title');
const modalForm = document.getElementById('modal-form');

const spinner = document.getElementsByClassName("spinner")[0];


const userId = "admin";
let automations = {};
let ws;


class AutomationClient {
    constructor(restBaseUrl, wsBaseUrl) {
        this.restBaseUrl = restBaseUrl;
        this.wsBaseUrl = wsBaseUrl;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.reconnectInterval = 3000; // 3 seconds
        this.currentInstanceId = null;
        this.isUserDisconnected = false;
        this.automationsStatus = null;
    }

    async startAutomation(automationType, params) {
        try {
            const response = await fetch(`${this.restBaseUrl}prepare-automation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ automation_type: automationType, params: params }),
            });

            if (!response.ok) {
                throw new Error('Failed to start automation (startAutomation)');
            }

            const data = await response.json()
            console.log(data.server_data);

            cardModal.classList.remove("fade-in");
            cardModal.style.pointerEvents = "none";

            this.currentInstanceId = data.server_data.instance_id
            automations[this.currentInstanceId] = data.server_data
            automations[this.currentInstanceId].display = true
            createUpgradeCircle(this.currentInstanceId);


            await fetch(`${this.restBaseUrl}start-automation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ automation_type: automationType, instance_id: data.server_data.instance_id }),
            });

            if (!response.ok) {
                throw new Error('Failed to start automation (startAutomation)');
            } else {
                console.log("gooddd");
            }


            // await this.connectWebSocket(this.currentInstanceId);
            // await this.sendStartMessage(this.currentInstanceId, 'server_upgrade');

            return data.server_data;

        } catch (error) {
            console.error('Error starting automation (startAutomation):', error);
            throw error;
        }
    }

    async connectWebSocket(instanceId) {
        if (this.isUserDisconnected) {
            console.log("User has disconnected. not attempting to reconnect.")
            return;
        }
        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(`${this.wsBaseUrl}/ws/${instanceId}`);

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                resolve();
            };

            this.socket.onmessage = (event) => {
                const update = JSON.parse(event.data);
                this.handleUpdate(update);
            };

            this.socket.onclose = (event) => {
                console.error(`WebSocket (${instanceId}) closed, code=${event.code}, reason=${event.reason}`);
                this.reconnectWebSocket(instanceId);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject();
            };
        })
    }

    reconnectWebSocket(instanceId) {
        if (this.isUserDisconnected) {
            console.log("User has disconnected. not attempting to reconnect.")
            return;
        }
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connectWebSocket(instanceId), this.reconnectInterval);
    }

    handleUpdate(update) {
        // console.log('Received update:', update);
        switch (update.type) {
            case 'update':
                updateAutomation(update.instance_id, update.message);
                break;
        }
    }

    async sendStartMessage(instanceId, automation_type) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ command: 'start', instance_id: instanceId, automation_type: automation_type }));
        } else {
            throw new Error('WebSocket is not open');
        }
    }

    async fwUpdateButtonConfirm() {
        const selectedVersionSpan = document.getElementById('selected_version');
        const serialSpan = document.getElementById('serial');
        const nameSpan = document.getElementById('name');

        if (confirm('בטוח?')) {
            try {
                const server_data = await client.startAutomation('server_upgrade', {
                    server_name: nameSpan.textContent,
                    serial_number: serialSpan.textContent,
                    data: selectedVersionSpan.textContent
                });
                console.log('Automation started with instance ID:', server_data.instance_id);
            } catch (error) {
                console.error('Failed to start automation (fwUpdateButtonConfirm):', error);
            }

        } else {
            return
        }
    }

    disconnect() {
        this.isUserDisconnected = true;
        if (this.socket) {
            this.socket.close();
        }
        console.log('User initiated disconnect. WebSocket connection closed.');
    }
}

const client = new AutomationClient('', `ws://${window.location.hostname}:8765`);

fetchExistingAutomations()

for (let i = 0; i < cards.length; i++) {
    cards[i].addEventListener("click", () => {
        cardModal.classList.add("fade-in")
        cardModal.style.pointerEvents = "auto"

        const cardTitle = cards[i].querySelector('.card-title').textContent;
        modalTitle.textContent = `${cardTitle}`;

        modalForm.innerHTML = '';
        const AutomationForm = getAutomationForm(cards[i].getAttribute("data-id"));
        modalForm.innerHTML = AutomationForm
        automationData(cards[i].getAttribute("data-id"))
    })
}

if (cardCloseSpan) {
    cardCloseSpan.addEventListener('click', function () {
        cardModal.classList.remove("fade-in")
        cardModal.style.pointerEvents = "none"
    });
}

window.addEventListener('click', function (event) {
    if (event.target == cardModal) {
        cardModal.classList.remove("fade-in")
        cardModal.style.pointerEvents = "none"
    }
});


function getAutomationForm(dataid) {
    console.log(dataid);

    if (dataid == "1") {
        return (`
            <div class="server-update-form">
                <div class="form-group">
                    <div class="version-selector">
                        <div class="version-header">
                            <label for="firmware_version">גרסת קושחה: </label>
                            <div class="spinner-small hidden" id="spinner-fw"></div>
                        </div>
                        <select data-blade="" data-rack="" id="firmware_version" name="firmware_version" class="form-control-text hidden" required>
                        </select>
                    </div>
                </div>
                    
                <div class="form-group search-section">
                    <div class="search-type">
                        <label for="search_type">חיפוש ע"י:</label>
                        <select id="search_type" name="search_type" class="form-control-text">
                            <option value="name" selected>שם</option>
                            <option value="serial_number">מספר סריאלי</option>
                            <option value="location">מיקום</option>
                        </select>
                    </div>
                    <div class="search-input">
                        <label for="search_term">שדה חיפוש:</label>
                        <input type="text" id="search_term" name="search_term" class="form-control-text" required>
                    </div>
                </div>

                <div class="search-button-container">
                    <button type="submit" id="search_button" class="btn-primary btn">
                        <span>חפש</span>
                        <div class="spinner-small hidden" id="spinner-search"></div>
                    </button>
                </div>
                
                <div id="server_data" class="hidden">
                    <h3>פרטי השרת</h3>
                    <div class="server-details">
                        <ul>
                            <li><strong>דומיין:</strong> <span id="domain"></span></li>
                            <li><strong>שם:</strong> <span id="name"></span></li>
                            <li><strong>מזהה שרת (DN):</strong> <span id="server_dn"></span></li>
                            <li><strong>סריאל:</strong> <span id="serial"></span></li>
                            <li><strong>מיקום:</strong> <span id="location"></span></li>
                            <li>
                                <strong>גרסה קיימת:</strong> <span id="existing_version"></span>
                                <div id="note_2_version"></div>
                            </li>
                        </ul>
                    </div>
                    
                    <div class="confirmation">
                        <p>לעדכן את השרת לגרסה <span id="selected_version" class="version-highlight"></span>?</p>
                        <button type="button" class="btn-primary btn" id="fw-update-button" onclick="client.fwUpdateButtonConfirm()">
                            <span>אישור</span>
                        </button>
                    </div>
                </div>
                
                <p id="error_message" class="error hidden"></p>
                <p id="statusUpdates"></p>
            </div>
        `)
    } else if (dataid == "2") {
        return (`
            <div class="bookmark-instructions">
                <ol>
                    <li>
                        <p>פתח את סרגל הסימניות בדפדפן שלך (על ידי לחיצה על Ctrl+Shift+B).</p>
                    </li>
                    <li>
                        <p>לחץ לחיצה ימנית על סרגל הסימניות ובחר "הוסף דף".</p>
                    </li>
                    <li>
                        <p>בשדה "שם", הזן שם לסימניה (לדוגמה: "סיסמאות").</p>
                    </li>
                    <li>
                        <p>בשדה "כתובת אתר", העתק והדבק את קוד ה-JavaScript הבא:</p>
                    </li>
                </ol>
                
                <div class="code-container">
                    <textarea id="pre-code"> javascript: (function () {
            var accounts = [


                //    ➡➡➡➡➡➡    פה ניתן להוסיף סיסמאות לפי הפורמט    ⬅⬅⬅⬅⬅⬅
                { name: '1970', username: 'admin', password: 'Central1970' },
                { name: '2017', username: 'admin', password: 'Central2017' },
                { name: 'ADST', username: 'admin', password: 'adstadst' },
                { name: 'omega', username: 'omega', password: 'omega' }
            ];
        



            function createSelector() {
                var selector = document.createElement('div');
        
                var  accountsContainer= document.createElement('div');
                accountsContainer.style.display = 'flex';
                selector.appendChild(accountsContainer);
        
                selector.style.position = 'fixed';
                selector.style.display = 'flex';
                selector.style.alignItems= "center";
                selector.style.gap = '1rem';
                selector.style.top = '20px';
                selector.style.left = '20px';
                selector.style.backgroundColor = 'white';
                selector.style.border = '1px solid black';
                selector.style.padding = '10px';
                selector.style.zIndex = '9999';
                accounts.forEach(function (account, index) {
                    var button = document.createElement('button');
                    button.textContent = account.name;
                    button.style.display = 'block';
                    button.style.margin = '5px';
                    button.style.width = '100%';
                    button.style.minWidth = 'auto';
                    button.onclick = function () {
                        fillCredentials(account);
                        document.body.removeChild(selector);
                        autoSubmit();
                    };
                    
                    if(button.textContent == "דומיין"){
                        button.style.border=  "1px solid rgb(4, 159, 217)";
                    }
                    if(button.textContent == "ADST"){
                        button.style.border=  "1px solid #00B388";
                    }
                    if(button.textContent == "סביבת ניסוי"){
                        button.style.border=  "1px solid red";
                    }
                    accountsContainer.appendChild(button);
                });
                
                var closeButton = document.createElement('button');
                closeButton.textContent = 'X';
                closeButton.style.display = 'block';
                closeButton.style.margin = '5px';
                closeButton.style.width = '4rem';
                closeButton.style.height = '4rem';
                closeButton.style.minWidth = 'auto';
                closeButton.style.borderRadius = "50%";
                closeButton.onclick = function () {
                    document.body.removeChild(selector);
                };
                selector.appendChild(closeButton);
        
                document.body.appendChild(selector);
            }
        
            function fillCredentials(account) {
                let inputs = [];
        
                var iframes = document.getElementsByTagName("iframe");
                if (iframes.length > 0) {
                    inputs = iframes[0].contentDocument.querySelectorAll("input");
        
                } else {
                    inputs = document.getElementsByTagName("input");
                }
        
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].type.toLowerCase() === 'text' ||
                        inputs[i].type.toLowerCase() === 'email' ||
                        inputs[i].name.toLowerCase() === 'usernameinput' ||
                        inputs[i].name.toLowerCase().indexOf('user') !== -1) {
                        inputs[i].value = account.username;
                    }
                    if (inputs[i].type.toLowerCase() === 'password' || inputs[i].name.toLowerCase() === 'passwordinput') {
                        inputs[i].value = account.password;
                    }
                }
            }
        
            function autoSubmit() {
                var possibleSubmitButtons = [];
                var iframes = document.getElementsByTagName("iframe");
                let formButton;
        
                if (iframes.length > 0) {
                    possibleSubmitButtons = iframes[0].contentDocument.querySelectorAll('button, input[type="button"], a');
                    formButton = iframes[0].contentDocument.getElementsByTagName("form");
                } else {
                    possibleSubmitButtons = document.querySelectorAll('button, input[type="button"], a');
                    formButton = document.getElementsByTagName("form");
                }
        
                if (formButton) {
                    simulateEnterKey(iframes[0]);
                } else if (possibleSubmitButtons) {
                    for (var i = 0; i < possibleSubmitButtons.length; i++) {
                        var buttonText = possibleSubmitButtons[i].textContent.toLowerCase();
                        if (buttonText.includes('login') || buttonText.includes('log in') || buttonText.includes('sign in') || buttonText.includes('submit')) {
                            possibleSubmitButtons[i].click();
                        }
                    }
                }
            }
            
            function simulateEnterKey(iframe) {
                var enterKeyEvent = new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: 'Enter',
                    keyCode: 13,
                    which: 13
                });
        
                let inputs = [];
                if (iframe) {
                    inputs = iframe.contentDocument.querySelectorAll("input");
                } else {
                    inputs = document.getElementsByTagName("input");
                }
                var lastInput = inputs[inputs.length - 2];
                if (lastInput) {
                    lastInput.focus();
                    lastInput.dispatchEvent(enterKeyEvent);
                    console.log("enter");
                } else {
                    lastInput.focus();
                    document.dispatchEvent(enterKeyEvent);
                    console.log("enter");
                }
            }
        
            createSelector();
        })();</textarea>
                    <button id="code-btn" type="button" onclick="copyCode()">
                        העתק קוד
                    </button>
                </div>

                <ol start="5">
                    <li>
                        <p>לחץ על "שמור" כדי להוסיף את הסימניה.</p>
                    </li>
                    <li>
                        <p>👍</p>
                    </li>
                </ol>
            </div>
        `)
    }
}

function copyCode() {

    const code = document.getElementById("pre-code");
    code.select()
    document.execCommand("copy");
    document.getElementById("code-btn").innerText = "מעתיקן 🤡"

    // const code = document.getElementById("pre-code").value;
    // navigator.clipboard.writeText(code).then(() => {
    //     document.getElementById("code-btn").innerText = "מעתיקן 🤡"
    // }, (err) => {
    //     console.error('שגיאה בהעתקה: ', err);
    // });
}

async function automationData(cardId) {
    if (cardId == "1") {
        const searchType = document.getElementById('search_type');
        const searchTerm = document.getElementById('search_term');
        const firmwareVersion = document.getElementById('firmware_version');
        const serverData = document.getElementById('server_data');
        const errorMessage = document.getElementById('error_message');
        const domainSpan = document.getElementById('domain');
        const nameSpan = document.getElementById('name');
        const serverDnSpan = document.getElementById('server_dn');
        const serialSpan = document.getElementById('serial');
        const locationSpan = document.getElementById('location');
        const existingVersionSpan = document.getElementById('existing_version');
        const note2VersionSpan = document.getElementById('note_2_version');
        const selectedVersionSpan = document.getElementById('selected_version');
        const spinnerFW = document.getElementById("spinner-fw")
        const spinnerSearch = document.getElementById("spinner-search")

        modalForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const criteria = searchType.value;
            const query = searchTerm.value;

            serverData.classList.add('hidden');
            spinnerSearch.classList.remove("hidden")
            errorMessage.classList.add('hidden');

            fetch(`search_server`, {
                method: "POST",
                body: JSON.stringify({
                    "search_type": criteria,
                    "search_term": query
                })
            })
                .then(response => response.json())
                .then(data => {
                    console.log(data);
                    if (data.status == "success") {
                        domainSpan.textContent = data.server.domain;
                        nameSpan.textContent = data.server.usr_lbl.split(" ")[1];
                        serverDnSpan.textContent = data.server.dn;
                        serialSpan.textContent = data.server.serial;
                        locationSpan.textContent = data.server.name;
                        existingVersionSpan.textContent = data.server.version;

                        const need2staps = ["3.2(1d)B", "3.2(1d)C", "3.2(2b)C", " 3.2(2c)C", "3.2(2c)B"]
                        for (let i = 0; i < need2staps.length; i++) {
                            if (data.server.version.includes(need2staps[i])) {
                                note2VersionSpan.innerHTML = `מגירסה זו נדרש שדרוג עם גרסת ביניים <br> <span style="font-weight:bold;">התהליך נתמך</span> אך יקח יותר זמן מהרגיל`;
                            }
                        }

                        nameExists = false;3
                        for (let key in automations) {
                            if (automations[key].server_name == nameSpan.textContent && automations[key].status == 'running') {
                                nameExists = true;
                                break
                            } else {
                                nameExists = false;
                            }
                        }

                        const dataAttRack = firmwareVersion.options[firmwareVersion.selectedIndex].getAttribute("data-rack");
                        const dataAttBlade = firmwareVersion.options[firmwareVersion.selectedIndex].getAttribute("data-blade");
                        if (dataAttRack == data.server.version || dataAttBlade == data.server.version) {
                            selectedVersionSpan.textContent = "⛔ הגרסה שבחרת שווה לגרסת השרת ⛔";
                            document.getElementById("fw-update-button").disabled = true;
                        } if (nameExists) {
                            selectedVersionSpan.textContent = "⛔ השרת כבר בתהליך עדכון ⛔";
                            document.getElementById("fw-update-button").disabled = true;
                        } else {
                            selectedVersionSpan.textContent = firmwareVersion.value;
                            document.getElementById("fw-update-button").disabled = false;
                        }

                        spinnerSearch.classList.add("hidden");
                        serverData.classList.remove('hidden');
                        errorMessage.classList.add('hidden');
                    } else {
                        spinnerSearch.classList.add("hidden");
                        serverData.classList.add('hidden');
                        errorMessage.textContent = data.message;
                        errorMessage.classList.remove('hidden');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    errorMessage.textContent = 'התרחשה בעיה בחיפוש הרת..';
                    errorMessage.classList.remove('hidden');
                    spinnerSearch.classList.add("hidden");
                });
        });
        console.log(spinnerFW);
        spinnerFW.classList.remove("hidden")
        const FWOptionsList = await pullFWList()
        updateFWSelectOptions(FWOptionsList)
        spinnerFW.classList.add("hidden")
        firmwareVersion.classList.remove("hidden")
    }
}


function updateAutomation(id, automation) {
    if (automations[id] && automations[id].display) {
    circle = document.getElementById(`automation-${id}`);
    if (!circle) {
            circle = createUpgradeCircle(id);
        }
        automations[id].progress = automation.progress;
        automations[id].status = automation.status;
        automations[id].message = automation.message;
        
        circle.querySelector('h4').textContent = `${automation.progress != 101 ? automation.progress + '%' : '✔'}`;
        
        if (automation.status == 'completed') {
            completeAutomation(id);
        } else if (automation.status == 'failed') {
            failAutomation(id, automation.error);
        }
    }
}

function completeAutomation(id) {
    automations[id].status = 'completed';
    const circle = document.getElementById(`automation-${id}`);
    circle.classList.remove("active")
    circle.classList.add("completed")
}

function failAutomation(id, error) {
    automations[id].status = 'failed';
    automations[id].error = error;
    const circle = document.getElementById(`automation-${id}`);
    circle.classList.remove("active")
    circle.classList.add("failed")

    circle.getElementsByTagName('h4')[0].textContent = `❕`;
}

function createUpgradeCircle(instanceId) {
    const circle = document.createElement('div');
    circle.id = `automation-${instanceId}`;
    circle.className = 'automation-circle';
    circle.title = automations[instanceId].server_name;
    circle.onclick = () => showModal(instanceId);

    document.getElementById('automation-circles-container').appendChild(circle);

    circle.classList.add("active");

    circleText = document.createElement('h4');
    circleText.innerHTML = '<div class="spinner-small"></div>';
    circle.appendChild(circleText);


    const closeBtn = document.createElement('div');
    closeBtn.className = 'delete-button';
    closeBtn.onclick = (e) => {
        e.stopPropagation()
        automations[instanceId].display = false
        circle.remove()
    };
    circle.appendChild(closeBtn);

    return circle
}

function showModal(id) {
    console.log(automations[id]);
    modalTitle.textContent = `${automations[id].server_name}`;
    
    modalForm.innerHTML = `
        <div class="automation-status">
            <div class="automation-status-grid">
                <div class="automation-status-item">
                    <div class="automation-status-label">מזהה אוטומציה:</div>
                    <div class="automation-status-value">${id}</div>
                </div>
                
                <div class="automation-status-item">
                    <div class="automation-status-label">התקדמות:</div>
                    <div class="automation-status-value automation-status-progress">
                        ${automations[id].progress != 101 ? automations[id].progress + '%' : "הושלם ✓"}
                    </div>
                </div>
                
                <div class="automation-status-item">
                    <div class="automation-status-label">סטטוס:</div>
                    <div class="automation-status-value">${automations[id].status}</div>
                </div>
                
                <div class="automation-status-item">
                    <div class="automation-status-label">הודעה:</div>
                    <div class="automation-status-value">${automations[id].message}</div>
                </div>
                
                ${automations[id].error ? `
                    <div class="automation-status-item">
                        <div class="automation-status-label">שגיאה:</div>
                        <div class="automation-status-value automation-status-error">${automations[id].error}</div>
                    </div>
                ` : ''}
                
                ${automations[id].created_at ? `
                    <div class="automation-status-item">
                        <div class="automation-status-label">נוצר ב:</div>
                        <div class="automation-status-value automation-status-date">
                            ${new Date(automations[id].created_at).toLocaleString()}
                        </div>
                    </div>
                ` : ''}
            </div>

            <button type="button" class="btn untracked-btn delete-btn" data-id="${id}">
                <span>הפסק מעקב</span>
            </button>
        </div>
    `;

    const deleteBtn = modalForm.getElementsByTagName('button')[0];
    deleteBtn.addEventListener('click', () => {
        unTrackAutomation(deleteBtn.dataset.id);
        cardModal.classList.remove("fade-in");
        cardModal.style.pointerEvents = "none";
    });
    
    cardModal.classList.add("fade-in");
    cardModal.style.pointerEvents = "auto";
}

function fetchExistingAutomations() {
    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.style.display = 'block';

    fetch(`/automations/list?user_id=${userId}`)
        .then(response => response.json())
        .then(data => {
            // console.log("List of running automations", data);
            Object.entries(data).forEach(async ([instance_id, automation]) => {
                if (automations[instance_id]) {
                    if (!automations[instance_id].display) {
                        automations[instance_id] = automation
                        automations[instance_id].display = false
                    } else {
                        automations[instance_id] = automation
                        automations[instance_id].display = true
                    }
                } else {
                    automations[instance_id] = automation
                    automations[instance_id].display = true
                }
            });
            for (id in automations) {
                updateAutomation(automations[id].instance_id, automations[id]);
            }
            loadingMessage.style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching automations:', error);
            loadingMessage.textContent = 'Error loading automations. Please refresh the page.';
        })
        .finally(() => setTimeout(fetchExistingAutomations, 10000));
}


async function pullFWList() {
    try {
        const response = await fetch(`http://${window.location.hostname}:${window.location.port}/automations/pull-FW-list-package`);
        const data = await response.json();

        console.log(data);
        if (data["status"] == "success") {
            return (data.data)
        }
    }
    catch (error) {
        console.error(error);
    }
}

function updateFWSelectOptions(FWOptionsList) {
    const firmwareVersion = document.getElementById('firmware_version');
    firmwareVersion.innerHTML = '<option value="">בחר גרסה</option> '
    if (FWOptionsList) {
        FWOptionsList.forEach((FW => {
            firmwareVersion.insertAdjacentHTML("beforeend", `<option data-blade="${FW.blade_bundle_version}" data-rack="${FW.rack_bundle_version}" value="${FW.name}">${FW.name}</option>`);
        }))
    }
}

async function pullAllCentralData() {
    try {
        const response = await fetch(`http://${window.location.hostname}:${window.location.port}/automations/admin/updateCentralServersData`);
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error(error);
    }
}

function unTrackAutomation(instance_id) {
    fetch('/automations/unTrack_automation', {
        method: "POST",
        headers: {
            "Content-Type": 'application/json',
        },
        body: JSON.stringify({ instance_id: instance_id })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                const automationElement = document.getElementById(`automation-${instance_id}`)
                if (automationElement) {
                    automationElement.remove();
                    delete automations[instance_id]
                } else {
                    console.error(data.error);
                }
            }
        })
        .catch(error => console.error('Error: ', error))
}

