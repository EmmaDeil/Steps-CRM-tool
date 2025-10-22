// src/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center">
        <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600">
            Email Not Verified
          </h2>
          <p className="text-gray-600 mt-2">
            Please verify your email before accessing the dashboard.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={handleResend}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Resend Verification Email
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
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

export default Dashboard;
