// Debug Panel System

let debugLogs = [];
let currentApiKey = 'AIzaSyBd9bDuyGvrzIyN871nZ5ZaRWZziWEZ768';
let currentValidationStep = 0;

/**
 * Initialize debug panel
 */
export function initDebugPanel() {
    // Load saved API key
    const savedKey = localStorage.getItem('google_api_key');
    if (savedKey) {
        currentApiKey = savedKey;
        const input = document.getElementById('apiKeyInput');
        if (input) input.value = savedKey;
        logDebug('Loaded API key from localStorage', 'info');
    }
    
    // Auto-show debug panel on error
    window.addEventListener('error', function(event) {
        logDebug(`Global error: ${event.message}`, 'error', {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });
    
    logDebug('Debug panel initialized', 'success');
}

/**
 * Log debug message
 */
function logDebug(message, type = 'info', data = null) {
    const timestamp = new Date().toLocaleTimeString('id-ID', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });
    
    const logEntry = {
        timestamp,
        message,
        type,
        data
    };
    
    debugLogs.push(logEntry);
    
    // Update UI
    const logsContainer = document.getElementById('debugLogs');
    if (logsContainer) {
        const logDiv = document.createElement('div');
        logDiv.className = `debug-log debug-${type}`;
        logDiv.innerHTML = `
            <div class="debug-timestamp">${timestamp}</div>
            <div class="debug-message">${message}</div>
            ${data ? `<div style="color:#aaa;font-size:10px;margin-top:5px;">${JSON.stringify(data).substring(0, 200)}...</div>` : ''}
        `;
        logsContainer.appendChild(logDiv);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    console.log(`[DEBUG ${type.toUpperCase()}] ${message}`, data || '');
}

/**
 * Update debug progress
 */
function updateDebugProgress(percent, message) {
    const fill = document.getElementById('debugProgressFill');
    const text = document.getElementById('debugProgressText');
    const status = document.getElementById('debugStatus');
    
    if (fill) fill.style.width = percent + '%';
    if (text) text.textContent = `Progress: ${percent}% - ${message}`;
    if (status) status.textContent = message;
    
    // Update stages
    const stages = ['debugStage1', 'debugStage2', 'debugStage3', 'debugStage4'];
    stages.forEach((stageId, index) => {
        const stage = document.getElementById(stageId);
        if (stage) {
            if (index < Math.floor(percent / 25)) {
                stage.className = 'debug-stage completed';
                stage.querySelector('span:last-child').textContent = '✅';
            } else if (index === Math.floor(percent / 25)) {
                stage.className = 'debug-stage active';
                stage.querySelector('span:last-child').innerHTML = '<div class="debug-loading">⟳</div>';
            }
        }
    });
}

/**
 * Update debug stage
 */
function updateDebugStage(stageNumber, status, message = '') {
    const stage = document.getElementById(`debugStage${stageNumber}`);
    if (stage) {
        if (status === 'active') {
            stage.className = 'debug-stage active';
            stage.querySelector('span:last-child').innerHTML = '<div class="debug-loading">⟳</div>';
        } else if (status === 'completed') {
            stage.className = 'debug-stage completed';
            stage.querySelector('span:last-child').textContent = '✅';
            if (message) {
                stage.querySelector('span:first-child').textContent += `: ${message.substring(0, 20)}...`;
            }
        } else if (status === 'failed') {
            stage.className = 'debug-stage failed';
            stage.querySelector('span:last-child').textContent = '❌';
            if (message) {
                stage.querySelector('span:first-child').textContent += `: ${message.substring(0, 20)}...`;
            }
        }
    }
}

/**
 * Show error details
 */
function showErrorDetails(error) {
    const detailsDiv = document.getElementById('errorDetails');
    const contentDiv = document.getElementById('errorContent');
    
    if (detailsDiv && contentDiv) {
        let errorHTML = `
            <div class="error-line">Error: ${error.message || 'Unknown error'}</div>
            <div>Type: ${error.name || 'Error'}</div>
            <div>Code: ${error.code || 'N/A'}</div>
        `;
        
        if (error.stack) {
            errorHTML += `<div style="margin-top:10px;"><strong>Stack Trace:</strong><br>${error.stack.split('\n').slice(0, 5).join('<br>')}</div>`;
        }
        
        contentDiv.innerHTML = errorHTML;
        detailsDiv.style.display = 'block';
    }
}

/**
 * Show raw data
 */
function showRawData(data) {
    const rawDiv = document.getElementById('debugRawData');
    const pre = document.getElementById('rawResponse');
    
    if (rawDiv && pre) {
        try {
            pre.textContent = JSON.stringify(data, null, 2);
            rawDiv.style.display = 'block';
        } catch (e) {
            pre.textContent = String(data);
            rawDiv.style.display = 'block';
        }
    }
}

/**
 * Toggle debug panel visibility
 */
function toggleDebugPanel() {
    const panel = document.getElementById('debugPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        logDebug('Debug panel opened', 'info');
    } else {
        panel.style.display = 'none';
    }
}

/**
 * Update API key
 */
function updateApiKey() {
    const input = document.getElementById('apiKeyInput');
    if (input && input.value.trim()) {
        currentApiKey = input.value.trim();
        window.currentApiKey = currentApiKey; // Make it global for other modules
        logDebug(`API Key updated to: ${currentApiKey.substring(0, 20)}...`, 'success');
        localStorage.setItem('google_api_key', currentApiKey);
    }
}

/**
 * Test API key
 */
async function testApiKey() {
    logDebug('Testing API Key...', 'info');
    updateDebugProgress(10, 'Testing API Key');
    updateDebugStage(2, 'active', 'Testing API Key');
    
    try {
        // Test dengan Google Drive API
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?key=${currentApiKey}&pageSize=1`);
        
        logDebug(`API Response Status: ${response.status} ${response.statusText}`, 'info', {
            status: response.status,
            statusText: response.statusText
        });
        
        if (response.ok) {
            const data = await response.json();
            updateDebugProgress(100, 'API Key VALID!');
            updateDebugStage(2, 'completed', 'API Key Valid');
            logDebug('✅ API Key is VALID and working!', 'success', {
                kind: data.kind,
                files: data.files?.length || 0
            });
            showRawData(data);
        } else {
            updateDebugStage(2, 'failed', `API Error: ${response.status}`);
            logDebug(`❌ API Key Error: ${response.status} ${response.statusText}`, 'error');
            showRawData({ status: response.status, statusText: response.statusText });
        }
    } catch (error) {
        updateDebugStage(2, 'failed', 'Network Error');
        logDebug(`❌ Network Error: ${error.message}`, 'error');
        showErrorDetails(error);
    }
}

/**
 * Test direct links
 */
function testDirectLink() {
    const testLinks = [
        'https://docs.google.com/document/d/1Mzoc4qoH4L5z3k9KjX7v8wN2b1cR5tY6uI7pO0qA/edit',
        'https://drive.google.com/file/d/1ABC123XYZ/view',
        'https://example.com/test.pdf'
    ];
    
    logDebug('Testing direct links...', 'info', { links: testLinks });
    
    testLinks.forEach((link, index) => {
        setTimeout(() => {
            logDebug(`Testing link ${index + 1}: ${link}`, 'info');
            document.getElementById('kontenLink').value = link;
            if (typeof validateLinkNow === 'function') {
                validateLinkNow();
            }
        }, index * 5000);
    });
}

/**
 * Clear debug logs
 */
function clearDebugLogs() {
    const logsContainer = document.getElementById('debugLogs');
    if (logsContainer) logsContainer.innerHTML = '';
    debugLogs = [];
    logDebug('Logs cleared', 'info');
}

// Export functions for global use
window.toggleDebugPanel = toggleDebugPanel;
window.updateApiKey = updateApiKey;
window.testApiKey = testApiKey;
window.testDirectLink = testDirectLink;
window.clearDebugLogs = clearDebugLogs;
window.initDebugPanel = initDebugPanel;
window.logDebug = logDebug;
window.updateDebugProgress = updateDebugProgress;
window.updateDebugStage = updateDebugStage;
window.showErrorDetails = showErrorDetails;
window.showRawData = showRawData;

// Make API key global
window.currentApiKey = currentApiKey;