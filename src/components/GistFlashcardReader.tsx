import { useState, useEffect, useCallback } from 'react';
import {
  GitHub,
  CheckCircle,
  AlertCircle,
  Loader,
  RefreshCw,
} from 'react-feather';
import { githubGistService } from '../lib/githubGist';
import { gistDebugLogger, formatGistError } from '../lib/gistDebug';
import { sanitizeString, validateFlashcard } from '../lib/validation';
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
    return { title: fallbackTitle, text: sanitizeString(face) };
  }

  return {
    title: face.title ? sanitizeString(face.title) : fallbackTitle,
    text: sanitizeString(face.text ?? ''),
    subText: face.subText ? sanitizeString(face.subText) : undefined,
    hint: face.hint ? sanitizeString(face.hint) : undefined,
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
      id: example.id ? sanitizeString(example.id) : undefined,
      label: example.label ? sanitizeString(example.label) : undefined,
      text: sanitizeString(example.text),
      translation: example.translation
        ? sanitizeString(example.translation)
        : undefined,
      note: example.note ? sanitizeString(example.note) : undefined,
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
  readonly gistId: string;
  readonly gistOwner?: string;
  readonly rawUrl?: string;
  readonly onFlashcardsLoaded?: (flashcards: Flashcard[]) => void;
  readonly onError?: (error: string) => void;
  readonly autoLoad?: boolean;
}

export function GistFlashcardReader({
  gistId,
  gistOwner,
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
    gistDebugLogger.log('init', 'GistFlashcardReader: Début du chargement', {
      gistId: gistId ? `${gistId.substring(0, 20)}...` : 'null',
      gistOwner: gistOwner ? `${gistOwner.substring(0, 20)}...` : 'undefined',
      hasRawUrl: !!rawUrl,
    });

    if (!gistId.trim()) {
      const errorMsg =
        'Aucun Gist ID fourni. Veuillez entrer un identifiant de Gist valide.';
      gistDebugLogger.error('validate_input', errorMsg, new Error(errorMsg), {
        component: 'GistFlashcardReader',
      });
      setLoadStatus({
        type: 'error',
        message: formatGistError('validate_input', errorMsg),
      });
      onError?.(formatGistError('validate_input', errorMsg));
      return;
    }

    setIsLoading(true);
    setLoadStatus({ type: 'idle', message: '' });

    try {
      gistDebugLogger.log(
        'fetch_api',
        'GistFlashcardReader: Appel à readFlashcards',
        {
          gistId: gistId.substring(0, 20),
          gistOwner,
          hasRawUrl: !!rawUrl,
        }
      );

      const result = await githubGistService.readFlashcards(gistId, rawUrl);

      if (result.success && result.flashcards) {
        gistDebugLogger.log(
          'convert_format',
          'GistFlashcardReader: Conversion des flashcards',
          {
            count: result.flashcards.length,
          }
        );

        // Convert and validate flashcards
        const convertedFlashcards = result.flashcards.map(
          convertGistFlashcardToAppFlashcard
        );
        // Validate all flashcards and filter out invalid ones
        const appFlashcards = convertedFlashcards
          .map(card => validateFlashcard(card))
          .filter((card): card is Flashcard => card !== null);

        if (appFlashcards.length !== convertedFlashcards.length) {
          gistDebugLogger.warn(
            'validate_flashcards',
            'Some flashcards were invalid and filtered out',
            {
              total: convertedFlashcards.length,
              valid: appFlashcards.length,
              invalid: convertedFlashcards.length - appFlashcards.length,
            }
          );
        }

        gistDebugLogger.success(
          'complete',
          'GistFlashcardReader: Flashcards chargées avec succès',
          {
            originalCount: result.flashcards.length,
            convertedCount: appFlashcards.length,
          }
        );

        setLoadStatus({
          type: 'success',
          message: `${appFlashcards.length} flashcards chargés avec succès!`,
          flashcardsCount: appFlashcards.length,
        });

        onFlashcardsLoaded?.(appFlashcards);
      } else {
        const errorMsg =
          result.error ||
          'Erreur lors du chargement des flashcards depuis le Gist';
        gistDebugLogger.error(
          'error',
          'GistFlashcardReader: Échec du chargement',
          new Error(errorMsg),
          {
            component: 'GistFlashcardReader',
            gistId: gistId.substring(0, 20),
            gistOwner,
          }
        );
        setLoadStatus({
          type: 'error',
          message: formatGistError('error', errorMsg, {
            gistId: gistId.substring(0, 20),
            owner: gistOwner,
          }),
        });
        onError?.(
          formatGistError('error', errorMsg, {
            gistId: gistId.substring(0, 20),
            owner: gistOwner,
          })
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors du chargement';
      gistDebugLogger.error(
        'error',
        'GistFlashcardReader: Exception non gérée',
        error,
        {
          component: 'GistFlashcardReader',
          gistId: gistId.substring(0, 20),
          gistOwner,
        }
      );
      const formattedError = formatGistError('error', errorMessage, {
        gistId: gistId.substring(0, 20),
        owner: gistOwner,
      });
      setLoadStatus({
        type: 'error',
        message: formattedError,
      });
      onError?.(formattedError);
    } finally {
      setIsLoading(false);
    }
  }, [gistId, gistOwner, rawUrl, onFlashcardsLoaded, onError]);

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
            href={
              gistOwner
                ? `https://gist.github.com/${gistOwner}/${gistId}`
                : `https://gist.github.com/${gistId}`
            }
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
