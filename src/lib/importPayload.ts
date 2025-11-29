/**
 * Import utility for restoring user progress from exported JSON files
 */

import {
  saveUserProgress,
  loadUserProgress,
  type UserProgress,
} from './cookies';
import {
  loadAllDeckFieldMappings,
  saveDeckFieldMapping,
} from './deckFieldMapping';
import type { DeckFieldMapping } from '../types/fieldMapping';

export interface ImportPayload {
  exportedAt?: string;
  version?: string;
  progress?: UserProgress;
  mappings?: Record<string, DeckFieldMapping>;
}

export interface ImportResult {
  success: boolean;
  progressCount?: number;
  mappingsCount?: number;
  error?: string;
  warnings?: string[];
}

/**
 * Validate and parse import payload
 */
export function parseImportPayload(data: unknown): ImportPayload | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as Record<string, unknown>;

  // Check if it's a valid export format
  if (payload.progress && typeof payload.progress === 'object') {
    return {
      exportedAt:
        typeof payload.exportedAt === 'string' ? payload.exportedAt : undefined,
      version:
        typeof payload.version === 'string' ? payload.version : undefined,
      progress: payload.progress as UserProgress,
      mappings: payload.mappings as
        | Record<string, DeckFieldMapping>
        | undefined,
    };
  }

  // If it's just a progress object directly
  if (
    Object.keys(payload).length > 0 &&
    !payload.exportedAt &&
    !payload.version
  ) {
    // Assume it's a progress object
    return {
      progress: payload as UserProgress,
    };
  }

  return null;
}

/**
 * Validate progress data structure
 */
function validateProgress(progress: UserProgress): string[] {
  const warnings: string[] = [];

  for (const [id, data] of Object.entries(progress)) {
    if (!data || typeof data !== 'object') {
      warnings.push(`Invalid progress entry for card ${id}`);
      continue;
    }

    const requiredFields = [
      'known',
      'lastSeen',
      'attempts',
      'successes',
      'failures',
    ];
    for (const field of requiredFields) {
      if (!(field in data)) {
        warnings.push(`Missing field '${field}' for card ${id}`);
      }
    }
  }

  return warnings;
}

/**
 * Import user progress from a payload
 * @param payload - The import payload containing progress and mappings
 * @param merge - If true, merge with existing progress. If false, replace it.
 */
export function importUserData(
  payload: ImportPayload,
  merge: boolean = false
): ImportResult {
  const warnings: string[] = [];

  try {
    // Import progress
    if (payload.progress) {
      const progressWarnings = validateProgress(payload.progress);
      warnings.push(...progressWarnings);

      if (merge) {
        // Merge with existing progress
        const existing = loadUserProgress();
        const merged: UserProgress = { ...existing };

        // Merge entries, keeping the most recent lastSeen for each card
        for (const [id, imported] of Object.entries(payload.progress)) {
          const existingEntry = merged[id];
          if (!existingEntry || imported.lastSeen > existingEntry.lastSeen) {
            merged[id] = imported;
          } else {
            // Keep existing but merge some fields
            merged[id] = {
              ...existingEntry,
              // Merge attempts, successes, failures (take the maximum)
              attempts: Math.max(existingEntry.attempts, imported.attempts),
              successes: Math.max(existingEntry.successes, imported.successes),
              failures: Math.max(existingEntry.failures, imported.failures),
            };
          }
        }

        saveUserProgress(merged);
      } else {
        // Replace existing progress
        saveUserProgress(payload.progress);
      }
    }

    // Import mappings
    if (payload.mappings) {
      if (merge) {
        const existing = loadAllDeckFieldMappings();
        const merged = { ...existing, ...payload.mappings };
        // Save each mapping individually
        for (const mapping of Object.values(merged)) {
          saveDeckFieldMapping(mapping);
        }
      } else {
        // Replace all mappings
        for (const mapping of Object.values(payload.mappings)) {
          saveDeckFieldMapping(mapping);
        }
      }
    }

    return {
      success: true,
      progressCount: payload.progress
        ? Object.keys(payload.progress).length
        : 0,
      mappingsCount: payload.mappings
        ? Object.keys(payload.mappings).length
        : 0,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error during import',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

/**
 * Import from a file
 */
export async function importFromFile(
  file: File,
  merge: boolean = false
): Promise<ImportResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const payload = parseImportPayload(data);

    if (!payload) {
      return {
        success: false,
        error: 'Invalid file format. Expected a valid export JSON file.',
      };
    }

    return importUserData(payload, merge);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
    };
  }
}
