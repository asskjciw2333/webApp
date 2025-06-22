export class NotificationManager {
    static showNotification(message, type = 'info') {
        const container = document.getElementById('notifications-container') 
            || document.createElement('div');
        
        if (!container.id) {
            container.id = 'notifications-container';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        requestAnimationFrame(() => notification.classList.add('show'));

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}
