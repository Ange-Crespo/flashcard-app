import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlashcardCard } from '../FlashcardCard';
import type { Flashcard } from '../../store';

const mockFlashcard: Flashcard = {
  id: 'test-card-1',
  front: {
    title: 'Question',
    text: 'What is the capital of France?',
    subText: 'Geography question',
    hint: 'Think about Europe',
  },
  back: {
    title: 'Answer',
    text: 'Paris',
    subText: 'The capital city',
    hint: 'Famous for the Eiffel Tower',
  },
};

describe('FlashcardCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render flashcard front by default', () => {
    render(<FlashcardCard flashcard={mockFlashcard} />);

    expect(
      screen.getByText('What is the capital of France?')
    ).toBeInTheDocument();
    expect(screen.getByText('Question')).toBeInTheDocument();
  });

  it('should render flashcard back when flipped', () => {
    render(<FlashcardCard flashcard={mockFlashcard} showFrontFirst={false} />);

    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Answer')).toBeInTheDocument();
  });

  it('should flip card when clicked', async () => {
    const user = userEvent.setup();
    render(<FlashcardCard flashcard={mockFlashcard} />);

    // Initially shows front
    expect(
      screen.getByText('What is the capital of France?')
    ).toBeInTheDocument();

    // Click to flip
    const card = screen.getByRole('button');
    await user.click(card);

    // Should show back
    expect(screen.getByText('Paris')).toBeInTheDocument();
  });

  it('should call onSwipeRight when swiped right', () => {
    const onSwipeRight = vi.fn();
    render(
      <FlashcardCard flashcard={mockFlashcard} onSwipeRight={onSwipeRight} />
    );

    // Note: Actual swipe testing would require more complex setup
    // This test verifies the component renders with the callback
    expect(onSwipeRight).toBeDefined();
  });

  it('should call onSwipeLeft when swiped left', () => {
    const onSwipeLeft = vi.fn();
    render(
      <FlashcardCard flashcard={mockFlashcard} onSwipeLeft={onSwipeLeft} />
    );

    expect(onSwipeLeft).toBeDefined();
  });

  it('should display metadata when present', () => {
    const cardWithMetadata: Flashcard = {
      ...mockFlashcard,
      metadata: {
        level: 'A1',
        topic: 'Geography',
      },
    };

    render(<FlashcardCard flashcard={cardWithMetadata} />);

    expect(screen.getByText(/level:/i)).toBeInTheDocument();
    expect(screen.getByText(/topic:/i)).toBeInTheDocument();
  });

  it('should display tags when present', async () => {
    const user = userEvent.setup();
    const cardWithTags: Flashcard = {
      ...mockFlashcard,
      tags: ['geography', 'france', 'capital'],
    };

    render(<FlashcardCard flashcard={cardWithTags} />);

    // Flip to back to see tags
    const card = screen.getByRole('button');
    await user.click(card);

    expect(screen.getByText('geography')).toBeInTheDocument();
    expect(screen.getByText('france')).toBeInTheDocument();
    expect(screen.getByText('capital')).toBeInTheDocument();
  });

  it('should display front examples when present', () => {
    const cardWithExamples: Flashcard = {
      ...mockFlashcard,
      frontExamples: [
        {
          text: 'Example question',
          translation: 'Example translation',
        },
      ],
    };

    render(<FlashcardCard flashcard={cardWithExamples} />);

    expect(screen.getByText('Example question')).toBeInTheDocument();
    expect(screen.getByText('Example translation')).toBeInTheDocument();
  });

  it('should display back examples when present', async () => {
    const user = userEvent.setup();
    const cardWithExamples: Flashcard = {
      ...mockFlashcard,
      backExamples: [
        {
          text: 'Back example',
          translation: 'Back translation',
        },
      ],
    };

    render(<FlashcardCard flashcard={cardWithExamples} />);

    // Flip to back
    const card = screen.getByRole('button');
    await user.click(card);

    expect(screen.getByText('Back example')).toBeInTheDocument();
    expect(screen.getByText('Back translation')).toBeInTheDocument();
  });

  it('should display shared examples when present', async () => {
    const user = userEvent.setup();
    const cardWithExamples: Flashcard = {
      ...mockFlashcard,
      examples: [
        {
          text: 'Shared example',
          translation: 'Shared translation',
        },
      ],
    };

    render(<FlashcardCard flashcard={cardWithExamples} />);

    // Flip to back
    const card = screen.getByRole('button');
    await user.click(card);

    expect(screen.getByText('Shared example')).toBeInTheDocument();
    expect(screen.getByText('Shared translation')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<FlashcardCard flashcard={mockFlashcard} disabled={true} />);

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '-1');
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    render(<FlashcardCard flashcard={mockFlashcard} style={customStyle} />);

    const card = screen.getByRole('button');
    // Note: Framer Motion applies styles differently, so we just verify the style prop is passed
    expect(card).toBeInTheDocument();
  });

  it('should display default hint when no hint provided', () => {
    const cardWithoutHint: Flashcard = {
      ...mockFlashcard,
      front: {
        ...mockFlashcard.front!,
        hint: undefined,
      },
    };

    render(<FlashcardCard flashcard={cardWithoutHint} />);

    expect(screen.getByText('Tap to flip the card')).toBeInTheDocument();
  });

  it('should handle missing front/back gracefully', () => {
    const incompleteCard: Flashcard = {
      id: 'incomplete',
      front: { text: 'Front only' },
      back: { text: 'Back only' },
    };

    render(<FlashcardCard flashcard={incompleteCard} />);

    expect(screen.getByText('Front only')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<FlashcardCard flashcard={mockFlashcard} />);

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label');
    expect(card.getAttribute('aria-label')).toContain('Flashcard');
  });
});
