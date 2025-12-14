import { describe, it, expect } from 'vitest';
import { simpleHash, generateCardHashId } from '../cardIdGenerator';
import type { Flashcard } from '../../store';

describe('cardIdGenerator', () => {
  describe('simpleHash', () => {
    it('should generate a hash from a string', () => {
      const hash = simpleHash('test string');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate consistent hashes for the same input', () => {
      const hash1 = simpleHash('test string');
      const hash2 = simpleHash('test string');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = simpleHash('test string 1');
      const hash2 = simpleHash('test string 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty strings', () => {
      const hash = simpleHash('');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters', () => {
      const hash = simpleHash('test@#$%^&*()');
      expect(hash).toBeTruthy();
    });
  });

  describe('generateCardHashId', () => {
    const baseCard: Flashcard = {
      id: 'original-id',
      deckId: 'test-deck',
      front: {
        text: 'Question',
        subText: 'Sub question',
      },
      back: {
        text: 'Answer',
        subText: 'Sub answer',
      },
    };

    it('should generate an ID for a basic card', () => {
      const id = generateCardHashId(baseCard);
      expect(id).toBeTruthy();
      expect(id).toContain('test-deck');
      expect(id).toContain('-');
    });

    it('should include deckId in the generated ID', () => {
      const id = generateCardHashId(baseCard);
      expect(id.startsWith('test-deck-')).toBe(true);
    });

    it('should generate consistent IDs for the same card', () => {
      const id1 = generateCardHashId(baseCard);
      const id2 = generateCardHashId(baseCard);
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different cards', () => {
      const card1: Flashcard = {
        ...baseCard,
        front: { text: 'Question 1' },
      };
      const card2: Flashcard = {
        ...baseCard,
        front: { text: 'Question 2' },
      };

      const id1 = generateCardHashId(card1);
      const id2 = generateCardHashId(card2);
      expect(id1).not.toBe(id2);
    });

    it('should include category in hash calculation', () => {
      const card1: Flashcard = {
        ...baseCard,
        category: 'Geography',
      };
      const card2: Flashcard = {
        ...baseCard,
        category: 'History',
      };

      const id1 = generateCardHashId(card1);
      const id2 = generateCardHashId(card2);
      expect(id1).not.toBe(id2);
    });

    it('should include tags in hash calculation', () => {
      const card1: Flashcard = {
        ...baseCard,
        tags: ['tag1', 'tag2'],
      };
      const card2: Flashcard = {
        ...baseCard,
        tags: ['tag2', 'tag1'], // Same tags, different order
      };

      // Tags are sorted, so should generate same ID
      const id1 = generateCardHashId(card1);
      const id2 = generateCardHashId(card2);
      expect(id1).toBe(id2);
    });

    it('should include metadata in hash calculation', () => {
      const card1: Flashcard = {
        ...baseCard,
        metadata: { level: 'A1', topic: 'Geography' },
      };
      const card2: Flashcard = {
        ...baseCard,
        metadata: { topic: 'Geography', level: 'A1' }, // Same metadata, different order
      };

      // Metadata keys are sorted, so should generate same ID
      const id1 = generateCardHashId(card1);
      const id2 = generateCardHashId(card2);
      expect(id1).toBe(id2);
    });

    it('should handle cards without deckId', () => {
      const card: Flashcard = {
        ...baseCard,
        deckId: undefined,
      };

      const id = generateCardHashId(card);
      expect(id).toBeTruthy();
      expect(id.startsWith('card-')).toBe(true);
    });

    it('should handle cards with minimal content', () => {
      const minimalCard: Flashcard = {
        id: 'minimal',
        front: { text: 'Q' },
        back: { text: 'A' },
      };

      const id = generateCardHashId(minimalCard);
      expect(id).toBeTruthy();
    });

    it('should handle cards with array metadata values', () => {
      const card: Flashcard = {
        ...baseCard,
        metadata: {
          topics: ['geography', 'history'],
        },
      };

      const id = generateCardHashId(card);
      expect(id).toBeTruthy();
    });

    it('should use fallback when content is minimal', () => {
      const minimalCard: Flashcard = {
        id: 'minimal',
        deckId: 'deck',
        front: { text: 'Q' },
        back: { text: 'A' },
      };

      const id = generateCardHashId(minimalCard);
      expect(id).toBeTruthy();
      expect(id).toContain('deck');
    });
  });
});
