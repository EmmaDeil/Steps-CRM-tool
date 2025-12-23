// src/dashboard/AnalyticsPage.jsx
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import DashboardAnalytics from "../components/DashboardAnalytics";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";

const AnalyticsPage = () => {
  const { user, isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (q) => {
    setSearchQuery(q || "");
    // Sending users to modules when they submit a module search
    navigate("/modules");
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await apiService.get("/api/analytics");
        if (mounted) setData(res.data || {});
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchMaterialRequests = async () => {
      try {
        const res = await apiService.get("/api/material-requests");
        if (mounted) setMaterialRequests(res.data || []);
      } catch (err) {}
    };

    const fetchPurchaseOrders = async () => {
      try {
        const res = await apiService.get("/api/purchase-orders");
        if (mounted) setPurchaseOrders(res.data || []);
      } catch (err) {}
    };

    fetchAnalytics();
    fetchMaterialRequests();
    fetchPurchaseOrders();
    return () => {
      mounted = false;
    };
  }, []);

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
          {loading && <div className="p-4">Loading analytics...</div>}
          {error && (
            <div className="p-4 text-danger">Failed to load analytics.</div>
          )}
          {!loading && !error && (
            <DashboardAnalytics
              data={data}
              materialRequests={materialRequests}
              purchaseOrders={purchaseOrders}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
