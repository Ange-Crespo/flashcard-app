# GitHub Gist Setup for Flashcard Learning App

This guide explains how to set up GitHub Gist to store and manage flashcards in the Flashcard Learning App.

## 🎯 Overview

The application uses GitHub Gist to:

- **Store** : Save flashcard decks in a Gist
- **Read** : Load flashcards from a Gist to study in the app

## 🔧 GitHub Configuration

### 1. Create a GitHub Token (Optional - for writing)

If you want to create or update flashcards via the app:

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give the token a name (e.g., "Flashcard App Gist")
4. Select permissions:
   - ✅ `gist` (Create gists)
5. Click "Generate token"
6. **Copy the token** (it will only be shown once!)

### 2. Token Format

The token looks like this:

```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 📁 Data Structure

### Gist Format

Flashcards are stored in a file called `flashcards.json` with this structure:

```json
[
  {
    "id": "flashcard-1",
    "front": "What is the capital of France?",
    "back": "Paris",
    "category": "Geography",
    "tags": ["geography", "europe", "capitals"]
  },
  {
    "id": "flashcard-2",
    "front": "What is 2 + 2?",
    "back": "4",
    "category": "Math",
    "tags": ["math", "arithmetic"]
  }
]
```

### Flashcard Fields

- **id** (required): Unique identifier for the flashcard
- **front** (required): Question or prompt (shown on front of card)
- **back** (required): Answer or explanation (shown on back of card)
- **category** (optional): Category for organization (e.g., "Geography", "Math")
- **tags** (optional): Array of tags for filtering (e.g., ["geography", "europe"])

## 🚀 Usage

### 1. Creating a Gist Manually

1. Go to [gist.github.com](https://gist.github.com)
2. Create a new Gist
3. Name the file `flashcards.json`
4. Paste your flashcards JSON
5. Make it public
6. Copy the Gist ID from the URL (the part after `/gist/`)

### 2. Using the Gist in the App

1. Set the Gist ID in `src/lib/constants.ts`:
   ```typescript
   export const DEFAULT_GIST_ID = 'your-gist-id-here';
   ```
2. The flashcards will load automatically when the app starts

### 3. Using the Hook

```typescript
import { useGistFlashcards } from './hooks/useGistFlashcards';

function MyComponent() {
  const { flashcards, isLoading, error, loadFlashcards } = useGistFlashcards({
    gistId: 'your-gist-id',
    autoLoad: true
  });

  // Use flashcards in your component
  return <FlashcardDeck flashcards={flashcards} />;
}
```

## 🔄 Typical Workflow

### For Content Creators

1. Create flashcards in JSON format
2. Create a new Gist on GitHub
3. Upload `flashcards.json` to the Gist
4. Make the Gist public
5. Share the Gist ID with learners

### For Learners

1. Enter the Gist ID in the app (or use the default)
2. Flashcards load automatically
3. Start studying!

## 🛠️ API Methods

### Read Flashcards

```typescript
const result = await githubGistService.readFlashcards(gistId);
if (result.success && result.flashcards) {
  // Use flashcards
}
```

### Create Flashcard Gist

```typescript
const result = await githubGistService.createFlashcardGist(
  flashcards,
  githubToken,
  'My Flashcard Deck'
);
```

### Update Flashcard Gist

```typescript
const result = await githubGistService.updateFlashcardGist(
  flashcards,
  githubToken
);
```

## 🔒 Security

- **Public Gists**: Flashcards are publicly visible (required for the app to read them)
- **No Sensitive Data**: Don't store personal or sensitive information in flashcards
- **Token Security**: If using tokens, store them securely and never commit them to git

## 🐛 Troubleshooting

### Error "Not found"

- Verify the Gist ID is correct
- Ensure the Gist is public
- Check that the file is named `flashcards.json`

### Error "No flashcards.json found"

- Verify the file name is exactly `flashcards.json`
- Check the Gist has the correct file

### Error "Network error"

- Check your internet connection
- Verify GitHub API is accessible
- Check browser console for detailed error messages

## 📝 Example Gists

### Test Gist

- **ID**: `abc123def456`
- **URL**: `https://gist.github.com/username/abc123def456`
- **Content**: Sample flashcards for testing

### Production Gist

- **ID**: `xyz789uvw012`
- **URL**: `https://gist.github.com/username/xyz789uvw012`
- **Content**: Full flashcard deck for a course or subject

## 💡 Tips

1. **Organize by Category**: Use the `category` field to organize flashcards by subject
2. **Use Tags**: Tags help filter and search flashcards
3. **Keep IDs Unique**: Each flashcard needs a unique ID
4. **Test First**: Test with a small set of flashcards before creating large decks
5. **Version Control**: Gists support version history, so you can track changes

## 🔗 Useful Links

- [GitHub Gist API Documentation](https://docs.github.com/en/rest/gists)
- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [React Hooks Documentation](https://reactjs.org/docs/hooks-intro.html)

## 📞 Support

For questions or issues:

1. Check this guide
2. Check browser console logs
3. Verify Gist is public and accessible
4. Test with a simple flashcard set first
