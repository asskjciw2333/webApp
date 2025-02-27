import { showNotification } from '../../core/notifications.js';
import { getServerUpdateFormHTML } from './templates/serverUpdateTemplate.js';
import { getBookmarkInstructionsHTML, getBookmarkCode } from './templates/bookmarkTemplate.js';
import { getTextCheckFormHTML } from './templates/textCheckTemplate.js';

export class AutomationUI {
    constructor() {
        this.initializeElements();
    }

    initializeElements() {
        this.modal = document.getElementById('modal');
        this.modalTitle = document.querySelector('.modal-title');
        this.modalForm = document.getElementById('modal-form');
    }

    
    initializeServerUpdateForm() {
        const searchButton = document.getElementById('search_button');
        const modalForm = document.getElementById('modal-form');
        if (!modalForm || !searchButton) return;

        modalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const searchType = document.getElementById('search_type').value;
            const searchTerm = document.getElementById('search_term').value;
            const firmwareVersion = document.getElementById('firmware_version').value;

           
            if (!searchTerm) {
                this.showError('נא להזין ערך לחיפוש');
                return;
            }

            if (!firmwareVersion) {
                this.showError('נא לבחור גרסת קושחה');
                return;
            }

            this.showSpinner();
            this.hideError();

            try {
                const response = await window.automationManager.serverService.findServer(
                    searchType,
                    searchTerm
                );
                if (response.status === "success") {
                    this.updateServerDetails(response.data);
                } else {
                    this.showError(response.response || 'שגיאה בחיפוש השרת');
                }
            } catch (error) {
                console.error('Search error:', error);
                this.showError('שגיאה בחיפוש השרת');
            } finally {
                this.hideSpinner();
            }
        });

        
        searchButton.addEventListener('click', () => {
            modalForm.dispatchEvent(new Event('submit'));
        });
    }

    checkSpecialVersion(version) {
        const note2VersionSpan = document.getElementById('note_2_version');
        const forceDirectUpgradeContainer = document.getElementById('force_direct_upgrade_container');
        const intermediateVersionContainer = document.getElementById('intermediate_version_container');
        
        try {
            // Specific versions that always need double upgrade
            const specificVersions = [
                "3.2(1d)B",
                "3.2(1d)C",
                "3.2(2b)C",
                "3.2(2c)C",
                "3.2(2c)B"
            ];

            // First check specific versions that always need double upgrade
            let needsDoubleUpgrade = specificVersions.some(v => version.includes(v));

            if (!needsDoubleUpgrade) {
                // Extract version numbers using regex to match server-side logic
                const versionMatch = version.match(/^(\d+)\.(\d+)/);
                if (versionMatch) {
                    const [, major, minor] = versionMatch;
                    // Need double upgrade if version is below 4.0
                    needsDoubleUpgrade = parseInt(major) < 4;
                } else {
                    console.warn(`Could not parse version number from ${version}`);
                }
            }
            
            if (needsDoubleUpgrade) {
                note2VersionSpan.innerHTML = `
                    <div class="version-warning">
                        <div>מגירסה זו נדרש שדרוג דו-שלבי:</div>
                        <div>1. שדרוג לגרסת ביניים</div>
                        <div>2. שדרוג לגרסה הסופית</div>
                        <div style="font-weight:bold; margin-top:5px;">התהליך נתמך אוטומטית אך יקח יותר זמן מהרגיל</div>
                    </div>`;
                note2VersionSpan.classList.add('visible');
                
                // Show intermediate version selection
                if (intermediateVersionContainer) {
                    const targetVersion = document.getElementById('firmware_version').value;
                    const availableVersions = Array.from(document.getElementById('firmware_version').options)
                        .map(opt => opt.value)
                        .filter(ver => ver && ver !== targetVersion); // Filter out empty and target version

                    if (availableVersions.length > 0) {
                        intermediateVersionContainer.innerHTML = `
                            <div class="intermediate-version-selection">
                                <label for="intermediate_version">בחר גרסת ביניים:</label>
                                <select id="intermediate_version" class="form-control-text" required>
                                    <option value="">בחר גרסת ביניים</option>
                                    ${availableVersions.map(ver => `<option value="${ver}">${ver}</option>`).join('')}
                                </select>
                                <div class="info-text">גרסת הביניים תשמש כשלב ראשון בתהליך השדרוג</div>
                            </div>`;
                        intermediateVersionContainer.classList.add('visible');
                    }
                }
                
                // Show force direct upgrade option
                if (forceDirectUpgradeContainer) {
                    forceDirectUpgradeContainer.innerHTML = `
                        <div class="force-upgrade-option">
                            <label class="checkbox-container">
                                <input type="checkbox" id="force_direct_upgrade">
                                <span class="checkmark"></span>
                                הכרח שדרוג ישיר (לא מומלץ)
                            </label>
                            <div class="warning-text">⚠️ אזהרה: שדרוג ישיר עלול לגרום לבעיות. השתמש באפשרות זו רק במקרים מיוחדים.</div>
                        </div>`;
                    forceDirectUpgradeContainer.classList.add('visible');

                    // Hide/show intermediate version selection based on force direct upgrade checkbox
                    document.getElementById('force_direct_upgrade').addEventListener('change', (e) => {
                        if (e.target.checked) {
                            intermediateVersionContainer.classList.remove('visible');
                            document.getElementById('intermediate_version').removeAttribute('required');
                        } else {
                            intermediateVersionContainer.classList.add('visible');
                            document.getElementById('intermediate_version').setAttribute('required', 'required');
                        }
                    });
                }
            } else {
                note2VersionSpan.classList.remove('visible');
                if (forceDirectUpgradeContainer) {
                    forceDirectUpgradeContainer.classList.remove('visible');
                }
                if (intermediateVersionContainer) {
                    intermediateVersionContainer.classList.remove('visible');
                }
            }
        } catch (error) {
            console.error('Error checking version:', error);
            // In case of error, don't show any warning
            note2VersionSpan.classList.remove('visible');
            if (forceDirectUpgradeContainer) {
                forceDirectUpgradeContainer.classList.remove('visible');
            }
            if (intermediateVersionContainer) {
                intermediateVersionContainer.classList.remove('visible');
            }
        }
    }

    updateServerDetails(serverData) {
        console.log(serverData);
        const serverDetails = document.getElementById('server_data');
        if (!serverDetails) return;

        // עדכון פרטי השרת
        document.getElementById('domain').textContent = serverData.domain;
        document.getElementById('name').textContent = serverData.usr_lbl.split(" ")[1];
        document.getElementById('server_dn').textContent = serverData.dn;
        document.getElementById('serial').textContent = serverData.serial;
        document.getElementById('location').textContent = serverData.name;
        document.getElementById('existing_version').textContent = serverData.version;

        this.checkSpecialVersion(serverData.version);
        this.updateSelectedVersion(serverData);

        serverDetails.classList.add('visible');
        document.getElementById('error_message').classList.remove('visible');
    }

    updateSelectedVersion(serverData) {
        const firmwareVersion = document.getElementById('firmware_version');
        const selectedVersionSpan = document.getElementById('selected_version');
        const updateButton = document.getElementById('fw-update-button');

        const selectedOption = firmwareVersion.options[firmwareVersion.selectedIndex];
        const isCurrentVersion = selectedOption.getAttribute("data-rack") === serverData.version ||
            selectedOption.getAttribute("data-blade") === serverData.version;

        let hasActiveUpgrade = false;
        for (const automation of window.automationManager.automations.values()) {
            if (automation.server_name === serverData.usr_lbl.split(" ")[1] && 
                ['pending', 'running'].includes(automation.status)) {
                hasActiveUpgrade = true;
                break;
            }
        }

        if (isCurrentVersion) {
            selectedVersionSpan.innerHTML = `
                <div class="version-error">
                    ⛔ הגרסה שבחרת זהה לגרסה הנוכחית של השרת ⛔
                </div>`;
            updateButton.disabled = true;
        } else if (hasActiveUpgrade) {
            selectedVersionSpan.innerHTML = `
                <div class="version-error">
                    ⛔ השרת נמצא כרגע בתהליך שדרוג ⛔
                </div>`;
            updateButton.disabled = true;
        } else {
            selectedVersionSpan.textContent = firmwareVersion.value;
            updateButton.disabled = false;
        }
    }

    // Modal Methods
    showModal() {
        this.modal.style.display = "flex";
        this.modal.classList.add("fade-in");
        this.modal.classList.remove("fade-out");
        this.modal.style.pointerEvents = "auto";
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        this.modal.classList.remove("fade-in");
        this.modal.classList.add("fade-out");
        this.modal.style.pointerEvents = "none";
        document.body.style.overflow = '';
        
        setTimeout(() => {
            this.modal.style.display = "none";
            this.modal.classList.remove("fade-out");
        }, 300);
    }

    // UI Update Methods
    updateFWSelectOptions(FWOptionsList) {
        const firmwareVersion = document.getElementById('firmware_version');
        if (!firmwareVersion) return;

        firmwareVersion.innerHTML = '<option value="">בחר גרסה</option>';
        if (FWOptionsList) {
            FWOptionsList.forEach(FW => {
                firmwareVersion.insertAdjacentHTML(
                    "beforeend",
                    `<option data-blade="${FW.blade_bundle_version}" 
                     data-rack="${FW.rack_bundle_version}" 
                     value="${FW.name}">${FW.name}</option>`
                );
            });
        }
        firmwareVersion.classList.remove("hidden");
    }

    // Loading States
    showSpinner() {
        const spinnerSearch = document.getElementById("spinner-search");
        if (spinnerSearch) spinnerSearch.classList.remove("hidden");
    }

    hideSpinner() {
        const spinnerSearch = document.getElementById("spinner-search");
        if (spinnerSearch) spinnerSearch.classList.add("hidden");
    }

    showFWSpinner() {
        const spinnerFW = document.getElementById("spinner-fw");
        const firmwareVersion = document.getElementById('firmware_version');
        if (spinnerFW) {
            spinnerFW.classList.remove("hidden");
            if (firmwareVersion) firmwareVersion.classList.add("hidden");
        }
    }

    hideFWSpinner() {
        const spinnerFW = document.getElementById("spinner-fw");
        const firmwareVersion = document.getElementById('firmware_version');
        if (spinnerFW) {
            spinnerFW.classList.add("hidden");
            if (firmwareVersion) firmwareVersion.classList.remove("hidden");
        }
    }

    // Error Handling
    showError(message) {
        const errorElement = document.getElementById('text-check-error');
        errorElement.textContent = message;
        errorElement.classList.add('visible');
    }

    hideError() {
        const errorElement = document.getElementById('text-check-error');
        errorElement.classList.remove('visible');
    }

    // Templates
    getServerUpdateTemplate() {
        return getServerUpdateFormHTML();
    }

    getBookmarkTemplate() {
        return `
            <div class="bookmark-instructions">
                ${getBookmarkInstructionsHTML()}
            </div>
        `;
    }

    getTextCheckTemplate() {
        return `
            <form class="text-check-form">
                ${getTextCheckFormHTML()}
            </form>
        `;
    }

    showAutomationModal(automation) {
        this.modalTitle.textContent = automation.server_name;
        this.modalForm.innerHTML = `
            <div class="automation-status">
                <div class="automation-status-grid">
                    <div class="automation-status-item">
                        <div class="automation-status-label">מזהה אוטומציה:</div>
                        <div class="automation-status-value">${automation.instance_id || automation.id}</div>
                    </div>
                    
                    <div class="automation-status-item">
                        <div class="automation-status-label">סוג אוטומציה:</div>
                        <div class="automation-status-value">${automation.automation_type || 'לא זמין'}</div>
                    </div>

                    <div class="automation-status-item">
                        <div class="automation-status-label">מספר סידורי:</div>
                        <div class="automation-status-value">${automation.serial_number || 'לא זמין'}</div>
                    </div>

                    <div class="automation-status-item">
                        <div class="automation-status-label">טמפליט:</div>
                        <div class="automation-status-value">${automation.template || 'לא זמין'}</div>
                    </div>
                    
                    <div class="automation-status-item">
                        <div class="automation-status-label">התקדמות:</div>
                        <div class="automation-status-value automation-status-progress">
                            ${automation.progress != 101 ? automation.progress + '%' : "הושלם ✓"}
                        </div>
                    </div>
                    
                    <div class="automation-status-item">
                        <div class="automation-status-label">סטטוס:</div>
                        <div class="automation-status-value">${automation.status}</div>
                    </div>

                    <div class="automation-status-item">
                        <div class="automation-status-label">נתונים:</div>
                        <div class="automation-status-value">${automation.data || 'לא זמין'}</div>
                    </div>
                    
                    <div class="automation-status-item">
                        <div class="automation-status-label">הודעה:</div>
                        <div class="automation-status-value">${automation.message}</div>
                    </div>
                    
                    ${automation.error ? `
                        <div class="automation-status-item">
                            <div class="automation-status-label">שגיאה:</div>
                            <div class="automation-status-value automation-status-error">${automation.error}</div>
                        </div>
                    ` : ''}

                    <div class="automation-status-item">
                        <div class="automation-status-label">משתמש:</div>
                        <div class="automation-status-value">${automation.user_id || 'לא זמין'}</div>
                    </div>
                    
                    ${automation.created_at ? `
                        <div class="automation-status-item">
                            <div class="automation-status-label">נוצר ב:</div>
                            <div class="automation-status-value automation-status-date">
                                ${new Date(automation.created_at).toLocaleString()}
                            </div>
                        </div>
                    ` : ''}

                    ${automation.force_direct_upgrade ? `
                        <div class="automation-status-item">
                            <div class="automation-status-label">שדרוג ישיר:</div>
                            <div class="automation-status-value">כן</div>
                        </div>
                    ` : ''}
                </div>

                <div class="automation-actions">
                    ${(automation.status === 'running' || automation.status === 'pending') ? `
                        <button type="button" class="btn danger-btn stop-btn" data-id="${automation.instance_id || automation.id}">
                            <span>עצור אוטומציה</span>
                        </button>
                    ` : ''}
                    <button type="button" class="btn untracked-btn delete-btn" data-id="${automation.instance_id || automation.id}">
                        <span>הפסק מעקב</span>
                    </button>
                </div>
            </div>
        `;

        this.showModal();
        const deleteBtn = this.modalForm.querySelector('.delete-btn');
        const stopBtn = this.modalForm.querySelector('.stop-btn');
        
        return { deleteBtn, stopBtn };
    }

    showConfirmationModal(details) {
        const confirmationModal = document.createElement('div');
        confirmationModal.className = 'confirmation-modal';
        confirmationModal.innerHTML = `
            <div class="confirmation-content">
                <h3>אישור שדרוג שרת</h3>
                <div class="confirmation-details">
                    <div class="detail-item">
                        <span class="detail-label">שם שרת:</span>
                        <span class="detail-value">${details.serverName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">מספר סידורי:</span>
                        <span class="detail-value">${details.serialNumber}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">גרסת קושחה סופית:</span>
                        <span class="detail-value">${details.firmwareVersion}</span>
                    </div>
                    ${details.intermediateVersion && !details.forceDirectUpgrade ? `
                        <div class="detail-item">
                            <span class="detail-label">גרסת ביניים:</span>
                            <span class="detail-value">${details.intermediateVersion}</span>
                        </div>
                    ` : ''}
                    ${details.forceDirectUpgrade ? `
                        <div class="warning-message">
                            ⚠️ שים לב: ביקשת לבצע שדרוג ישיר. פעולה זו אינה מומלצת ועלולה לגרום לבעיות.
                        </div>
                    ` : ''}
                </div>
                <div class="confirmation-actions">
                    <button class="btn cancel-btn">ביטול</button>
                    <button class="btn confirm-btn">אישור</button>
                </div>
            </div>
        `;

        return new Promise((resolve) => {
            document.body.appendChild(confirmationModal);
            
            const cancelBtn = confirmationModal.querySelector('.cancel-btn');
            const confirmBtn = confirmationModal.querySelector('.confirm-btn');
            
            const cleanup = () => {
                confirmationModal.remove();
            };
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
        });
    }

    async handleFWUpdate(serverService, onSuccess) {
        const searchType = document.getElementById('search_type').value;
        const searchTerm = document.getElementById('search_term').value;
        const firmwareVersion = document.getElementById('firmware_version').value;
        const forceDirectUpgrade = document.getElementById('force_direct_upgrade')?.checked || false;
        const intermediateVersion = document.getElementById('intermediate_version')?.value;
        const serverName = document.getElementById('name').textContent;
        const serialNumber = document.getElementById('serial').textContent;
        const updateButton = document.getElementById('fw-update-button');
        const spinnerContainer = document.createElement('div');
        spinnerContainer.className = 'spinner-small';

        if (!searchTerm || !firmwareVersion) {
            this.showError('נא למלא את כל השדות');
            return;
        }

        // Check if intermediate version is required but not selected
        const needsIntermediate = document.getElementById('intermediate_version_container')?.classList.contains('visible');
        if (needsIntermediate && !forceDirectUpgrade && !intermediateVersion) {
            this.showError('נא לבחור גרסת ביניים');
            return;
        }

        // Show confirmation modal
        const confirmed = await this.showConfirmationModal({
            serverName,
            serialNumber,
            firmwareVersion,
            forceDirectUpgrade,
            intermediateVersion
        });

        if (!confirmed) return;

        try {
            updateButton.disabled = true;
            updateButton.querySelector('span').style.display = 'none';
            updateButton.appendChild(spinnerContainer);

            // Start the automation process
            const prepareResponse = await serverService.prepareAutomation({
                automation_type: 'server_upgrade',
                params: {
                    server_name: serverName,
                    serial_number: serialNumber,
                    data: firmwareVersion,
                    force_direct_upgrade: forceDirectUpgrade,
                    intermediate_version: intermediateVersion
                }
            });

            // Close modal and notify success immediately after prepare
            if (prepareResponse.data) {
                this.hideModal();
                if (onSuccess) onSuccess(prepareResponse.data);
                
                // Continue with initiate in the background
                serverService.initiateAutomation('server_upgrade', prepareResponse.instance_id)
                    .catch(error => {
                        console.error('Failed to initiate automation:', error);
                        showNotification(
                            'האוטומציה נוצרה אך התרחשה שגיאה בהפעלתה',
                            'warning'
                        );
                    });
            } else {
                this.showError('שגיאה בהתחלת השדרוג');
            }
        } catch (error) {
            console.error('Failed to start automation:', error);
            showNotification(
                error.message || 'שגיאה בהתחלת העדכון, אנא נסה שוב',
                'error'
            );
        } finally {
            if (updateButton) {
                updateButton.disabled = false;
                updateButton.querySelector('span').style.display = '';
                spinnerContainer.remove();
            }
        }
    }

    initializeTextCheckForm() {
        const checkButton = document.getElementById('check-text-button');
        const copyButton = document.getElementById('copy-result-btn');
        const spinner = document.getElementById('spinner-text-check');
        const resultContainer = document.getElementById('result-container');
        const errorElement = document.getElementById('text-check-error');
        
        if (!checkButton) return;

        checkButton.addEventListener('click', async () => {
            const inputText = document.getElementById('input-text').value;

            if (!inputText.trim()) {
                this.showError('נא להזין טקסט לבדיקה');
                return;
            }

            try {
                spinner.classList.remove('hidden');
                checkButton.disabled = true;
                errorElement.classList.remove('visible');
                resultContainer.classList.remove('visible');
                checkButton.getElementsByTagName('span')[0].classList.add('hidden');

                const response = await fetch('/api/automations/check-text', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: inputText })
                });

                const data = await response.json();

                if (data.status === 'success' && data.result) {
                    const resultText = document.getElementById('result-text');
                    resultText.value = data.result;
                    
                    setTimeout(() => {
                        resultContainer.classList.add('visible');
                        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                    
                    errorElement.classList.remove('visible');
                } else {
                    throw new Error(data.message || 'שגיאה בבדיקת הטקסט');
                }
            } catch (error) {
                console.error('Text check error:', error);
                errorElement.textContent = error.message || 'שגיאה בבדיקת הטקסט';
                errorElement.classList.add('visible');
                resultContainer.classList.remove('visible');
            } finally {
                spinner.classList.add('hidden');
                checkButton.getElementsByTagName('span')[0].classList.remove('hidden');
                checkButton.disabled = false;
            }
        });

        if (copyButton) {
            copyButton.addEventListener('click', () => {
                const resultText = document.getElementById('result-text');
                resultText.select();
                document.execCommand('copy');
                
                // עדכון ויזואלי לפעולת ההעתקה
                const originalText = copyButton.textContent;
                copyButton.textContent = 'הועתק! ✓';
                copyButton.classList.add('success');
                
                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.classList.remove('success');
                }, 2000);
            });
        }

        // טיפול בכפתור ניקוי
        const clearInputBtn = document.getElementById('clear-input-btn');
        if (clearInputBtn) {
            clearInputBtn.addEventListener('click', () => {
                const inputText = document.getElementById('input-text');
                inputText.value = '';
                inputText.focus();
            });
        }

        // טיפול בכפתורי הרחבה/כיווץ
        const expandInputBtn = document.getElementById('expand-input-btn');
        const expandResultBtn = document.getElementById('expand-result-btn');
        
        if (expandInputBtn) {
            expandInputBtn.addEventListener('click', () => {
                const container = expandInputBtn.closest('.textarea-container');
                const textarea = container.querySelector('textarea');
                if (container.classList.contains('expanded')) {
                    container.classList.remove('expanded');
                    textarea.style.height = '150px';
                    expandInputBtn.querySelector('span').textContent = '⤢';
                    expandInputBtn.title = 'הרחב';
                } else {
                    container.classList.add('expanded');
                    textarea.style.height = '400px';
                    expandInputBtn.querySelector('span').textContent = '⤡';
                    expandInputBtn.title = 'כווץ';
                }
            });
        }

        if (expandResultBtn) {
            expandResultBtn.addEventListener('click', () => {
                const container = expandResultBtn.closest('.textarea-container');
                const textarea = container.querySelector('textarea');
                if (container.classList.contains('expanded')) {
                    container.classList.remove('expanded');
                    textarea.style.height = '150px';
                    expandResultBtn.querySelector('span').textContent = '⤢';
                    expandResultBtn.title = 'הרחב';
                } else {
                    container.classList.add('expanded');
                    textarea.style.height = '400px';
                    expandResultBtn.querySelector('span').textContent = '⤡';
                    expandResultBtn.title = 'כווץ';
                }
            });
        }
    }
} 