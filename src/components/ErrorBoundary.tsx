import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'react-feather';
import { logger } from '../lib/logger';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using logger
    logger.error('ErrorBoundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // In a real app, you would also log the error to an error reporting service
    // Example: errorReportingService.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <div className="error-boundary__icon">
              <AlertTriangle size={48} />
            </div>

            <h2 className="error-boundary__title">
              Oops! Quelque chose s'est mal passé
            </h2>

            <p className="error-boundary__message">
              Nous avons rencontré une erreur inattendue. Veuillez réessayer.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary__details">
                <summary>Détails de l'erreur (mode développement)</summary>
                <pre className="error-boundary__error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-boundary__actions">
              <button
                className="error-boundary__retry-btn"
                onClick={this.handleRetry}
                aria-label="Réessayer"
              >
                <RefreshCw size={20} />
                Réessayer
              </button>

              <button
                className="error-boundary__reload-btn"
                onClick={() => window.location.reload()}
                aria-label="Recharger la page"
              >
                Recharger la page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version of ErrorBoundary for functional components
 * Returns a function that can be used to handle errors in functional components
 *
 * @example
 * const handleError = useErrorHandler();
 * try {
 *   // some code
 * } catch (error) {
 *   handleError(error);
 * }
 */
export function useErrorHandler() {
  return (
    error: Error | unknown,
    errorInfo?: ErrorInfo | Record<string, unknown>
  ) => {
    if (error instanceof Error) {
      logger.error('Error caught by useErrorHandler', error, {
        ...(errorInfo && typeof errorInfo === 'object' ? errorInfo : {}),
        componentStack:
          errorInfo &&
          typeof errorInfo === 'object' &&
          'componentStack' in errorInfo
            ? String(errorInfo.componentStack)
            : undefined,
      });
    } else {
      logger.error('Error caught by useErrorHandler', error, {
        ...(errorInfo && typeof errorInfo === 'object' ? errorInfo : {}),
      });
    }
    // In a real app, you would also log to an error reporting service
    // Example: errorReportingService.captureException(error, { extra: errorInfo });
  };
}
