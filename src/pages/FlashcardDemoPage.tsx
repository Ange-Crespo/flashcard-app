import { useState } from 'react';
import { GistFlashcardWriter } from '../components/GistFlashcardWriter';
import { GistFlashcardReader } from '../components/GistFlashcardReader';
import { useGistFlashcards } from '../hooks/useGistFlashcards';
import { FlashcardDeck } from '../components/FlashcardDeck';
import type { Flashcard } from '../store';
import './FlashcardDemoPage.css';

export function FlashcardDemoPage() {
  const [gistId, setGistId] = useState('');
  const [gistOwner, setGistOwner] = useState<string | undefined>(undefined);
  const [showReader, setShowReader] = useState(false);

  const { flashcards, error } = useGistFlashcards({
    gistId: showReader ? gistId : undefined,
    autoLoad: false,
  });

  const handleUploadSuccess = (gistUrl: string) => {
    // Extract Gist ID and owner from URL
    // Format: https://gist.github.com/owner/id
    try {
      const url = new URL(gistUrl);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        setGistOwner(segments[0]);
        setGistId(segments[1]);
      } else if (segments.length === 1) {
        setGistId(segments[0]);
        setGistOwner(undefined);
      } else {
        // Fallback: try to extract from the end of the URL
        const id = gistUrl.split('/').pop();
        if (id) {
          setGistId(id);
        }
      }
      setShowReader(true);
    } catch {
      // If URL parsing fails, try simple extraction
      const id = gistUrl.split('/').pop();
      if (id) {
        setGistId(id);
      }
      setShowReader(true);
    }
  };

  const handleFlashcardsLoaded = (loadedFlashcards: Flashcard[]) => {
    console.log('Flashcards chargés:', loadedFlashcards);
  };

  const handleError = (error: string) => {
    console.error('Erreur:', error);
  };

  return (
    <div className="flashcard-demo-page">
      <div className="flashcard-demo-header">
        <h1>GitHub Gist - Gestion des Flashcards</h1>
        <p>Créez des flashcards et chargez-les depuis GitHub Gist</p>
      </div>

      <div className="flashcard-demo-content">
        <section className="flashcard-demo-section">
          <h2>1. Créer et Uploader des Flashcards</h2>
          <GistFlashcardWriter
            onSuccess={handleUploadSuccess}
            onError={handleError}
          />
        </section>

        {gistId && (
          <section className="flashcard-demo-section">
            <h2>2. Charger des Flashcards depuis Gist</h2>
            <GistFlashcardReader
              gistId={gistId}
              gistOwner={gistOwner}
              onFlashcardsLoaded={handleFlashcardsLoaded}
              onError={handleError}
              autoLoad={false}
            />
          </section>
        )}

        {flashcards.length > 0 && (
          <section className="flashcard-demo-section">
            <h2>3. Aperçu des Flashcards Chargées</h2>
            <div className="flashcard-demo-preview">
              <p className="flashcard-demo-stats">
                {flashcards.length} flashcards chargées depuis le Gist
              </p>

              <div className="flashcard-demo-cards">
                <FlashcardDeck />
              </div>
            </div>
          </section>
        )}

        {error && (
          <section className="flashcard-demo-section">
            <div className="flashcard-demo-error">
              <h3>Erreur</h3>
              <p>{error}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
