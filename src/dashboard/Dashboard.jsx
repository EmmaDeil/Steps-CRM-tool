// src/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { onAuthStateChanged } from "firebase/auth";
import { auth, sendVerificationEmail, signOut } from "../firebase";
import LogoutButton from "./LogoutButton";
import toast from "react-hot-toast";
import "./Dashboard.css";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  if (checking)
    return (
      <div className="dashboard-bg d-flex align-items-center justify-content-center min-vh-100">
        <div className="dashboard-card card shadow-lg p-4 mx-auto text-center">
          <span className="text-secondary">Checking authentication...</span>
        </div>
      </div>
    );

  if (!user) {
    return (
      <div className="dashboard-bg d-flex align-items-center justify-content-center min-vh-100">
        <div className="dashboard-card card shadow-lg p-4 mx-auto text-center">
          <span className="text-secondary">Please log in first.</span>
        </div>
      </div>
    );
  }

  // 🚨 User exists but email not verified
  if (!user.emailVerified) {
    const handleResend = async () => {
      setResendDisabled(true);
      setResendMessage("");
      try {
        await sendVerificationEmail(user);
        setResendMessage("Verification email sent! Please check your inbox.");
        toast.success("Verification email sent again!");
        setTimeout(() => setResendDisabled(false), 30000);
      } catch (err) {
        setResendMessage("Failed to send verification email. Try again later.");
        toast.error(err.message);
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
              {resendDisabled
                ? "Resend Disabled (30s)"
                : "Resend Verification Link"}
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

  // ...existing code for verified user dashboard...
  return (
    <div className="dashboard-bg d-flex align-items-center justify-content-center min-vh-100">
      <div className="dashboard-card card shadow-lg p-4 mx-auto text-center">
        <h2 className="dashboard-title text-success mb-2">
          Welcome, {user.displayName || "User"} 👋
        </h2>
        <p className="dashboard-desc text-secondary mb-3">{user.email}</p>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  // If you expect props, define here
};

export default Dashboard;
