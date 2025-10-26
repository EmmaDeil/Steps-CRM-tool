// src/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import LogoutButton from "./LogoutButton";
import Navbar from "../components/Navbar";
import Module from "../components/Module";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./Dashboard.css";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Firebase removed: simply navigate to the auth/root page and show toast
    toast.success("Logged out");
    navigate("/");
  };

  const handleSearchSubmit = (q) => {
    // set the query and navigate to modules list so the Module component displays filtered results
    setSearchQuery(q || "");
    navigate("/modules");
  };

  useEffect(() => {
    // Firebase removed: no auth provider — mark checking as finished.
    setChecking(false);
    setUser(null);
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
        onSearch={handleSearchSubmit}
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
