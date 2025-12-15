<p align="center">
  <img src="banner.png" width="65%" style="border-radius: 12px;" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white"/>
  <img src="https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=firefox&logoColor=white"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
</p>

<p align="center">
  <b>Monitor, manage, and optimize browser tab memory usage.</b><br>
  <i>Identify memory-heavy tabs and improve overall browser performance.</i>
</p>

---

## Overview

**Tab Memory Monitor** is a lightweight browser extension that allows users to **track memory usage of open tabs in real time**.

It helps identify tabs consuming excessive memory and enables quick actions to maintain a fast and responsive browsing experience.

This extension is especially useful for:
- Developers
- Students
- Heavy multitaskers
---

## Features

| Feature | Description |
|------|-------------|
| **Real-Time Monitoring** | Displays memory usage for each open tab |
| **Smart Sorting** | Sorts tabs by highest memory consumption |
| **One-Click Cleanup** | Easily close memory-intensive tabs |
| **Auto Refresh** | Memory statistics update automatically |
| **Cross-Browser Support** | Compatible with Chrome and Firefox |
| **Lightweight** | Minimal impact on browser performance |
| **Clean UI** | Simple and distraction-free interface |

---

## Supported Browsers

- Google Chrome  
- Mozilla Firefox  

---

## Tech Stack

| Layer | Tools |
|-----|------|
| **Extension APIs** | Chrome Extensions API / WebExtensions |
| **Language** | JavaScript |
| **UI** | HTML, CSS |
| **Build Tools** | Node.js (custom build script) |

---

## Installation

### Chrome

1. Clone or download this repository
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `dist/chrome/` folder

---

### Firefox

1. Clone or download this repository
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `dist/firefox/manifest.json`

---

## Development Setup

### Prerequisites
- Node.js (v16 or higher recommended)

### Build Process

```bash
# Clone the repository
git clone https://github.com/yourusername/tab-memory-monitor.git

# Navigate to the project directory
cd tab-memory-monitor

# Build for all supported browsers
node build.js
