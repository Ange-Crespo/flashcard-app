import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressPage from '../ProgressPage';
import { useAppStore } from '../../store';
import { getProgressStats } from '../../lib/cookies';
import type { Flashcard } from '../../store';

vi.mock('../../store');
vi.mock('../../lib/cookies', () => ({
  getProgressStats: vi.fn(() => ({
    attempts: 0,
    successRate: 0,
  })),
}));

const mockUseAppStore = vi.mocked(useAppStore);

describe('ProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppStore.mockReturnValue({
      flashcards: [],
      knownIds: new Set(),
      unknownIds: new Set(),
    } as ReturnType<typeof useAppStore>);
  });

  it('should render page title', () => {
    render(<ProgressPage />);

    expect(
      screen.getByText("Vos Statistiques d'Apprentissage")
    ).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    render(<ProgressPage />);

    expect(
      screen.getByText(
        "Suivez votre progression dans l'apprentissage des flashcards"
      )
    ).toBeInTheDocument();
  });

  it('should display total flashcards count', () => {
    const mockFlashcards = [
      { id: '1', front: { text: 'Q1' }, back: { text: 'A1' } },
      { id: '2', front: { text: 'Q2' }, back: { text: 'A2' } },
    ];

    mockUseAppStore.mockReturnValue({
      flashcards: mockFlashcards as Flashcard[],
      knownIds: new Set(),
      unknownIds: new Set(),
    } as ReturnType<typeof useAppStore>);

    render(<ProgressPage />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Flashcards Total')).toBeInTheDocument();
  });

  it('should display known cards count', () => {
    mockUseAppStore.mockReturnValue({
      flashcards: [],
      knownIds: new Set(['1', '2', '3']),
      unknownIds: new Set(),
    } as ReturnType<typeof useAppStore>);

    render(<ProgressPage />);

    expect(screen.getByText('Connues')).toBeInTheDocument();
    // Check that the known count appears in the stat card
    const knownCard = screen.getByText('Connues').closest('.stat-card');
    expect(knownCard).toHaveTextContent('3');
  });

  it('should display unknown cards count', () => {
    mockUseAppStore.mockReturnValue({
      flashcards: [],
      knownIds: new Set(),
      unknownIds: new Set(['1', '2']),
    } as ReturnType<typeof useAppStore>);

    render(<ProgressPage />);

    expect(screen.getByText('À Réviser')).toBeInTheDocument();
    // Check that the unknown count appears in the stat card
    const unknownCard = screen.getByText('À Réviser').closest('.stat-card');
    expect(unknownCard).toHaveTextContent('2');
  });

  it('should calculate and display success rate', () => {
    mockUseAppStore.mockReturnValue({
      flashcards: [],
      knownIds: new Set(['1', '2', '3']),
      unknownIds: new Set(['4']),
    } as ReturnType<typeof useAppStore>);

    render(<ProgressPage />);

    // 3 known out of 4 studied = 75%
    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getByText('Taux de Réussite')).toBeInTheDocument();
  });

  it('should display empty state when no flashcards', () => {
    render(<ProgressPage />);

    expect(screen.getByText('Aucune Flashcard')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Commencez à étudier des flashcards pour voir vos statistiques'
      )
    ).toBeInTheDocument();
  });

  it('should display start learning message when no cards studied', () => {
    const mockFlashcards = [
      { id: '1', front: { text: 'Q1' }, back: { text: 'A1' } },
    ];

    mockUseAppStore.mockReturnValue({
      flashcards: mockFlashcards as Flashcard[],
      knownIds: new Set(),
      unknownIds: new Set(),
    } as ReturnType<typeof useAppStore>);

    render(<ProgressPage />);

    expect(
      screen.getByText(/commencez votre apprentissage/i)
    ).toBeInTheDocument();
  });

  it('should display encouragement message based on success rate', () => {
    // High success rate
    mockUseAppStore.mockReturnValue({
      flashcards: [
        { id: '1', front: { text: 'Q' }, back: { text: 'A' } },
      ] as Flashcard[],
      knownIds: new Set(['1']),
      unknownIds: new Set(),
    } as ReturnType<typeof useAppStore>);

    const { rerender } = render(<ProgressPage />);

    expect(
      screen.getByText(/excellent travail ! vous maîtrisez bien/i)
    ).toBeInTheDocument();

    // Medium success rate
    mockUseAppStore.mockReturnValue({
      flashcards: [
        { id: '1', front: { text: 'Q1' }, back: { text: 'A1' } },
        { id: '2', front: { text: 'Q2' }, back: { text: 'A2' } },
      ] as Flashcard[],
      knownIds: new Set(['1']),
      unknownIds: new Set(['2']),
    } as ReturnType<typeof useAppStore>);

    rerender(<ProgressPage />);

    expect(
      screen.getByText(/continuez vos efforts ! vous progressez bien/i)
    ).toBeInTheDocument();
  });

  it('should display progress stats from cookies', () => {
    vi.mocked(getProgressStats).mockReturnValue({
      total: 1,
      known: 1,
      unknown: 0,
      attempts: 50,
      successRate: 75.5,
    });

    mockUseAppStore.mockReturnValue({
      flashcards: [
        { id: '1', front: { text: 'Q' }, back: { text: 'A' } },
      ] as Flashcard[],
      knownIds: new Set(['1']),
      unknownIds: new Set(),
    } as ReturnType<typeof useAppStore>);

    render(<ProgressPage />);

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('75.5%')).toBeInTheDocument();
  });
});
