import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeString,
  validateFlashcardId,
  validateGistId,
  validateGistOwner,
  validateUrl,
  validateFlashcardFace,
  validateFlashcard,
  validateFlashcards,
  sanitizeJsonData,
} from '../validation';
import { logger } from '../logger';

vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe('validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeString', () => {
    it('should return empty string for non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('123');
      expect(sanitizeString(true)).toBe('true');
    });

    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(sanitizeString(input)).not.toContain('<script>');
      expect(sanitizeString(input)).toContain('Hello');
      expect(sanitizeString(input)).toContain('World');
    });

    it('should remove iframe tags', () => {
      const input = 'Hello <iframe src="evil.com"></iframe> World';
      expect(sanitizeString(input)).not.toContain('<iframe>');
    });

    it('should remove javascript: protocol', () => {
      const input = 'Hello javascript:alert("xss") World';
      expect(sanitizeString(input)).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = 'Hello onclick=evil() World';
      expect(sanitizeString(input)).not.toContain('onclick=');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });
  });

  describe('validateFlashcardId', () => {
    it('should validate correct flashcard IDs', () => {
      expect(validateFlashcardId('card-123')).toBe('card-123');
      expect(validateFlashcardId('card_123')).toBe('card_123');
      expect(validateFlashcardId('card123')).toBe('card123');
      expect(validateFlashcardId('  card-123  ')).toBe('card-123');
    });

    it('should reject invalid IDs', () => {
      expect(validateFlashcardId(null)).toBeNull();
      expect(validateFlashcardId(undefined)).toBeNull();
      expect(validateFlashcardId('')).toBeNull();
      expect(validateFlashcardId('   ')).toBeNull();
      expect(validateFlashcardId('card@123')).toBe('card123'); // Invalid character removed
      expect(validateFlashcardId('a'.repeat(201))).toBeNull(); // Too long
    });
  });

  describe('validateGistId', () => {
    it('should validate correct Gist IDs', () => {
      expect(validateGistId('abc123def456789012345678901234')).toBe(
        'abc123def456789012345678901234'
      );
      expect(validateGistId('ABC123DEF456789012345678901234')).toBe(
        'abc123def456789012345678901234'
      );
      expect(validateGistId('a1b2c3d4e5f6')).toBe('a1b2c3d4e5f6');
    });

    it('should reject invalid Gist IDs', () => {
      expect(validateGistId(null)).toBeNull();
      expect(validateGistId(undefined)).toBeNull();
      expect(validateGistId('')).toBeNull();
      expect(validateGistId('invalid-id!')).toBeNull();
      expect(validateGistId('abc123def')).toBe('abc123def'); // Hex characters allowed
    });
  });

  describe('validateGistOwner', () => {
    it('should validate correct GitHub usernames', () => {
      expect(validateGistOwner('username')).toBe('username');
      expect(validateGistOwner('user-name')).toBe('user-name');
      expect(validateGistOwner('user123')).toBe('user123');
      expect(validateGistOwner('  username  ')).toBe('username');
    });

    it('should reject invalid usernames', () => {
      expect(validateGistOwner(null)).toBeNull();
      expect(validateGistOwner(undefined)).toBeNull();
      expect(validateGistOwner('')).toBeNull();
      expect(validateGistOwner('user_name')).toBe('username'); // Underscore removed
      expect(validateGistOwner('a'.repeat(40))).toBeNull(); // Too long
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const url1 = validateUrl('https://example.com');
      expect(url1).toContain('https://example.com');
      const url2 = validateUrl('http://example.com');
      expect(url2).toContain('http://example.com');
      const url3 = validateUrl('  https://example.com  ');
      expect(url3).toContain('https://example.com');
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl(null)).toBeNull();
      expect(validateUrl(undefined)).toBeNull();
      expect(validateUrl('')).toBeNull();
      expect(validateUrl('not-a-url')).toBeNull();
      expect(validateUrl('ftp://example.com')).toBeNull(); // Invalid protocol
      expect(validateUrl('javascript:alert(1)')).toBeNull(); // Invalid protocol
    });
  });

  describe('validateFlashcardFace', () => {
    it('should validate correct face data', () => {
      const face = {
        text: 'Question text',
        title: 'Title',
        subText: 'Subtext',
        hint: 'Hint',
      };
      const result = validateFlashcardFace(face);
      expect(result).toEqual({
        text: 'Question text',
        title: 'Title',
        subText: 'Subtext',
        hint: 'Hint',
      });
    });

    it('should require text field', () => {
      expect(validateFlashcardFace({ title: 'Title' })).toBeNull();
      expect(validateFlashcardFace({ text: '' })).toBeNull();
      expect(validateFlashcardFace({ text: '   ' })).toBeNull();
    });

    it('should reject invalid face data', () => {
      expect(validateFlashcardFace(null)).toBeNull();
      expect(validateFlashcardFace(undefined)).toBeNull();
      expect(validateFlashcardFace('string')).toBeNull();
    });

    it('should sanitize text content', () => {
      const face = {
        text: 'Question <script>alert("xss")</script>',
      };
      const result = validateFlashcardFace(face);
      expect(result?.text).not.toContain('<script>');
    });
  });

  describe('validateFlashcard', () => {
    it('should validate correct flashcard', () => {
      const card = {
        id: 'card-1',
        front: { text: 'Question' },
        back: { text: 'Answer' },
      };
      const result = validateFlashcard(card);
      expect(result).toBeTruthy();
      expect(result?.id).toBe('card-1');
      expect(result?.front.text).toBe('Question');
      expect(result?.back.text).toBe('Answer');
    });

    it('should include optional fields', () => {
      const card = {
        id: 'card-1',
        front: { text: 'Question' },
        back: { text: 'Answer' },
        deckId: 'deck-1',
        tags: ['tag1', 'tag2'],
        metadata: { level: 'A1' },
      };
      const result = validateFlashcard(card);
      expect(result?.deckId).toBe('deck-1');
      expect(result?.tags).toEqual(['tag1', 'tag2']);
      expect(result?.metadata?.level).toBe('A1');
    });

    it('should reject invalid flashcards', () => {
      expect(validateFlashcard(null)).toBeNull();
      expect(validateFlashcard({})).toBeNull();
      expect(validateFlashcard({ id: 'card-1' })).toBeNull(); // Missing front/back
      expect(
        validateFlashcard({ front: { text: 'Q' }, back: { text: 'A' } })
      ).toBeNull(); // Missing id
    });
  });

  describe('validateFlashcards', () => {
    it('should validate array of flashcards', () => {
      const cards = [
        { id: 'card-1', front: { text: 'Q1' }, back: { text: 'A1' } },
        { id: 'card-2', front: { text: 'Q2' }, back: { text: 'A2' } },
      ];
      const result = validateFlashcards(cards);
      expect(result).toHaveLength(2);
    });

    it('should filter out invalid flashcards', () => {
      const cards = [
        { id: 'card-1', front: { text: 'Q1' }, back: { text: 'A1' } },
        { id: '', front: { text: 'Q2' }, back: { text: 'A2' } }, // Invalid ID
        { id: 'card-3', front: { text: 'Q3' }, back: { text: 'A3' } },
      ];
      const result = validateFlashcards(cards);
      expect(result).toHaveLength(2);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return empty array for non-array input', () => {
      expect(validateFlashcards(null)).toEqual([]);
      expect(validateFlashcards(undefined)).toEqual([]);
      expect(validateFlashcards('string')).toEqual([]);
      expect(validateFlashcards({})).toEqual([]);
    });
  });

  describe('sanitizeJsonData', () => {
    it('should sanitize strings', () => {
      const input = 'Hello <script>alert("xss")</script>';
      expect(sanitizeJsonData(input)).not.toContain('<script>');
    });

    it('should preserve numbers and booleans', () => {
      expect(sanitizeJsonData(123)).toBe(123);
      expect(sanitizeJsonData(true)).toBe(true);
      expect(sanitizeJsonData(false)).toBe(false);
    });

    it('should sanitize arrays', () => {
      const input = ['hello', '<script>alert("xss")</script>', 123];
      const result = sanitizeJsonData(input) as unknown[];
      expect(result[0]).toBe('hello');
      expect(result[1]).not.toContain('<script>');
      expect(result[2]).toBe(123);
    });

    it('should sanitize objects', () => {
      const input = {
        key1: 'value1',
        'key<script>': 'value<script>',
        key2: 123,
      };
      const result = sanitizeJsonData(input) as Record<string, unknown>;
      expect(result.key1).toBe('value1');
      // Key is sanitized (script tag removed), value is also sanitized
      const sanitizedKey = Object.keys(result).find(k => k.includes('key'));
      if (sanitizedKey) {
        expect(sanitizedKey).not.toContain('<script>');
        expect(result[sanitizedKey]).not.toContain('<script>');
      }
      expect(result.key2).toBe(123);
    });

    it('should handle null and undefined', () => {
      expect(sanitizeJsonData(null)).toBeNull();
      expect(sanitizeJsonData(undefined)).toBeUndefined();
    });
  });
});
