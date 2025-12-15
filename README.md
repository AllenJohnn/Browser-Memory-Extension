# Browser Memory Extension

A browser extension to monitor memory usage of tabs across different browsers.

## Project Structure

- /chrome/ - Chrome extension files
- /firefox/ - Firefox extension files

Each browser folder contains:
- manifest.json - Extension manifest
- ackground.js - Background service worker
- popup.html - Popup interface
- popup.js - Popup logic
- popup.css - Popup styles
- uild.js - Build script
- package.json - NPM configuration
- icon*.png - Extension icons
- README.md - Browser-specific instructions

## Features
- Monitor memory usage per tab
- Visual indicators for high memory usage
- Sort tabs by memory consumption
- One-click to free memory by closing tabs

## Installation
See individual browser folders for installation instructions.

## Building
Run 
ode build.js in each browser folder to package the extension.

## License
MIT
