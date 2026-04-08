const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

const SAMPLE_INTERVAL_MS = 30000;
const HISTORY_LIMIT = 240;
const tabMemoryState = new Map();
let memoryHistory = [];

function stableHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function estimateTabMemoryMb(tab) {
  const url = (tab.url || '').toLowerCase();
  let estimate = 45;

  if (url.includes('youtube.com') || url.includes('netflix.com') || url.includes('twitch.tv')) {
    estimate += 260;
  } else if (url.includes('figma.com') || url.includes('canva.com') || url.includes('photoshop')) {
    estimate += 220;
  } else if (url.includes('docs.google.com') || url.includes('notion.so') || url.includes('slack.com')) {
    estimate += 130;
  } else if (url.includes('discord.com') || url.includes('teams.microsoft.com') || url.includes('meet.google.com')) {
    estimate += 170;
  } else if (url.includes('github.com') || url.includes('gitlab.com') || url.includes('stackoverflow.com')) {
    estimate += 95;
  } else {
    estimate += 60;
  }

  const urlHash = stableHash(url || String(tab.id || 0));
  estimate += urlHash % 30;

  if (tab.active) estimate += 35;
  if (tab.audible) estimate += 45;
  if (tab.pinned) estimate -= 10;
  if (tab.discarded) estimate -= 20;

  return Math.max(20, Math.min(1200, Math.round(estimate)));
}

async function sampleMemorySnapshot() {
  try {
    const tabs = await browserAPI.tabs.query({});
    const now = Date.now();
    let totalMemory = 0;
    const activeTabIds = new Set();

    tabs.forEach((tab) => {
      activeTabIds.add(tab.id);
      const memory = estimateTabMemoryMb(tab);
      totalMemory += memory;
      tabMemoryState.set(tab.id, {
        tabId: tab.id,
        title: tab.title || 'New Tab',
        url: tab.url || '',
        memory,
        active: Boolean(tab.active),
        pinned: Boolean(tab.pinned),
        timestamp: now
      });
    });

    for (const tabId of tabMemoryState.keys()) {
      if (!activeTabIds.has(tabId)) {
        tabMemoryState.delete(tabId);
      }
    }

    const tabsCount = tabs.length;
    memoryHistory.push({
      timestamp: now,
      totalMemory,
      tabsCount,
      averageMemory: tabsCount > 0 ? Math.round(totalMemory / tabsCount) : 0
    });

    if (memoryHistory.length > HISTORY_LIMIT) {
      memoryHistory = memoryHistory.slice(-HISTORY_LIMIT);
    }
  } catch (error) {
    // Silently ignore sampling failures to keep the worker resilient.
  }
}

browserAPI.tabs.onRemoved.addListener((tabId) => {
  tabMemoryState.delete(tabId);
});

browserAPI.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    sampleMemorySnapshot();
  }
});

browserAPI.tabs.onActivated.addListener(() => {
  sampleMemorySnapshot();
});

browserAPI.runtime.onInstalled.addListener(() => {
  sampleMemorySnapshot();
});

setInterval(sampleMemorySnapshot, SAMPLE_INTERVAL_MS);
sampleMemorySnapshot();

browserAPI.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getMemoryHistory') {
    sendResponse({ history: memoryHistory });
    return true;
  }

  if (request.action === 'getTabMemory') {
    sendResponse({ tabs: Array.from(tabMemoryState.values()) });
    return true;
  }

  return false;
});
