import { DutyRosterUI } from '../js/features/duty-roster/DutyRosterUI.js';

// Initialize the duty roster feature when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create a global instance that can be accessed by onclick handlers
    window.dutyRoster = new DutyRosterUI('duty-roster-container');
});
