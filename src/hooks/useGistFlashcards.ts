import { useState, useEffect, useCallback, useRef } from 'react';
import { githubGistService } from '../lib/githubGist';
import {
  DEFAULT_LOCAL_DECK_ID,
  getLocalDeckFlashcards,
} from '../lib/localDecks';
import { mockFlashcards } from '../lib/mockFlashcards';
import { gistDebugLogger, formatGistError } from '../lib/gistDebug';
import { logger } from '../lib/logger';
import { sanitizeString, validateFlashcard } from '../lib/validation';
import type {
  GistFlashcard,
  GistFlashcardFace,
  GistFlashcardExample,
} from '../types/gist';
import type { Flashcard, FlashcardFace, FlashcardExample } from '../store';
import { generateCardHashId } from '../utils/cardIdGenerator';

interface UseGistFlashcardsOptions {
  gistId?: string;
  gistOwner?: string;
  rawUrl?: string;
  autoLoad?: boolean;
  onError?: (error: string) => void;
}

interface UseGistFlashcardsReturn {
  flashcards: Flashcard[];
  isLoading: boolean;
  error: string | null;
  loadFlashcards: () => Promise<void>;
  refreshFlashcards: () => Promise<void>;
  setGistId: (gistId: string, owner?: string) => void;
}

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

/**
 * Custom hook for fetching flashcards from GitHub Gist
 * Manages loading states, error handling, and data fetching
 */
export function useGistFlashcards({
  gistId,
  gistOwner,
  rawUrl,
  autoLoad = true,
  onError,
}: UseGistFlashcardsOptions = {}): UseGistFlashcardsReturn {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract Gist ID and owner from rawUrl if provided (to fix wrong IDs in stored selection)
  let effectiveGistId = gistId;
  let effectiveGistOwner = gistOwner;

  if (rawUrl) {
    try {
      const urlMatch = rawUrl.match(
        /gist\.githubusercontent\.com\/([^/]+)\/([a-f0-9]+)\/raw\//
      );
      if (urlMatch) {
        effectiveGistOwner = urlMatch[1];
        effectiveGistId = urlMatch[2];
        logger.debug('Extracted Gist info from rawUrl', {
          owner: effectiveGistOwner,
          id: effectiveGistId,
        });
      }
    } catch (error) {
      logger.warn('Could not extract Gist ID from rawUrl', { error });
    }
  }

  const [currentGistId, setCurrentGistId] = useState<string | undefined>(
    effectiveGistId
  );
  const [currentGistOwner, setCurrentGistOwner] = useState<string | undefined>(
    effectiveGistOwner
  );

  // Use refs to track loading state and prevent infinite loops
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef<string | null>(null);
  const hasLoadedFallbackRef = useRef(false);

  const loadFallbackFlashcards = useCallback(
    (message: string) => {
      // Prevent loading fallback multiple times for the same error
      if (hasLoadedFallbackRef.current) {
        gistDebugLogger.warn(
          'init',
          'Tentative de chargement du fallback déjà effectuée, ignorée'
        );
        return;
      }

      gistDebugLogger.log('init', 'Chargement des flashcards de fallback', {
        errorMessage: message,
      });

      setError(message);
      onError?.(message);
      hasLoadedFallbackRef.current = true;

      const datasetFallback = getLocalDeckFlashcards(DEFAULT_LOCAL_DECK_ID, {
        limit: 500,
      });
      if (datasetFallback.length > 0) {
        setFlashcards(datasetFallback);
        gistDebugLogger.success(
          'init',
          'Flashcards de fallback chargées (dataset local)',
          {
            flashcardsCount: datasetFallback.length,
            source: 'local_dataset',
          }
        );
        logger.success('Using Mandarin dataset flashcards', {
          count: datasetFallback.length,
        });
        return;
      }

      setFlashcards(mockFlashcards);
      gistDebugLogger.success(
        'init',
        'Flashcards de fallback chargées (mock)',
        {
          flashcardsCount: mockFlashcards.length,
          source: 'mock',
        }
      );
      logger.success('Using mock flashcards for testing', {
        count: mockFlashcards.length,
      });
    },
    [onError]
  );

  const loadFlashcards = useCallback(async () => {
    const gistIdToLoad = currentGistId?.trim();

    gistDebugLogger.log('init', 'useGistFlashcards: Début du chargement', {
      gistId: gistIdToLoad ? `${gistIdToLoad.substring(0, 20)}...` : 'null',
      gistOwner: currentGistOwner
        ? `${currentGistOwner.substring(0, 20)}...`
        : 'undefined',
      hasRawUrl: !!rawUrl,
      alreadyLoaded: hasLoadedRef.current === gistIdToLoad,
      isLoading: isLoadingRef.current || isLoading,
    });

    if (!gistIdToLoad) {
      const errorMsg =
        'Aucun Gist ID fourni. Veuillez configurer un Gist dans les paramètres.';
      gistDebugLogger.error('validate_input', errorMsg, new Error(errorMsg), {
        hook: 'useGistFlashcards',
      });
      if (!hasLoadedFallbackRef.current) {
        loadFallbackFlashcards(formatGistError('validate_input', errorMsg));
      }
      return;
    }

    // Prevent duplicate loading - check both state and ref
    if (isLoadingRef.current || isLoading) {
      gistDebugLogger.warn(
        'init',
        'useGistFlashcards: Chargement déjà en cours, ignoré'
      );
      return;
    }

    // If we've already loaded this Gist ID, don't reload
    if (hasLoadedRef.current === gistIdToLoad) {
      gistDebugLogger.log(
        'init',
        'useGistFlashcards: Gist déjà chargé, ignoré',
        {
          gistId: gistIdToLoad.substring(0, 20),
        }
      );
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    hasLoadedFallbackRef.current = false;

    try {
      gistDebugLogger.log(
        'fetch_api',
        'useGistFlashcards: Appel à readFlashcards',
        {
          gistId: gistIdToLoad.substring(0, 20),
          gistOwner: currentGistOwner,
          hasRawUrl: !!rawUrl,
        }
      );

      const result = await githubGistService.readFlashcards(
        gistIdToLoad,
        rawUrl
      );

      if (result.success && result.flashcards && result.flashcards.length > 0) {
        gistDebugLogger.log(
          'convert_format',
          'useGistFlashcards: Conversion des flashcards',
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
          logger.warn('Some flashcards were invalid and filtered out', {
            total: convertedFlashcards.length,
            valid: appFlashcards.length,
            invalid: convertedFlashcards.length - appFlashcards.length,
          });
        }

        gistDebugLogger.success(
          'complete',
          'useGistFlashcards: Flashcards chargées avec succès',
          {
            originalCount: result.flashcards.length,
            convertedCount: appFlashcards.length,
            gistId: gistIdToLoad.substring(0, 20),
          }
        );

        setFlashcards(appFlashcards);
        setError(null);
        hasLoadedRef.current = gistIdToLoad;
        logger.success('Loaded flashcards from Gist', {
          count: appFlashcards.length,
        });
        return;
      }

      const errorMessage =
        result.error ||
        'Erreur lors du chargement des flashcards depuis le Gist';
      gistDebugLogger.error(
        'error',
        'useGistFlashcards: Échec du chargement',
        new Error(errorMessage),
        {
          hook: 'useGistFlashcards',
          gistId: gistIdToLoad.substring(0, 20),
          gistOwner: currentGistOwner,
        }
      );
      const formattedError = formatGistError('error', errorMessage, {
        gistId: gistIdToLoad.substring(0, 20),
        owner: currentGistOwner,
      });
      logger.warn(
        'Failed to load flashcards from Gist, using local dataset instead',
        {
          error: formattedError,
        }
      );
      if (!hasLoadedFallbackRef.current) {
        loadFallbackFlashcards(formattedError);
      }
      hasLoadedRef.current = gistIdToLoad; // Mark as attempted to prevent retries
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Erreur inconnue lors du chargement';
      gistDebugLogger.error(
        'error',
        'useGistFlashcards: Exception non gérée',
        err,
        {
          hook: 'useGistFlashcards',
          gistId: gistIdToLoad.substring(0, 20),
          gistOwner: currentGistOwner,
        }
      );
      const formattedError = formatGistError('error', errorMessage, {
        gistId: gistIdToLoad.substring(0, 20),
        owner: currentGistOwner,
      });
      logger.warn(
        'Error loading flashcards from Gist, using local dataset instead',
        {
          error: formattedError,
        }
      );
      if (!hasLoadedFallbackRef.current) {
        loadFallbackFlashcards(formattedError);
      }
      hasLoadedRef.current = gistIdToLoad; // Mark as attempted to prevent retries
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [
    currentGistId,
    currentGistOwner,
    rawUrl,
    loadFallbackFlashcards,
    isLoading,
  ]);

  const refreshFlashcards = useCallback(async () => {
    await loadFlashcards();
  }, [loadFlashcards]);

  const handleSetGistId = useCallback(
    (newGistId: string, owner?: string) => {
      setCurrentGistId(newGistId);
      setCurrentGistOwner(prev => owner ?? prev);
      const resolvedOwner = owner ?? currentGistOwner;
      githubGistService.setGistId(newGistId, resolvedOwner);
    },
    [currentGistOwner]
  );

  // Reset refs and clear error when Gist ID changes
  useEffect(() => {
    const gistIdToLoad = currentGistId?.trim();
    if (gistIdToLoad && hasLoadedRef.current !== gistIdToLoad) {
      hasLoadedRef.current = null;
      hasLoadedFallbackRef.current = false;
      setError(null); // Clear error when Gist ID changes
    }
  }, [currentGistId]);

  // Auto-load on mount or when gistId changes
  useEffect(() => {
    const gistIdToLoad = currentGistId?.trim();
    if (
      autoLoad &&
      gistIdToLoad &&
      !isLoadingRef.current &&
      hasLoadedRef.current !== gistIdToLoad
    ) {
      loadFlashcards();
    }
    // Only depend on currentGistId to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, currentGistId]);

  // Update gistId when prop changes
  useEffect(() => {
    if (gistId && gistId !== currentGistId) {
      handleSetGistId(gistId, gistOwner);
    }
  }, [gistId, gistOwner, currentGistId, handleSetGistId]);

  useEffect(() => {
    if (gistOwner && gistOwner !== currentGistOwner && currentGistId) {
      setCurrentGistOwner(gistOwner);
      githubGistService.setGistId(currentGistId, gistOwner);
    }
  }, [gistOwner, currentGistOwner, currentGistId]);

  useEffect(() => {
    if (currentGistId) {
      githubGistService.setGistId(currentGistId, currentGistOwner);
    }
  }, [currentGistId, currentGistOwner]);

  return {
    flashcards,
    isLoading,
    error,
    loadFlashcards,
    refreshFlashcards,
    setGistId: handleSetGistId,
  };
}
