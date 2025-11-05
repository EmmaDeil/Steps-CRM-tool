import React from "react";
import PropTypes from "prop-types";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Instead of forcing navigation to the dashboard, reload the current page
    // so the user stays on the same route if they prefer.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
          <div className="card shadow-lg p-4" style={{ maxWidth: "600px" }}>
            <div className="text-center mb-4">
              <div className="display-1 mb-3">⚠️</div>
              <h2 className="mb-3">Oops! Something went wrong</h2>
              <p className="text-secondary mb-4">
                We're sorry for the inconvenience. The application encountered
                an unexpected error.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="alert alert-danger mb-4">
                <strong>Error:</strong> {this.state.error.toString()}
                <details className="mt-2" style={{ whiteSpace: "pre-wrap" }}>
                  {this.state.errorInfo?.componentStack}
                </details>
              </div>
            )}

            <div className="d-flex gap-2 justify-content-center">
              <button className="btn btn-primary" onClick={this.handleReset}>
                Reload Page
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
