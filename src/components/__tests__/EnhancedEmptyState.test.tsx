import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { EnhancedEmptyState } from '../EnhancedEmptyState';

// Mock the CSS import
vi.mock('../EnhancedEmptyState.css', () => ({}));

describe('EnhancedEmptyState', () => {
  const mockOnCreateDeck = vi.fn();
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty state content', () => {
    render(
      <EnhancedEmptyState
        onCreateDeck={mockOnCreateDeck}
        onRefresh={mockOnRefresh}
      />
    );

    expect(
      screen.getByText('Plus de flashcards à étudier pour le moment')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Vous avez étudié toutes les flashcards disponibles ! Revenez plus tard pour réviser, ou créez votre propre deck de flashcards pour continuer à apprendre.'
      )
    ).toBeInTheDocument();
  });

  it('shows action buttons', () => {
    render(
      <EnhancedEmptyState
        onCreateDeck={mockOnCreateDeck}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Créer un Deck')).toBeInTheDocument();
    expect(screen.getByText('Réinitialiser')).toBeInTheDocument();
  });

  it('calls onCreateDeck when Créer un Deck is clicked', () => {
    render(
      <EnhancedEmptyState
        onCreateDeck={mockOnCreateDeck}
        onRefresh={mockOnRefresh}
      />
    );

    fireEvent.click(screen.getByText('Créer un Deck'));

    expect(mockOnCreateDeck).toHaveBeenCalledTimes(1);
  });

  it('calls onRefresh when Actualiser is clicked', () => {
    render(
      <EnhancedEmptyState
        onCreateDeck={mockOnCreateDeck}
        onRefresh={mockOnRefresh}
      />
    );

    fireEvent.click(screen.getByText('Réinitialiser'));

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows helpful tips section', () => {
    render(
      <EnhancedEmptyState
        onCreateDeck={mockOnCreateDeck}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Et maintenant ?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Créez votre propre deck de flashcards pour continuer à apprendre'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Consultez vos statistiques pour voir votre progression')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Partagez vos decks avec d'autres pour les aider à apprendre"
      )
    ).toBeInTheDocument();
  });

  it('has proper button styling classes', () => {
    render(
      <EnhancedEmptyState
        onCreateDeck={mockOnCreateDeck}
        onRefresh={mockOnRefresh}
      />
    );

    const createButton = screen.getByText('Créer un Deck');
    const refreshButton = screen.getByText('Réinitialiser');

    expect(createButton).toHaveClass('action-btn', 'primary');
    expect(refreshButton).toHaveClass('action-btn', 'secondary');
  });

  it('shows icons in buttons', () => {
    render(
      <EnhancedEmptyState
        onCreateDeck={mockOnCreateDeck}
        onRefresh={mockOnRefresh}
      />
    );

    // Check for Plus icon in Create button
    const createButton = screen.getByText('Créer un Deck').closest('button');
    expect(createButton).toBeInTheDocument();

    // Check for RefreshCw icon in Réinitialiser button
    const refreshButton = screen.getByText('Réinitialiser').closest('button');
    expect(refreshButton).toBeInTheDocument();
  });
});
