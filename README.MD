# Flashcard Learning App

A React + TypeScript flashcard learning application that helps you memorize information using spaced repetition. Study with interactive flashcards, track your progress locally, and learn more effectively.

## 🎯 Project Purpose

Flashcard Learning App is a privacy-first learning tool that helps you memorize information through interactive flashcards. Your progress is stored locally in your browser - no accounts, no tracking, just effective learning.

## ✨ Features

- **📚 Interactive Flashcards**: Tap to flip cards and reveal answers
- **👆 Swipe Gestures**: Swipe right if you know it, left if you don't
- **📊 Progress Tracking**: Track what you know and what you need to practice
- **🔒 Privacy-First**: All progress stored locally in browser cookies
- **📱 Mobile-First Design**: Optimized for mobile devices with smooth animations
- **🌐 GitHub Gist Integration**: Store flashcards in GitHub Gist for easy sharing
- **🔄 Spaced Repetition Ready**: Architecture supports science-based spaced repetition algorithms

## Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Framer Motion (animations)
- Zustand (state management)
- React Router (routing)
- React Feather (icons)

## Theme

- **Colors**: Black background (#121214), yellow primary (#F9E25B), white text
- **Typography**: Inter font, uppercase titles, bold CTAs
- **Layout**: Mobile-first, 420px max width, edge-to-edge cards
- **Animations**: Smooth swipe with bounce, 300ms transitions, 3D card flip

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Ange-Crespo/flashcard-app.git
cd flashcard-app

# Install dependencies
npm install

# Start development server
npm run dev

# Open your browser
# Navigate to http://localhost:3000
```

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
```

## Project Structure

```
src/
├── components/
│   ├── FlashcardCard.tsx      # Swipeable flashcard with flip animation
│   ├── FlashcardDeck.tsx      # Card stack with actions
│   └── ...
├── pages/
│   ├── DiscoverPage.tsx      # Main learning interface
│   └── ...
├── hooks/
│   ├── useGistFlashcards.ts   # Data fetching hook
│   └── ...
├── lib/
│   ├── cookies.ts             # Cookie management for progress
│   ├── githubGist.ts           # Gist API service
│   └── ...
├── store.ts                    # Zustand state management
├── App.tsx                     # Main app with routing
└── index.css                  # Global styles
```

## 🎮 How to Use

### For Learners

1. **Open the app** - No registration required
2. **Study flashcards** - Tap cards to flip, swipe to mark as known/unknown
3. **Track progress** - Your progress is automatically saved locally
4. **Review regularly** - Focus on cards you don't know yet

### For Content Creators

1. **Create flashcards** - Format your flashcards as JSON
2. **Store in GitHub Gist** - Upload to a Gist as `flashcards.json`
3. **Share the Gist ID** - Others can use your flashcards by entering the Gist ID

## 📝 Flashcard Format

Flashcards are stored as JSON in GitHub Gist:

```json
[
  {
    "id": "1",
    "front": "What is the capital of France?",
    "back": "Paris",
    "category": "Geography",
    "tags": ["geography", "europe", "capitals"]
  }
]
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

### Areas for Contribution

- **Spaced Repetition Algorithm**: Implement science-based spaced repetition
- **Flashcard Decks**: Add support for multiple flashcard decks
- **Progress Analytics**: Add detailed progress tracking and statistics
- **Accessibility**: Improve screen reader support
- **Mobile Experience**: Enhance mobile usability
- **Testing**: Increase test coverage
- **Documentation**: Improve code documentation

## 📚 Documentation

- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute to the project
- [API Documentation](API.md) - Internal APIs and data structures
- [Deployment Guide](deploy.md) - How to deploy the app
- [GitHub Gist Setup](GITHUB_GIST_SETUP.md) - How to set up flashcards in Gist

## 🔒 Privacy & Security

- **Local Storage Only**: All progress stored in browser cookies
- **No Data Collection**: No analytics, no tracking, no personal data
- **Anonymous Users**: No registration required
- **Privacy-First Design**: Complete anonymity for users

## 🏗️ Development

The app uses a mobile-first approach with:

- Bottom navigation on mobile
- Top navigation on desktop (768px+)
- Fixed positioning to prevent scrolling on Discover page
- Responsive breakpoints: 320px, 640px, 768px, 1024px

## 🚀 Deployment

The app can be deployed to:

- **Vercel** (recommended)
- **Netlify**
- **GitHub Pages**
- **Firebase Hosting**

See [Deployment Guide](deploy.md) for detailed instructions.

## 📄 License

This project is for educational purposes. By contributing, you agree that your contributions will be licensed under the same license as the project.

## 🙏 Acknowledgments

- The spaced repetition research community
- The open source community
- Contributors and supporters

---

**Start learning effectively with flashcards! 🚀**
