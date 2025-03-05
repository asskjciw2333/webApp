export function getServerUpdateFormHTML() {
    return `
    <div> יש לשים לב שהשרת מוגדר כ <strong>global defualt</strong> בטמפליט. אחרת יבוצע שינמוך  אוטומאטי בסיום התהליך </div>
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
                <button type="button" id="search_button" class="btn-primary btn">
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
                            <strong>גרסה קיימת:</strong> <div id="note_2_version"></div> <span id="existing_version"></span>
                        </li>
                    </ul>
                </div>
                
                <div id="intermediate_version_container" class="hidden">
                    <!-- Container for intermediate version selection will be populated dynamically -->
                </div>

                <div id="force_direct_upgrade_container" class="hidden">
                    <!-- Container for force direct upgrade option will be populated dynamically -->
                </div>
                
                <div class="confirmation">
                    <p>לעדכן את השרת לגרסה <span id="selected_version" class="version-highlight"></span>?</p>
                    <button type="button" class="btn-primary btn" id="fw-update-button">
                        <span>אישור</span>
                    </button>
                </div>
            </div>
            <p id="text-check-error" class="error hidden"></p>

            <p id="error_message" class="error hidden"></p>
            <p id="statusUpdates"></p>
        </div>
    `;
} 