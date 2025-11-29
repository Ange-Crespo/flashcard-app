import { useState, useEffect, useCallback, useRef } from 'react';
import { githubGistService } from '../lib/githubGist';
import {
  DEFAULT_LOCAL_DECK_ID,
  getLocalDeckFlashcards,
} from '../lib/localDecks';
import { mockFlashcards } from '../lib/mockFlashcards';
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
  const [currentGistId, setCurrentGistId] = useState<string | undefined>(
    gistId
  );
  const [currentGistOwner, setCurrentGistOwner] = useState<string | undefined>(
    gistOwner
  );

  // Use refs to track loading state and prevent infinite loops
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef<string | null>(null);
  const hasLoadedFallbackRef = useRef(false);

  const loadFallbackFlashcards = useCallback(
    (message: string) => {
      // Prevent loading fallback multiple times for the same error
      if (hasLoadedFallbackRef.current) {
        return;
      }

      setError(message);
      onError?.(message);
      hasLoadedFallbackRef.current = true;

      const datasetFallback = getLocalDeckFlashcards(DEFAULT_LOCAL_DECK_ID, {
        limit: 500,
      });
      if (datasetFallback.length > 0) {
        setFlashcards(datasetFallback);
        console.log(
          '✅ Using Mandarin dataset flashcards:',
          datasetFallback.length
        );
        return;
      }

      setFlashcards(mockFlashcards);
      console.log(
        '✅ Using mock flashcards for testing:',
        mockFlashcards.length
      );
    },
    [onError]
  );

  const loadFlashcards = useCallback(async () => {
    const gistIdToLoad = currentGistId?.trim();

    if (!gistIdToLoad) {
      if (!hasLoadedFallbackRef.current) {
        loadFallbackFlashcards('Aucun Gist ID fourni');
      }
      return;
    }

    // Prevent duplicate loading - check both state and ref
    if (isLoadingRef.current || isLoading) {
      return;
    }

    // If we've already loaded this Gist ID, don't reload
    if (hasLoadedRef.current === gistIdToLoad) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    hasLoadedFallbackRef.current = false;

    try {
      const result = await githubGistService.readFlashcards(
        gistIdToLoad,
        rawUrl
      );

      if (result.success && result.flashcards && result.flashcards.length > 0) {
        const appFlashcards = result.flashcards.map(
          convertGistFlashcardToAppFlashcard
        );
        setFlashcards(appFlashcards);
        setError(null);
        hasLoadedRef.current = gistIdToLoad;
        console.log('✅ Loaded flashcards from Gist:', appFlashcards.length);
        return;
      }

      const errorMessage =
        result.error || 'Erreur lors du chargement des flashcards';
      console.warn(
        '⚠️ Failed to load flashcards from Gist, using local dataset instead:',
        errorMessage
      );
      if (!hasLoadedFallbackRef.current) {
        loadFallbackFlashcards(errorMessage);
      }
      hasLoadedRef.current = gistIdToLoad; // Mark as attempted to prevent retries
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur inconnue';
      console.warn(
        '⚠️ Error loading flashcards from Gist, using local dataset instead:',
        errorMessage
      );
      if (!hasLoadedFallbackRef.current) {
        loadFallbackFlashcards(errorMessage);
      }
      hasLoadedRef.current = gistIdToLoad; // Mark as attempted to prevent retries
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGistId, rawUrl, loadFallbackFlashcards]);

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
