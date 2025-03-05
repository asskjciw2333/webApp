import { LogCharts } from './features/log_viewer/LogCharts.js';

let logCharts;

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    logCharts = new LogCharts();

    // Restore previous state if it exists
    restoreState();

    // Set default dates only if no saved state
    if (!sessionStorage.getItem('logViewerState')) {
        const today = new Date();
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('startDate').value = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
    }

    // Remove form submit listener and use button click instead
    const searchButton = document.querySelector('.btn-search');
    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            searchLogs();
            return false;
        });
    }

    // Add today's logs button listener
    document.getElementById('showTodayBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showTodayLogs();
    });

    // Add copy and download buttons listeners
    document.getElementById('copyLogsBtn').addEventListener('click', copyLogs);
    document.getElementById('downloadLogsBtn').addEventListener('click', downloadLogs);

    // Initialize with saved state if exists, otherwise show today's logs
    const savedState = sessionStorage.getItem('logViewerState');
    if (savedState) {
        searchLogs();
    } else {
        showTodayLogs();
    }

    // Load initial logs when page loads
    fetch('/api/logs/initial')
        .then(response => response.json())
        .then(data => {
            if (data.logs) {
                displayLogs({'recent': data.logs});
            }
        })
        .catch(error => {
            console.error('Error fetching initial logs:', error);
        });
});

// Log Search Functions
function getSelectedSeverities() {
    return Array.from(document.querySelectorAll('.severity-checkbox input:checked'))
        .map(cb => cb.value);
}

function getLineCount() {
    const lineCount = document.getElementById('lineCount').value;
    return lineCount;
}

function searchLogs() {
    const keyword = document.getElementById('keyword').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const severities = getSelectedSeverities();
    const lineCount = getLineCount();
    
    // Save current state to session storage
    saveCurrentState();
    
    fetch(`/api/logs/search?keyword=${encodeURIComponent(keyword)}&start_date=${startDate}&end_date=${endDate}&severities=${severities.join(',')}&lineCount=${lineCount}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayLogs(data.results, keyword, severities);
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error fetching logs:', error);
            alert('An error occurred while fetching logs. Please try again.');
        });
}

function showTodayLogs() {
    const severities = getSelectedSeverities();
    const lineCount = getLineCount();
    
    fetch(`/api/logs/today?lineCount=${lineCount}`)
        .then(response => response.json())
        .then(data => {
            if (data.logs) {
                const filteredLogs = filterLogsBySeverity(data.logs, severities);
                displayLogs({'today': filteredLogs});
                
                // Save the current state
                saveCurrentState();
            }
        })
        .catch(error => {
            console.error('Error fetching today\'s logs:', error);
            alert('Error fetching today\'s logs. Please try again.');
        });
}

// Log Processing Functions
function filterLogsBySeverity(logs, severities) {
    return logs.filter(log => {
        return severities.some(severity => log.includes(` - ${severity} - `));
    });
}

function displayLogs(results, keyword = '', severities = null) {
    const container = document.getElementById('logResults');
    container.innerHTML = '';
    
    // Update charts with new data
    const event = new CustomEvent('logsUpdated', { detail: results });
    document.dispatchEvent(event);
    
    let totalLines = 0;
    
    for (const [date, logs] of Object.entries(results)) {
        // Add date header
        const dateHeader = document.createElement('div');
        dateHeader.className = 'log-date';
        dateHeader.textContent = date;
        container.appendChild(dateHeader);
        
        // Filter and add logs
        let filteredLogs = severities ? filterLogsBySeverity(logs, severities) : logs;
        totalLines += filteredLogs.length;
        
        filteredLogs.forEach(log => {
            const logLine = document.createElement('div');
            logLine.className = 'log-line';
            
            // Add severity class
            const severityMatch = log.match(/ - (ERROR|WARNING|INFO|DEBUG) - /);
            if (severityMatch) {
                logLine.classList.add(`severity-${severityMatch[1].toLowerCase()}`);
            }
            
            if (keyword && log.toLowerCase().includes(keyword.toLowerCase())) {
                const parts = log.split(new RegExp(`(${keyword})`, 'gi'));
                logLine.innerHTML = parts.map(part => 
                    part.toLowerCase() === keyword.toLowerCase() 
                        ? `<span class="highlight">${part}</span>` 
                        : part
                ).join('');
            } else {
                logLine.textContent = log;
            }
            
            container.appendChild(logLine);
        });
    }
    
    // Update log count in results header
    const resultsTitle = document.querySelector('.results-title');
    resultsTitle.textContent = `Log Results (${totalLines} lines)`;
}

// Utility Functions
function copyLogs() {
    const logs = document.getElementById('logResults').innerText;
    navigator.clipboard.writeText(logs).then(() => {
        alert('Logs copied to clipboard!');
    });
}

function downloadLogs() {
    const logs = document.getElementById('logResults').innerText;
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs.txt';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Add these new functions to handle state preservation
function saveCurrentState() {
    const state = {
        keyword: document.getElementById('keyword').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        severities: getSelectedSeverities(),
        lineCount: getLineCount()
    };
    sessionStorage.setItem('logViewerState', JSON.stringify(state));
}

function restoreState() {
    const savedState = sessionStorage.getItem('logViewerState');
    if (savedState) {
        const state = JSON.parse(savedState);
        document.getElementById('keyword').value = state.keyword || '';
        document.getElementById('startDate').value = state.startDate || '';
        document.getElementById('endDate').value = state.endDate || '';
        if (state.lineCount) {
            document.getElementById('lineCount').value = state.lineCount;
        }
        
        // Restore severity checkboxes
        const checkboxes = document.querySelectorAll('.severity-checkbox input');
        checkboxes.forEach(cb => {
            cb.checked = state.severities.includes(cb.value);
        });
    }
} 