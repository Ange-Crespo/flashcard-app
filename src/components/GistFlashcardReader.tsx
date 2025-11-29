import { useState, useEffect, useCallback } from 'react';
import {
  GitHub,
  CheckCircle,
  AlertCircle,
  Loader,
  RefreshCw,
} from 'react-feather';
import { githubGistService } from '../lib/githubGist';
import type { Flashcard, FlashcardFace, FlashcardExample } from '../store';
import type {
  GistFlashcard,
  GistFlashcardFace,
  GistFlashcardExample,
} from '../types/gist';
import { generateCardHashId } from '../utils/cardIdGenerator';
import './GistFlashcardReader.css';

/**
 * Convert GistFlashcard to app Flashcard format
 */
function normalizeFace(
  face: GistFlashcardFace | undefined,
  fallbackTitle: string
): FlashcardFace {
  if (!face) {
    return { title: fallbackTitle, text: '' };
  }

  if (typeof face === 'string') {
    return { title: fallbackTitle, text: face };
  }

  return {
    title: face.title ?? fallbackTitle,
    text: face.text ?? '',
    subText: face.subText,
    hint: face.hint,
  };
}

function normalizeExamples(
  examples: GistFlashcardExample[] | undefined
): FlashcardExample[] | undefined {
  if (!examples || examples.length === 0) {
    return undefined;
  }

  return examples
    .filter(example => Boolean(example?.text))
    .map(example => ({
      id: example.id,
      label: example.label,
      text: example.text,
      translation: example.translation,
      note: example.note,
    }));
}

function convertGistFlashcardToAppFlashcard(
  gistFlashcard: GistFlashcard
): Flashcard {
  const front = normalizeFace(gistFlashcard.front, 'Front');
  const back = normalizeFace(gistFlashcard.back, 'Back');

  // Build the card first
  const card: Flashcard = {
    id: '', // Will be set after card is built
    deckId: gistFlashcard.deckId,
    language: gistFlashcard.language,
    category: gistFlashcard.category,
    difficulty: gistFlashcard.difficulty,
    tags: gistFlashcard.tags,
    front,
    back,
    metadata: gistFlashcard.metadata,
    examples: normalizeExamples(gistFlashcard.examples),
    extras: gistFlashcard.extras,
  };

  // Generate hash-based ID from the card content
  card.id = generateCardHashId(card);

  return card;
}

interface GistFlashcardReaderProps {
  gistId: string;
  rawUrl?: string;
  onFlashcardsLoaded?: (flashcards: Flashcard[]) => void;
  onError?: (error: string) => void;
  autoLoad?: boolean;
}

export function GistFlashcardReader({
  gistId,
  rawUrl,
  onFlashcardsLoaded,
  onError,
  autoLoad = true,
}: GistFlashcardReaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
    flashcardsCount?: number;
  }>({ type: 'idle', message: '' });

  const loadFlashcards = useCallback(async () => {
    if (!gistId.trim()) {
      setLoadStatus({
        type: 'error',
        message: 'Aucun Gist ID fourni',
      });
      return;
    }

    setIsLoading(true);
    setLoadStatus({ type: 'idle', message: '' });

    try {
      const result = await githubGistService.readFlashcards(gistId, rawUrl);

      if (result.success && result.flashcards) {
        const appFlashcards = result.flashcards.map(
          convertGistFlashcardToAppFlashcard
        );
        setLoadStatus({
          type: 'success',
          message: `${appFlashcards.length} flashcards chargés avec succès!`,
          flashcardsCount: appFlashcards.length,
        });

        onFlashcardsLoaded?.(appFlashcards);
      } else {
        setLoadStatus({
          type: 'error',
          message: result.error || 'Erreur lors du chargement',
        });
        onError?.(result.error || 'Erreur lors du chargement');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      setLoadStatus({
        type: 'error',
        message: errorMessage,
      });
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [gistId, rawUrl, onFlashcardsLoaded, onError]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && gistId) {
      loadFlashcards();
    }
  }, [gistId, autoLoad, loadFlashcards]);

  return (
    <div className="gist-flashcard-reader">
      <div className="gist-reader-header">
        <GitHub className="gist-icon" size={20} />
        <h4>Charger des Flashcards depuis GitHub Gist</h4>
      </div>

      <div className="gist-reader-content">
        <div className="gist-gist-info">
          <span className="gist-gist-id">
            <strong>Gist ID:</strong> {gistId}
          </span>
          <a
            href={`https://gist.github.com/${gistId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="gist-view-link"
          >
            <GitHub size={14} />
            Voir le Gist
          </a>
        </div>

        {loadStatus.type !== 'idle' && (
          <div className={`gist-status gist-status--${loadStatus.type}`}>
            {isLoading && <Loader className="gist-status-icon" size={14} />}
            {loadStatus.type === 'success' && (
              <CheckCircle className="gist-status-icon" size={14} />
            )}
            {loadStatus.type === 'error' && (
              <AlertCircle className="gist-status-icon" size={14} />
            )}
            <span>{loadStatus.message}</span>
            {loadStatus.flashcardsCount && (
              <span className="gist-count">
                ({loadStatus.flashcardsCount} flashcards)
              </span>
            )}
          </div>
        )}

        <div className="gist-actions">
          <button
            onClick={loadFlashcards}
            disabled={isLoading || !gistId.trim()}
            className="gist-load-button"
          >
            {isLoading ? (
              <>
                <Loader size={14} />
                Chargement...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Recharger les Flashcards
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
