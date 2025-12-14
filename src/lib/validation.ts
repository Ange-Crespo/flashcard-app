/**
 * Validation and sanitization utilities for flashcard data
 */

import type { Flashcard } from '../store';
import { logger } from './logger';

/**
 * Sanitize a string to prevent XSS attacks
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return String(input ?? '');
  }

  // Remove potentially dangerous HTML/script tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Validate and sanitize a flashcard ID
 */
export function validateFlashcardId(id: unknown): string | null {
  if (typeof id !== 'string' || !id.trim()) {
    return null;
  }

  // Only allow alphanumeric, hyphens, and underscores
  const sanitized = id.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (sanitized.length === 0 || sanitized.length > 200) {
    return null;
  }

  return sanitized;
}

/**
 * Validate a Gist ID format
 */
export function validateGistId(id: unknown): string | null {
  if (typeof id !== 'string' || !id.trim()) {
    return null;
  }

  // Gist IDs are typically 32-character hex strings
  const sanitized = id.trim();
  if (!/^[a-f0-9]{32}$/i.test(sanitized)) {
    // Allow shorter IDs for testing, but validate format
    if (!/^[a-f0-9]{1,32}$/i.test(sanitized)) {
      logger.warn('Invalid Gist ID format', { id: sanitized });
      return null;
    }
  }

  return sanitized.toLowerCase();
}

/**
 * Validate a GitHub username/owner
 */
export function validateGistOwner(owner: unknown): string | null {
  if (typeof owner !== 'string' || !owner.trim()) {
    return null;
  }

  // GitHub usernames: alphanumeric and hyphens, 1-39 chars
  const sanitized = owner.trim().replace(/[^a-zA-Z0-9-]/g, '');
  if (sanitized.length === 0 || sanitized.length > 39) {
    return null;
  }

  return sanitized;
}

/**
 * Validate a URL
 */
export function validateUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) {
    return null;
  }

  try {
    const parsed = new URL(url.trim());
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate flashcard face data
 */
export function validateFlashcardFace(face: unknown): {
  title?: string;
  text: string;
  subText?: string;
  hint?: string;
} | null {
  if (!face || typeof face !== 'object') {
    return null;
  }

  const faceObj = face as Record<string, unknown>;
  const text = faceObj.text;
  if (typeof text !== 'string' || !text.trim()) {
    return null;
  }

  return {
    title: faceObj.title ? sanitizeString(faceObj.title) : undefined,
    text: sanitizeString(text),
    subText: faceObj.subText ? sanitizeString(faceObj.subText) : undefined,
    hint: faceObj.hint ? sanitizeString(faceObj.hint) : undefined,
  };
}

/**
 * Validate a complete flashcard
 */
export function validateFlashcard(data: unknown): Flashcard | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const card = data as Record<string, unknown>;

  // Validate ID
  const id = validateFlashcardId(card.id);
  if (!id) {
    logger.warn('Invalid flashcard ID', { id: card.id });
    return null;
  }

  // Validate front and back
  const front = validateFlashcardFace(card.front);
  if (!front) {
    logger.warn('Invalid flashcard front', { id });
    return null;
  }

  const back = validateFlashcardFace(card.back);
  if (!back) {
    logger.warn('Invalid flashcard back', { id });
    return null;
  }

  // Build validated flashcard
  const validated: Flashcard = {
    id,
    front,
    back,
  };

  // Optional fields
  if (card.deckId && typeof card.deckId === 'string') {
    validated.deckId = sanitizeString(card.deckId);
  }
  if (card.deckName && typeof card.deckName === 'string') {
    validated.deckName = sanitizeString(card.deckName);
  }
  if (card.language && typeof card.language === 'string') {
    validated.language = sanitizeString(card.language);
  }
  if (card.category && typeof card.category === 'string') {
    validated.category = sanitizeString(card.category);
  }
  if (card.difficulty && typeof card.difficulty === 'string') {
    validated.difficulty = sanitizeString(card.difficulty);
  }
  if (Array.isArray(card.tags)) {
    validated.tags = card.tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map(tag => sanitizeString(tag))
      .filter(Boolean);
  }

  // Preserve raw fields for mapping
  if (card.rawFields && typeof card.rawFields === 'object') {
    validated.rawFields = card.rawFields as Record<string, unknown>;
  }
  if (card.extras && typeof card.extras === 'object') {
    validated.extras = card.extras as Record<string, unknown>;
  }
  if (card.metadata && typeof card.metadata === 'object') {
    validated.metadata = card.metadata as Record<string, unknown>;
  }

  return validated;
}

/**
 * Validate an array of flashcards
 */
export function validateFlashcards(data: unknown): Flashcard[] {
  if (!Array.isArray(data)) {
    logger.warn('Flashcards data is not an array', { type: typeof data });
    return [];
  }

  const validated: Flashcard[] = [];
  for (let i = 0; i < data.length; i++) {
    const card = validateFlashcard(data[i]);
    if (card) {
      validated.push(card);
    } else {
      logger.warn('Skipped invalid flashcard', { index: i });
    }
  }

  if (validated.length !== data.length) {
    logger.warn('Some flashcards were invalid and skipped', {
      total: data.length,
      valid: validated.length,
      invalid: data.length - validated.length,
    });
  }

  return validated;
}

/**
 * Sanitize JSON data from external sources
 */
export function sanitizeJsonData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeJsonData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeJsonData(value);
    }
    return sanitized;
  }

  return String(data);
}
