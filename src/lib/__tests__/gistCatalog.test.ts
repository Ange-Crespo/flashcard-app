/**
 * Tests for Gist Catalog parser
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchGistDeckCatalog } from '../gistCatalog';

// Mock the catalog data from the provided URL
const mockCatalogData = [
  {
    id: '764525884bff631696fc0a5025ce93d6',
    owner: 'Ange-Crespo',
    name: 'Mandarin Full Deck',
    description:
      'Jeu complet extrait de Language-Learning-decks. Inclut plus de 2 400 entrées.',
    language: 'Mandarin Chinese',
    sizeHint: '≈2 400 cartes',
    gistUrl2:
      'https://gist.github.com/Ange-Crespo/764525884bff631696fc0a5025ce93d6',
    gistUrl:
      'https://gist.githubusercontent.com/Ange-Crespo/764525884bff631696fc0a5025ce93d6/raw/mandarin.json',
  },
  {
    id: '764525884bff631696fc0a5025ce93d7',
    owner: 'Ange-Crespo',
    name: 'SQuaD',
    description: 'The Stanford Question Answering Dataset',
    language: 'Math',
    sizeHint: '≈Sample Tests',
    gistUrl:
      'https://gist.githubusercontent.com/Ange-Crespo/ed98b7cff7919d8c74d257dc52c1dcf7/raw/77d99363c6edc365d6ab48806fc4fa7eeec8fe75/SQuaD.json',
    gistUrlRaw:
      'https://gist.githubusercontent.com/Ange-Crespo/ed98b7cff7919d8c74d257dc52c1dcf7/raw/77d99363c6edc365d6ab48806fc4fa7eeec8fe75/SQuaD.json',
  },
];

describe('fetchGistDeckCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse catalog and extract rawUrl from gistUrlRaw', async () => {
    // Mock the GitHub API response
    const mockGistResponse = {
      owner: { login: 'Ange-Crespo' },
      files: {
        'list.json': {
          filename: 'list.json',
          content: JSON.stringify(mockCatalogData),
        },
      },
      html_url:
        'https://gist.github.com/Ange-Crespo/be69a326687af7b0f42c46382a2c8041',
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGistResponse,
    });

    const result = await fetchGistDeckCatalog(
      'be69a326687af7b0f42c46382a2c8041'
    );

    expect(result.decks).toHaveLength(2);
    expect(result.owner).toBe('Ange-Crespo');
    expect(result.id).toBe('be69a326687af7b0f42c46382a2c8041');

    // Test Mandarin deck
    const mandarinDeck = result.decks.find(
      d => d.name === 'Mandarin Full Deck'
    );
    expect(mandarinDeck).toBeDefined();
    expect(mandarinDeck?.id).toBe('764525884bff631696fc0a5025ce93d6');
    expect(mandarinDeck?.owner).toBe('Ange-Crespo');
    expect(mandarinDeck?.rawUrl).toBe(
      'https://gist.githubusercontent.com/Ange-Crespo/764525884bff631696fc0a5025ce93d6/raw/mandarin.json'
    );
    expect(mandarinDeck?.gistUrl).toBe(
      'https://gist.github.com/Ange-Crespo/764525884bff631696fc0a5025ce93d6'
    );

    // Test SQuAD deck
    const squadDeck = result.decks.find(d => d.name === 'SQuaD');
    expect(squadDeck).toBeDefined();
    expect(squadDeck?.id).toBe('ed98b7cff7919d8c74d257dc52c1dcf7'); // Should extract from rawUrl
    expect(squadDeck?.owner).toBe('Ange-Crespo');
    expect(squadDeck?.rawUrl).toBe(
      'https://gist.githubusercontent.com/Ange-Crespo/ed98b7cff7919d8c74d257dc52c1dcf7/raw/77d99363c6edc365d6ab48806fc4fa7eeec8fe75/SQuaD.json'
    );
    expect(squadDeck?.gistUrl).toBe(
      'https://gist.github.com/Ange-Crespo/ed98b7cff7919d8c74d257dc52c1dcf7'
    );
  });

  it('should extract Gist ID from rawUrl when provided', async () => {
    const correctGistId = 'ed98b7cff7919d8c74d257dc52c1dcf7';
    const wrongGistId = '764525884bff631696fc0a5025ce93d7';

    const mockGistResponse = {
      owner: { login: 'Ange-Crespo' },
      files: {
        'list.json': {
          filename: 'list.json',
          content: JSON.stringify([
            {
              id: wrongGistId,
              owner: 'Ange-Crespo',
              name: 'Test Deck',
              gistUrlRaw: `https://gist.githubusercontent.com/Ange-Crespo/${correctGistId}/raw/77d99363c6edc365d6ab48806fc4fa7eeec8fe75/file.json`,
            },
          ]),
        },
      },
      html_url: 'https://gist.github.com/Ange-Crespo/test',
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGistResponse,
    });

    const result = await fetchGistDeckCatalog('test');

    expect(result.decks).toHaveLength(1);
    const deck = result.decks[0];
    expect(deck.id).toBe(correctGistId); // Should extract from rawUrl, not use wrong-id
    expect(deck.owner).toBe('Ange-Crespo');
    expect(deck.rawUrl).toBe(
      `https://gist.githubusercontent.com/Ange-Crespo/${correctGistId}/raw/77d99363c6edc365d6ab48806fc4fa7eeec8fe75/file.json`
    );
  });

  it('should handle rawUrl with commit hash in path', async () => {
    const mockGistResponse = {
      owner: { login: 'Ange-Crespo' },
      files: {
        'list.json': {
          filename: 'list.json',
          content: JSON.stringify([
            {
              id: 'test-id',
              owner: 'Ange-Crespo',
              name: 'Test Deck',
              gistUrlRaw:
                'https://gist.githubusercontent.com/Ange-Crespo/abc123def456/raw/77d99363c6edc365d6ab48806fc4fa7eeec8fe75/SQuaD.json',
            },
          ]),
        },
      },
      html_url: 'https://gist.github.com/Ange-Crespo/test',
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGistResponse,
    });

    const result = await fetchGistDeckCatalog('test');

    expect(result.decks).toHaveLength(1);
    const deck = result.decks[0];
    expect(deck.id).toBe('abc123def456'); // Should extract from rawUrl
    expect(deck.rawUrl).toBe(
      'https://gist.githubusercontent.com/Ange-Crespo/abc123def456/raw/77d99363c6edc365d6ab48806fc4fa7eeec8fe75/SQuaD.json'
    );
  });

  it('should prioritize rawUrl over gistUrlRaw', async () => {
    const rawUrlGistId = 'ed98b7cff7919d8c74d257dc52c1dcf7';
    const gistUrlRawGistId = '764525884bff631696fc0a5025ce93d6';
    const itemId = 'be69a326687af7b0f42c46382a2c8041';

    const mockGistResponse = {
      owner: { login: 'Ange-Crespo' },
      files: {
        'list.json': {
          filename: 'list.json',
          content: JSON.stringify([
            {
              id: itemId,
              owner: 'Ange-Crespo',
              name: 'Test Deck',
              rawUrl: `https://gist.githubusercontent.com/Ange-Crespo/${rawUrlGistId}/raw/file.json`,
              gistUrlRaw: `https://gist.githubusercontent.com/Ange-Crespo/${gistUrlRawGistId}/raw/file.json`,
            },
          ]),
        },
      },
      html_url: 'https://gist.github.com/Ange-Crespo/test',
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGistResponse,
    });

    const result = await fetchGistDeckCatalog('test');

    expect(result.decks).toHaveLength(1);
    const deck = result.decks[0];
    expect(deck.rawUrl).toBe(
      `https://gist.githubusercontent.com/Ange-Crespo/${rawUrlGistId}/raw/file.json`
    );
    expect(deck.id).toBe(rawUrlGistId); // Should extract from rawUrl (prioritized)
  });

  it('should use gistUrlRaw when rawUrl is not provided', async () => {
    const mockGistResponse = {
      owner: { login: 'Ange-Crespo' },
      files: {
        'list.json': {
          filename: 'list.json',
          content: JSON.stringify([
            {
              id: 'test-id',
              owner: 'Ange-Crespo',
              name: 'Test Deck',
              gistUrlRaw:
                'https://gist.githubusercontent.com/Ange-Crespo/test-id/raw/file.json',
            },
          ]),
        },
      },
      html_url: 'https://gist.github.com/Ange-Crespo/test',
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGistResponse,
    });

    const result = await fetchGistDeckCatalog('test');

    expect(result.decks).toHaveLength(1);
    const deck = result.decks[0];
    expect(deck.rawUrl).toBe(
      'https://gist.githubusercontent.com/Ange-Crespo/test-id/raw/file.json'
    );
  });

  it('should handle gistUrl that is a raw URL', async () => {
    const mockGistResponse = {
      owner: { login: 'Ange-Crespo' },
      files: {
        'list.json': {
          filename: 'list.json',
          content: JSON.stringify([
            {
              id: 'test-id',
              owner: 'Ange-Crespo',
              name: 'Test Deck',
              gistUrl:
                'https://gist.githubusercontent.com/Ange-Crespo/abc123/raw/file.json',
            },
          ]),
        },
      },
      html_url: 'https://gist.github.com/Ange-Crespo/test',
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGistResponse,
    });

    const result = await fetchGistDeckCatalog('test');

    expect(result.decks).toHaveLength(1);
    const deck = result.decks[0];
    expect(deck.rawUrl).toBe(
      'https://gist.githubusercontent.com/Ange-Crespo/abc123/raw/file.json'
    );
    expect(deck.id).toBe('abc123'); // Should extract from rawUrl
    expect(deck.gistUrl).toBe('https://gist.github.com/Ange-Crespo/abc123');
  });
});
