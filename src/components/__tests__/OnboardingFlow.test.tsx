import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { OnboardingFlow } from '../OnboardingFlow';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock the CSS import
vi.mock('../OnboardingFlow.css', () => ({}));

describe('OnboardingFlow', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the first step with welcome content', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);

    await waitFor(
      () => {
        expect(
          screen.getByText('Welcome to Flashcard Learning')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Learn effectively with spaced repetition')
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'This app helps you learn and memorize information using flashcards. Each card has a question on the front and an answer on the back. Your progress is tracked locally in your browser for privacy.'
          )
        ).toBeInTheDocument();
      },
      { timeout: 100 }
    );
  });

  it('shows progress indicators', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);

    await waitFor(
      () => {
        const progressDots = screen
          .getAllByRole('generic')
          .filter(el => el.className.includes('progress-dot'));
        expect(progressDots).toHaveLength(4);
        expect(progressDots[0]).toHaveClass('active');
      },
      { timeout: 100 }
    );
  });

  it('navigates through all steps with Next button', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);

    // Step 1: Welcome
    await waitFor(
      () => {
        expect(
          screen.getByText('Welcome to Flashcard Learning')
        ).toBeInTheDocument();
      },
      { timeout: 100 }
    );

    // Click Next
    fireEvent.click(screen.getByText('Next'));

    // Step 2: How to Use Flashcards
    await waitFor(() => {
      expect(screen.getByText('How to Use Flashcards')).toBeInTheDocument();
    });

    // Click Next
    fireEvent.click(screen.getByText('Next'));

    // Step 3: Track Your Progress
    await waitFor(() => {
      expect(screen.getByText('Track Your Progress')).toBeInTheDocument();
    });

    // Click Next
    fireEvent.click(screen.getByText('Next'));

    // Step 4: Science-Based Learning
    await waitFor(() => {
      expect(screen.getByText('Science-Based Learning')).toBeInTheDocument();
    });
  });

  it('shows gesture tutorial on step 2', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);

    // Navigate to step 2
    fireEvent.click(screen.getByText('Suivant'));

    await waitFor(() => {
      expect(screen.getByText('How to Use Flashcards')).toBeInTheDocument();
      expect(screen.getByText('Simple and intuitive')).toBeInTheDocument();
      expect(screen.getByText("Don't Know")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
      expect(screen.getByText('Know It')).toBeInTheDocument();
    });
  });

  it('calls onComplete when Get Started is clicked on last step', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);

    // Navigate to last step
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Start Learning'));

    await waitFor(
      () => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: 500 }
    );
  });

  it('calls onComplete when Skip is clicked', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);

    fireEvent.click(screen.getByText('Skip'));

    await waitFor(
      () => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: 500 }
    );
  });

  it('shows correct button text for each step', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);

    // Step 1-3 should show "Next"
    await waitFor(
      () => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      },
      { timeout: 100 }
    );

    // Navigate to last step
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
    });
  });

  it('updates progress indicators as user progresses', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);

    let progressDots: HTMLElement[];

    await waitFor(
      () => {
        progressDots = screen
          .getAllByRole('generic')
          .filter(el => el.className.includes('progress-dot'));

        // First dot should be active initially
        expect(progressDots[0]).toHaveClass('active');
      },
      { timeout: 100 }
    );

    // Click Next to go to step 2
    fireEvent.click(screen.getByText('Next'));

    await waitFor(
      () => {
        // First two dots should be active
        expect(progressDots[0]).toHaveClass('active');
        expect(progressDots[1]).toHaveClass('active');
      },
      { timeout: 100 }
    );
  });
});
