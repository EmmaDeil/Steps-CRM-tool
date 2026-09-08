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
    // Log error to console instead of showing modal to users
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo?.componentStack);

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
      // Errors are logged to console in componentDidCatch — no overlay shown
      return null;
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
