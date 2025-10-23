// src/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { onAuthStateChanged } from "firebase/auth";
import { auth, sendVerificationEmail, signOut } from "../firebase";
import LogoutButton from "./LogoutButton";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  if (checking)
    return (
      <div className="h-screen flex items-center justify-center text-gray-600">
        Checking authentication...
      </div>
    );

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-600">
        Please log in first.
      </div>
    );
  }

  // 🚨 User exists but email not verified
  if (!user.emailVerified) {
    const handleResend = async () => {
      try {
        await sendVerificationEmail(user);
        toast.success("Verification email sent again!");
      } catch (err) {
        toast.error(err.message);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full flex flex-col items-center">
          <div className="mb-4">
            <svg
              width="48"
              height="48"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="mx-auto text-red-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M12 20h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Email Not Verified
          </h2>
          <p className="text-gray-700 mb-6">
            Please verify your email before accessing the dashboard.
          </p>
          <div className="flex gap-4 w-full">
            <button
              onClick={handleResend}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Resend Verification Link
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Verified user dashboard
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center">
      <div className="bg-white shadow-lg p-6 rounded-xl max-w-md w-full">
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-20 h-20 rounded-full mx-auto mb-4"
          />
        )}
        <h2 className="text-xl font-semibold">
          Welcome, {user.displayName || "User"} 👋
        </h2>
        <p className="text-gray-500 mt-2">{user.email}</p>

        <div className="mt-6">
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
