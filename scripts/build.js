/**
 * ZenFlow Build Script
 * Synchronizes web assets from src/ to www/ for PWA and Capacitor distribution.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const wwwDir = path.join(rootDir, 'www');

if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

const filesToCopy = [
  'index.html',
  'style.css',
  'flow.js',
  'levels.js',
  'audio.js',
  'app.js',
  'manifest.webmanifest',
  'sw.js',
  'favicon.svg',
  'icon-192.png',
  'icon-512.png'
];

filesToCopy.forEach((file) => {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(wwwDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${file} -> www/${file}`);
  } else {
    console.warn(`Warning: ${file} not found in src/`);
  }
});

console.log('Build completed successfully: assets synced to www/');
