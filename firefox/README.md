# Tab Memory Monitor

A browser extension to monitor memory usage of browser tabs. Identify memory-heavy tabs and optimize browser performance.

## Features

- **Real-time monitoring**: See memory usage for each open tab
- **Smart sorting**: Sort tabs by memory consumption (highest to lowest)
- **Memory cleanup**: One-click close tabs using excessive memory
- **Cross-browser**: Works on Chrome, Edge, and Firefox
- **Lightweight**: Minimal performance impact
- **Auto-refresh**: Updates memory data automatically

## Installation

### Chrome / Edge / Brave
1. Download this repository
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the `dist/chrome/` folder

### Firefox
1. Download this repository
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `dist/firefox/manifest.json`

## Development

### Prerequisites
- Node.js (for build script)

### Build Process
```bash
# Clone the repository
git clone https://github.com/yourusername/tab-memory-monitor.git

# Navigate to project
cd tab-memory-monitor

# Build for all browsers
node build.js

# Check output in dist/ folder