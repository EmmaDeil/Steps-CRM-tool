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
    // set the query and navigate to modules list so the Module component displays filtered results
    setSearchQuery(q || "");
    navigate("/modules");
  };

  if (!isLoaded) {
    return (
      <div className="dashboard-bg d-flex align-items-center justify-content-center min-vh-100">
        <div className="dashboard-card card shadow-lg p-4 mx-auto text-center">
          <span className="text-secondary">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar
        active="home"
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearchSubmit}
      />
      <div className="dashboard-bg">
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
