// src/dashboard/AnalyticsPage.jsx
import React, { useState } from "react";
import Navbar from "../components/Navbar";
import DashboardAnalytics from "../components/DashboardAnalytics";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const AnalyticsPage = () => {
  const { user, isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (q) => {
    setSearchQuery(q || "");
    // Sending users to modules when they submit a module search
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
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearchSubmit}
      />
      <div className="dashboard-bg">
        <div className="dashboard-card card shadow-lg p-4 mx-auto text-center">
          <DashboardAnalytics />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
