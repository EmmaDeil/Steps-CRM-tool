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
        <div className="min-h-screen flex items-center justify-center bg-[#f6f7f8] px-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#dbe0e6] bg-white shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">⚠️</div>
              <h2 className="text-xl font-bold mb-2 text-[#111418]">
                Oops! Something went wrong
              </h2>
              <p className="text-sm text-[#617589]">
                We're sorry for the inconvenience. The application encountered
                an unexpected error.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="rounded-md border border-red-300 bg-red-50 text-red-700 p-4 mb-4">
                <strong>Error:</strong> {this.state.error.toString()}
                <details className="mt-2" style={{ whiteSpace: "pre-wrap" }}>
                  {this.state.errorInfo?.componentStack}
                </details>
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md border border-blue-600 text-blue-700 hover:bg-blue-50"
                onClick={this.handleReset}
              >
                <i className="fa-solid fa-rotate-right text-sm"></i>
                Reload Page
              </button>
              <button
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => (window.location.href = "/home")}
              >
                <i className="fa-solid fa-home text-sm"></i>
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
