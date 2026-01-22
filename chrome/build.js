const fs = require('fs');
const path = require('path');

function buildForBrowser(browser) {
  const sourceDir = './';
  const targetDir = `./dist/${browser}`;
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const filesToCopy = [
    'popup.html', 'popup.css', 'popup.js', 'background.js',
    'icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'
  ];
  
  filesToCopy.forEach(file => {
    fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
  });
  
  if (browser === 'firefox') {
    fs.copyFileSync('./manifest.firefox.json', path.join(targetDir, 'manifest.json'));
    fs.copyFileSync('./icon96.png', path.join(targetDir, 'icon96.png'));
  } else {
    fs.copyFileSync('./manifest.json', path.join(targetDir, 'manifest.json'));
  }
  
  console.log(`Built for ${browser} in ${targetDir}`);
}

['chrome', 'edge', 'firefox'].forEach(buildForBrowser);
