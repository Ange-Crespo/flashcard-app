import { NavLink, Route, Routes } from 'react-router-dom';
import { Search, MessageCircle, GitHub, Plus, Settings } from 'react-feather';
import { useEffect, useMemo } from 'react';
import DiscoverPage from './pages/DiscoverPage';
import ProgressPage from './pages/ProgressPage';
import { FlashcardDemoPage } from './pages/FlashcardDemoPage';
import FlashcardDeckCreatorPage from './pages/FlashcardDeckCreatorPage';
import SettingsPage from './pages/SettingsPage';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useToast } from './hooks/useToast';
import { useAppStore } from './store';
import { useGistFlashcards } from './hooks/useGistFlashcards';
import { DEFAULT_GIST_OWNER } from './lib/constants';
import { applyTheme, loadStoredTheme } from './lib/themes';
import {
  DEFAULT_LOCAL_DECK_ID,
  getLocalDeckFlashcards,
} from './lib/localDecks';
import './App.css';

/**
 * Main App component that handles routing and layout.
 * Provides navigation between the main app sections: Study and Progress.
 *
 * @returns JSX element representing the main app layout
 */
function App() {
  const { toasts, removeToast } = useToast();
  const { flashcards, setFlashcards, loadProgress, selectedGist } =
    useAppStore();

  // Apply theme on mount
  useEffect(() => {
    const theme = loadStoredTheme();
    applyTheme(theme);
  }, []);
  const localDeckFlashcards = useMemo(
    () => getLocalDeckFlashcards(DEFAULT_LOCAL_DECK_ID, { limit: 500 }),
    []
  );

  // Initialize flashcards from Gist on app startup
  const { flashcards: gistFlashcards } = useGistFlashcards({
    gistId: selectedGist.id,
    gistOwner: selectedGist.owner ?? DEFAULT_GIST_OWNER,
    rawUrl: selectedGist.rawUrl,
    autoLoad: true,
  });

  // Update flashcards in store when loaded (only once when flashcards are available)
  useEffect(() => {
    // Only update if store is empty and we have flashcards to load
    if (flashcards.length === 0) {
      if (gistFlashcards.length > 0) {
        setFlashcards(gistFlashcards);
        console.log('✅ Loaded flashcards from Gist:', gistFlashcards.length);
      } else if (localDeckFlashcards.length > 0) {
        setFlashcards(localDeckFlashcards);
        console.log(
          '✅ Loaded local dataset flashcards:',
          localDeckFlashcards.length
        );
      }
    }
    // Only depend on gistFlashcards.length to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gistFlashcards.length, setFlashcards]);

  // Load user progress from cookies on app startup
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return (
    <ErrorBoundary>
      <div className="app">
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        <header role="banner" className="app-header">
          <h1 className="app-title">Flashcard Learning</h1>
        </header>
        <main
          role="main"
          id="main-content"
          data-testid="main-content"
          className="app-main"
        >
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<DiscoverPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/matches" element={<ProgressPage />} />
              <Route path="/gist-demo" element={<FlashcardDemoPage />} />
              <Route path="/create" element={<FlashcardDeckCreatorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="*"
                element={
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Page Not Found</h2>
                    <p>La page que vous recherchez n'existe pas.</p>
                    <a href={import.meta.env.BASE_URL}>Retour à l'accueil</a>
                  </div>
                }
              />
            </Routes>
          </ErrorBoundary>
        </main>
        <nav role="navigation" className="nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Search />
            <span>Study</span>
          </NavLink>
          <NavLink
            to="/progress"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <MessageCircle />
            <span>Progress</span>
          </NavLink>
          <NavLink
            to="/create"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Plus />
            <span>Create</span>
          </NavLink>
          <NavLink
            to="/gist-demo"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <GitHub />
            <span>Gist</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Settings />
            <span>Settings</span>
          </NavLink>
        </nav>
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
