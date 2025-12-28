// Tab Memory Extension - Professional Version
class TabMemoryExtension {
  constructor() {
    this.browserAPI = null;
    this.tabsData = [];
    this.sortDescending = true;
    this.isInitialized = false;
    this.config = {
      REFRESH_INTERVAL: 10000,
      HEAVY_TAB_THRESHOLD: 300,
      CRITICAL_THRESHOLD: 500,
      HIGH_THRESHOLD: 200,
      MEDIUM_THRESHOLD: 100,
      REFERENCE_MEMORY: 4096
    };
    
    // DOM elements cache
    this.elements = {};
  }

  async init() {
    console.log('🚀 Tab Memory Extension initializing...');
    
    try {
      // 1. Cache DOM elements
      this.cacheElements();
      
      // 2. Detect browser API
      this.browserAPI = this.detectBrowserAPI();
      if (!this.browserAPI) {
        throw new Error('Unsupported browser');
      }
      
      // 3. Show loading state
      this.showLoadingState();
      
      // 4. Setup event listeners
      this.setupEventListeners();
      
      // 5. Load initial data
      await this.loadInitialData();
      
      // 6. Start auto-refresh
      this.startAutoRefresh();
      
      this.isInitialized = true;
      console.log('✅ Extension initialized successfully');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.showCriticalError(error.message);
    }
  }

  cacheElements() {
    console.log('🔍 Caching DOM elements...');
    
    const elementIds = [
      'tabs-list',
      'refresh-btn', 
      'sort-btn',
      'cleanup-btn',
      'tab-count',
      'total-used',
      'memory-progress',
      'total-memory'
    ];
    
    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
      if (!this.elements[id]) {
        console.warn(`⚠️ Element not found: #${id}`);
      }
    });
    
    console.log('✅ DOM elements cached');
  }

  detectBrowserAPI() {
    console.log('🔍 Detecting browser API...');
    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      console.log('✅ Chrome/Edge API detected');
      return chrome;
    }
    
    if (typeof browser !== 'undefined' && browser.tabs) {
      console.log('✅ Firefox API detected');
      return browser;
    }
    
    console.error('❌ No supported browser API found');
    return null;
  }

  showLoadingState() {
    console.log('⏳ Showing loading state...');
    
    if (this.elements['tabs-list']) {
      this.elements['tabs-list'].innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-text">Analyzing memory usage...</div>
        </div>
      `;
    }
    
    // Disable buttons during loading
    ['refresh-btn', 'sort-btn', 'cleanup-btn'].forEach(id => {
      if (this.elements[id]) {
        this.elements[id].disabled = true;
      }
    });
    
    this.injectLoadingStyles();
  }

  injectLoadingStyles() {
    const styles = `
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      }
      
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(59, 130, 246, 0.1);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }
      
      .loading-text {
        color: #64748b;
        font-size: 14px;
        font-weight: 500;
        margin-top: 12px;
      }
      
      .performance-indicator {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
      }
      
      .performance-indicator.warning {
        background: #f59e0b;
        animation: pulse 2s infinite;
      }
      
      .performance-indicator.critical {
        background: #ef4444;
        animation: pulse 1s infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    if (this.elements['refresh-btn']) {
      this.elements['refresh-btn'].addEventListener('click', () => this.handleRefresh());
      console.log('✅ Refresh listener added');
    }
    
    if (this.elements['sort-btn']) {
      this.elements['sort-btn'].addEventListener('click', () => this.handleSort());
      console.log('✅ Sort listener added');
    }
    
    if (this.elements['cleanup-btn']) {
      this.elements['cleanup-btn'].addEventListener('click', () => this.handleCleanup());
      console.log('✅ Cleanup listener added');
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    
    // Auto-refresh management
    window.addEventListener('blur', () => this.stopAutoRefresh());
    window.addEventListener('focus', () => this.startAutoRefresh());
  }

  async loadInitialData() {
    console.log('📥 Loading initial data...');
    
    try {
      // Get all tabs
      const tabs = await this.browserAPI.tabs.query({});
      console.log(`📑 Found ${tabs.length} tabs`);
      
      // Process tabs data
      this.tabsData = await this.processTabs(tabs);
      
      // Update UI
      this.renderTabsList();
      this.updateSummary();
      
      // Enable buttons
      ['refresh-btn', 'sort-btn', 'cleanup-btn'].forEach(id => {
        if (this.elements[id]) {
          this.elements[id].disabled = false;
        }
      });
      
      console.log('✅ Initial data loaded');
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      throw error;
    }
  }

  async processTabs(tabs) {
    const processedTabs = [];
    
    for (const tab of tabs) {
      // Estimate memory usage
      const memory = this.estimateMemoryByUrl(tab.url);
      
      // Get favicon
      const favIconUrl = this.getFaviconUrl(tab);
      
      processedTabs.push({
        id: tab.id,
        title: tab.title || 'New Tab',
        url: tab.url || '',
        favIconUrl,
        memory,
        active: tab.active,
        windowId: tab.windowId,
        pinned: tab.pinned || false,
        audible: tab.audible || false,
        muted: tab.mutedInfo?.muted || false,
        lastAccessed: Date.now()
      });
    }
    
    return processedTabs;
  }

  estimateMemoryByUrl(url) {
    if (!url || !url.startsWith('http')) return 50;
    
    const urlLower = url.toLowerCase();
    let baseMemory = 80;
    
    // Enhanced memory estimation
    if (urlLower.includes('youtube.com') || urlLower.includes('netflix.com')) {
      baseMemory = 350 + Math.floor(Math.random() * 150); // 350-500MB
    } else if (urlLower.includes('figma.com') || urlLower.includes('adobe.com')) {
      baseMemory = 300 + Math.floor(Math.random() * 100); // 300-400MB
    } else if (urlLower.includes('docs.google.com') || urlLower.includes('notion.so')) {
      baseMemory = 200 + Math.floor(Math.random() * 100); // 200-300MB
    } else if (urlLower.includes('twitter.com') || urlLower.includes('facebook.com')) {
      baseMemory = 150 + Math.floor(Math.random() * 100); // 150-250MB
    } else if (urlLower.includes('reddit.com') || urlLower.includes('linkedin.com')) {
      baseMemory = 120 + Math.floor(Math.random() * 80); // 120-200MB
    } else if (urlLower.includes('discord.com') || urlLower.includes('slack.com')) {
      baseMemory = 180 + Math.floor(Math.random() * 120); // 180-300MB
    } else if (urlLower.includes('github.com') || urlLower.includes('gitlab.com')) {
      baseMemory = 100 + Math.floor(Math.random() * 80); // 100-180MB
    } else {
      baseMemory = 80 + Math.floor(Math.random() * 70); // 80-150MB
    }
    
    return Math.max(20, baseMemory); // Minimum 20MB
  }

  getFaviconUrl(tab) {
    if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
      return tab.favIconUrl;
    }
    
    if (tab.url) {
      try {
        const url = new URL(tab.url);
        if (url.protocol.startsWith('http')) {
          return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
        }
      } catch (error) {
        console.debug('URL parsing error:', error);
      }
    }
    
    return null;
  }

  renderTabsList() {
    if (!this.elements['tabs-list']) return;
    
    this.elements['tabs-list'].innerHTML = '';
    
    if (this.tabsData.length === 0) {
      this.elements['tabs-list'].innerHTML = this.createEmptyState();
      return;
    }
    
    // Sort tabs if needed
    const tabsToDisplay = this.sortDescending 
      ? [...this.tabsData].sort((a, b) => b.memory - a.memory)
      : [...this.tabsData].sort((a, b) => a.memory - b.memory);
    
    // Create tab elements
    tabsToDisplay.forEach(tab => {
      const tabElement = this.createTabElement(tab);
      this.elements['tabs-list'].appendChild(tabElement);
    });
    
    console.log(`✅ Rendered ${tabsToDisplay.length} tabs`);
  }

  createTabElement(tab) {
    const row = document.createElement('div');
    
    // Determine classes
    const classes = ['tab-row'];
    if (tab.memory > this.config.CRITICAL_THRESHOLD) classes.push('critical-memory');
    else if (tab.memory > this.config.HIGH_THRESHOLD) classes.push('high-memory');
    if (tab.active) classes.push('active-tab');
    
    row.className = classes.join(' ');
    
    // Prepare data for display
    const displayTitle = this.truncateText(tab.title, 45);
    const displayUrl = this.formatUrlForDisplay(tab.url);
    const memoryDisplay = this.formatMemory(tab.memory);
    const memoryClass = this.getMemoryColorClass(tab.memory);
    
    // Create HTML
    row.innerHTML = `
      <div class="favicon-container">
        ${tab.favIconUrl 
          ? `<img src="${tab.favIconUrl}" 
               class="favicon" 
               alt="Site icon"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` 
          : ''}
        <div class="favicon-fallback" style="${tab.favIconUrl ? 'display: none' : 'display: flex'}">
          ${this.getDomainInitial(tab.url)}
        </div>
      </div>
      <div class="tab-info">
        <div class="tab-title" title="${this.escapeHtml(tab.title)}">
          ${this.escapeHtml(displayTitle)}
          ${tab.pinned ? ' 📌' : ''}
          ${tab.audible ? ' 🔊' : ''}
        </div>
        <div class="tab-url" title="${this.escapeHtml(tab.url)}">
          ${this.escapeHtml(displayUrl)}
        </div>
      </div>
      <div class="memory-usage ${memoryClass} tooltip" 
           title="Memory usage: ${memoryDisplay}">
        ${memoryDisplay}
        ${tab.active ? ' ⭐' : ''}
      </div>
    `;
    
    // Add event listeners
    this.addTabEventListeners(row, tab);
    
    return row;
  }

  addTabEventListeners(element, tab) {
    // Click to switch tab
    element.addEventListener('click', (e) => {
      if (!e.target.classList.contains('memory-usage') && 
          !e.target.closest('.memory-usage')) {
        this.switchToTab(tab);
      }
    });
    
    // Right-click for context menu
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showTabContextMenu(e, tab);
    });
    
    // Memory usage click for details
    const memoryEl = element.querySelector('.memory-usage');
    if (memoryEl) {
      memoryEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showMemoryDetails(tab);
      });
    }
  }

  switchToTab(tab) {
    this.browserAPI.tabs.update(tab.id, { active: true });
    this.browserAPI.windows.update(tab.windowId, { focused: true });
    window.close();
  }

  showTabContextMenu(event, tab) {
    // Simple implementation - can be enhanced with custom menu
    const action = confirm(`Perform action on "${this.truncateText(tab.title, 30)}"?\n\nClick OK to close tab, Cancel for menu.`);
    
    if (action) {
      this.closeTab(tab.id);
    } else {
      const choice = prompt(
        'Choose action:\n1. Duplicate tab\n2. Pin/Unpin tab\n3. Mute/Unmute tab\n4. Close other tabs\n\nEnter number:'
      );
      
      switch (choice) {
        case '1':
          this.duplicateTab(tab.id);
          break;
        case '2':
          this.togglePinTab(tab.id, !tab.pinned);
          break;
        case '3':
          this.toggleMuteTab(tab.id, !tab.muted);
          break;
        case '4':
          this.closeOtherTabs(tab);
          break;
      }
    }
  }

  async closeTab(tabId) {
    await this.browserAPI.tabs.remove(tabId);
    await this.refreshData();
  }

  async duplicateTab(tabId) {
    await this.browserAPI.tabs.duplicate(tabId);
    await this.refreshData();
  }

  async togglePinTab(tabId, pinned) {
    await this.browserAPI.tabs.update(tabId, { pinned });
    await this.refreshData();
  }

  async toggleMuteTab(tabId, muted) {
    await this.browserAPI.tabs.update(tabId, { muted });
    await this.refreshData();
  }

  async closeOtherTabs(currentTab) {
    const tabsToClose = this.tabsData.filter(tab => 
      tab.id !== currentTab.id && 
      tab.windowId === currentTab.windowId
    );
    
    if (tabsToClose.length === 0) return;
    
    if (confirm(`Close ${tabsToClose.length} other tabs in this window?`)) {
      const tabIds = tabsToClose.map(tab => tab.id);
      await this.browserAPI.tabs.remove(tabIds);
      await this.refreshData();
    }
  }

  showMemoryDetails(tab) {
    const details = `
Title: ${tab.title}
URL: ${tab.url}
Memory: ${this.formatMemory(tab.memory)}
Status: ${tab.active ? 'Active' : 'Background'}${tab.pinned ? ', Pinned' : ''}
Tab ID: ${tab.id}
    `.trim();
    
    alert(details);
  }

  updateSummary() {
    const totalTabs = this.tabsData.length;
    const totalMemory = this.tabsData.reduce((sum, tab) => sum + tab.memory, 0);
    const avgMemory = totalTabs > 0 ? Math.round(totalMemory / totalTabs) : 0;
    
    const heavyTabs = this.tabsData.filter(tab => tab.memory > this.config.HEAVY_TAB_THRESHOLD).length;
    const performanceWarning = (totalMemory / this.config.REFERENCE_MEMORY) > 0.7;
    
    // Update UI elements
    if (this.elements['tab-count']) {
      this.elements['tab-count'].textContent = totalTabs;
    }
    
    if (this.elements['total-used']) {
      this.elements['total-used'].textContent = 
        `${this.formatMemory(totalMemory)} total • ${this.formatMemory(avgMemory)} avg`;
    }
    
    if (this.elements['total-memory']) {
      this.elements['total-memory'].textContent = 
        `${totalTabs} tabs • ${heavyTabs} heavy`;
    }
    
    // Update progress bar
    if (this.elements['memory-progress']) {
      const percentage = Math.min((totalMemory / this.config.REFERENCE_MEMORY) * 100, 100);
      this.elements['memory-progress'].style.width = `${percentage}%`;
      
      // Dynamic color based on percentage
      let gradient;
      if (percentage > 80) {
        gradient = 'linear-gradient(135deg, #ef4444, #dc2626)';
      } else if (percentage > 60) {
        gradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
      } else if (percentage > 40) {
        gradient = 'linear-gradient(135deg, #3b82f6, #2563eb)';
      } else {
        gradient = 'linear-gradient(135deg, #10b981, #059669)';
      }
      
      this.elements['memory-progress'].style.background = gradient;
      
      // Update performance indicator
      this.updatePerformanceIndicator(performanceWarning);
    }
  }

  updatePerformanceIndicator(warning) {
    let indicator = document.querySelector('.performance-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'performance-indicator';
      document.body.appendChild(indicator);
    }
    
    indicator.className = 'performance-indicator';
    if (warning) {
      indicator.classList.add('warning');
    }
  }

  async handleRefresh() {
    console.log('🔄 Handling refresh...');
    
    if (this.elements['refresh-btn']) {
      this.elements['refresh-btn'].disabled = true;
      this.elements['refresh-btn'].innerHTML = '<span class="loading"></span> Refreshing...';
      
      // Add loading animation
      if (!document.querySelector('.loading')) {
        const style = document.createElement('style');
        style.textContent = `
          .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    try {
      await this.refreshData();
      this.showToast('Data refreshed successfully', 'success');
    } catch (error) {
      console.error('Refresh error:', error);
      this.showToast('Failed to refresh data', 'error');
    } finally {
      if (this.elements['refresh-btn']) {
        setTimeout(() => {
          this.elements['refresh-btn'].disabled = false;
          this.elements['refresh-btn'].innerHTML = '🔄 Refresh';
        }, 500);
      }
    }
  }

  async refreshData() {
    const tabs = await this.browserAPI.tabs.query({});
    this.tabsData = await this.processTabs(tabs);
    this.renderTabsList();
    this.updateSummary();
  }

  handleSort() {
    this.sortDescending = !this.sortDescending;
    
    if (this.elements['sort-btn']) {
      const icon = this.sortDescending ? '▼' : '▲';
      const direction = this.sortDescending ? 'descending' : 'ascending';
      this.elements['sort-btn'].textContent = `Sort ${icon}`;
      this.elements['sort-btn'].title = `Sort by memory (${direction})`;
      
      // Add visual feedback
      this.elements['sort-btn'].style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.elements['sort-btn'].style.transform = 'scale(1)';
      }, 150);
    }
    
    this.renderTabsList();
  }

  async handleCleanup() {
    console.log('🧹 Handling cleanup...');
    
    const heavyTabs = this.tabsData.filter(tab => 
      tab.memory > this.config.HEAVY_TAB_THRESHOLD && 
      !tab.pinned && 
      !tab.active
    );
    
    if (heavyTabs.length === 0) {
      this.showToast('No heavy tabs found to clean up', 'info');
      return;
    }
    
    const totalMemory = heavyTabs.reduce((sum, tab) => sum + tab.memory, 0);
    const confirmation = `
      Close ${heavyTabs.length} heavy tab(s)?
      
      This will free approximately ${this.formatMemory(totalMemory)} of memory.
      
      Proceed?
    `;
    
    if (confirm(confirmation)) {
      try {
        const tabIds = heavyTabs.map(tab => tab.id);
        await this.browserAPI.tabs.remove(tabIds);
        
        this.showToast(`Closed ${heavyTabs.length} heavy tabs`, 'success');
        await this.refreshData();
        
      } catch (error) {
        console.error('Cleanup error:', error);
        this.showToast('Failed to close tabs', 'error');
      }
    }
  }

  handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + R to refresh
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      this.handleRefresh();
    }
    
    // Ctrl/Cmd + S to sort
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.handleSort();
    }
    
    // Ctrl/Cmd + D to cleanup
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault();
      this.handleCleanup();
    }
    
    // Escape to close popup
    if (event.key === 'Escape') {
      window.close();
    }
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.autoRefreshInterval = setInterval(() => {
      if (this.isInitialized && document.hasFocus()) {
        this.refreshData().catch(console.error);
      }
    }, this.config.REFRESH_INTERVAL);
  }

  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  // Utility methods
  formatMemory(mb) {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  }

  getMemoryColorClass(memory) {
    if (memory > this.config.CRITICAL_THRESHOLD) return 'memory-critical';
    if (memory > this.config.HIGH_THRESHOLD) return 'memory-high';
    if (memory > this.config.MEDIUM_THRESHOLD) return 'memory-medium';
    return 'memory-low';
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  formatUrlForDisplay(url) {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      let display = urlObj.hostname.replace('www.', '');
      
      // Add path if it's short
      if (display.length + urlObj.pathname.length <= 30) {
        display += urlObj.pathname;
      }
      
      return display.length > 30 
        ? display.substring(0, 27) + '...'
        : display;
    } catch {
      return this.truncateText(url, 30);
    }
  }

  getDomainInitial(url) {
    if (!url) return '🌐';
    
    try {
      const domain = new URL(url).hostname;
      const firstChar = domain.charAt(0).toUpperCase();
      return /[A-Z]/.test(firstChar) ? firstChar : 'W';
    } catch {
      return '🌐';
    }
  }

  createEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h4>No Tabs Found</h4>
        <p>Open some websites to see memory usage analysis.</p>
      </div>
    `;
  }

  showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.memory-toast');
    if (existingToast) existingToast.remove();
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `memory-toast toast-${type}`;
    toast.textContent = message;
    
    // Add styles if not present
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .memory-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(10px);
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 10000;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          max-width: 90%;
          text-align: center;
          pointer-events: none;
        }
        
        .memory-toast.show {
          transform: translateX(-50%) translateY(0);
        }
        
        .toast-success {
          background: rgba(16, 185, 129, 0.95);
        }
        
        .toast-error {
          background: rgba(239, 68, 68, 0.95);
        }
        
        .toast-info {
          background: rgba(59, 130, 246, 0.95);
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showCriticalError(message) {
    console.error('💥 Critical error:', message);
    
    if (this.elements['tabs-list']) {
      this.elements['tabs-list'].innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h4 class="error-title">Extension Error</h4>
          <p>${this.escapeHtml(message)}</p>
          <div class="error-actions">
            <button id="retry-btn" class="btn-primary">
              Retry
            </button>
            <button onclick="window.close()" class="btn-secondary">
              Close
            </button>
          </div>
        </div>
      `;
      
      // Add retry listener
      setTimeout(() => {
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            window.location.reload();
          });
        }
      }, 100);
    }
    
    // Add error styles
    const errorStyles = `
      .error-state {
        text-align: center;
        padding: 40px 20px;
        background: linear-gradient(135deg, #fef2f2, #fee2e2);
        border-radius: 16px;
        border: 1px solid rgba(254, 178, 178, 0.8);
      }
      
      .error-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .error-title {
        color: #dc2626;
        font-weight: 600;
        margin-bottom: 12px;
      }
      
      .error-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 20px;
      }
      
      .btn-primary {
        padding: 10px 20px;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      }
      
      .btn-secondary {
        padding: 10px 20px;
        background: linear-gradient(135deg, #64748b, #475569);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.textContent = errorStyles;
    document.head.appendChild(styleEl);
  }
}

// Initialize the extension when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const extension = new TabMemoryExtension();
  extension.init();
  
});


