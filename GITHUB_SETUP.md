# GitHub Repository Setup

## Current Repository

- **Repository URL**: https://github.com/Ange-Crespo/flashcard-app.git
- **GitHub Pages URL**: https://Ange-Crespo.github.io/flashcard-app/
- **Repository Status**: Empty (ready for initial push)

## Configuration Updated

All configuration files have been updated to use the new repository:

### ✅ Updated Files

1. **`.git/config`**
   - Remote URL changed to: `https://github.com/Ange-Crespo/flashcard-app.git`

2. **`package.json`**
   - Homepage updated to: `https://Ange-Crespo.github.io/flashcard-app`

3. **`vite.config.ts`**
   - Base path updated to: `/flashcard-app/` (for production)

4. **`deploy-github-pages.js`**
   - Base path updated to `/flashcard-app/`
   - Deployment URL updated

5. **`scripts/fix-asset-paths.js`**
   - All asset path fixes updated to use `/flashcard-app/`

6. **`public/redirect.js`**
   - Base path updated to `/flashcard-app/`

7. **`public/404.html`**
   - Favicon paths updated to `/flashcard-app/`
   - Script paths updated

8. **`public/fallback-loader.js`**
   - Asset paths updated to `/flashcard-app/`

9. **`index.html`**
   - Favicon paths updated to `/flashcard-app/`

10. **`public/robots.txt`**
    - Sitemap URL updated

11. **`README.md`**
    - Clone URL updated to new repository

## Next Steps

### 1. Initial Push to New Repository

```bash
# Check current status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Migrate to flashcard-app repository"

# Add new remote (if not already set)
git remote set-url origin https://github.com/Ange-Crespo/flashcard-app.git

# Verify remote
git remote -v

# Push to new repository
git push -u origin master
# or if your default branch is 'main':
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to: https://github.com/Ange-Crespo/flashcard-app/settings/pages
2. Under "Source", select:
   - Branch: `master` (or `main` if that's your default branch)
   - Folder: `/ (root)` or `/docs` if using docs folder
3. Click "Save"
4. Your app will be available at: https://Ange-Crespo.github.io/flashcard-app/

### 3. Set Up GitHub Actions (Optional)

If you want automatic deployment on push, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master] # or 'main'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Repository Information

- **Owner**: Ange-Crespo
- **Repository Name**: flashcard-app
- **Type**: Public
- **Status**: Empty (ready for code)

## Verification

After pushing, verify:

- ✅ Repository contains all project files
- ✅ GitHub Pages is enabled
- ✅ App loads at: https://Ange-Crespo.github.io/flashcard-app/
- ✅ All routes work correctly
- ✅ Assets load properly

## Troubleshooting

If GitHub Pages doesn't work:

1. Check that the branch name matches (master vs main)
2. Verify the base path in `vite.config.ts` is `/flashcard-app/`
3. Check browser console for asset loading errors
4. Verify `.nojekyll` file exists in the root of the deployed branch
