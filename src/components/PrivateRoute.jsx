// src/components/PrivateRoute.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { sendVerificationEmail, signOut } from "../noFirebase";
import toast from "react-hot-toast";

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  // If user is not logged in, redirect to login
  if (!currentUser) {
    // App routes use '/' for the auth page — redirect there instead of '/auth'
    return <Navigate to="/" replace />;
  }

  // If user's provider data is missing or not password-based, treat as verified
  const isPasswordProvider =
    currentUser.providerData && currentUser.providerData[0]
      ? currentUser.providerData[0].providerId === "password"
      : false;

  // If user’s email is not verified (only for email/password accounts)
  if (isPasswordProvider && !currentUser.emailVerified) {
    const handleResend = async () => {
      setResendDisabled(true);
      setResendMessage("");
      try {
        await sendVerificationEmail(currentUser);
        setResendMessage("Verification email sent! Please check your inbox.");
        toast.success("Verification email sent again!");
        setTimeout(() => setResendDisabled(false), 30000);
      } catch (err) {
        setResendMessage("Failed to send verification email. Try again later.");
        toast.error(err.message || "Failed to send verification email");
        setResendDisabled(false);
      }
    };

    const handleLogout = async () => {
      try {
        await signOut();
        toast.success("Logged out");
      } catch (error) {
        toast.error(error?.message || "Logout failed");
      }
    };

    return (
      <div className="dashboard-bg d-flex align-items-center justify-content-center min-vh-100">
        <div className="dashboard-card card shadow-lg p-4 mx-auto text-center">
          <div className="mb-3">
            <svg
              width="48"
              height="48"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="dashboard-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M12 20h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
              />
            </svg>
          </div>
          <h2 className="dashboard-title text-danger mb-2">
            Email Not Verified
          </h2>
          <p className="dashboard-desc mb-3">
            Please verify your email before accessing the dashboard.
          </p>
          {resendMessage && (
            <div className="alert alert-info text-center mb-3 animate-fade-in">
              {resendMessage}
            </div>
          )}
          <div className="d-flex gap-2 w-100">
            <button
              onClick={handleResend}
              disabled={resendDisabled}
              className={`btn btn-primary flex-fill ${
                resendDisabled ? "disabled" : ""
              }`}
            >
              {resendDisabled ? "Disabled (30s)" : "Resend Verification Link"}
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-outline-secondary flex-fill"
            >
              Logout
            </button>
          </div>
        </div>
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
