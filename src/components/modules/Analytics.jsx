import React, { useState, useEffect } from "react";
import DashboardAnalytics from "../DashboardAnalytics";
import { apiService } from "../../services/api";

const Analytics = () => {
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
        console.error("Failed to fetch analytics:", err);
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchMaterialRequests = async () => {
      try {
        const res = await apiService.get("/api/material-requests");
        if (mounted) setMaterialRequests(res.data || []);
      } catch (err) {
        console.error("Failed to fetch material requests:", err);
      }
    };

    const fetchPurchaseOrders = async () => {
      try {
        const res = await apiService.get("/api/purchase-orders");
        if (mounted) setPurchaseOrders(res.data || []);
      } catch (err) {
        console.error("Failed to fetch purchase orders:", err);
      }
    };

    fetchAnalytics();
    fetchMaterialRequests();
    fetchPurchaseOrders();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading analytics...</span>
        </div>
        <p className="mt-3 text-secondary">Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Failed to load analytics data. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <DashboardAnalytics
        data={data}
        materialRequests={materialRequests}
        purchaseOrders={purchaseOrders}
      />
    </div>
  );
};

export default Analytics;
