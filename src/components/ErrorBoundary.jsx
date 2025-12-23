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
    // Error boundary captured the error, displaying fallback UI
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
        <div className="min-h-screen flex items-center justify-center bg-[#f6f7f8] dark:bg-background-dark px-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">⚠️</div>
              <h2 className="text-xl font-bold mb-2 text-[#111418] dark:text-white">
                Oops! Something went wrong
              </h2>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                We're sorry for the inconvenience. The application encountered
                an unexpected error.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="rounded-md border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200 p-4 mb-4">
                <strong>Error:</strong> {this.state.error.toString()}
                <details className="mt-2" style={{ whiteSpace: "pre-wrap" }}>
                  {this.state.errorInfo?.componentStack}
                </details>
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md border border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={this.handleReset}
              >
                <span className="material-symbols-outlined text-base">
                  refresh
                </span>
                Reload Page
              </button>
              <button
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => (window.location.href = "/home")}
              >
                <span className="material-symbols-outlined text-base">
                  home
                </span>
                Home
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
