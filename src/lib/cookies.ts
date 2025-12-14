/**
 * Storage management utility for tracking user progress on flashcards.
 * User data is persisted via localStorage when available, with an
 * in-memory fallback for non-browser/test environments.
 */
import { evaluateFsrsReview, Grade } from './fsrs';
import { logger } from './logger';

/**
 * User progress data for a single flashcard
 */
export interface FsrsReviewLogEntry {
  timestamp: number;
  grade: Grade;
  interval: number;
  stability: number;
  difficulty: number;
  retrievability: number;
  due: number;
}

export interface FlashcardProgress {
  /** Whether the user knows this flashcard */
  known: boolean;
  /** Timestamp of last interaction */
  lastSeen: number;
  /** Number of attempts */
  attempts: number;
  /** Number of successful attempts */
  successes: number;
  /** Number of failed attempts */
  failures: number;
  /** Next review date (for spaced repetition algorithm) */
  nextReview?: number;
  /** Ease factor (for spaced repetition algorithm) */
  easeFactor?: number;
  /** Interval in days (for spaced repetition algorithm) */
  interval?: number;
  /** FSRS stability in days */
  stability?: number;
  /** FSRS difficulty */
  difficulty?: number;
  /** Timestamp for when the card is due */
  due?: number;
  /** Timestamp of the last review */
  lastReview?: number;
  /** Total number of reviews performed */
  reviewCount?: number;
  /** History of FSRS reviews */
  history?: FsrsReviewLogEntry[];
}

/**
 * User progress data for all flashcards
 */
export interface UserProgress {
  [flashcardId: string]: FlashcardProgress;
}

const STORAGE_KEY = 'flashcard_progress';

const memoryStore = new Map<string, string>();
let cachedStorage: Storage | null | undefined;

function getLocalStorageRef(): Storage | null {
  if (
    typeof globalThis === 'undefined' ||
    !('localStorage' in globalThis) ||
    !globalThis.localStorage
  ) {
    return null;
  }
  return globalThis.localStorage;
}

function resolveStorage(): Storage | null {
  if (cachedStorage !== undefined) {
    return cachedStorage;
  }

  const localStorageRef = getLocalStorageRef();
  if (!localStorageRef) {
    cachedStorage = null;
    return cachedStorage;
  }

  try {
    const testKey = '__flashcard_storage_test__';
    localStorageRef.setItem(testKey, testKey);
    const persistedValue = localStorageRef.getItem(testKey);
    localStorageRef.removeItem(testKey);
    if (persistedValue !== testKey) {
      throw new Error(
        'localStorage is unavailable or mocked without persistence.'
      );
    }
    cachedStorage = localStorageRef;
  } catch {
    cachedStorage = null;
  }

  return cachedStorage;
}

function setStorageValue(name: string, value: string) {
  const storage = resolveStorage();
  if (storage) {
    try {
      storage.setItem(name, value);
      return;
    } catch (error) {
      logger.error('Error writing to localStorage', error);
    }
  }
  memoryStore.set(name, value);
}

function getStorageValue(name: string): string | null {
  const storage = resolveStorage();
  if (storage) {
    try {
      return storage.getItem(name);
    } catch (error) {
      logger.error('Error reading from localStorage', error);
    }
  }
  return memoryStore.get(name) ?? null;
}

function deleteStorageValue(name: string) {
  const storage = resolveStorage();
  if (storage) {
    try {
      storage.removeItem(name);
    } catch (error) {
      logger.error('Error removing from localStorage', error);
    }
  }
  memoryStore.delete(name);
}

export function listStoredKeys(prefix?: string): string[] {
  const storage = resolveStorage();
  const keys: string[] = [];

  if (storage) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key) {
        keys.push(key);
      }
    }
  } else {
    keys.push(...memoryStore.keys());
  }

  return prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
}

/**
 * Expose helpers for other modules (legacy naming retained)
 */
export function setCookieValue(name: string, value: string) {
  setStorageValue(name, value);
}

export function getCookieValue(name: string): string | null {
  return getStorageValue(name);
}

export function deleteCookieValue(name: string) {
  deleteStorageValue(name);
}

/**
 * Load user progress from cookies
 */
export function loadUserProgress(): UserProgress {
  try {
    const storedValue = getStorageValue(STORAGE_KEY);
    if (!storedValue) {
      return {};
    }
    try {
      return JSON.parse(storedValue) as UserProgress;
    } catch {
      // Attempt to parse legacy URI-encoded payloads
      return JSON.parse(decodeURIComponent(storedValue)) as UserProgress;
    }
  } catch (error) {
    logger.error('Error loading user progress from storage', error);
    return {};
  }
}

/**
 * Save user progress to cookies
 */
export function saveUserProgress(progress: UserProgress): void {
  try {
    const serialized = JSON.stringify(progress);
    setStorageValue(STORAGE_KEY, serialized);
  } catch (error) {
    logger.error('Error saving user progress to storage', error);
  }
}

/**
 * Update progress for a specific flashcard
 */
export function updateFlashcardProgress(
  flashcardId: string,
  known: boolean,
  progress?: Partial<FlashcardProgress>,
  gradeOverride?: Grade
): void {
  const currentProgress = loadUserProgress();
  const existing = currentProgress[flashcardId] || {
    known: false,
    lastSeen: 0,
    attempts: 0,
    successes: 0,
    failures: 0,
    reviewCount: 0,
  };
  const now = Date.now();
  const grade = gradeOverride ?? (known ? Grade.GOOD : Grade.FORGOT);
  const fsrsState = evaluateFsrsReview(existing, grade, now);

  const updated: FlashcardProgress = {
    ...existing,
    ...progress,
    known,
    lastSeen: now,
    attempts: existing.attempts + 1,
    successes: known ? existing.successes + 1 : existing.successes,
    failures: known ? existing.failures : existing.failures + 1,
    stability: fsrsState.stability,
    difficulty: fsrsState.difficulty,
    interval: fsrsState.interval,
    due: fsrsState.due,
    lastReview: fsrsState.lastReview,
    reviewCount: fsrsState.reviewCount,
    history: [
      ...(existing.history ?? []),
      {
        timestamp: now,
        grade,
        interval: fsrsState.interval,
        stability: fsrsState.stability ?? 0,
        difficulty: fsrsState.difficulty ?? 0,
        retrievability: fsrsState.retrievability,
        due: fsrsState.due,
      },
    ],
  };

  currentProgress[flashcardId] = updated;
  saveUserProgress(currentProgress);

  // Debug: Log when progress is saved with hash-based ID
  if (flashcardId.includes('-') && flashcardId.length > 20) {
    logger.debug('Saved progress with hash-based ID', {
      idPrefix: flashcardId.substring(0, 30) + '...',
    });
  }
}

/**
 * Get progress for a specific flashcard
 */
export function getFlashcardProgress(
  flashcardId: string
): FlashcardProgress | null {
  const progress = loadUserProgress();
  return progress[flashcardId] || null;
}

/**
 * Get all known flashcard IDs
 */
export function getKnownFlashcardIds(): Set<string> {
  const progress = loadUserProgress();
  const knownIds = new Set<string>();
  for (const [id, data] of Object.entries(progress)) {
    if (data.known) {
      knownIds.add(id);
    }
  }
  return knownIds;
}

/**
 * Get all unknown flashcard IDs
 */
export function getUnknownFlashcardIds(): Set<string> {
  const progress = loadUserProgress();
  const unknownIds = new Set<string>();
  for (const [id, data] of Object.entries(progress)) {
    if (!data.known) {
      unknownIds.add(id);
    }
  }
  return unknownIds;
}

/**
 * Clear all user progress
 */
export function clearUserProgress(): void {
  deleteStorageValue(STORAGE_KEY);
}

/**
 * Get statistics about user progress
 */
export function getProgressStats(): {
  total: number;
  known: number;
  unknown: number;
  attempts: number;
  successRate: number;
} {
  const progress = loadUserProgress();
  const entries = Object.values(progress);
  const total = entries.length;
  const known = entries.filter(p => p.known).length;
  const unknown = total - known;
  const attempts = entries.reduce((sum, p) => sum + p.attempts, 0);
  const totalSuccesses = entries.reduce((sum, p) => sum + p.successes, 0);
  const successRate = attempts > 0 ? (totalSuccesses / attempts) * 100 : 0;

  return {
    total,
    known,
    unknown,
    attempts,
    successRate,
  };
}
