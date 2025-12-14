/**
 * Generic flashcard converter that can handle any format
 * Supports auto-detection and custom field mappings
 */

import type { GistFlashcard, GistFlashcardFace } from '../types/gist';
import { gistDebugLogger } from './gistDebug';

/**
 * Field mapping configuration for converting any format to GistFlashcard
 */
export interface FlashcardFieldMapping {
  /** Field name for the front/question side of the card */
  front?: string | string[];
  /** Field name for the back/answer side of the card */
  back?: string | string[];
  /** Field name for subtitle/subtext on front */
  frontSubText?: string | string[];
  /** Field name for subtitle/subtext on back */
  backSubText?: string | string[];
  /** Field name for category */
  category?: string | string[];
  /** Field names for tags (can be multiple fields) */
  tags?: string | string[];
  /** Field name for language */
  language?: string | string[];
  /** Field name for difficulty */
  difficulty?: string | string[];
  /** Field names for examples (front) */
  frontExamples?: string | string[];
  /** Field names for examples (back) */
  backExamples?: string | string[];
  /** Field names for examples (shared) */
  examples?: string | string[];
  /** Field name for metadata object or field names to include as metadata */
  metadata?: string | string[];
  /** Field name for ID */
  id?: string | string[];
  /** Field name for deck ID */
  deckId?: string | string[];
  /** Field name for deck name */
  deckName?: string | string[];
  /** Custom title for front face */
  frontTitle?: string;
  /** Custom title for back face */
  backTitle?: string;
  /** Custom hint for front face */
  frontHint?: string;
  /** Custom hint for back face */
  backHint?: string;
  /** Filter function to determine if entry is useful */
  filter?: (entry: Record<string, unknown>) => boolean;
}

/**
 * Configuration that can be embedded in JSON data
 */
export interface FlashcardConfig {
  /** Field mapping configuration */
  mapping?: FlashcardFieldMapping;
  /** Default values */
  defaults?: {
    language?: string;
    deckId?: string;
    deckName?: string;
    frontTitle?: string;
    backTitle?: string;
    frontHint?: string;
    backHint?: string;
  };
  /** Format identifier */
  format?: string;
}

/**
 * Get value from entry by field name(s)
 */
function getFieldValue(
  entry: Record<string, unknown>,
  fieldName: string | string[] | undefined
): unknown {
  if (!fieldName) return undefined;
  const fields = Array.isArray(fieldName) ? fieldName : [fieldName];

  for (const field of fields) {
    const value = entry[field];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

/**
 * Get string value from entry
 */
function getStringValue(
  entry: Record<string, unknown>,
  fieldName: string | string[] | undefined
): string | undefined {
  const value = getFieldValue(entry, fieldName);
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

/**
 * Auto-detect field mapping from entry structure
 */
function autoDetectMapping(
  entry: Record<string, unknown>
): FlashcardFieldMapping {
  const keys = Object.keys(entry).map(k => k.toLowerCase());

  // Common patterns for front/question (ordered by priority)
  const frontPatterns = [
    'word',
    'question',
    'q',
    'front',
    'prompt',
    'term',
    'vocabulary',
    'front_text',
    'question_text',
    'frontside',
    'front_side',
  ];

  // Common patterns for back/answer (ordered by priority)
  const backPatterns = [
    'english_translation',
    'translation',
    'answer',
    'a',
    'back',
    'response',
    'definition',
    'back_text',
    'answer_text',
    'backside',
    'back_side',
  ];

  // Helper to find field by pattern, ensuring it's a string type
  const findStringField = (patterns: string[]): string | undefined => {
    // First try exact matches
    for (const pattern of patterns) {
      const exactMatch = Object.keys(entry).find(
        k =>
          k.toLowerCase() === pattern &&
          typeof entry[k] === 'string' &&
          String(entry[k]).trim().length > 0
      );
      if (exactMatch) return exactMatch;
    }

    // Then try word boundary matches (field name starts with pattern or is pattern_word)
    for (const pattern of patterns) {
      const wordBoundaryMatch = Object.keys(entry).find(k => {
        const lowerKey = k.toLowerCase();
        return (
          (lowerKey === pattern ||
            lowerKey.startsWith(pattern + '_') ||
            lowerKey.endsWith('_' + pattern) ||
            lowerKey === pattern + 's' ||
            lowerKey === pattern + 'es') &&
          typeof entry[k] === 'string' &&
          String(entry[k]).trim().length > 0
        );
      });
      if (wordBoundaryMatch) return wordBoundaryMatch;
    }

    // Last resort: contains pattern (but only if it's a string)
    for (const pattern of patterns) {
      const containsMatch = Object.keys(entry).find(k => {
        const lowerKey = k.toLowerCase();
        // Avoid matching fields like "word_frequency" when looking for "word"
        // Only match if pattern is at the start or is a complete word
        const isGoodMatch =
          lowerKey.startsWith(pattern) ||
          lowerKey.includes('_' + pattern) ||
          lowerKey.includes(pattern + '_');
        return (
          isGoodMatch &&
          typeof entry[k] === 'string' &&
          String(entry[k]).trim().length > 0
        );
      });
      if (containsMatch) return containsMatch;
    }

    return undefined;
  };

  // Find front field (must be string)
  const front = findStringField(frontPatterns);

  // Find back field (must be string)
  const back = findStringField(backPatterns);

  // If we found both, we have a valid mapping
  if (front && back) {
    const mapping: FlashcardFieldMapping = { front, back };

    // Try to detect other common fields
    const categoryPatterns = [
      'category',
      'cat',
      'topic',
      'subject',
      'title',
      'cefr_level',
      'level',
    ];
    const categoryKey = keys.find(k =>
      categoryPatterns.some(p => k === p || k.startsWith(p + '_'))
    );
    if (categoryKey) {
      mapping.category = Object.keys(entry).find(
        k => k.toLowerCase() === categoryKey
      );
    }

    const tagPatterns = ['tags', 'tag', 'labels', 'label'];
    const tagKey = keys.find(k =>
      tagPatterns.some(p => k === p || k.startsWith(p + '_'))
    );
    if (tagKey) {
      mapping.tags = Object.keys(entry).find(k => k.toLowerCase() === tagKey);
    }

    const languagePatterns = ['language', 'lang', 'locale'];
    const languageKey = keys.find(k =>
      languagePatterns.some(p => k === p || k.startsWith(p + '_'))
    );
    if (languageKey) {
      mapping.language = Object.keys(entry).find(
        k => k.toLowerCase() === languageKey
      );
    }

    const examplePatterns = [
      'example',
      'examples',
      'context',
      'usage',
      'note',
      'notes',
    ];
    const exampleKey = keys.find(k =>
      examplePatterns.some(p => k === p || k.startsWith(p + '_'))
    );
    if (exampleKey) {
      mapping.examples = Object.keys(entry).find(
        k => k.toLowerCase() === exampleKey
      );
    }

    return mapping;
  }

  // Fallback: use first two string fields
  const stringFields = Object.keys(entry).filter(
    k => typeof entry[k] === 'string' && (entry[k] as string).trim().length > 0
  );

  if (stringFields.length >= 2) {
    return {
      front: stringFields[0],
      back: stringFields[1],
    };
  }

  // Last resort: use first field for both (not ideal but better than nothing)
  if (stringFields.length >= 1) {
    return {
      front: stringFields[0],
      back: stringFields[0],
    };
  }

  return {};
}

/**
 * Convert examples field to GistFlashcard examples
 */
function convertExamples(
  entry: Record<string, unknown>,
  fieldName: string | string[] | undefined,
  label?: string
): Array<{ label: string; text: string; translation?: string }> | undefined {
  const value = getFieldValue(entry, fieldName);

  if (!value) return undefined;

  const examples: Array<{ label: string; text: string; translation?: string }> =
    [];

  // If it's a string, create a single example
  if (typeof value === 'string') {
    examples.push({
      label: label || 'Example',
      text: value,
    });
    return examples;
  }

  // If it's an array of strings
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        examples.push({
          label: label || 'Example',
          text: item,
        });
      } else if (typeof item === 'object' && item !== null) {
        // Handle object with label/text structure
        const obj = item as Record<string, unknown>;
        if (obj.text || obj.label) {
          examples.push({
            label: (obj.label as string) || label || 'Example',
            text: (obj.text as string) || String(obj),
            translation: obj.translation as string | undefined,
          });
        }
      }
    }
    return examples.length > 0 ? examples : undefined;
  }

  // If it's an object, try to extract text
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.text || typeof obj === 'string') {
      examples.push({
        label: label || 'Example',
        text: (obj.text as string) || String(value),
        translation: obj.translation as string | undefined,
      });
      return examples;
    }
  }

  return undefined;
}

/**
 * Convert metadata field(s) to metadata object
 */
function convertMetadata(
  entry: Record<string, unknown>,
  fieldName: string | string[] | undefined
): Record<string, string | number> | undefined {
  if (!fieldName) return undefined;

  const fields = Array.isArray(fieldName) ? fieldName : [fieldName];
  const metadata: Record<string, string | number> = {};

  for (const field of fields) {
    const value = entry[field];
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // If it's an object, merge its properties
        Object.assign(metadata, value);
      } else if (typeof value === 'string' || typeof value === 'number') {
        // If it's a simple value, use field name as key
        metadata[field] = value;
      }
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Convert tags field(s) to tags array
 */
function convertTags(
  entry: Record<string, unknown>,
  fieldName: string | string[] | undefined
): string[] | undefined {
  if (!fieldName) return undefined;

  const fields = Array.isArray(fieldName) ? fieldName : [fieldName];
  const tags: string[] = [];

  for (const field of fields) {
    const value = entry[field];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          tags.push(item.trim());
        }
      }
    } else if (typeof value === 'string' && value.trim()) {
      tags.push(value.trim());
    } else if (typeof value === 'number') {
      tags.push(String(value));
    }
  }

  return tags.length > 0 ? tags : undefined;
}

/**
 * Convert a generic entry to GistFlashcard using field mapping
 */
function convertEntryToGistFlashcard(
  entry: Record<string, unknown>,
  mapping: FlashcardFieldMapping,
  defaults: FlashcardConfig['defaults'],
  index: number
): GistFlashcard | null {
  // Get front and back text (required)
  const frontText = getStringValue(entry, mapping.front);
  const backText = getStringValue(entry, mapping.back);

  if (!frontText || !backText) {
    return null;
  }

  // Build front face
  const front: GistFlashcardFace = {
    title: mapping.frontTitle || defaults?.frontTitle || 'Question',
    text: frontText,
    subText: getStringValue(entry, mapping.frontSubText),
    hint: mapping.frontHint || defaults?.frontHint,
  };

  // Build back face
  const back: GistFlashcardFace = {
    title: mapping.backTitle || defaults?.backTitle || 'Answer',
    text: backText,
    subText: getStringValue(entry, mapping.backSubText),
    hint: mapping.backHint || defaults?.backHint,
  };

  // Get optional fields
  const category = getStringValue(entry, mapping.category);
  const language =
    getStringValue(entry, mapping.language) || defaults?.language;
  const difficulty = getStringValue(entry, mapping.difficulty);
  const tags = convertTags(entry, mapping.tags);
  const metadata = convertMetadata(entry, mapping.metadata);
  const examples = convertExamples(entry, mapping.examples);
  const frontExamples = convertExamples(
    entry,
    mapping.frontExamples,
    'Example'
  );
  const backExamples = convertExamples(entry, mapping.backExamples, 'Example');

  // Get ID
  const id = getStringValue(entry, mapping.id) || `card-${index}`;

  // Get deck info
  const deckId =
    getStringValue(entry, mapping.deckId) || defaults?.deckId || 'generic-deck';
  const deckName =
    getStringValue(entry, mapping.deckName) || defaults?.deckName;

  return {
    id,
    deckId,
    front,
    back,
    category,
    language,
    difficulty,
    tags,
    metadata,
    examples: examples || frontExamples || backExamples,
    extras: {
      ...entry,
      deckName, // Store deckName in extras since it's not in GistFlashcard type
    },
  };
}

/**
 * Check if data has embedded configuration
 */
function hasConfig(
  data: unknown
): data is { _config?: FlashcardConfig; data?: unknown[] } {
  if (typeof data !== 'object' || data === null) return false;
  return '_config' in data;
}

/**
 * Convert any array of entries to GistFlashcard format
 */
export function convertGenericFlashcards(
  data: unknown,
  fileName?: string
): {
  success: boolean;
  flashcards?: GistFlashcard[];
  error?: string;
} {
  try {
    // Check if data has embedded config
    let entries: unknown[] = [];
    let config: FlashcardConfig | undefined;

    if (hasConfig(data)) {
      config = data._config;
      entries = Array.isArray(data.data) ? data.data : [];
    } else if (Array.isArray(data)) {
      entries = data;
    } else {
      return {
        success: false,
        error: 'Data must be an array or an object with a "data" array',
      };
    }

    if (entries.length === 0) {
      return {
        success: false,
        error: 'No entries found in data',
      };
    }

    // Get first entry to detect format
    const firstEntry = entries[0];
    if (typeof firstEntry !== 'object' || firstEntry === null) {
      return {
        success: false,
        error: 'Entries must be objects',
      };
    }

    const entry = firstEntry as Record<string, unknown>;

    // Use config mapping if available, otherwise auto-detect
    const mapping = config?.mapping || autoDetectMapping(entry);

    if (!mapping.front || !mapping.back) {
      gistDebugLogger.warn(
        'convert_format',
        'Could not auto-detect front/back fields, attempting fallback',
        {
          entryKeys: Object.keys(entry),
          fileName,
        }
      );

      // Last resort: try to find any two string fields
      const stringFields = Object.keys(entry).filter(
        k =>
          typeof entry[k] === 'string' && (entry[k] as string).trim().length > 0
      );

      if (stringFields.length < 2) {
        return {
          success: false,
          error: `Could not detect flashcard format. Found fields: ${Object.keys(entry).join(', ')}. Please provide a _config.mapping or ensure entries have at least two string fields.`,
        };
      }

      mapping.front = stringFields[0];
      mapping.back = stringFields[1];
    }

    gistDebugLogger.log('convert_format', 'Converting generic flashcards', {
      fileName,
      entriesCount: entries.length,
      mapping: {
        front: mapping.front,
        back: mapping.back,
        category: mapping.category,
        tags: mapping.tags,
      },
      hasConfig: !!config,
    });

    // Convert all entries
    const flashcards: GistFlashcard[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (typeof entry !== 'object' || entry === null) continue;

      // Apply filter if provided
      if (mapping.filter && !mapping.filter(entry as Record<string, unknown>)) {
        continue;
      }

      const flashcard = convertEntryToGistFlashcard(
        entry as Record<string, unknown>,
        mapping,
        config?.defaults,
        i
      );

      if (flashcard) {
        flashcards.push(flashcard);
      }
    }

    gistDebugLogger.success('convert_format', 'Generic conversion complete', {
      fileName,
      originalCount: entries.length,
      convertedCount: flashcards.length,
    });

    if (flashcards.length === 0) {
      return {
        success: false,
        error: 'No valid flashcards could be created from the data',
      };
    }

    return {
      success: true,
      flashcards,
    };
  } catch (error) {
    const errorMsg = `Error converting generic flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`;
    gistDebugLogger.error('convert_format', errorMsg, error, { fileName });
    return {
      success: false,
      error: errorMsg,
    };
  }
}
