import { elements } from './panels-main.js';
import { 
    showNotification, 
    handleError, 
    showSpinner, 
    hideSpinner, 
    setButtonLoading, 
    setButtonSuccess, 
    setButtonError 
} from './ui-utils.js';
import { downloadAsCSV } from './data-manager.js';

const { spinner } = elements;

export function initializeDCIMIntegration() {
    initializePullAllPanels();
    initializeDownloadButton();
}

// Update DCIM with panel changes
export async function updateDCIM(formData) {
    showSpinner(spinner);
    
    try {
        const response = await fetch(`${formData.dcim_id}/update_dcim`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        // אם יש שגיאת HTTP
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        // בדיקת סטטוס התגובה מהשרת
        if (data.success) {
            showNotification('המידע עודכן בDCIM!', 'success');
            return data;
        } else if (data.status === "error") {
            throw new Error(data.message || 'שגיאה בהעברת המידע לDCIM');
        } else {
            throw new Error('תגובה לא צפויה מהשרת');
        }
    } catch (error) {
        // אם יש שגיאת אימות
        if (error.message.includes('אין חיבור מאומת')) {
            showNotification('אין חיבור מאומת ל-DCIM. נא לרענן את הדף', 'error');
        } else {
            showNotification(error.message || 'שגיאה בהעברת המידע לDCIM', 'error');
        }
        throw error; // Re-throw error so form-handlers can handle it
    } finally {
        hideSpinner(spinner);
    }
}

// Initialize "Pull All Panels" functionality
function initializePullAllPanels() {
    const pullAllPanelsLink = document.getElementById("pull-panel-link");
    if (pullAllPanelsLink) {
        pullAllPanelsLink.addEventListener("click", handlePullAllPanels);
    }
}

// Handle pulling all panels from DCIM
async function handlePullAllPanels() {
    const button = document.getElementById("pull-panel-link");
    const originalText = setButtonLoading(button, 'מושך נתונים...');
    showSpinner(spinner);

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
        setButtonSuccess(button, originalText, 'הנתונים עודכנו!');
        showNotification(data.message, 'success');
    } catch (error) {
        setButtonError(button, originalText, 'שגיאה בעדכון');
        handleError(error, 'שגיאה בעדכון המידע');
    } finally {
        hideSpinner(spinner);
    }
}

// Initialize download button
function initializeDownloadButton() {
    const downloadBtn = document.querySelector('.download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }
}

// Handle download functionality
export function handleDownload() {
    const btn = document.querySelector('.download-btn');
    if (!btn) return;

    const originalText = setButtonLoading(btn, 'מוריד...');

    try {
        downloadAsCSV();
        setButtonSuccess(btn, originalText, 'הקובץ הורד!');
    } catch (error) {
        setButtonError(btn, originalText, 'שגיאה בהורדה');
        handleError(error, 'שגיאה בהורדת הקובץ');
    }
}

// Export check pull status for use in main
export async function checkPullStatus() {
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
        data.isUpdating ? showSpinner(spinner) : hideSpinner(spinner);
    } catch (error) {
        console.error('Error checking pull status:', error);
        hideSpinner(spinner);
    }
} 