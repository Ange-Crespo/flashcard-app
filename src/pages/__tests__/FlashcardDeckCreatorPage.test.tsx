import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FlashcardDeckCreatorPage from '../FlashcardDeckCreatorPage';
import { FlashcardDeckCreator } from '../../components/FlashcardDeckCreator';

vi.mock('../../components/FlashcardDeckCreator', () => ({
  FlashcardDeckCreator: vi.fn(({ onComplete }) => (
    <div>
      <button onClick={onComplete}>Complete</button>
    </div>
  )),
}));

const mockFlashcardDeckCreator = vi.mocked(FlashcardDeckCreator);

describe('FlashcardDeckCreatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render FlashcardDeckCreator component', () => {
    render(
      <MemoryRouter>
        <FlashcardDeckCreatorPage />
      </MemoryRouter>
    );

    expect(mockFlashcardDeckCreator).toHaveBeenCalled();
  });

  it('should pass onComplete handler to FlashcardDeckCreator', () => {
    render(
      <MemoryRouter>
        <FlashcardDeckCreatorPage />
      </MemoryRouter>
    );

    const callArgs = mockFlashcardDeckCreator.mock.calls[0][0];
    expect(callArgs.onComplete).toBeDefined();
    expect(typeof callArgs.onComplete).toBe('function');
  });
});
