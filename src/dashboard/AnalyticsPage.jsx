// src/dashboard/AnalyticsPage.jsx
import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Analytics from "../components/modules/Analytics";
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0f0f1e]">
        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] shadow-lg p-6 text-center">
          <span className="text-sm text-[#617589] dark:text-gray-400">
            Loading...
          </span>
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
      <Analytics />
    </div>
  );
};

export default AnalyticsPage;
