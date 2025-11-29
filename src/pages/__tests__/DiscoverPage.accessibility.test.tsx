import '@testing-library/jest-dom';
import 'vitest-axe/extend-expect';
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import DiscoverPage from '../DiscoverPage';

declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void;
  }
}

const mockUseGistFlashcards = vi.fn();

vi.mock('../../hooks/useGistFlashcards', () => ({
  useGistFlashcards: (...args: unknown[]) =>
    mockUseGistFlashcards(...(args as [])),
}));

const mockLocalStorage = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

const DiscoverPageWithRouter = () => (
  <BrowserRouter>
    <DiscoverPage />
  </BrowserRouter>
);

beforeEach(() => {
  mockUseGistFlashcards.mockReset();
  mockUseGistFlashcards.mockReturnValue({
    flashcards: [],
    isLoading: false,
    error: null,
    loadFlashcards: vi.fn(),
    refreshFlashcards: vi.fn(),
    setGistId: vi.fn(),
  });
  mockLocalStorage.getItem.mockReturnValue('true');
});

describe('DiscoverPage accessibility', () => {
  it('has no accessibility violations in default state', async () => {
    const { container } = render(<DiscoverPageWithRouter />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when onboarding is visible', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    const { container } = render(<DiscoverPageWithRouter />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
