// src/components/PrivateRoute.jsx
import React from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();

  // If user is not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // If user’s email is not verified (for email/password accounts)
  if (
    currentUser.providerData[0].providerId === "password" &&
    !currentUser.emailVerified
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl font-semibold text-red-500 mb-3">
          Email not verified
        </h2>
        <p className="text-gray-700">
          Please verify your email before accessing the dashboard.
        </p>
      </div>
    );
  }

  // Otherwise, render the protected content
  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PrivateRoute;
