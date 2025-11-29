// Import polyfills first - this must be done before any other imports
import './polyfills';

import '@testing-library/jest-dom';
import { vi, afterEach, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import 'vitest-axe/extend-expect';
import { cleanup } from '@testing-library/react';

expect.extend(axeMatchers);

// Mock IntersectionObserver for tests
class MockIntersectionObserver implements IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = Object.freeze([]);

  constructor() {
    // Mock implementation - no parameters needed
  }

  observe() {
    // Mock implementation - do nothing
  }

  unobserve() {
    // Mock implementation - do nothing
  }

  disconnect() {
    // Mock implementation - do nothing
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// Mock IntersectionObserver globally
globalThis.IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver for tests
class MockResizeObserver implements ResizeObserver {
  constructor() {
    // Mock implementation - no parameters needed
  }

  observe() {
    // Mock implementation - do nothing
  }

  unobserve() {
    // Mock implementation - do nothing
  }

  disconnect() {
    // Mock implementation - do nothing
  }
}

globalThis.ResizeObserver = MockResizeObserver;

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo for tests
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock localStorage for tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage for tests
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Default GitHub Gist fixtures for tests (prevents live network calls)
const gistFlashcardFixture = [
  {
    id: 'gist-fixture-1',
    front: {
      title: 'Question',
      text: 'Quelle est la capitale de la France ?',
    },
    back: {
      title: 'Réponse',
      text: 'Paris',
    },
  },
];

const createJsonResponse = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

const defaultFetchImplementation = async (
  input: RequestInfo | URL
): Promise<Response> => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (url.includes('/raw/flashcards.json')) {
    return createJsonResponse(gistFlashcardFixture);
  }

  if (url.includes('/gists')) {
    return createJsonResponse({
      html_url: 'https://gist.github.com/mock-owner/mock-id',
      id: 'mock-id',
      owner: { login: 'mock-owner' },
      files: {
        'flashcards.json': {
          content: JSON.stringify(gistFlashcardFixture),
          raw_url:
            'https://gist.githubusercontent.com/mock-owner/mock-id/raw/flashcards.json',
        },
      },
    });
  }

  return createJsonResponse({});
};

const defaultFetchMock = vi.fn<typeof fetch>(defaultFetchImplementation);

Object.defineProperty(globalThis, 'fetch', {
  writable: true,
  value: defaultFetchMock as typeof fetch,
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
  defaultFetchMock.mockImplementation(defaultFetchImplementation);
  defaultFetchMock.mockClear();
  globalThis.fetch = defaultFetchMock as typeof fetch;
});
