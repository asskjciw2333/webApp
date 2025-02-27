import { initializeApp } from './panels-main.js';
import { PortsStatusManager } from './ports-status.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // Initialize ports status functionality
    new PortsStatusManager();
}); 