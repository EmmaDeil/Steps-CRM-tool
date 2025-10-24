// src/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { onAuthStateChanged } from "firebase/auth";
import { auth, signOut } from "../firebase";
import LogoutButton from "./LogoutButton";
import Navbar from "../components/Navbar";
import Module from "../components/Module";
import toast from "react-hot-toast";
import "./Dashboard.css";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out");
    } catch (error) {
      toast.error(error?.message || "Logout failed");
    }
  };

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

  // verification UI moved to PrivateRoute.jsx

  // ...existing code for verified user dashboard...
  return (
    <div>
      <Navbar
        active="home"
        user={user}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="dashboard-bg d-flex align-items-center justify-content-center min-vh-100">
        <div className="dashboard-card card shadow-lg p-4 mx-auto text-center">
          <Module searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  // If you expect props, define here
};

export default Dashboard;
