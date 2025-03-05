import { showNotification as coreShowNotification } from '../core/notifications.js';

// Re-export showNotification from core
export const showNotification = coreShowNotification;

// Button state management
export function setButtonLoading(button, loadingText = 'טוען...') {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = loadingText;
    button.classList.add('loading');
    return originalText;
}

export function setButtonSuccess(button, originalText, successText = 'הושלם!') {
    button.innerHTML = successText;
    button.classList.remove('loading');
    button.classList.add('success');

    setTimeout(() => {
        button.disabled = false;
        button.innerHTML = originalText;
        button.classList.remove('success');
    }, 2000);
}

export function setButtonError(button, originalText, errorText = 'שגיאה') {
    button.innerHTML = errorText;
    button.classList.remove('loading');
    button.classList.add('error');

    setTimeout(() => {
        button.disabled = false;
        button.innerHTML = originalText;
        button.classList.remove('error');
    }, 2000);
}

// Spinner management
export function showSpinner(spinnerElement) {
    if (spinnerElement) {
        spinnerElement.style.display = 'block';
    }
}

export function hideSpinner(spinnerElement) {
    if (spinnerElement) {
        spinnerElement.style.display = 'none';
    }
}

// Form validation helpers
export function validateRequired(value, fieldName) {
    if (!value || value.trim() === '') {
        return `השדה ${fieldName} הוא חובה`;
    }
    return null;
}

export function validateNumber(value, fieldName) {
    if (isNaN(value) || value < 0) {
        return `${fieldName} חייב להיות מספר חיובי`;
    }
    return null;
}

// Date formatting
export function formatDate(dateString) {
    if (!dateString) return "";
    
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('he-IL', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Modal scroll handling
export function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
}

export function unlockBodyScroll() {
    document.body.style.overflow = '';
}

// Error handling helper
export function handleError(error, defaultMessage = 'שגיאה לא צפויה') {
    console.error(error);
    const message = error.response?.data?.message || error.message || defaultMessage;
    showNotification(message, 'error');
}

// CSS class helpers
export function addClass(element, className) {
    if (element && !element.classList.contains(className)) {
        element.classList.add(className);
    }
}

export function removeClass(element, className) {
    if (element && element.classList.contains(className)) {
        element.classList.remove(className);
    }
}

// Text direction helper
export function setTextDirection(element) {
    const text = element.value || element.textContent;
    const hasHebrew = /[\u0590-\u05FF]/.test(text);
    element.style.direction = hasHebrew ? 'rtl' : 'ltr';
} 