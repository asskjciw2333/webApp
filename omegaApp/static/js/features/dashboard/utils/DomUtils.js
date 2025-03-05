export function createChartTypeButtons(chartId) {
    const buttons = [];
    
    switch (chartId) {
        case 'vendor':
        case 'location':
            buttons.push(
                createButton('bar', 'תרשים עמודות', createBarIcon()),
                createButton('pie', 'תרשים עוגה', createPieIcon())
            );
            break;
        case 'memory':
            buttons.push(
                createButton('bar', 'תרשים עמודות', createBarIcon()),
                createButton('line', 'תרשים קו', createLineIcon()),
                createButton('pie', 'תרשים עוגה', createPieIcon())
            );
            break;
        case 'power':
            buttons.push(
                createButton('bar', 'תרשים עמודות', createBarIcon()),
                createButton('line', 'תרשים קו', createLineIcon()),
                createButton('radar', 'תרשים רדאר', createRadarIcon())
            );
            break;
    }

    return `
        <div class="chart-type-buttons" data-chart="${chartId}">
            ${buttons.join('')}
        </div>
    `;
}

function createButton(type, title, icon) {
    return `
        <button class="chart-type-btn${type === getDefaultType() ? ' active' : ''}" 
                data-type="${type}" 
                title="${title}"
                pointerEvents="none">
            <span class="chart-type-icon" pointerEvents="none">
                ${icon}
            </span>
        </button>
    `;
}

function getDefaultType() {
    return 'bar';
}

function createPieIcon() {
    return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointerEvents="none">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z" pointerEvents="none"/>
            <path d="M12 12L2.5 7.5" pointerEvents="none"/>
        </svg>
    `;
}

function createBarIcon() {
    return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointerEvents="none">
            <rect x="3" y="3" width="4" height="18" pointerEvents="none"/>
            <rect x="10" y="8" width="4" height="13" pointerEvents="none"/>
            <rect x="17" y="5" width="4" height="16" pointerEvents="none"/>
        </svg>
    `;
}

function createLineIcon() {
    return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointerEvents="none">
            <path d="M3 12h18M3 6h18M3 18h18" pointerEvents="none"/>
        </svg>
    `;
}

function createRadarIcon() {
    return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointerEvents="none">
            <path d="M12 12L2.5 7.5" pointerEvents="none"/>
            <path d="M12 12L21.5 7.5" pointerEvents="none"/>
            <path d="M12 12L12 21.5" pointerEvents="none"/>
            <circle cx="12" cy="12" r="10" pointerEvents="none"/>
            <circle cx="12" cy="12" r="6" pointerEvents="none"/>
            <circle cx="12" cy="12" r="2" pointerEvents="none"/>
        </svg>
    `;
}

export function createEmptyState() {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M21 9V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V9M21 9L12 3L3 9M21 9H3" />
                    <path d="M9 21V15C9 13.8954 9.89543 13 11 13H13C14.1046 13 15 13.8954 15 15V21" />
                </svg>
            </div>
            <h3>אין נתוני שרתים</h3>
            <p>לא נמצאו קבצי JSON בתיקיית הנתונים</p>
            <p class="empty-state-path">נתיב: omegaApp/data/servers/</p>
            <div class="empty-state-help">
                <p>כדי להתחיל:</p>
                <ol>
                    <li>וודא שהתיקייה קיימת</li>
                    <li>הוסף קבצי JSON בפורמט הנדרש</li>
                    <li>המערכת תזהה אותם אוטומטית</li>
                </ol>
            </div>
        </div>
    `;
}

export function createChartModal() {
    const modalId = `modal_${Math.random().toString(36).substr(2, 9)}`;
    const canvasId = `canvas_${Math.random().toString(36).substr(2, 9)}`;
    
    const modalHtml = `
        <div id="${modalId}" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title"></h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <canvas id="${canvasId}"></canvas>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById(modalId);
    
    // Close button click handler
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => {
        modal.classList.remove('fade-in');
        modal.style.display = 'none';
        
        // Remove the modal from DOM after animation
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    };
    
    // Click outside modal to close
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    };
    
    return { modal, canvasId };
} 