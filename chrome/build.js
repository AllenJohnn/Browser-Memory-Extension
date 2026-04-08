const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const browserName = path.basename(__dirname).toLowerCase();
const distDir = path.join(__dirname, 'dist', browserName);
const manifestPath = path.join(__dirname, 'manifest.json');

const filesToCopy = [
  'popup.html',
  'popup.css',
  'popup.js',
  'background.js',
  'manifest.json',
  'icon16.png',
  'icon32.png',
  'icon48.png',
  'icon96.png',
  'icon128.png'
];

function assertRequiredFiles() {
  filesToCopy.forEach((file) => {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing required file: ${file}`);
    }
  });
}

function validateManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const required = ['manifest_version', 'name', 'version', 'description', 'action'];

  required.forEach((key) => {
    if (!(key in manifest)) {
      throw new Error(`Manifest missing required key: ${key}`);
    }
  });

  return manifest.version;
}

function cleanDist() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
}

function copyBuildFiles() {
  filesToCopy.forEach((file) => {
    fs.copyFileSync(path.join(__dirname, file), path.join(distDir, file));
  });
}

function maybeCreateZip(version) {
  if (!process.argv.includes('--zip')) {
    return;
  }

  if (process.platform !== 'win32') {
    console.warn('Zip packaging is only configured for Windows PowerShell in this project.');
    return;
  }

  const zipPath = path.join(__dirname, 'dist', `${browserName}-extension-v${version}.zip`);
  const psCommand = [
    `$zip='${zipPath.replace(/\\/g, '\\\\')}'`,
    `if (Test-Path $zip) { Remove-Item $zip -Force }`,
    `Compress-Archive -Path '${distDir.replace(/\\/g, '\\\\')}\\*' -DestinationPath $zip`
  ].join('; ');

  execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });
  console.log(`Created package: ${zipPath}`);
}

function run() {
  assertRequiredFiles();
  const version = validateManifest();
  cleanDist();
  copyBuildFiles();
  maybeCreateZip(version);
  console.log(`Build completed for ${browserName} at ${distDir}`);
}

run();
