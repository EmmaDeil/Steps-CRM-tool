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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Spinner */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-500 animate-spin"></div>
          </div>
          {/* Loading Text */}
          <p className="text-gray-600 font-medium text-lg">
            Loading your workspace...
          </p>
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
