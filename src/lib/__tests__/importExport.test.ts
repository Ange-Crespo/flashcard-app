import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import {
  loadUserProgress,
  saveUserProgress,
  clearUserProgress,
  type UserProgress,
  type FlashcardProgress,
} from '../cookies';
import { buildExportPayload } from '../exportPayload';
import {
  importUserData,
  parseImportPayload,
  type ImportPayload,
} from '../importPayload';
import {
  saveDeckFieldMapping,
  loadAllDeckFieldMappings,
  clearDeckFieldMapping,
} from '../deckFieldMapping';
import type { DeckFieldMapping } from '../../types/fieldMapping';

const localStorageMock = globalThis.window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  length: number;
  key: ReturnType<typeof vi.fn>;
};

const storageSnapshot = new Map<string, string>();

beforeEach(() => {
  storageSnapshot.clear();
  localStorageMock.getItem.mockImplementation((key: string) =>
    storageSnapshot.has(key) ? storageSnapshot.get(key)! : null
  );
  localStorageMock.setItem.mockImplementation((key: string, value: string) => {
    storageSnapshot.set(key, value);
    return null;
  });
  localStorageMock.removeItem.mockImplementation((key: string) => {
    storageSnapshot.delete(key);
    return null;
  });
  localStorageMock.clear.mockImplementation(() => {
    storageSnapshot.clear();
    return null;
  });
  // Mock length property
  Object.defineProperty(localStorageMock, 'length', {
    get: () => storageSnapshot.size,
    configurable: true,
  });
  // Mock key() method
  localStorageMock.key.mockImplementation((index: number) => {
    const keys = Array.from(storageSnapshot.keys());
    return keys[index] || null;
  });
  clearUserProgress();
  // Clear all mappings
  const mappings = loadAllDeckFieldMappings();
  Object.keys(mappings).forEach(deckId => clearDeckFieldMapping(deckId));
});

afterAll(() => {
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
  localStorageMock.key.mockReset();
});

/**
 * Compare two progress objects, ignoring timestamp fields
 */
function compareProgressIgnoringTimestamps(
  original: UserProgress,
  imported: UserProgress
): { match: boolean; differences: string[] } {
  const differences: string[] = [];
  const originalKeys = new Set(Object.keys(original));
  const importedKeys = new Set(Object.keys(imported));

  // Check for missing or extra keys
  for (const key of originalKeys) {
    if (!importedKeys.has(key)) {
      differences.push(`Missing key in imported: ${key}`);
    }
  }
  for (const key of importedKeys) {
    if (!originalKeys.has(key)) {
      differences.push(`Extra key in imported: ${key}`);
    }
  }

  // Compare each card's progress (excluding timestamp fields)
  for (const key of originalKeys) {
    if (!importedKeys.has(key)) continue;

    const orig = original[key];
    const imp = imported[key];

    // Compare non-timestamp fields
    const fieldsToCompare: Array<keyof FlashcardProgress> = [
      'known',
      'attempts',
      'successes',
      'failures',
      'reviewCount',
      'stability',
      'difficulty',
      'interval',
      'due',
    ];

    for (const field of fieldsToCompare) {
      if (orig[field] !== imp[field]) {
        differences.push(
          `Card ${key}: ${field} differs - original: ${orig[field]}, imported: ${imp[field]}`
        );
      }
    }

    // Compare history length (but not individual timestamps)
    if (orig.history?.length !== imp.history?.length) {
      differences.push(
        `Card ${key}: history length differs - original: ${orig.history?.length}, imported: ${imp.history?.length}`
      );
    }

    // Compare history entries (excluding timestamp)
    if (orig.history && imp.history) {
      const minLength = Math.min(orig.history.length, imp.history.length);
      for (let i = 0; i < minLength; i++) {
        const origEntry = orig.history[i];
        const impEntry = imp.history[i];
        if (
          origEntry.grade !== impEntry.grade ||
          origEntry.interval !== impEntry.interval ||
          origEntry.stability !== impEntry.stability ||
          origEntry.difficulty !== impEntry.difficulty
        ) {
          differences.push(
            `Card ${key}: history[${i}] differs (excluding timestamp)`
          );
        }
      }
    }
  }

  return {
    match: differences.length === 0,
    differences,
  };
}

describe('Export/Import Data Integrity', () => {
  const createSampleProgress = (): UserProgress => {
    const now = Date.now();
    return {
      'card-1': {
        known: true,
        lastSeen: now - 1000,
        attempts: 3,
        successes: 3,
        failures: 0,
        reviewCount: 3,
        stability: 10.5,
        difficulty: 2.5,
        interval: 11,
        due: now + 86400000,
        lastReview: now - 1000,
        history: [
          {
            timestamp: now - 5000,
            grade: 3,
            interval: 1,
            stability: 1.5,
            difficulty: 2.7,
            retrievability: 0.9,
            due: now + 86400000,
          },
          {
            timestamp: now - 3000,
            grade: 3,
            interval: 5,
            stability: 4.5,
            difficulty: 2.5,
            retrievability: 0.99,
            due: now + 432000000,
          },
          {
            timestamp: now - 1000,
            grade: 3,
            interval: 11,
            stability: 10.5,
            difficulty: 2.5,
            retrievability: 0.999,
            due: now + 950400000,
          },
        ],
      },
      'card-2': {
        known: false,
        lastSeen: now - 500,
        attempts: 1,
        successes: 0,
        failures: 1,
        reviewCount: 1,
        stability: 0.3,
        difficulty: 3.2,
        interval: 1,
        due: now + 86400000,
        lastReview: now - 500,
        history: [
          {
            timestamp: now - 500,
            grade: 1,
            interval: 1,
            stability: 0.3,
            difficulty: 3.2,
            retrievability: 0.9,
            due: now + 86400000,
          },
        ],
      },
      'mandarin-core-abc123': {
        known: true,
        lastSeen: now - 2000,
        attempts: 2,
        successes: 2,
        failures: 0,
        reviewCount: 2,
        stability: 5.2,
        difficulty: 2.6,
        interval: 6,
        due: now + 518400000,
        lastReview: now - 2000,
        history: [
          {
            timestamp: now - 4000,
            grade: 3,
            interval: 1,
            stability: 1.5,
            difficulty: 2.7,
            retrievability: 0.9,
            due: now + 86400000,
          },
          {
            timestamp: now - 2000,
            grade: 3,
            interval: 6,
            stability: 5.2,
            difficulty: 2.6,
            retrievability: 0.99,
            due: now + 518400000,
          },
        ],
      },
    };
  };

  const createSampleMappings = (): Record<string, DeckFieldMapping> => {
    return {
      'deck-1': {
        deckId: 'deck-1',
        front: {
          textField: 'word',
          subTextField: 'romanization',
        },
        back: {
          textField: 'english_translation',
        },
        examples: [],
        tagsEnabled: true,
        tagFields: ['pos', 'cefr_level'],
      },
      'deck-2': {
        deckId: 'deck-2',
        front: {
          textField: 'question',
        },
        back: {
          textField: 'answer',
        },
        examples: [],
      },
    };
  };

  it('should export and import progress data with identical content (excluding timestamps)', () => {
    // Setup: Create sample progress
    const originalProgress = createSampleProgress();
    saveUserProgress(originalProgress);

    // Export
    const exportPayload = buildExportPayload(originalProgress, {});

    // Verify export structure
    expect(exportPayload).toHaveProperty('exportedAt');
    expect(exportPayload).toHaveProperty('version', '1.0');
    expect(exportPayload).toHaveProperty('progress');
    expect(exportPayload).toHaveProperty('mappings');

    // Clear storage to simulate fresh import
    clearUserProgress();

    // Import (replace mode)
    const importResult = importUserData(exportPayload, false);

    expect(importResult.success).toBe(true);
    expect(importResult.progressCount).toBe(
      Object.keys(originalProgress).length
    );

    // Load imported progress
    const importedProgress = loadUserProgress();

    // Compare (ignoring timestamps)
    const comparison = compareProgressIgnoringTimestamps(
      originalProgress,
      importedProgress
    );

    expect(comparison.match).toBe(true);
    if (comparison.differences.length > 0) {
      console.error('Differences found:', comparison.differences);
    }
  });

  it('should export and import mappings data with identical content', () => {
    // Setup: Create sample mappings
    const originalMappings = createSampleMappings();
    for (const mapping of Object.values(originalMappings)) {
      saveDeckFieldMapping(mapping);
    }

    // Export
    const exportPayload = buildExportPayload({}, originalMappings);

    // Clear mappings
    Object.keys(originalMappings).forEach(deckId =>
      clearDeckFieldMapping(deckId)
    );

    // Import (replace mode)
    const importResult = importUserData(exportPayload, false);

    expect(importResult.success).toBe(true);
    expect(importResult.mappingsCount).toBe(
      Object.keys(originalMappings).length
    );

    // Load imported mappings
    const importedMappings = loadAllDeckFieldMappings();

    // Compare
    expect(Object.keys(importedMappings).length).toBe(
      Object.keys(originalMappings).length
    );
    for (const [deckId, originalMapping] of Object.entries(originalMappings)) {
      expect(importedMappings[deckId]).toEqual(originalMapping);
    }
  });

  it('should export and import both progress and mappings together', () => {
    // Setup: Create both progress and mappings
    const originalProgress = createSampleProgress();
    const originalMappings = createSampleMappings();
    saveUserProgress(originalProgress);
    for (const mapping of Object.values(originalMappings)) {
      saveDeckFieldMapping(mapping);
    }

    // Export
    const exportPayload = buildExportPayload(
      originalProgress,
      originalMappings
    );

    // Clear everything
    clearUserProgress();
    Object.keys(originalMappings).forEach(deckId =>
      clearDeckFieldMapping(deckId)
    );

    // Import (replace mode)
    const importResult = importUserData(exportPayload, false);

    expect(importResult.success).toBe(true);
    expect(importResult.progressCount).toBe(
      Object.keys(originalProgress).length
    );
    expect(importResult.mappingsCount).toBe(
      Object.keys(originalMappings).length
    );

    // Verify progress
    const importedProgress = loadUserProgress();
    const progressComparison = compareProgressIgnoringTimestamps(
      originalProgress,
      importedProgress
    );
    expect(progressComparison.match).toBe(true);

    // Verify mappings
    const importedMappings = loadAllDeckFieldMappings();
    expect(Object.keys(importedMappings).length).toBe(
      Object.keys(originalMappings).length
    );
    for (const [deckId, originalMapping] of Object.entries(originalMappings)) {
      expect(importedMappings[deckId]).toEqual(originalMapping);
    }
  });

  it('should handle merge mode correctly', () => {
    // Setup: Create initial progress
    const initialProgress: UserProgress = {
      'card-1': {
        known: true,
        lastSeen: 1000,
        attempts: 1,
        successes: 1,
        failures: 0,
        reviewCount: 1,
        stability: 1.5,
        difficulty: 2.7,
        interval: 1,
        due: 10000,
        lastReview: 1000,
        history: [],
      },
    };
    saveUserProgress(initialProgress);

    // Create progress to import (with newer data for card-1 and new card-2)
    const importProgress: UserProgress = {
      'card-1': {
        known: true,
        lastSeen: 2000, // Newer
        attempts: 3, // More attempts
        successes: 3,
        failures: 0,
        reviewCount: 3,
        stability: 10.5,
        difficulty: 2.5,
        interval: 11,
        due: 20000,
        lastReview: 2000,
        history: [],
      },
      'card-2': {
        known: false,
        lastSeen: 1500,
        attempts: 1,
        successes: 0,
        failures: 1,
        reviewCount: 1,
        stability: 0.3,
        difficulty: 3.2,
        interval: 1,
        due: 15000,
        lastReview: 1500,
        history: [],
      },
    };

    const importPayload: ImportPayload = {
      progress: importProgress,
    };

    // Import with merge mode
    const importResult = importUserData(importPayload, true);

    expect(importResult.success).toBe(true);

    // Verify merged result
    const mergedProgress = loadUserProgress();

    // card-1 should have newer data (from import)
    expect(mergedProgress['card-1']?.lastSeen).toBe(2000);
    expect(mergedProgress['card-1']?.attempts).toBe(3);

    // card-2 should be added
    expect(mergedProgress['card-2']).toBeDefined();
    expect(mergedProgress['card-2']?.known).toBe(false);
  });

  it('should parse exported JSON and import it correctly', () => {
    // Setup
    const originalProgress = createSampleProgress();
    const originalMappings = createSampleMappings();
    saveUserProgress(originalProgress);
    for (const mapping of Object.values(originalMappings)) {
      saveDeckFieldMapping(mapping);
    }

    // Export to JSON string
    const exportPayload = buildExportPayload(
      originalProgress,
      originalMappings
    );
    const jsonString = JSON.stringify(exportPayload);

    // Parse JSON string (simulating file read)
    const parsed = JSON.parse(jsonString);
    const importPayload = parseImportPayload(parsed);

    expect(importPayload).not.toBeNull();
    expect(importPayload?.progress).toBeDefined();
    expect(importPayload?.mappings).toBeDefined();

    // Clear and import
    clearUserProgress();
    Object.keys(originalMappings).forEach(deckId =>
      clearDeckFieldMapping(deckId)
    );

    const importResult = importUserData(importPayload!, false);

    expect(importResult.success).toBe(true);

    // Verify data integrity
    const importedProgress = loadUserProgress();
    const comparison = compareProgressIgnoringTimestamps(
      originalProgress,
      importedProgress
    );
    expect(comparison.match).toBe(true);

    const importedMappings = loadAllDeckFieldMappings();
    expect(Object.keys(importedMappings).length).toBe(
      Object.keys(originalMappings).length
    );
  });

  it('should handle hash-based IDs correctly in export/import', () => {
    // Create progress with hash-based IDs (like the new system generates)
    const hashBasedProgress: UserProgress = {
      'mandarin-core-a1b2c3d4e5f6g7h8': {
        known: true,
        lastSeen: Date.now(),
        attempts: 5,
        successes: 5,
        failures: 0,
        reviewCount: 5,
        stability: 15.8,
        difficulty: 2.4,
        interval: 20,
        due: Date.now() + 1728000000,
        lastReview: Date.now(),
        history: [],
      },
      'mandarin-gist-x9y8z7w6v5u4t3s2': {
        known: false,
        lastSeen: Date.now() - 1000,
        attempts: 2,
        successes: 0,
        failures: 2,
        reviewCount: 2,
        stability: 0.5,
        difficulty: 3.5,
        interval: 1,
        due: Date.now() + 86400000,
        lastReview: Date.now() - 1000,
        history: [],
      },
    };

    saveUserProgress(hashBasedProgress);

    // Export
    const exportPayload = buildExportPayload(hashBasedProgress, {});

    // Clear and import
    clearUserProgress();
    const importResult = importUserData(exportPayload, false);

    expect(importResult.success).toBe(true);
    expect(importResult.progressCount).toBe(2);

    // Verify IDs are preserved
    const importedProgress = loadUserProgress();
    expect(importedProgress).toHaveProperty('mandarin-core-a1b2c3d4e5f6g7h8');
    expect(importedProgress).toHaveProperty('mandarin-gist-x9y8z7w6v5u4t3s2');

    // Verify content matches (excluding timestamps)
    const comparison = compareProgressIgnoringTimestamps(
      hashBasedProgress,
      importedProgress
    );
    expect(comparison.match).toBe(true);
  });

  it('should ensure exported and imported data are identical (excluding time-related fields)', () => {
    // Create comprehensive test data with all possible fields
    const now = Date.now();
    const originalProgress: UserProgress = {
      'mandarin-core-abc123def456': {
        known: true,
        lastSeen: now - 5000,
        attempts: 10,
        successes: 8,
        failures: 2,
        reviewCount: 10,
        stability: 25.5,
        difficulty: 2.3,
        interval: 30,
        due: now + 2592000000,
        lastReview: now - 5000,
        history: [
          {
            timestamp: now - 10000,
            grade: 3,
            interval: 1,
            stability: 1.5,
            difficulty: 2.7,
            retrievability: 0.9,
            due: now + 86400000,
          },
          {
            timestamp: now - 8000,
            grade: 3,
            interval: 5,
            stability: 4.5,
            difficulty: 2.6,
            retrievability: 0.99,
            due: now + 432000000,
          },
          {
            timestamp: now - 5000,
            grade: 3,
            interval: 30,
            stability: 25.5,
            difficulty: 2.3,
            retrievability: 0.999,
            due: now + 2592000000,
          },
        ],
      },
      'mandarin-gist-xyz789uvw012': {
        known: false,
        lastSeen: now - 2000,
        attempts: 3,
        successes: 0,
        failures: 3,
        reviewCount: 3,
        stability: 0.2,
        difficulty: 3.8,
        interval: 1,
        due: now + 86400000,
        lastReview: now - 2000,
        history: [
          {
            timestamp: now - 5000,
            grade: 1,
            interval: 1,
            stability: 0.2,
            difficulty: 3.8,
            retrievability: 0.9,
            due: now + 86400000,
          },
          {
            timestamp: now - 3000,
            grade: 1,
            interval: 1,
            stability: 0.2,
            difficulty: 3.8,
            retrievability: 0.9,
            due: now + 86400000,
          },
          {
            timestamp: now - 2000,
            grade: 1,
            interval: 1,
            stability: 0.2,
            difficulty: 3.8,
            retrievability: 0.9,
            due: now + 86400000,
          },
        ],
      },
    };

    const originalMappings = createSampleMappings();

    // Save original data
    saveUserProgress(originalProgress);
    for (const mapping of Object.values(originalMappings)) {
      saveDeckFieldMapping(mapping);
    }

    // Step 1: Export data (simulating download)
    const exportPayload = buildExportPayload(
      originalProgress,
      originalMappings
    );

    // Verify export structure
    expect(exportPayload).toHaveProperty('exportedAt');
    expect(exportPayload).toHaveProperty('version', '1.0');
    expect(exportPayload.progress).toBeDefined();
    expect(exportPayload.mappings).toBeDefined();

    // Step 2: Serialize to JSON string (simulating file save)
    const jsonString = JSON.stringify(exportPayload, null, 2);
    expect(jsonString).toBeTruthy();
    expect(typeof jsonString).toBe('string');

    // Step 3: Parse JSON string (simulating file read)
    const parsedData = JSON.parse(jsonString);
    const importPayload = parseImportPayload(parsedData);
    expect(importPayload).not.toBeNull();
    expect(importPayload?.progress).toBeDefined();
    expect(importPayload?.mappings).toBeDefined();

    // Step 4: Clear all data (simulating fresh import)
    clearUserProgress();
    Object.keys(originalMappings).forEach(deckId =>
      clearDeckFieldMapping(deckId)
    );

    // Step 5: Import data (replace mode to ensure clean comparison)
    const importResult = importUserData(importPayload!, false);
    expect(importResult.success).toBe(true);
    expect(importResult.progressCount).toBe(
      Object.keys(originalProgress).length
    );
    expect(importResult.mappingsCount).toBe(
      Object.keys(originalMappings).length
    );

    // Step 6: Load imported data
    const importedProgress = loadUserProgress();
    const importedMappings = loadAllDeckFieldMappings();

    // Step 7: Compare progress data (excluding time-related fields)
    const progressComparison = compareProgressIgnoringTimestamps(
      originalProgress,
      importedProgress
    );

    expect(progressComparison.match).toBe(true);
    if (progressComparison.differences.length > 0) {
      console.error('Progress differences:', progressComparison.differences);
      expect(progressComparison.differences).toEqual([]);
    }

    // Step 8: Compare mappings data (should be identical)
    expect(Object.keys(importedMappings).length).toBe(
      Object.keys(originalMappings).length
    );
    for (const [deckId, originalMapping] of Object.entries(originalMappings)) {
      expect(importedMappings[deckId]).toEqual(originalMapping);
    }

    // Step 9: Verify all card IDs are preserved
    const originalCardIds = Object.keys(originalProgress).sort();
    const importedCardIds = Object.keys(importedProgress).sort();
    expect(importedCardIds).toEqual(originalCardIds);

    // Step 10: Verify each card's non-time fields match exactly
    for (const cardId of originalCardIds) {
      const original = originalProgress[cardId];
      const imported = importedProgress[cardId];

      // Compare all non-time fields
      expect(imported.known).toBe(original.known);
      expect(imported.attempts).toBe(original.attempts);
      expect(imported.successes).toBe(original.successes);
      expect(imported.failures).toBe(original.failures);
      expect(imported.reviewCount).toBe(original.reviewCount);
      expect(imported.stability).toBe(original.stability);
      expect(imported.difficulty).toBe(original.difficulty);
      expect(imported.interval).toBe(original.interval);
      expect(imported.due).toBe(original.due);

      // Compare history length
      expect(imported.history?.length).toBe(original.history?.length);

      // Compare history entries (excluding timestamp)
      if (original.history && imported.history) {
        for (let i = 0; i < original.history.length; i++) {
          const origEntry = original.history[i];
          const impEntry = imported.history[i];
          expect(impEntry.grade).toBe(origEntry.grade);
          expect(impEntry.interval).toBe(origEntry.interval);
          expect(impEntry.stability).toBe(origEntry.stability);
          expect(impEntry.difficulty).toBe(origEntry.difficulty);
          expect(impEntry.retrievability).toBe(origEntry.retrievability);
          expect(impEntry.due).toBe(origEntry.due);
          // timestamp is intentionally not compared
        }
      }
    }
  });
});
