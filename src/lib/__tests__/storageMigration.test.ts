import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import {
  loadUserProgress,
  saveUserProgress,
  clearUserProgress,
} from '../cookies';

const STORAGE_KEY = 'flashcard_progress';

const localStorageMock = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
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
  clearUserProgress();
});

afterAll(() => {
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
});

describe('storage migration', () => {
  const sampleProgress = {
    known: true,
    lastSeen: 123456,
    attempts: 1,
    successes: 1,
    failures: 0,
  };

  it('persists progress to localStorage and loads it back', () => {
    saveUserProgress({ 'card-1': sampleProgress });

    expect(storageSnapshot.get(STORAGE_KEY)).toEqual(
      JSON.stringify({ 'card-1': sampleProgress })
    );

    const loaded = loadUserProgress();
    expect(loaded).toEqual({ 'card-1': sampleProgress });
  });

  it('parses legacy URI-encoded payloads stored in localStorage', () => {
    const legacyPayload = {
      'legacy-card': sampleProgress,
    };
    storageSnapshot.set(
      STORAGE_KEY,
      encodeURIComponent(JSON.stringify(legacyPayload))
    );

    const loaded = loadUserProgress();
    expect(loaded).toEqual(legacyPayload);
  });

  it('returns an empty object when stored data is invalid', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    storageSnapshot.set(STORAGE_KEY, 'not-json');

    const loaded = loadUserProgress();
    expect(loaded).toEqual({});

    consoleSpy.mockRestore();
  });
});
