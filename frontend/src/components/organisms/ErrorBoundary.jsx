/**
 * ErrorBoundary Component
 *
 * React Error Boundary for catching and displaying component errors.
 * Provides fallback UI and error reporting.
 *
 * @param {ReactNode} props.children - Child components to wrap
 * @param {ReactNode} props.fallback - Custom fallback UI
 */

import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Store error info in state
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            padding: 40,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 8,
            margin: 24
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>

          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#DC2626',
              marginBottom: 8
            }}
          >
            Something went wrong
          </h2>

          <p
            style={{
              fontSize: 12,
              color: '#7F1D1D',
              textAlign: 'center',
              marginBottom: 16,
              maxWidth: 400
            }}
          >
            An unexpected error occurred. Please refresh the page or contact support if the
            problem persists.
          </p>

          {this.state.error && (
            <details
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #FCA5A5',
                borderRadius: 6,
                padding: 12,
                marginBottom: 16,
                maxWidth: 600,
                width: '100%'
              }}
            >
              <summary
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#DC2626',
                  cursor: 'pointer',
                  marginBottom: 8
                }}
              >
                Error Details
              </summary>
              <div
                style={{
                  fontSize: 10,
                  color: '#7F1D1D',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </div>
            </details>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              ':hover': { backgroundColor: '#B91C1C' }
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#B91C1C';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#DC2626';
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
