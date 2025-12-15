// Cross-browser compatible background script
const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

// Track memory usage over time
let memoryHistory = [];

// Listen for tab updates
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log(`Tab ${tabId} finished loading: ${tab.url || 'unknown'}`);
  }
});

browserAPI.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Clean up memory history for closed tab
  memoryHistory = memoryHistory.filter(record => record.tabId !== tabId);
  console.log(`Tab ${tabId} closed`);
});

// Function to periodically check memory (optional)
async function checkMemoryPeriodically() {
  // Only works in Chrome with processes API enabled
  if (typeof chrome !== 'undefined' && chrome.processes) {
    try {
      const processes = await chrome.processes.getProcessInfo();
      const totalMemory = processes.reduce((sum, proc) => {
        return sum + (proc.privateMemory || 0);
      }, 0);
      
      memoryHistory.push({
        timestamp: Date.now(),
        totalMemory: Math.round(totalMemory / (1024 * 1024))
      });
      
      // Keep only last 100 records
      if (memoryHistory.length > 100) {
        memoryHistory.shift();
      }
    } catch (error) {
      // Silently fail - processes API not available in most browsers
    }
  }
}

// Check every 30 seconds (optional)
setInterval(checkMemoryPeriodically, 30000);

// Listen for messages from popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMemoryHistory') {
    sendResponse({ history: memoryHistory });
  }
  return true;
});

console.log('Tab Memory Monitor background script started');