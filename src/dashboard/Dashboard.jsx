// src/dashboard/Dashboard.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import Navbar from "../components/Navbar";
import Module from "../components/Module";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (q) => {
    setSearchQuery(q || "");
    navigate("/modules");
  };

  if (!isLoaded) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-card">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-secondary">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <Navbar
        active="home"
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearchSubmit}
      />
      <Module searchQuery={searchQuery} />
    </div>
  );
};

Dashboard.propTypes = {
  // If you expect props, define here
};

export default Dashboard;
