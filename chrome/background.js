
const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

let memoryHistory = [];

browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log(`Tab ${tabId} finished loading: ${tab.url || 'unknown'}`);
  }
});

browserAPI.tabs.onRemoved.addListener((tabId, removeInfo) => {
  memoryHistory = memoryHistory.filter(record => record.tabId !== tabId);
  console.log(`Tab ${tabId} closed`);
});

async function checkMemoryPeriodically() {
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
      
      if (memoryHistory.length > 100) {
        memoryHistory.shift();
      }
    } catch (error) {
    }
  }
}

setInterval(checkMemoryPeriodically, 30000);

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMemoryHistory') {
    sendResponse({ history: memoryHistory });
  }
  return true;
});

console.log('Tab Memory Monitor background script started');
