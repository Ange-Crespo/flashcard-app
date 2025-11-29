#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying deployment configuration...');

const distDir = 'dist';
const requiredFiles = ['index.html', '404.html', '.nojekyll'];

const requiredAssets = [
  'assets/index-',
  'assets/vendor-',
  'assets/motion-',
  'assets/router-',
  'assets/index-',
];

let hasErrors = false;

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found');
  hasErrors = true;
  process.exit(1);
}

// Check required files
console.log('\n📁 Checking required files:');
for (const file of requiredFiles) {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.error(`❌ ${file} - MISSING`);
    hasErrors = true;
  }
}

// Check for asset files
console.log('\n🎨 Checking asset files:');
const assetFiles = fs.readdirSync(path.join(distDir, 'assets'));
const assetPatterns = ['index-', 'vendor-', 'motion-', 'router-', 'index-'];

for (const pattern of assetPatterns) {
  const matchingFiles = assetFiles.filter(file => file.includes(pattern));
  if (matchingFiles.length > 0) {
    console.log(`✅ ${pattern}* (found ${matchingFiles.length} files)`);
  } else {
    console.error(`❌ ${pattern}* - NO MATCHING FILES`);
    hasErrors = true;
  }
}

// Check index.html content
console.log('\n📄 Checking index.html content:');
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');

  // Check for double slashes
  if (content.includes('/flashcard-app//')) {
    console.error('❌ Double slashes found in asset paths');
    hasErrors = true;
  } else {
    console.log('✅ No double slashes in asset paths');
  }

  // Check for correct base path
  if (
    content.includes('href="/flashcard-app/') &&
    content.includes('src="/flashcard-app/')
  ) {
    console.log('✅ Correct base path in asset references');
  } else {
    console.error('❌ Incorrect base path in asset references');
    hasErrors = true;
  }

  // Check for CSP
  if (content.includes('Content-Security-Policy')) {
    console.log('✅ Content Security Policy found');
  } else {
    console.log('⚠️  No Content Security Policy found');
  }
}

// Check 404.html content
console.log('\n🔄 Checking 404.html content:');
const notFoundPath = path.join(distDir, '404.html');
if (fs.existsSync(notFoundPath)) {
  const content = fs.readFileSync(notFoundPath, 'utf8');

  if (content.includes('GitHub Pages SPA routing fix')) {
    console.log('✅ SPA routing script found');
  } else {
    console.error('❌ SPA routing script missing');
    hasErrors = true;
  }

  if (content.includes('/flashcard-app/')) {
    console.log('✅ Correct base path in 404.html');
  } else {
    console.error('❌ Incorrect base path in 404.html');
    hasErrors = true;
  }
}

// Summary
console.log('\n📊 Deployment Verification Summary:');
if (hasErrors) {
  console.error('❌ Deployment verification FAILED - Fix the issues above');
  process.exit(1);
} else {
  console.log('✅ Deployment verification PASSED - Ready for GitHub Pages!');
  console.log(
    '🌐 Your app should work at: https://Ange-Crespo.github.io/flashcard-app/'
  );
}
