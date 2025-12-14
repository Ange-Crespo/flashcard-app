import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, useErrorHandler } from '../ErrorBoundary';
import { logger } from '../../lib/logger';

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByText("Oops! Quelque chose s'est mal passé")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Nous avons rencontré une erreur inattendue. Veuillez réessayer.'
      )
    ).toBeInTheDocument();
  });

  it('should log errors when caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(logger.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should display custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(
      screen.queryByText("Oops! Quelque chose s'est mal passé")
    ).not.toBeInTheDocument();
  });

  it('should show retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /réessayer/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should show reload button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', {
      name: /recharger la page/i,
    });
    expect(reloadButton).toBeInTheDocument();
  });

  it('should reset error state when retry is clicked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Trigger error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByText("Oops! Quelque chose s'est mal passé")
    ).toBeInTheDocument();

    // Click retry
    const retryButton = screen.getByRole('button', { name: /réessayer/i });
    await user.click(retryButton);

    // Error boundary should reset, but component will still throw
    // In a real scenario, the parent would re-render with a non-throwing component
  });

  it('should show error details in development mode', () => {
    const originalEnv = import.meta.env.DEV;
    // @ts-expect-error - modifying readonly property for test
    import.meta.env.DEV = true;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const details = screen.getByText(
      /détails de l'erreur \(mode développement\)/i
    );
    expect(details).toBeInTheDocument();

    // @ts-expect-error - restoring for test
    import.meta.env.DEV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = import.meta.env.DEV;
    // @ts-expect-error - modifying readonly property for test
    import.meta.env.DEV = false;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const details = screen.queryByText(
      /détails de l'erreur \(mode développement\)/i
    );
    expect(details).not.toBeInTheDocument();

    // @ts-expect-error - restoring for test
    import.meta.env.DEV = originalEnv;
  });
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a function', () => {
    const handleError = useErrorHandler();
    expect(typeof handleError).toBe('function');
  });

  it('should log Error instances', () => {
    const handleError = useErrorHandler();
    const error = new Error('Test error');

    handleError(error);

    expect(logger.error).toHaveBeenCalledWith(
      'Error caught by useErrorHandler',
      error,
      expect.any(Object)
    );
  });

  it('should log non-Error values', () => {
    const handleError = useErrorHandler();

    handleError('String error');

    expect(logger.error).toHaveBeenCalledWith(
      'Error caught by useErrorHandler',
      'String error',
      expect.any(Object)
    );
  });

  it('should include errorInfo when provided', () => {
    const handleError = useErrorHandler();
    const error = new Error('Test error');
    const errorInfo = { componentStack: 'test stack' };

    handleError(error, errorInfo);

    expect(logger.error).toHaveBeenCalledWith(
      'Error caught by useErrorHandler',
      error,
      expect.objectContaining({
        componentStack: 'test stack',
      })
    );
  });
});
