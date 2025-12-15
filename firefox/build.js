const fs = require('fs');
const path = require('path');

// Copy files to browser-specific folders
function buildForBrowser(browser) {
  const sourceDir = './';
  const targetDir = `./dist/${browser}`;
  
  // Create directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copy common files
  const filesToCopy = [
    'popup.html', 'popup.css', 'popup.js', 'background.js',
    'icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'
  ];
  
  filesToCopy.forEach(file => {
    fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
  });
  
  // Use appropriate manifest
  if (browser === 'firefox') {
    fs.copyFileSync('./manifest.firefox.json', path.join(targetDir, 'manifest.json'));
    // Add Firefox-specific icon
    fs.copyFileSync('./icon96.png', path.join(targetDir, 'icon96.png'));
  } else {
    fs.copyFileSync('./manifest.json', path.join(targetDir, 'manifest.json'));
  }
  
  console.log(`Built for ${browser} in ${targetDir}`);
}

// Build for all browsers
['chrome', 'edge', 'firefox'].forEach(buildForBrowser);