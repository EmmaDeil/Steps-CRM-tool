// src/components/PrivateRoute.jsx
import React from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

const PrivateRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();

  // Wait for Clerk to finish loading
  if (!isLoaded) {
    return (
      <div className="dashboard-bg d-flex align-items-center justify-content-center min-vh-100">
        <div className="dashboard-card card shadow-lg p-4 mx-auto text-center">
          <span className="text-secondary">Loading...</span>
        </div>
      </div>
    );
  }

  // If user is not signed in, redirect to auth page
  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated, render children
  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PrivateRoute;
