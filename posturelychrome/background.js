// Background service worker for Posturely Chrome Extension

// Simplified icon management without status indicators
let isTrackingActive = false;

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        console.log('Posturely extension installed');
        // Set default settings
        chrome.storage.local.set({
            isTracking: false,
            isScanning: false,
            settings: {
                alertThreshold: 80,
                soundEnabled: true
            }
        });
    }
    
    // Set initial icon state for both install and startup
    initializeIconState();
});

// Initialize icon state on startup
chrome.runtime.onStartup.addListener(() => {
    initializeIconState();
});

// Initialize icon state based on current storage
async function initializeIconState() {
    try {
        const result = await chrome.storage.local.get(['isTracking']);
        const isTracking = result.isTracking || false;
        isTrackingActive = isTracking;
        
        // Set basic title without badge indicators
        chrome.action.setTitle({
            title: isTracking ? 'Posturely - Tracking active' : 'Posturely - Click to start tracking'
        });
        
        console.log('Initialized icon state:', { isTracking });
    } catch (error) {
        console.error('Failed to initialize icon state:', error);
    }
}

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(function(tab) {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from sidepanel to update icon state
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateIcon') {
        const { isTracking } = message.data;
        isTrackingActive = isTracking;
        
        // Update title only, no badge indicators
        chrome.action.setTitle({
            title: isTracking ? 'Posturely - Tracking active' : 'Posturely - Click to start tracking'
        });
        
        sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
});

// Simplified icon management - no complex state tracking needed

// Listen for storage changes to detect tracking state changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.isTracking) {
            const isTracking = changes.isTracking.newValue;
            isTrackingActive = isTracking;
            
            // Update title only
            chrome.action.setTitle({
                title: isTracking ? 'Posturely - Tracking active' : 'Posturely - Click to start tracking'
            });
        }
    }
});
