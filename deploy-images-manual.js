#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Manual Image Deployment Script');
console.log('==================================');

// Step 1: Build the project
console.log('📦 Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 2: Verify images are in dist
const distProfilesDir = path.join('dist', 'assets', 'profiles');
if (!fs.existsSync(distProfilesDir)) {
  console.error('❌ dist/assets/profiles directory not found');
  process.exit(1);
}

const imageFiles = fs
  .readdirSync(distProfilesDir)
  .filter(file => file.endsWith('.jpg'));
console.log(`✅ Found ${imageFiles.length} images in dist/assets/profiles`);

// Step 3: Check if images are accessible locally
console.log('🔍 Testing local image access...');
const testImagePath = path.join(distProfilesDir, 'profile-001.jpg');
if (fs.existsSync(testImagePath)) {
  const stats = fs.statSync(testImagePath);
  console.log(`✅ Test image exists: ${stats.size} bytes`);
} else {
  console.error('❌ Test image not found');
  process.exit(1);
}

// Step 4: Create a simple test HTML file
const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Image Test</title>
</head>
<body>
    <h1>Profile Images Test</h1>
    <p>Testing if images are accessible:</p>
    <img src="/assets/profiles/profile-001.jpg" alt="Profile 1" style="width: 200px; height: 200px; object-fit: cover;">
    <img src="/assets/profiles/profile-002.jpg" alt="Profile 2" style="width: 200px; height: 200px; object-fit: cover;">
    <img src="/assets/profiles/profile-003.jpg" alt="Profile 3" style="width: 200px; height: 200px; object-fit: cover;">
    <p>If you can see the images above, the deployment is working!</p>
</body>
</html>
`;

fs.writeFileSync(path.join('dist', 'test-images.html'), testHtml);
console.log('✅ Created test-images.html');

// Step 5: Git operations
console.log('📝 Committing changes...');
try {
  execSync('git add dist/', { stdio: 'inherit' });
  execSync('git commit -m "Deploy profile images - manual deployment"', {
    stdio: 'inherit',
  });
  console.log('✅ Changes committed');
} catch (error) {
  console.log('⚠️  Git commit failed (might be no changes):', error.message);
}

console.log('🚀 Pushing to GitHub...');
try {
  execSync('git push origin master', { stdio: 'inherit' });
  console.log('✅ Pushed to GitHub');
} catch (error) {
  console.error('❌ Git push failed:', error.message);
  process.exit(1);
}

console.log('');
console.log('🎉 Deployment completed!');
console.log('📋 Next steps:');
console.log('1. Wait 2-3 minutes for GitHub Actions to deploy');
console.log(
  '2. Check: https://Ange-Crespo.github.io/flashcard-app/test-images.html'
);
console.log(
  '3. If images show, your app should work at: https://Ange-Crespo.github.io/flashcard-app/'
);
console.log('');
console.log("🔍 If images still don't show:");
console.log('- Check GitHub Actions tab in your repository');
console.log('- Verify GitHub Pages settings');
console.log('- Check if there are any deployment errors');
