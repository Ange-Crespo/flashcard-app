import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Grade } from '../lib/fsrs';

vi.mock('../lib/cookies', () => ({
  loadUserProgress: vi.fn(() => ({})),
  saveUserProgress: vi.fn(),
  updateFlashcardProgress: vi.fn(),
}));

import {
  loadUserProgress,
  saveUserProgress,
  updateFlashcardProgress,
} from '../lib/cookies';
import { useAppStore, type Flashcard } from '../store';

const sampleFlashcards: Flashcard[] = [
  {
    id: 'flash-1',
    front: { title: 'Prompt', text: 'Sample Question 1' },
    back: { title: 'Answer', text: 'Sample Answer 1' },
  },
  {
    id: 'flash-2',
    front: { title: 'Prompt', text: 'Sample Question 2' },
    back: { title: 'Answer', text: 'Sample Answer 2' },
  },
];

const fsrsFlashcards: Flashcard[] = [
  {
    id: 'flash-soon',
    front: { text: 'Soon question' },
    back: { text: 'Soon answer' },
  },
  {
    id: 'flash-mid-a',
    front: { text: 'Mid question A' },
    back: { text: 'Mid answer A' },
  },
  {
    id: 'flash-mid-b',
    front: { text: 'Mid question B' },
    back: { text: 'Mid answer B' },
  },
];

describe('useAppStore (flashcard state)', () => {
  const mockedLoadProgress = vi.mocked(loadUserProgress);
  const mockedSaveProgress = vi.mocked(saveUserProgress);
  const mockedUpdateProgress = vi.mocked(updateFlashcardProgress);

  beforeEach(() => {
    mockedLoadProgress.mockReturnValue({
      'flash-1': {
        known: true,
        lastSeen: Date.now(),
        attempts: 1,
        successes: 1,
        failures: 0,
      },
      'flash-2': {
        known: false,
        lastSeen: Date.now(),
        attempts: 1,
        successes: 0,
        failures: 1,
      },
    });

    act(() => {
      useAppStore.setState({
        flashcards: [],
        knownIds: new Set<string>(),
        unknownIds: new Set<string>(),
        userProgress: {},
      });
    });
  });

  it('initializes with an empty deck', () => {
    const { result } = renderHook(() => useAppStore());

    expect(result.current.flashcards).toEqual([]);
    expect(result.current.knownIds.size).toBe(0);
    expect(result.current.unknownIds.size).toBe(0);
    expect(result.current.userProgress).toEqual({});
  });

  it('sets flashcards', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setFlashcards(sampleFlashcards);
    });

    expect(result.current.flashcards).toEqual(sampleFlashcards);
  });

  it('marks a flashcard as known', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setFlashcards(sampleFlashcards);
      result.current.markAsKnown('flash-1');
    });

    expect(mockedUpdateProgress).toHaveBeenCalledWith('flash-1', true);
    expect(result.current.knownIds.has('flash-1')).toBe(true);
    expect(result.current.unknownIds.has('flash-1')).toBe(false);
  });

  it('marks a flashcard as unknown', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setFlashcards(sampleFlashcards);
      result.current.markAsUnknown('flash-2');
    });

    expect(mockedUpdateProgress).toHaveBeenCalledWith('flash-2', false);
    expect(result.current.unknownIds.has('flash-2')).toBe(true);
    expect(result.current.knownIds.has('flash-2')).toBe(false);
  });

  it('loads progress from cookies', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.loadProgress();
    });

    expect(mockedLoadProgress).toHaveBeenCalled();
    expect(result.current.knownIds.has('flash-1')).toBe(true);
    expect(result.current.unknownIds.has('flash-2')).toBe(true);
  });

  it('saves progress to cookies', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      useAppStore.setState({
        userProgress: {
          'flash-1': {
            known: true,
            lastSeen: Date.now(),
            attempts: 2,
            successes: 2,
            failures: 0,
          },
        },
      });
      result.current.saveProgress();
    });

    expect(mockedSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        'flash-1': expect.objectContaining({ known: true }),
      })
    );
  });

  it('orders flashcards deterministically using FSRS scheduling data', () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = 1_700_000_000_000;
    const fsrsProgress = {
      'flash-soon': {
        known: false,
        lastSeen: now,
        attempts: 1,
        successes: 0,
        failures: 1,
        due: now + 1 * dayMs,
        history: [
          {
            timestamp: now,
            grade: Grade.GOOD,
            interval: 1,
            stability: 1.2,
            difficulty: 3.5,
            retrievability: 0.4,
            due: now + 1 * dayMs,
          },
        ],
      },
      'flash-mid-a': {
        known: false,
        lastSeen: now,
        attempts: 1,
        successes: 0,
        failures: 1,
        due: now + 3 * dayMs,
        history: [
          {
            timestamp: now,
            grade: Grade.EASY,
            interval: 3,
            stability: 2.0,
            difficulty: 2.5,
            retrievability: 0.2,
            due: now + 3 * dayMs,
          },
        ],
      },
      'flash-mid-b': {
        known: false,
        lastSeen: now,
        attempts: 1,
        successes: 0,
        failures: 1,
        due: now + 3 * dayMs,
        history: [
          {
            timestamp: now,
            grade: Grade.HARD,
            interval: 3,
            stability: 1.8,
            difficulty: 4.5,
            retrievability: 0.9,
            due: now + 3 * dayMs,
          },
        ],
      },
    };

    const { result } = renderHook(() => useAppStore());

    act(() => {
      useAppStore.setState({
        flashcards: [],
        sortedFlashcards: [],
        knownIds: new Set<string>(),
        unknownIds: new Set<string>(),
        userProgress: fsrsProgress,
      });
      result.current.setFlashcards(fsrsFlashcards);
    });

    const ordered = result.current.getOrderedCards().map(card => card.id);
    expect(ordered).toEqual(['flash-soon', 'flash-mid-a', 'flash-mid-b']);
  });
});
