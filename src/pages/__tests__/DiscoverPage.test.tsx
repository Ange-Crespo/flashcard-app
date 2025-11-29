import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import DiscoverPage from '../DiscoverPage';
import { useAppStore } from '../../store';

const mockUseGistFlashcards = vi.fn();

// Mock the FlashcardDeck component
vi.mock('../../components/FlashcardDeck', () => ({
  FlashcardDeck: () => (
    <div data-testid="flashcard-deck">FlashcardDeck Component</div>
  ),
}));

vi.mock('../../hooks/useGistFlashcards', () => ({
  useGistFlashcards: (...args: unknown[]) =>
    mockUseGistFlashcards(...(args as [])),
}));

import { useGistFlashcards } from '../../hooks/useGistFlashcards';

const DiscoverPageWithRouter = () => (
  <BrowserRouter>
    <DiscoverPage />
  </BrowserRouter>
);

// Mock localStorage
const mockLocalStorage = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

const resetStoreState = () => {
  act(() => {
    useAppStore.setState({
      flashcards: [],
      sortedFlashcards: [],
      knownIds: new Set<string>(),
      unknownIds: new Set<string>(),
      userProgress: {},
    });
  });
};

type UseGistFlashcardsReturn = ReturnType<typeof useGistFlashcards>;

const createHookState = (
  overrides?: Partial<UseGistFlashcardsReturn>
): UseGistFlashcardsReturn => ({
  flashcards: [],
  isLoading: false,
  error: null,
  loadFlashcards: vi.fn(),
  refreshFlashcards: vi.fn(),
  setGistId: vi.fn(),
  ...overrides,
});

describe('DiscoverPage Component', () => {
  beforeEach(() => {
    resetStoreState();
    mockUseGistFlashcards.mockReset();
    mockUseGistFlashcards.mockReturnValue(createHookState());
    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.setItem.mockReset();
    mockLocalStorage.getItem.mockReturnValue('true');

    // Mock localStorage to return that user has seen onboarding
    mockLocalStorage.getItem.mockReturnValue('true');
  });

  it('renders FlashcardDeck component', () => {
    render(<DiscoverPageWithRouter />);

    expect(screen.getByTestId('flashcard-deck')).toBeInTheDocument();
  });

  it('has correct CSS class', () => {
    render(<DiscoverPageWithRouter />);

    const discoverElement = screen
      .getByText('Flashcard Learning')
      .closest('.discover');
    expect(discoverElement).toHaveClass('discover');
  });

  it('renders discover header with title only', () => {
    render(<DiscoverPageWithRouter />);

    expect(screen.getByText('Flashcard Learning')).toBeInTheDocument();
    expect(screen.queryByText('Créer un Deck')).not.toBeInTheDocument();
  });

  it('does not have create deck button (hidden as requested)', () => {
    render(<DiscoverPageWithRouter />);

    const createButton = screen.queryByText('Create Deck');
    expect(createButton).not.toBeInTheDocument();
  });

  it('has discover header with correct CSS class', () => {
    render(<DiscoverPageWithRouter />);

    const headerElement = screen.getByText('Flashcard Learning').closest('div');
    expect(headerElement).toHaveClass('discover-header');
  });

  it('shows onboarding flow when the user has not completed it', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    render(<DiscoverPageWithRouter />);

    expect(
      screen.getByText(/Welcome to Flashcard Learning/i)
    ).toBeInTheDocument();
    expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
      'hasSeenOnboarding',
      'true'
    );
  });

  it('sets flashcards in the store and renders stats when data loads', async () => {
    const gistCards = [
      {
        id: 'card-1',
        front: { text: 'Q1' },
        back: { text: 'A1' },
      },
      {
        id: 'card-2',
        front: { text: 'Q2' },
        back: { text: 'A2' },
      },
    ];
    mockUseGistFlashcards.mockReturnValue(
      createHookState({ flashcards: gistCards })
    );

    render(<DiscoverPageWithRouter />);

    await waitFor(() =>
      expect(useAppStore.getState().flashcards).toHaveLength(2)
    );
    expect(screen.getByText('2 flashcards')).toBeInTheDocument();
  });

  it('displays loading state while flashcards are being fetched', () => {
    mockUseGistFlashcards.mockReturnValue(createHookState({ isLoading: true }));

    render(<DiscoverPageWithRouter />);

    expect(screen.getByText(/Loading flashcards.../i)).toBeInTheDocument();
  });

  it('renders an inline error message when flashcards cannot be loaded', () => {
    mockUseGistFlashcards.mockReturnValue(
      createHookState({
        error: 'API rate limit exceeded',
      })
    );

    render(<DiscoverPageWithRouter />);

    expect(
      screen.getByText(/Failed to load flashcards from GitHub Gist/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Showing the local Mandarin deck instead/i)
    ).toBeInTheDocument();
  });
});
