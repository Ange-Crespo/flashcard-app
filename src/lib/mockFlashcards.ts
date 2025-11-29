/**
 * Mock flashcard data for testing and development
 */

import type { Flashcard } from '../store';

/**
 * Generate mock flashcards for testing
 */
export function generateMockFlashcards(): Flashcard[] {
  return [
    {
      id: 'demo-1',
      deckId: 'demo',
      deckName: 'Demo Deck',
      language: 'generic',
      category: 'greetings',
      tags: ['conversation', 'beginner'],
      front: {
        title: 'Prompt',
        text: 'Hello',
        subText: 'Use in friendly situations',
      },
      back: {
        title: 'Response',
        text: 'A polite greeting used when you meet someone.',
        hint: 'Swipe to continue your session',
      },
      metadata: {
        Difficulty: 'A1',
      },
      frontExamples: [
        {
          label: 'Usage',
          text: 'Hello, nice to meet you!',
        },
      ],
      rawFields: {
        question: 'Hello',
        context: 'Use in friendly situations',
        answer: 'A polite greeting used when you meet someone.',
        example_text: 'Hello, nice to meet you!',
        difficulty: 'A1',
      },
    },
    {
      id: 'demo-2',
      deckId: 'demo',
      deckName: 'Demo Deck',
      language: 'generic',
      category: 'gratitude',
      tags: ['conversation'],
      front: {
        title: 'Prompt',
        text: 'Thank you',
      },
      back: {
        title: 'Response',
        text: 'An expression of gratitude.',
      },
      metadata: {
        Difficulty: 'A1',
      },
      backExamples: [
        {
          label: 'Usage',
          text: 'Thank you for your help.',
        },
      ],
      rawFields: {
        question: 'Thank you',
        answer: 'An expression of gratitude.',
        example_text: 'Thank you for your help.',
        difficulty: 'A1',
      },
    },
  ];
}

/**
 * Export mock flashcards
 */
export const mockFlashcards: Flashcard[] = generateMockFlashcards();
