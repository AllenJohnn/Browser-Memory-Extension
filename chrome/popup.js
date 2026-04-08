class TabMemoryExtension {
  constructor() {
    this.browserAPI = null;
    this.tabsData = [];
    this.sortDescending = true;
    this.filterMode = 'all';
    this.isCompactMode = false;
    this.settingsPanelOpen = false;
    this.isInitialized = false;
    this.config = {
      REFRESH_INTERVAL: 10000,
      HEAVY_TAB_THRESHOLD: 300,
      CRITICAL_THRESHOLD: 500,
      HIGH_THRESHOLD: 200,
      MEDIUM_THRESHOLD: 100,
      REFERENCE_MEMORY: 4096
    };
    this.elements = {};
  }

  async init() {
    try {
      this.cacheElements();
      this.browserAPI = this.detectBrowserAPI();
      if (!this.browserAPI) {
        throw new Error('Unsupported browser');
      }
      await this.loadSettings();
      this.showLoadingState();
      this.setupEventListeners();
      await this.loadInitialData();
      this.applySettingsToUi();
      this.startAutoRefresh();
      this.isInitialized = true;
    } catch (error) {
      this.showCriticalError(error.message);
    }
  }

  cacheElements() {
    const elementIds = [
      'tabs-list',
      'refresh-btn', 
      'sort-btn',
      'cleanup-btn',
      'tab-count',
      'total-used',
      'memory-progress',
      'total-memory',
      'settings-toggle',
      'settings-panel',
      'save-settings',
      'heavy-threshold',
      'refresh-interval',
      'compact-mode'
    ];
    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });

    this.elements['filter-chips'] = Array.from(document.querySelectorAll('.filter-chip'));
  }

  detectBrowserAPI() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      return chrome;
    }
    if (typeof browser !== 'undefined' && browser.tabs) {
      return browser;
    }
    return null;
  }

  showLoadingState() {
    if (this.elements['tabs-list']) {
      this.elements['tabs-list'].innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-text">Analyzing memory usage...</div>
        </div>
      `;
    }
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
    if (this.elements['refresh-btn']) {
      this.elements['refresh-btn'].addEventListener('click', () => this.handleRefresh());
    }
    if (this.elements['sort-btn']) {
      this.elements['sort-btn'].addEventListener('click', () => this.handleSort());
    }
    if (this.elements['cleanup-btn']) {
      this.elements['cleanup-btn'].addEventListener('click', () => this.handleCleanup());
    }
    if (this.elements['settings-toggle']) {
      this.elements['settings-toggle'].addEventListener('click', () => this.toggleSettingsPanel());
    }
    if (this.elements['save-settings']) {
      this.elements['save-settings'].addEventListener('click', () => this.saveSettingsFromForm());
    }
    if (Array.isArray(this.elements['filter-chips'])) {
      this.elements['filter-chips'].forEach((chip) => {
        chip.addEventListener('click', () => {
          this.setFilterMode(chip.dataset.filter || 'all');
        });
      });
    }
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    window.addEventListener('blur', () => this.stopAutoRefresh());
    window.addEventListener('focus', () => this.startAutoRefresh());
  }

  async loadInitialData() {
    try {
      const tabs = await this.browserAPI.tabs.query({});
      this.tabsData = await this.processTabs(tabs);
      this.renderTabsList();
      this.updateSummary();
      ['refresh-btn', 'sort-btn', 'cleanup-btn'].forEach(id => {
        if (this.elements[id]) {
          this.elements[id].disabled = false;
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async processTabs(tabs) {
    const processedTabs = [];
    const memoryMap = await this.getBackgroundTabMemoryMap();
    for (const tab of tabs) {
      const memory = memoryMap.get(tab.id) || this.estimateMemoryByTab(tab);
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

  estimateMemoryByTab(tab) {
    const urlLower = (tab.url || '').toLowerCase();
    let estimate = 45;

    if (urlLower.includes('youtube.com') || urlLower.includes('netflix.com') || urlLower.includes('twitch.tv')) {
      estimate += 260;
    } else if (urlLower.includes('figma.com') || urlLower.includes('canva.com') || urlLower.includes('photoshop')) {
      estimate += 220;
    } else if (urlLower.includes('docs.google.com') || urlLower.includes('notion.so') || urlLower.includes('slack.com')) {
      estimate += 130;
    } else if (urlLower.includes('discord.com') || urlLower.includes('teams.microsoft.com') || urlLower.includes('meet.google.com')) {
      estimate += 170;
    } else if (urlLower.includes('github.com') || urlLower.includes('gitlab.com') || urlLower.includes('stackoverflow.com')) {
      estimate += 95;
    } else {
      estimate += 60;
    }

    const hash = this.stableHash(urlLower || String(tab.id || 0));
    estimate += hash % 30;

    if (tab.active) estimate += 35;
    if (tab.audible) estimate += 45;
    if (tab.pinned) estimate -= 10;
    if (tab.discarded) estimate -= 20;

    return Math.max(20, Math.min(1200, Math.round(estimate)));
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
      }
    }
    return null;
  }

  renderTabsList() {
    if (!this.elements['tabs-list']) return;
    this.elements['tabs-list'].innerHTML = '';
    const filteredTabs = this.getFilteredTabs(this.tabsData);
    if (filteredTabs.length === 0) {
      this.elements['tabs-list'].innerHTML = this.createEmptyState();
      return;
    }
    const tabsToDisplay = this.sortDescending
      ? [...filteredTabs].sort((a, b) => b.memory - a.memory)
      : [...filteredTabs].sort((a, b) => a.memory - b.memory);
    tabsToDisplay.forEach(tab => {
      const tabElement = this.createTabElement(tab);
      this.elements['tabs-list'].appendChild(tabElement);
    });
  }

  createTabElement(tab) {
    const row = document.createElement('div');
    const classes = ['tab-row'];
    if (tab.memory > this.config.CRITICAL_THRESHOLD) classes.push('critical-memory');
    else if (tab.memory > this.config.HIGH_THRESHOLD) classes.push('high-memory');
    if (tab.active) classes.push('active-tab');
    row.className = classes.join(' ');
    const displayTitle = this.truncateText(tab.title, 45);
    const displayUrl = this.formatUrlForDisplay(tab.url);
    const memoryDisplay = this.formatMemory(tab.memory);
    const memoryClass = this.getMemoryColorClass(tab.memory);
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
      <div class="quick-actions" aria-label="Quick actions">
        <button class="quick-action-btn ${tab.pinned ? 'is-active' : ''}" data-action="pin" title="${tab.pinned ? 'Unpin tab' : 'Pin tab'}" aria-label="${tab.pinned ? 'Unpin tab' : 'Pin tab'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 17v5" />
            <path d="M5 4h14l-3 5v4l-4-2-4 2V9z" />
          </svg>
        </button>
        <button class="quick-action-btn ${tab.muted ? 'is-active' : ''}" data-action="mute" title="${tab.muted ? 'Unmute tab' : 'Mute tab'}" aria-label="${tab.muted ? 'Unmute tab' : 'Mute tab'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        </button>
        <button class="quick-action-btn danger" data-action="close" title="Close tab" aria-label="Close tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    `;
    this.addTabEventListeners(row, tab);
    return row;
  }

  addTabEventListeners(element, tab) {
    element.addEventListener('click', (e) => {
      const actionButton = e.target.closest('.quick-action-btn');
      if (actionButton) {
        e.stopPropagation();
        this.handleQuickAction(actionButton.dataset.action, tab);
        return;
      }

      if (!e.target.classList.contains('memory-usage') &&
          !e.target.closest('.memory-usage')) {
        this.switchToTab(tab);
      }
    });
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showTabContextMenu(e, tab);
    });
    const memoryEl = element.querySelector('.memory-usage');
    if (memoryEl) {
      memoryEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showMemoryDetails(tab);
      });
    }
  }

  async handleQuickAction(action, tab) {
    try {
      switch (action) {
        case 'pin':
          await this.togglePinTab(tab.id, !tab.pinned);
          this.showToast(tab.pinned ? 'Tab unpinned' : 'Tab pinned', 'success');
          break;
        case 'mute':
          await this.toggleMuteTab(tab.id, !tab.muted);
          this.showToast(tab.muted ? 'Tab unmuted' : 'Tab muted', 'success');
          break;
        case 'close':
          await this.closeTab(tab.id);
          this.showToast('Tab closed', 'success');
          break;
        default:
          break;
      }
    } catch (_error) {
      this.showToast('Action failed', 'error');
    }
  }

  switchToTab(tab) {
    this.browserAPI.tabs.update(tab.id, { active: true });
    this.browserAPI.windows.update(tab.windowId, { focused: true });
    window.close();
  }

  showTabContextMenu(event, tab) {
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
    const filteredTabs = this.getFilteredTabs(this.tabsData);
    const totalMemory = this.tabsData.reduce((sum, tab) => sum + tab.memory, 0);
    const performanceWarning = (totalMemory / this.config.REFERENCE_MEMORY) > 0.7;
    if (this.elements['tab-count']) {
      this.elements['tab-count'].textContent = this.filterMode === 'all'
        ? totalTabs
        : `${filteredTabs.length}/${totalTabs}`;
    }
    if (this.elements['total-used']) {
      this.elements['total-used'].textContent = this.formatMemory(totalMemory);
    }
    if (this.elements['total-memory']) {
      this.elements['total-memory'].textContent = this.formatMemory(totalMemory);
    }
    if (this.elements['memory-progress']) {
      const percentage = Math.min((totalMemory / this.config.REFERENCE_MEMORY) * 100, 100);
      this.elements['memory-progress'].style.width = `${percentage}%`;
      const memoryPercentEl = document.getElementById('memory-percent');
      if (memoryPercentEl) {
        memoryPercentEl.textContent = `${Math.round(percentage)}%`;
      }
      if (percentage > 80) {
        this.elements['memory-progress'].style.background = '#ef4444';
      } else if (percentage > 60) {
        this.elements['memory-progress'].style.background = '#f59e0b';
      } else if (percentage > 40) {
        this.elements['memory-progress'].style.background = '#3b82f6';
      } else {
        this.elements['memory-progress'].style.background = '#111827';
      }
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
    if (this.elements['refresh-btn']) {
      const originalContent = this.elements['refresh-btn'].innerHTML;
      this.elements['refresh-btn'].disabled = true;
      this.elements['refresh-btn'].innerHTML = '<span class="loading"></span><span>Refreshing...</span>';
      if (!document.querySelector('#loading-style')) {
        const style = document.createElement('style');
        style.id = 'loading-style';
        style.textContent = `
          .loading {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #e5e7eb;
            border-top-color: #111827;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
        `;
        document.head.appendChild(style);
      }
      try {
        await this.refreshData();
        this.showToast('Data refreshed successfully', 'success');
      } catch (error) {
        this.showToast('Failed to refresh data', 'error');
      } finally {
        setTimeout(() => {
          this.elements['refresh-btn'].disabled = false;
          this.elements['refresh-btn'].innerHTML = originalContent;
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
    this.persistSettings();
    if (this.elements['sort-btn']) {
      const sortBtn = this.elements['sort-btn'];
      const icon = sortBtn.querySelector('.btn-icon');
      if (icon) {
        icon.style.transform = this.sortDescending ? 'rotate(0deg)' : 'rotate(180deg)';
      }
      sortBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        sortBtn.style.transform = 'scale(1)';
      }, 150);
    }
    this.renderTabsList();
  }

  async handleCleanup() {
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
    const confirmation = `Close ${heavyTabs.length} heavy tab(s)?\n\nThis will free approximately ${this.formatMemory(totalMemory)} of memory.\n\nProceed?`;
    if (confirm(confirmation)) {
      try {
        const tabIds = heavyTabs.map(tab => tab.id);
        await this.browserAPI.tabs.remove(tabIds);
        this.showToast(`Closed ${heavyTabs.length} heavy tabs`, 'success');
        await this.refreshData();
      } catch (error) {
        this.showToast('Failed to close tabs', 'error');
      }
    }
  }

  getFilteredTabs(tabs) {
    switch (this.filterMode) {
      case 'active':
        return tabs.filter((tab) => tab.active);
      case 'pinned':
        return tabs.filter((tab) => tab.pinned);
      case 'heavy':
        return tabs.filter((tab) => tab.memory > this.config.HEAVY_TAB_THRESHOLD);
      case 'audible':
        return tabs.filter((tab) => tab.audible);
      default:
        return tabs;
    }
  }

  setFilterMode(mode) {
    this.filterMode = mode;
    this.updateFilterChips();
    this.renderTabsList();
    this.updateSummary();
  }

  updateFilterChips() {
    if (!Array.isArray(this.elements['filter-chips'])) return;
    this.elements['filter-chips'].forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.filter === this.filterMode);
    });
  }

  toggleSettingsPanel() {
    const panel = this.elements['settings-panel'];
    if (!panel) return;
    this.settingsPanelOpen = !this.settingsPanelOpen;
    panel.hidden = !this.settingsPanelOpen;
    if (this.elements['settings-toggle']) {
      this.elements['settings-toggle'].classList.toggle('active', this.settingsPanelOpen);
    }
  }

  getStorageArea() {
    return this.browserAPI?.storage?.local || null;
  }

  async loadSettings() {
    const defaults = {
      heavyThreshold: this.config.HEAVY_TAB_THRESHOLD,
      refreshInterval: this.config.REFRESH_INTERVAL,
      sortDescending: this.sortDescending,
      compactMode: this.isCompactMode
    };

    const storage = this.getStorageArea();
    if (!storage) {
      return;
    }

    const settings = await new Promise((resolve) => {
      storage.get(defaults, (result) => {
        if (this.browserAPI.runtime.lastError) {
          resolve(defaults);
          return;
        }
        resolve(result || defaults);
      });
    });

    this.config.HEAVY_TAB_THRESHOLD = Number(settings.heavyThreshold) || defaults.heavyThreshold;
    this.config.REFRESH_INTERVAL = Number(settings.refreshInterval) || defaults.refreshInterval;
    this.sortDescending = Boolean(settings.sortDescending);
    this.isCompactMode = Boolean(settings.compactMode);
  }

  applySettingsToUi() {
    if (this.elements['heavy-threshold']) {
      this.elements['heavy-threshold'].value = this.config.HEAVY_TAB_THRESHOLD;
    }
    if (this.elements['refresh-interval']) {
      this.elements['refresh-interval'].value = String(this.config.REFRESH_INTERVAL);
    }
    if (this.elements['compact-mode']) {
      this.elements['compact-mode'].checked = this.isCompactMode;
    }
    document.body.classList.toggle('compact-mode', this.isCompactMode);
    this.updateFilterChips();
  }

  async persistSettings() {
    const storage = this.getStorageArea();
    if (!storage) {
      return;
    }

    const payload = {
      heavyThreshold: this.config.HEAVY_TAB_THRESHOLD,
      refreshInterval: this.config.REFRESH_INTERVAL,
      sortDescending: this.sortDescending,
      compactMode: this.isCompactMode
    };

    await new Promise((resolve) => {
      storage.set(payload, () => resolve());
    });
  }

  async saveSettingsFromForm() {
    const threshold = Number(this.elements['heavy-threshold']?.value || this.config.HEAVY_TAB_THRESHOLD);
    const refreshInterval = Number(this.elements['refresh-interval']?.value || this.config.REFRESH_INTERVAL);
    const compactMode = Boolean(this.elements['compact-mode']?.checked);

    this.config.HEAVY_TAB_THRESHOLD = Math.min(1200, Math.max(100, threshold));
    this.config.REFRESH_INTERVAL = [5000, 10000, 15000, 30000].includes(refreshInterval)
      ? refreshInterval
      : this.config.REFRESH_INTERVAL;
    this.isCompactMode = compactMode;

    this.applySettingsToUi();
    this.startAutoRefresh();
    await this.persistSettings();
    await this.refreshData();
    this.showToast('Preferences saved', 'success');
  }

  handleKeyboardShortcuts(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      this.handleRefresh();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.handleSort();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault();
      this.handleCleanup();
    }
    if (event.key === 'Escape') {
      window.close();
    }
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.autoRefreshInterval = setInterval(() => {
      if (this.isInitialized && document.hasFocus()) {
        this.refreshData().catch(() => {});
      }
    }, this.config.REFRESH_INTERVAL);
  }

  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

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

  stableHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  async getBackgroundTabMemoryMap() {
    return new Promise((resolve) => {
      try {
        this.browserAPI.runtime.sendMessage({ action: 'getTabMemory' }, (response) => {
          if (this.browserAPI.runtime.lastError || !response || !Array.isArray(response.tabs)) {
            resolve(new Map());
            return;
          }

          const memoryMap = new Map();
          response.tabs.forEach((item) => {
            if (typeof item.tabId === 'number' && typeof item.memory === 'number') {
              memoryMap.set(item.tabId, item.memory);
            }
          });

          resolve(memoryMap);
        });
      } catch (_error) {
        resolve(new Map());
      }
    });
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
    const isFiltered = this.filterMode !== 'all';
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h4>${isFiltered ? 'No Matching Tabs' : 'No Tabs Found'}</h4>
        <p>${isFiltered ? 'Try another filter to see more tabs.' : 'Open some websites to see memory usage analysis.'}</p>
      </div>
    `;
  }

  showToast(message, type = 'info') {
    const existingToast = document.querySelector('.memory-toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = `memory-toast toast-${type}`;
    toast.textContent = message;
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
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showCriticalError(message) {
    if (this.elements['tabs-list']) {
      this.elements['tabs-list'].innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h4 class="error-title">Extension Error</h4>
          <p>${this.escapeHtml(message)}</p>
          <div class="error-actions">
            <button id="retry-btn" class="btn-primary">Retry</button>
            <button onclick="window.close()" class="btn-secondary">Close</button>
          </div>
        </div>
      `;
      setTimeout(() => {
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            window.location.reload();
          });
        }
      }, 100);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const extension = new TabMemoryExtension();
  extension.init();
});
