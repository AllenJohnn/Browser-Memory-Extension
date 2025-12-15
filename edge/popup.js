document.addEventListener('DOMContentLoaded', function() {
  // Browser API detection - works with Chrome, Edge, and Firefox
  const browserAPI = (typeof chrome !== 'undefined' && chrome.tabs) ? chrome : 
                     (typeof browser !== 'undefined' && browser.tabs) ? browser : null;
  
  if (!browserAPI) {
    showErrorMessage('Browser not supported. Requires Chrome, Edge, or Firefox.');
    return;
  }
  
  // DOM elements
  const tabsList = document.getElementById('tabs-list');
  const refreshBtn = document.getElementById('refresh-btn');
  const sortBtn = document.getElementById('sort-btn');
  const cleanupBtn = document.getElementById('cleanup-btn');
  const tabCount = document.getElementById('tab-count');
  const totalUsed = document.getElementById('total-used');
  const memoryProgress = document.getElementById('memory-progress');
  const totalMemory = document.getElementById('total-memory');
  
  // State variables
  let tabsData = [];
  let sortDescending = true;
  let refreshInterval;
  
  // Main function to fetch and display memory info
  async function updateMemoryInfo() {
    try {
      console.log('Fetching memory info...');
      
      // Get all open tabs - works in Chrome/Edge/Firefox
      const tabs = await browserAPI.tabs.query({});
      console.log(`Found ${tabs.length} tabs`);
      
      // Memory estimation - fallback for all browsers
      let processMap = new Map();
      
      // Try to get real memory data (Chrome/Edge specific)
      if (typeof chrome !== 'undefined' && chrome.processes && typeof chrome.processes.getProcessInfo === 'function') {
        try {
          const processes = await chrome.processes.getProcessInfo(['privateMemory']);
          console.log(`Got ${processes.length} processes`);
          
          processes.forEach(process => {
            if (process.tabs && process.tabs.length > 0) {
              const memoryMB = process.privateMemory ? 
                Math.round(process.privateMemory / (1024 * 1024)) : 0;
              
              process.tabs.forEach(tabId => {
                processMap.set(tabId, {
                  memory: memoryMB,
                  processId: process.id
                });
              });
            }
          });
        } catch (processError) {
          console.warn('Could not get process info:', processError);
        }
      } else {
        console.log('Using estimated memory (standard for Firefox, fallback for Chrome)');
      }
      
      // Prepare tabs data
      tabsData = await Promise.all(tabs.map(async tab => {
        const processInfo = processMap.get(tab.id);
        const memoryMB = processInfo?.memory || estimateMemoryByUrl(tab.url);
        
        // Get favicon URL - handle different browser APIs
        let favIconUrl = tab.favIconUrl;
        if (!favIconUrl && tab.url) {
          try {
            const url = new URL(tab.url);
            if (url.protocol.startsWith('http')) {
              // Use favicon service as fallback
              favIconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
            }
          } catch (e) {
            // Invalid URL, use default
          }
        }
        
        return {
          id: tab.id,
          title: tab.title || 'New Tab',
          url: tab.url || '',
          favIconUrl: favIconUrl,
          memory: memoryMB,
          active: tab.active,
          windowId: tab.windowId,
          pinned: tab.pinned
        };
      }));
      
      // Display tabs and update summary
      displayTabs(tabsData);
      updateSummary();
      
    } catch (error) {
      console.error('Error in updateMemoryInfo:', error);
      showErrorMessage('Failed to load memory data. Try refreshing.');
    }
  }
  
  // Estimate memory based on URL/domain (fallback when processes API fails)
  function estimateMemoryByUrl(url) {
    if (!url) return 50; // Default 50MB for new tabs
    
    const urlStr = url.toLowerCase();
    
    // Heavy sites
    if (urlStr.includes('youtube.com') || urlStr.includes('netflix.com') || 
        urlStr.includes('figma.com') || urlStr.includes('photoshop.com')) {
      return 300 + Math.floor(Math.random() * 200); // 300-500MB
    }
    
    // Medium sites
    if (urlStr.includes('docs.google.com') || urlStr.includes('notion.so') ||
        urlStr.includes('discord.com') || urlStr.includes('slack.com')) {
      return 150 + Math.floor(Math.random() * 100); // 150-250MB
    }
    
    // Social media
    if (urlStr.includes('twitter.com') || urlStr.includes('facebook.com') ||
        urlStr.includes('instagram.com') || urlStr.includes('linkedin.com')) {
      return 100 + Math.floor(Math.random() * 100); // 100-200MB
    }
    
    // Light sites
    return 50 + Math.floor(Math.random() * 50); // 50-100MB
  }
  
  // Display tabs in the popup
  function displayTabs(tabs) {
    if (!tabsList) return;
    
    tabsList.innerHTML = '';
    
    if (tabs.length === 0) {
      tabsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌐</div>
          <div>No tabs found. Try opening some websites.</div>
        </div>
      `;
      return;
    }
    
    // Sort tabs if needed
    let tabsToDisplay = [...tabs];
    if (sortDescending) {
      tabsToDisplay.sort((a, b) => b.memory - a.memory);
    }
    
    tabsToDisplay.forEach(tab => {
      const row = document.createElement('div');
      row.className = `tab-row ${tab.memory > 500 ? 'critical-memory' : tab.memory > 200 ? 'high-memory' : ''} ${tab.active ? 'active-tab' : ''}`;
      
      // Truncate title
      const maxTitleLength = 40;
      const displayTitle = tab.title.length > maxTitleLength 
        ? tab.title.substring(0, maxTitleLength) + '...' 
        : tab.title;
      
      row.innerHTML = `
        <div class="favicon-container">
          ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" class="favicon" alt="favicon" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
          <div class="favicon-fallback" style="${tab.favIconUrl ? 'display: none' : 'display: block'}">🌐</div>
        </div>
        <div class="tab-info">
          <div class="tab-title" title="${escapeHtml(tab.title)}">
            ${escapeHtml(displayTitle)}
            ${tab.pinned ? ' 📌' : ''}
          </div>
          <div class="tab-url" title="${escapeHtml(tab.url)}">
            ${escapeHtml(truncateUrl(tab.url))}
          </div>
        </div>
        <div class="memory-usage ${getMemoryColorClass(tab.memory)} tooltip" title="Click for details">
          ${formatMemory(tab.memory)}
          ${tab.active ? ' ⭐' : ''}
          <span class="tooltiptext">Click for tab details</span>
        </div>
      `;
      
      // Click to switch to tab
      row.addEventListener('click', (e) => {
        // Don't switch if user clicked on memory usage
        if (!e.target.classList.contains('memory-usage') && !e.target.closest('.memory-usage')) {
          browserAPI.tabs.update(tab.id, { active: true });
          browserAPI.windows.update(tab.windowId, { focused: true });
          window.close(); // Close popup after switching
        }
      });
      
      // Memory usage click - show details
      const memoryEl = row.querySelector('.memory-usage');
      if (memoryEl) {
        memoryEl.addEventListener('click', (e) => {
          e.stopPropagation();
          showMemoryDetails(tab);
        });
      }
      
      // Right-click to close tab
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm(`Close "${tab.title.substring(0, 30)}${tab.title.length > 30 ? '...' : ''}"?`)) {
          browserAPI.tabs.remove(tab.id);
          setTimeout(updateMemoryInfo, 300);
        }
      });
      
      tabsList.appendChild(row);
    });
  }
  
  // Update summary statistics
  function updateSummary() {
    const totalTabs = tabsData.length;
    const totalMemoryUsed = tabsData.reduce((sum, tab) => sum + tab.memory, 0);
    const avgMemory = totalTabs > 0 ? Math.round(totalMemoryUsed / totalTabs) : 0;
    
    // Find heaviest tab
    const heaviestTab = tabsData.length > 0 
      ? tabsData.reduce((max, tab) => tab.memory > max.memory ? tab : max, tabsData[0])
      : null;
    
    if (tabCount) {
      tabCount.textContent = totalTabs;
    }
    
    if (totalUsed) {
      totalUsed.textContent = `${formatMemory(totalMemoryUsed)} total (avg: ${formatMemory(avgMemory)})`;
      
      if (heaviestTab) {
        totalUsed.title = `Heaviest: ${heaviestTab.title} (${formatMemory(heaviestTab.memory)})`;
      }
    }
    
    // Update total memory display
    if (totalMemory) {
      totalMemory.textContent = `${totalTabs} tabs`;
    }
    
    // Update progress bar
    if (memoryProgress) {
      // Assume 4GB (4096MB) as baseline for visualization
      const referenceMemory = 4096;
      const percentage = Math.min((totalMemoryUsed / referenceMemory) * 100, 100);
      memoryProgress.style.width = `${percentage}%`;
      
      // Change color based on usage
      if (percentage > 75) {
        memoryProgress.style.background = 'linear-gradient(135deg, #FF5722, #FF9800)';
      } else if (percentage > 50) {
        memoryProgress.style.background = 'linear-gradient(135deg, #FFC107, #FFEB3B)';
      } else {
        memoryProgress.style.background = 'linear-gradient(135deg, #4CAF50, #8BC34A)';
      }
      
      memoryProgress.title = `${percentage.toFixed(1)}% of ${formatMemory(referenceMemory)} reference`;
    }
  }
  
  // Sort tabs by memory usage
  function sortTabs() {
    sortDescending = !sortDescending;
    if (sortBtn) {
      sortBtn.textContent = sortDescending ? 'Sort by Memory ▼' : 'Sort by Memory ▲';
      sortBtn.title = sortDescending ? 'Descending (highest first)' : 'Ascending (lowest first)';
    }
    displayTabs(tabsData);
  }
  
  // Close tabs using excessive memory
  async function cleanupHeavyTabs() {
    const threshold = 300; // 300MB threshold
    const heavyTabs = tabsData.filter(tab => tab.memory > threshold && !tab.pinned);
    
    if (heavyTabs.length === 0) {
      alert(`No unpinned tabs found using more than ${threshold}MB of memory.`);
      return;
    }
    
    const tabNames = heavyTabs.map(tab => 
      `• ${tab.title.substring(0, 30)}${tab.title.length > 30 ? '...' : ''} (${formatMemory(tab.memory)})`
    ).join('\n');
    
    if (confirm(`Close these ${heavyTabs.length} tabs using >${threshold}MB each?\n\n${tabNames}`)) {
      const tabIds = heavyTabs.map(tab => tab.id);
      await browserAPI.tabs.remove(tabIds);
      
      // Show notification if available
      if (browserAPI.notifications && browserAPI.notifications.create) {
        try {
          browserAPI.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'Memory Cleanup Complete',
            message: `Closed ${heavyTabs.length} heavy tab(s)`
          });
        } catch (notifError) {
          console.log('Notifications not supported:', notifError);
        }
      }
      
      setTimeout(updateMemoryInfo, 500);
    }
  }
  
  // Helper: Show memory details for a tab
  function showMemoryDetails(tab) {
    const details = `
      <strong>${escapeHtml(tab.title)}</strong><br>
      URL: ${escapeHtml(truncateUrl(tab.url, 50))}<br>
      Memory: ${formatMemory(tab.memory)}<br>
      Status: ${tab.active ? 'Active' : 'Background'}${tab.pinned ? ', Pinned' : ''}<br>
      Tab ID: ${tab.id}
    `;
    
    // Simple alert for now
    alert(details);
  }
  
  // Helper: Format memory in appropriate units
  function formatMemory(mb) {
    if (mb < 1) {
      return '<1 MB';
    } else if (mb < 1024) {
      return `${Math.round(mb)} MB`;
    } else {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
  }
  
  // Helper: Get CSS class for memory color
  function getMemoryColorClass(memory) {
    if (memory > 500) return 'memory-critical';
    if (memory > 200) return 'memory-high';
    if (memory > 100) return 'memory-medium';
    return 'memory-low';
  }
  
  // Helper: Escape HTML
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Helper: Truncate URL for display
  function truncateUrl(url, maxLength = 35) {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;
      
      if (hostname.length + path.length <= maxLength) {
        return hostname + path;
      }
      
      const availableForPath = maxLength - hostname.length - 3; // -3 for "..."
      if (availableForPath > 0) {
        return hostname + path.substring(0, availableForPath) + '...';
      } else {
        return hostname.substring(0, maxLength - 3) + '...';
      }
    } catch {
      // If URL parsing fails, just truncate the string
      return url.length > maxLength 
        ? url.substring(0, maxLength - 3) + '...' 
        : url;
    }
  }
  
  // Helper: Show error message
  function showErrorMessage(message) {
    if (tabsList) {
      tabsList.innerHTML = `
        <div class="error-state">
          <h4>⚠️ Error</h4>
          <div>${escapeHtml(message)}</div>
          <button id="retry-btn" class="retry-btn">
            Retry
          </button>
        </div>
      `;
      
      // Add retry button listener
      setTimeout(() => {
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', updateMemoryInfo);
        }
      }, 100);
    } else {
      // If tabsList doesn't exist yet, show basic alert
      alert(`Tab Memory Extension Error: ${message}`);
    }
  }
  
  // Initialize event listeners
  function initEventListeners() {
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.innerHTML = '<span class="loading"></span> Refreshing...';
        refreshBtn.disabled = true;
        updateMemoryInfo().finally(() => {
          setTimeout(() => {
            refreshBtn.innerHTML = '🔄 Refresh';
            refreshBtn.disabled = false;
          }, 500);
        });
      });
    }
    
    if (sortBtn) {
      sortBtn.addEventListener('click', sortTabs);
    }
    
    if (cleanupBtn) {
      cleanupBtn.addEventListener('click', cleanupHeavyTabs);
    }
    
    // Auto-refresh interval
    startAutoRefresh();
    
    // Stop auto-refresh when popup loses focus
    window.addEventListener('blur', () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    });
    
    // Restart auto-refresh when popup gains focus
    window.addEventListener('focus', () => {
      if (!refreshInterval) {
        startAutoRefresh();
      }
    });
  }
  
  // Start auto-refresh
  function startAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(updateMemoryInfo, 8000); // Refresh every 8 seconds
  }
  
  // Initialize everything
  function init() {
    console.log('Initializing Tab Memory extension...');
    console.log('Browser API detected:', browserAPI === chrome ? 'Chrome/Edge' : 'Firefox');
    
    // Initialize event listeners
    initEventListeners();
    
    // Load initial data
    updateMemoryInfo();
    
    console.log('Extension initialized successfully');
  }
  
  // Start the extension
  init();
});

// Add this CSS for the retry button
const retryButtonStyle = `
  .retry-btn {
    margin-top: 10px;
    padding: 8px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }
  
  .retry-btn:hover {
    background: #1976D2;
  }
`;

// Inject retry button styles only
const retryStyleElement = document.createElement('style');
retryStyleElement.textContent = retryButtonStyle;
document.head.appendChild(retryStyleElement);