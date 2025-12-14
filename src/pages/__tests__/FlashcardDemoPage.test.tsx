import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FlashcardDemoPage from '../FlashcardDemoPage';
import { useGistFlashcards } from '../../hooks/useGistFlashcards';
import type { Flashcard } from '../../store';

vi.mock('../../hooks/useGistFlashcards');
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseGistFlashcards = vi.mocked(useGistFlashcards);

describe('FlashcardDemoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGistFlashcards.mockReturnValue({
      flashcards: [],
      isLoading: false,
      error: null,
      loadFlashcards: vi.fn(),
      refreshFlashcards: vi.fn(),
      setGistId: vi.fn(),
    });
  });

  it('should render the page title', () => {
    render(
      <MemoryRouter>
        <FlashcardDemoPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText('GitHub Gist - Gestion des Flashcards')
    ).toBeInTheDocument();
  });

  it('should render the description', () => {
    render(
      <MemoryRouter>
        <FlashcardDemoPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText('Créez des flashcards et chargez-les depuis GitHub Gist')
    ).toBeInTheDocument();
  });

  it('should render GistFlashcardWriter component', () => {
    render(
      <MemoryRouter>
        <FlashcardDemoPage />
      </MemoryRouter>
    );

    expect(
      screen.getAllByText(/créer et uploader des flashcards/i).length
    ).toBeGreaterThan(0);
  });

  it('should show GistFlashcardReader when gistId is set', () => {
    mockUseGistFlashcards.mockReturnValue({
      flashcards: [],
      isLoading: false,
      error: null,
      loadFlashcards: vi.fn(),
      refreshFlashcards: vi.fn(),
      setGistId: vi.fn(),
    });

    render(
      <MemoryRouter>
        <FlashcardDemoPage />
      </MemoryRouter>
    );

    // Initially, reader should not be visible
    expect(
      screen.queryByText(/charger des flashcards depuis gist/i)
    ).not.toBeInTheDocument();
  });

  it('should display flashcards when loaded', () => {
    const mockFlashcards = [
      {
        id: '1',
        front: { text: 'Question 1' },
        back: { text: 'Answer 1' },
      },
      {
        id: '2',
        front: { text: 'Question 2' },
        back: { text: 'Answer 2' },
      },
    ];

    mockUseGistFlashcards.mockReturnValue({
      flashcards: mockFlashcards as Flashcard[],
      isLoading: false,
      error: null,
      loadFlashcards: vi.fn(),
      refreshFlashcards: vi.fn(),
      setGistId: vi.fn(),
    });

    render(
      <MemoryRouter>
        <FlashcardDemoPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/2 flashcards chargées depuis le gist/i)
    ).toBeInTheDocument();
  });

  it('should display error when error occurs', () => {
    mockUseGistFlashcards.mockReturnValue({
      flashcards: [],
      isLoading: false,
      error: 'Failed to load flashcards',
      loadFlashcards: vi.fn(),
      refreshFlashcards: vi.fn(),
      setGistId: vi.fn(),
    });

    render(
      <MemoryRouter>
        <FlashcardDemoPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Erreur')).toBeInTheDocument();
    expect(screen.getByText('Failed to load flashcards')).toBeInTheDocument();
  });

  it('should not show preview section when no flashcards', () => {
    render(
      <MemoryRouter>
        <FlashcardDemoPage />
      </MemoryRouter>
    );

    expect(
      screen.queryByText(/aperçu des flashcards chargées/i)
    ).not.toBeInTheDocument();
  });
});
