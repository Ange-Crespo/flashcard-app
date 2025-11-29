import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlashcardDeck } from '../components/FlashcardDeck';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { useAppStore } from '../store';
import { useGistFlashcards } from '../hooks/useGistFlashcards';
import { DEFAULT_GIST_ID, DEFAULT_GIST_OWNER } from '../lib/constants';
import './DiscoverPage.css';

/**
 * Main discover page component that displays the flashcard learning interface.
 * Prevents body scrolling to maintain a mobile app-like experience.
 *
 * @returns JSX element representing the discover page
 */
export default function DiscoverPage() {
  const navigate = useNavigate();
  const {
    flashcards,
    sortedFlashcards,
    setFlashcards,
    loadProgress,
    selectedGist,
  } = useAppStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    localStorage.getItem('hasSeenOnboarding') === 'true'
  );
  const [hasCheckedFirstTime, setHasCheckedFirstTime] = useState(false);

  // Load flashcards from Gist
  const {
    flashcards: gistFlashcards,
    isLoading,
    error,
  } = useGistFlashcards({
    gistId: selectedGist.id,
    gistOwner: selectedGist.owner ?? DEFAULT_GIST_OWNER,
    rawUrl: selectedGist.rawUrl,
    autoLoad: true,
  });

  // Check if it's first-time use (no custom Gist configured)
  // Only redirect after onboarding is complete and if there's an error
  useEffect(() => {
    if (hasCheckedFirstTime || showOnboarding || isLoading) return;

    // Check if user has manually configured a Gist (not using default)
    const hasCustomGist = localStorage.getItem('selected_gist_deck');
    const isUsingDefault =
      !hasCustomGist || selectedGist.id === DEFAULT_GIST_ID;

    // Only redirect if: using default AND there's an error AND onboarding is done
    if (
      isUsingDefault &&
      error &&
      hasSeenOnboarding &&
      gistFlashcards.length === 0
    ) {
      // Redirect to settings to configure Gist
      navigate('/settings', { replace: true });
      setHasCheckedFirstTime(true);
      return;
    }

    setHasCheckedFirstTime(true);
  }, [
    selectedGist.id,
    hasSeenOnboarding,
    hasCheckedFirstTime,
    showOnboarding,
    isLoading,
    error,
    gistFlashcards.length,
    navigate,
  ]);

  // Clear error when flashcards are successfully loaded
  useEffect(() => {
    if (gistFlashcards.length > 0 && error) {
      // Error will be cleared by the hook, but we ensure it's cleared here too
      // The hook already sets error to null on successful load
    }
  }, [gistFlashcards.length, error]);

  // Update store when flashcards are loaded (only if store is empty or different)
  useEffect(() => {
    if (
      gistFlashcards.length > 0 &&
      flashcards.length !== gistFlashcards.length
    ) {
      setFlashcards(gistFlashcards);
    }
    // Only depend on gistFlashcards.length to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gistFlashcards.length, setFlashcards]);

  // Load user progress on mount
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Prevent body scrolling to maintain mobile app feel
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Show onboarding for first-time users
  useEffect(() => {
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [hasSeenOnboarding]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (isLoading) {
    return (
      <div className="discover">
        <div className="discover-header">
          <h1>Flashcard Learning</h1>
        </div>
        <div className="loading-message">Loading flashcards...</div>
      </div>
    );
  }

  return (
    <div className="discover">
      <div className="discover-header">
        <h1>Flashcard Learning</h1>
        {(sortedFlashcards.length || flashcards.length) > 0 && (
          <div className="flashcard-stats">
            <span>
              {(sortedFlashcards.length || flashcards.length).toString()}{' '}
              flashcards
            </span>
          </div>
        )}
      </div>
      {error && gistFlashcards.length === 0 && (
        <div className="error-banner" aria-live="polite" aria-atomic="true">
          <p>Failed to load flashcards from GitHub Gist: {error}</p>
          <p>Showing the local Mandarin deck instead.</p>
          <button
            onClick={() => navigate('/settings')}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              backgroundColor: 'var(--primary-yellow)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Configure Gist in Settings
          </button>
        </div>
      )}
      <FlashcardDeck />
    </div>
  );
}
