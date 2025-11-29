# Contributing to Flashcard Learning App

Thank you for your interest in contributing to Flashcard Learning App! This app helps people learn and memorize information using interactive flashcards with spaced repetition.

## 🎯 Project Overview

Flashcard Learning App is a privacy-first learning tool where users study flashcards, track their progress locally, and learn more effectively. All progress is stored in browser cookies - no accounts, no tracking.

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19+ and npm
- Git
- A code editor (VS Code recommended)

### Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/flashcards-app.git
   cd flashcards-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:run` - Run tests once
- `npm run lint` - Run ESLint

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── __tests__/      # Component tests
│   ├── FlashcardCard.tsx        # Swipeable flashcard with flip
│   ├── FlashcardDeck.tsx   # Card stack with actions
│   └── ...
├── pages/              # Page components
│   ├── __tests__/      # Page tests
│   ├── DiscoverPage.tsx # Main learning interface
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useGistFlashcards.ts # Data fetching hook
│   └── ...
├── lib/                # Utility functions
│   ├── cookies.ts      # Cookie management
│   ├── githubGist.ts   # Gist API service
│   └── ...
├── store.ts            # Zustand state management
└── App.tsx             # Main app with routing
```

## 📝 Code Style

- Use TypeScript for all new code
- Follow ESLint rules (run `npm run lint` before committing)
- Use Prettier for formatting
- Write tests for new features
- Add JSDoc comments for public functions

## 🧪 Testing

- Write tests for new components and features
- Run `npm run test` to execute tests
- Aim for good test coverage
- Use React Testing Library for component tests

## 📦 Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests for new features
   - Update documentation if needed

3. **Test your changes**

   ```bash
   npm run test
   npm run lint
   ```

4. **Commit your changes**

   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/amazing-feature
   ```

6. **Create a Pull Request**
   - Describe your changes clearly
   - Reference any related issues
   - Wait for review and feedback

## 🎯 Areas for Contribution

### High Priority

- **Spaced Repetition Algorithm**: Implement science-based spaced repetition (SM-2, Anki algorithm, etc.)
- **Progress Analytics**: Add detailed statistics and progress tracking
- **Flashcard Decks**: Support for multiple flashcard decks
- **Import/Export**: Allow users to import/export flashcard sets

### Medium Priority

- **Accessibility**: Improve screen reader support
- **Mobile Experience**: Enhance mobile usability and gestures
- **Themes**: Add different color themes
- **Offline Support**: Add service worker for offline functionality

### Low Priority

- **Social Features**: Share flashcard decks with others
- **Study Modes**: Different study modes (review only, new only, etc.)
- **Audio Support**: Add audio pronunciation for language learning
- **Image Support**: Support images in flashcards

## 🐛 Reporting Bugs

1. Check if the bug has already been reported
2. Create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS information

## 💡 Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Mockups or examples if applicable

## 📚 Documentation

- Update README.md for user-facing changes
- Update API.md for API changes
- Add JSDoc comments for new functions
- Update this file if contributing guidelines change

## ✅ Checklist for Pull Requests

- [ ] Code follows the project's style guidelines
- [ ] Tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated if needed
- [ ] Changes are backward compatible (if applicable)
- [ ] Commit messages are clear and descriptive

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Celebrate diversity of ideas

## 🙏 Thank You

Thank you for contributing to Flashcard Learning App! Together, we can help people learn more effectively. 🚀
