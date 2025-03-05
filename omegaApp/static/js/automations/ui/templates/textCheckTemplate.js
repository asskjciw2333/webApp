export function getTextCheckFormHTML() {
    return `
        <div class="text-check-form">
            <div class="form-group">
                <div class="input-header">
                    <label for="input-text">הכנס טקסט לבדיקה:</label>
                </div>
                <div class="textarea-container">
                    <textarea 
                        id="input-text" 
                        class="form-control-textarea" 
                        rows="8" 
                        placeholder="הכנס את הטקסט כאן..."
                        required
                    ></textarea>
                    <div class="textarea-tools">
                        <button type="button" id="clear-input-btn" class="tool-btn" title="נקה טקסט">
                            <span>🗑️</span>
                        </button>
                        <button type="button" id="expand-input-btn" class="tool-btn" title="הרחב/כווץ">
                            <span>⤢</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="button-container">
                <button type="button" id="check-text-button" class="btn-primary btn">
                    <span>בדוק טקסט</span>
                    <div class="spinner-small hidden" id="spinner-text-check"></div>
                </button>
            </div>

            <div id="result-container">
                <div class="result-header">
                    <h3>הטקסט המתוקן:</h3>
                </div>
                <div class="result-content">
                    <div class="textarea-container">
                        <textarea 
                            id="result-text" 
                            class="form-control-textarea" 
                            rows="8" 
                            readonly
                        ></textarea>
                        <div class="textarea-tools">
                            <button type="button" id="copy-result-btn" class="tool-btn" title="העתק תוצאה">
                                <span>📋</span>
                            </button>
                            <button type="button" id="expand-result-btn" class="tool-btn" title="הרחב/כווץ">
                                <span>⤢</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <p id="text-check-error" class="error hidden"></p>
        </div>
    `;
} 