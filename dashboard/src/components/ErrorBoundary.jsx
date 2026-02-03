import { Component } from 'react';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the whole page.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    // In production, you would send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="error-boundary">
          <div className="error-content">
            <span className="error-icon">WARN</span>
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            <button onClick={this.handleRetry} className="retry-btn">
              Try Again
            </button>
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 300px;
              padding: var(--space-8);
            }
            .error-content {
              text-align: center;
              max-width: 400px;
            }
            .error-icon {
              font-size: 3rem;
              display: block;
              margin-bottom: var(--space-4);
            }
            .error-content h2 {
              margin: 0 0 var(--space-2) 0;
              color: var(--color-danger);
            }
            .error-content p {
              color: var(--color-text-secondary);
              margin: 0 0 var(--space-4) 0;
            }
            .retry-btn {
              background: var(--color-primary-600);
              color: white;
              border: none;
              padding: var(--space-2) var(--space-4);
              border-radius: var(--radius-md);
              cursor: pointer;
              font-weight: 500;
              transition: background 0.2s;
            }
            .retry-btn:hover {
              background: var(--color-primary-700);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
