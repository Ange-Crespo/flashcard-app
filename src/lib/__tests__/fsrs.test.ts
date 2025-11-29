import { describe, it, expect, beforeEach } from 'vitest';
import {
  updateFlashcardProgress,
  loadUserProgress,
  clearUserProgress,
} from '../cookies';
import { Grade } from '../fsrs';

describe('FSRS integration in cookies', () => {
  beforeEach(() => {
    clearUserProgress();
  });

  it('creates initial fsrs state with history on first review', () => {
    updateFlashcardProgress('card-1', true, undefined, Grade.GOOD);
    const progress = loadUserProgress();
    const card = progress['card-1'];

    expect(card).toBeTruthy();
    expect(card.reviewCount).toBe(1);
    expect(card.stability).toBeGreaterThan(0);
    expect(card.difficulty).toBeDefined();
    expect(card.history).toHaveLength(1);
    expect(card.history?.[0].grade).toBe(Grade.GOOD);
  });

  it('appends history on subsequent reviews and updates intervals', () => {
    updateFlashcardProgress('card-2', true, undefined, Grade.GOOD);
    updateFlashcardProgress('card-2', false, undefined, Grade.FORGOT);

    const card = loadUserProgress()['card-2'];
    expect(card.reviewCount).toBe(2);
    expect(card.history).toHaveLength(2);
    expect(card.history?.[1].grade).toBe(Grade.FORGOT);
    expect(card.stability).toBeGreaterThan(0);
    expect(card.due).toBeGreaterThan(card.lastReview ?? 0);
  });
});
