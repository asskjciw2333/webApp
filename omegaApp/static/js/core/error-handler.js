import { showNotification } from './notifications.js';

export class ErrorHandler {
    static handleDCIMError(error, context = '') {
        console.error(`DCIM Error ${context ? `(${context})` : ''}:`, error);

        if (error.name === 'NetworkError' || error.message.includes('Failed to fetch')) {
            showNotification('שגיאת תקשורת: לא ניתן להתחבר לשרת ה-DCIM', 'error');
            return;
        }

        if (error.status === 401 || error.status === 403) {
            showNotification('שגיאת הרשאות: אין הרשאה לבצע את הפעולה ב-DCIM', 'error');
            return;
        }

        if (error.status === 404) {
            showNotification('השרת לא נמצא ב-DCIM', 'error');
            return;
        }

        if (error.status === 409) {
            showNotification('התנגשות נתונים: קיים כבר רשומה עם נתונים זהים', 'warning');
            return;
        }

        if (error.status >= 500) {
            showNotification('שגיאת שרת DCIM. נא לנסות שוב מאוחר יותר', 'error');
            return;
        }

        // Default error message
        showNotification(error.message || 'שגיאה לא צפויה בתקשורת עם DCIM', 'error');
    }

    static handleBulkUpdateError(error, result) {
        console.error('Bulk Update Error:', error);

        if (result?.failedServers?.length > 0) {
            const failedCount = result.failedServers.length;
            showNotification(`נכשל עדכון ${failedCount} שרתים`, 'warning');
            
            // Log detailed failures
            result.failedServers.forEach(failure => {
                console.error(`Failed to update server ${failure.mgmtIp}: ${failure.error}`);
            });
        }

        if (error.name === 'AbortError') {
            showNotification('העדכון בוטל עקב חריגת זמן', 'warning');
            return;
        }

        if (error.name === 'NetworkError') {
            showNotification('שגיאת תקשורת: לא ניתן להשלים את העדכון', 'error');
            return;
        }

        // Default error message
        showNotification(error.message || 'שגיאה בעדכון השרתים', 'error');
    }

    static handleValidationError(error) {
        console.error('Validation Error:', error);

        if (error.validationErrors) {
            const messages = error.validationErrors.map(err => err.message);
            showNotification(messages.join('\n'), 'error');
            return;
        }

        showNotification(error.message || 'שגיאה באימות הנתונים', 'error');
    }

    static handleAuthError(error) {
        console.error('Authentication Error:', error);

        if (error.status === 401) {
            showNotification('פג תוקף החיבור. נא להתחבר מחדש', 'error');
            // Redirect to login page or show login modal
            return;
        }

        if (error.status === 403) {
            showNotification('אין הרשאה לבצע את הפעולה', 'error');
            return;
        }

        showNotification(error.message || 'שגיאת אימות', 'error');
    }

    static handleAPIError(error) {
        console.error('API Error:', error);

        if (error.status === 400) {
            showNotification('בקשה לא תקינה: ' + (error.message || ''), 'error');
            return;
        }

        if (error.status === 404) {
            showNotification('המשאב המבוקש לא נמצא', 'error');
            return;
        }

        if (error.status === 429) {
            showNotification('חריגה ממגבלת בקשות. נא לנסות שוב בעוד מספר דקות', 'warning');
            return;
        }

        if (error.status >= 500) {
            showNotification('שגיאת שרת. נא לנסות שוב מאוחר יותר', 'error');
            return;
        }

        showNotification(error.message || 'שגיאה בתקשורת עם השרת', 'error');
    }

    static async retryOperation(operation, maxRetries = 3, delay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                lastError = error;

                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                }
            }
        }

        throw lastError;
    }
} 