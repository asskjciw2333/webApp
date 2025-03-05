// Shared Notifications System
export function showNotification(type, message) {
    // If old format is used (message, type), swap parameters
    if (typeof type === 'string' && (typeof message === 'undefined' || typeof message === 'string' && ['success', 'error', 'warning', 'info'].includes(message))) {
        [message, type] = [type, message || 'success'];
    }

    // Ensure container exists
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    // Create close button with SVG icon
    const closeButton = document.createElement('span');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    closeButton.onclick = () => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    };
    
    // Assemble notification
    notification.appendChild(messageSpan);
    notification.appendChild(closeButton);
    
    // Add to container
    container.appendChild(notification);
    
    // Show notification with animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    // Auto-remove notification after delay
    const displayTime = type === 'error' ? 10000 : 7000; // 10 seconds for error, 7 for others
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, displayTime);
} 