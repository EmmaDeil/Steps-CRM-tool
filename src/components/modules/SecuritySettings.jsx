import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import webSocketService from "../../services/websocket";

const SecuritySettings = () => {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();

  // Loading States
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  // Password Policy State
  const [passwordPolicy, setPasswordPolicy] = useState({
    enabled: true,
    minLength: 12,
    specialChars: true,
    expiry: 90,
  });

  // Multi-Factor Auth State
  const [mfaSettings, setMfaSettings] = useState({
    enabled: true,
    method: "Authenticator App",
    enforcement: "All Users",
    gracePeriod: "None",
  });

  // Session Control State
  const [sessionControl, setSessionControl] = useState({
    idleTimeout: 30,
    concurrentSessions: 3,
    activeUsers: 0,
  });

  // Activity Logs State
  const [activityLogs, setActivityLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLogDetailsModal, setShowLogDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  // Bulk Actions
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Notification Rules
  const [notificationRules, setNotificationRules] = useState([]);

  // Settings History
  const [settingsHistory, setSettingsHistory] = useState([]);
  const [showSettingsHistory, setShowSettingsHistory] = useState(false);

  // Phase 2 Enhancement States
  const [showSessionManagement, setShowSessionManagement] = useState(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [show2FAWizard, setShow2FAWizard] = useState(false);
  const [showComplianceReports, setShowComplianceReports] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Fetch security settings
  const fetchSecuritySettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const response = await apiService.get("/api/security/settings");
      if (response.data) {
        setPasswordPolicy(response.data.passwordPolicy);
        setMfaSettings(response.data.mfaSettings);
        setSessionControl(response.data.sessionControl);
      }
    } catch (error) {
      console.error("Error fetching security settings:", error);
      toast.error("Failed to load security settings");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Fetch notification rules
  const fetchNotificationRules = useCallback(async () => {
    try {
      const response = await apiService.get("/api/security/notification-rules");
      if (response.data) {
        setNotificationRules(response.data.rules || []);
      }
    } catch (error) {
      console.error("Error fetching notification rules:", error);
    }
  }, []);

  // Fetch settings history
  const fetchSettingsHistory = useCallback(async () => {
    try {
      const response = await apiService.get("/api/security/settings-history");
      if (response.data) {
        setSettingsHistory(response.data.history || []);
      }
    } catch (error) {
      console.error("Error fetching settings history:", error);
    }
  }, []);

  // Fetch active sessions
  const fetchActiveSessions = useCallback(async () => {
    try {
      const response = await apiService.get("/api/security/active-sessions");
      if (response.data) {
        setActiveSessions(response.data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      toast.error("Failed to load active sessions");
    }
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await apiService.get("/api/security/analytics");
      if (response.data) {
        setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    }
  }, []);

  // Fetch active users count
  const fetchActiveUsers = useCallback(async () => {
    try {
      const response = await apiService.get("/api/security/active-users");
      if (response.data) {
        setSessionControl((prev) => ({
          ...prev,
          activeUsers: response.data.count,
        }));
      }
    } catch (error) {
      console.error("Error fetching active users:", error);
    }
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (actionFilter && actionFilter !== "All Actions") {
        params.append("action", actionFilter);
      }
      if (statusFilter && statusFilter !== "All Statuses") {
        params.append("status", statusFilter);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      // Add date filtering
      if (dateFilter !== "All Time") {
        let startDate;

        if (
          dateFilter === "Custom Range" &&
          customDateRange.start &&
          customDateRange.end
        ) {
          startDate = new Date(customDateRange.start);
          params.append("endDate", new Date(customDateRange.end).toISOString());
        } else {
          const now = new Date();
          switch (dateFilter) {
            case "Last 24 Hours":
              startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case "Last 7 Days":
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "Last 30 Days":
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case "Last 90 Days":
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            case "Last 6 Months":
              startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
              break;
            case "Last Year":
              startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              break;
            case "Today":
              startDate = new Date(now.setHours(0, 0, 0, 0));
              break;
            case "Yesterday": {
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              startDate = new Date(yesterday.setHours(0, 0, 0, 0));
              params.append(
                "endDate",
                new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()
              );
              break;
            }
            case "This Week": {
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay());
              startDate = new Date(weekStart.setHours(0, 0, 0, 0));
              break;
            }
            case "This Month":
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case "This Quarter": {
              const quarter = Math.floor(now.getMonth() / 3);
              startDate = new Date(now.getFullYear(), quarter * 3, 1);
              break;
            }
            case "All Time":
              startDate = null;
              break;
            default:
              startDate = null;
          }
        }

        if (startDate) {
          params.append("startDate", startDate.toISOString());
        }
      }

      const response = await apiService.get(
        `/api/audit-logs?${params.toString()}`
      );
      if (response.data) {
        setActivityLogs(response.data.logs || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLogsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    actionFilter,
    statusFilter,
    searchQuery,
    dateFilter,
    customDateRange,
  ]);

  // Initial load
  useEffect(() => {
    fetchSecuritySettings();
    fetchActiveUsers();
    fetchAuditLogs();
    fetchNotificationRules();
    fetchSettingsHistory();
  }, [
    fetchSecuritySettings,
    fetchActiveUsers,
    fetchAuditLogs,
    fetchNotificationRules,
    fetchSettingsHistory,
  ]);

  // WebSocket real-time updates
  useEffect(() => {
    let listenerId;

    if (realTimeEnabled) {
      // Connect to WebSocket
      webSocketService.connect();
      webSocketService.subscribeToSecurityLogs();

      // Listen for new audit logs
      listenerId = webSocketService.onNewAuditLog((newLog) => {
        console.log("📨 Real-time log received:", newLog);

        // Add new log to the beginning of the list
        setActivityLogs((prev) => {
          const updated = [newLog, ...prev];
          // Keep only the first page worth of logs
          return updated.slice(0, pagination.limit);
        });

        // Update pagination total
        setPagination((prev) => ({
          ...prev,
          total: prev.total + 1,
          pages: Math.ceil((prev.total + 1) / prev.limit),
        }));

        // Show toast notification for important events
        if (newLog.status === "Failed" || newLog.action === "Access Denied") {
          toast.error(
            `Security Alert: ${newLog.action} - ${newLog.actor.userName}`
          );
        }
      });

      toast.success("🔴 Real-time updates enabled");
    } else {
      // Disconnect when disabled
      if (webSocketService.isConnected()) {
        webSocketService.unsubscribeFromSecurityLogs();
        toast("Real-time updates disabled", { icon: "⏸️" });
      }
    }

    // Cleanup
    return () => {
      if (listenerId) {
        webSocketService.removeListener(listenerId);
      }
      if (!realTimeEnabled && webSocketService.isConnected()) {
        webSocketService.unsubscribeFromSecurityLogs();
      }
    };
  }, [realTimeEnabled, pagination.limit]);

  // Disconnect WebSocket on unmount
  useEffect(() => {
    return () => {
      if (webSocketService.isConnected()) {
        webSocketService.disconnect();
      }
    };
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchAuditLogs();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Refetch when filters change
  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, statusFilter, dateFilter, pagination.page]);

  // Fetch sessions when modal opens
  useEffect(() => {
    if (showSessionManagement) {
      fetchActiveSessions();
    }
  }, [showSessionManagement, fetchActiveSessions]);

  // Fetch analytics when modal opens
  useEffect(() => {
    if (showAnalyticsDashboard) {
      fetchAnalytics();
    }
  }, [showAnalyticsDashboard, fetchAnalytics]);

  // Handle export CSV
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter && actionFilter !== "All Actions")
        params.append("action", actionFilter);
      if (statusFilter && statusFilter !== "All Statuses")
        params.append("status", statusFilter);

      const response = await fetch(
        `${
          apiService.defaults.baseURL
        }/api/audit-logs/export?${params.toString()}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV");
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLogs([]);
      setSelectAll(false);
    } else {
      setSelectedLogs(activityLogs.map((log) => log._id));
      setSelectAll(true);
    }
  };

  const handleSelectLog = (logId) => {
    setSelectedLogs((prev) => {
      if (prev.includes(logId)) {
        return prev.filter((id) => id !== logId);
      } else {
        return [...prev, logId];
      }
    });
  };

  // Handle bulk export
  const handleBulkExport = async () => {
    if (selectedLogs.length === 0) {
      toast.error("No logs selected");
      return;
    }

    try {
      const response = await fetch(
        `${apiService.defaults.baseURL}/api/audit-logs/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logIds: selectedLogs }),
        }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selected-logs-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Exported ${selectedLogs.length} logs`);
      setSelectedLogs([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast.error("Failed to export logs");
    }
  };

  // Handle update password policy
  const handleUpdatePasswordPolicy = async (updatedPolicy) => {
    try {
      await apiService.patch("/api/security/settings", {
        passwordPolicy: updatedPolicy,
      });
      setPasswordPolicy(updatedPolicy);
      setShowPasswordModal(false);
      toast.success("Password policy updated");
      fetchSettingsHistory(); // Refresh history
    } catch (error) {
      console.error("Error updating password policy:", error);
      toast.error("Failed to update password policy");
    }
  };

  // Handle update MFA settings
  const handleUpdateMFASettings = async (updatedSettings) => {
    try {
      await apiService.patch("/api/security/settings", {
        mfaSettings: updatedSettings,
      });
      setMfaSettings(updatedSettings);
      setShowMFAModal(false);
      toast.success("MFA settings updated");
      fetchSettingsHistory();
    } catch (error) {
      console.error("Error updating MFA settings:", error);
      toast.error("Failed to update MFA settings");
    }
  };

  // Handle update session control
  const handleUpdateSessionControl = async (updatedControl) => {
    try {
      await apiService.patch("/api/security/settings", {
        sessionControl: updatedControl,
      });
      setSessionControl(updatedControl);
      setShowSessionModal(false);
      toast.success("Session control updated");
      fetchSettingsHistory();
    } catch (error) {
      console.error("Error updating session control:", error);
      toast.error("Failed to update session control");
    }
  };

  // Handle panic logout all users
  const handlePanicLogout = async () => {
    if (
      !window.confirm(
        "Are you sure you want to log out ALL users? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await apiService.post("/api/security/panic-logout");
      toast.success("All users have been logged out");
      fetchActiveUsers();
    } catch (error) {
      console.error("Error during panic logout:", error);
      toast.error("Failed to logout all users");
    }
  };

  // Handle add notification rule
  const handleAddNotificationRule = async (rule) => {
    try {
      const response = await apiService.post(
        "/api/security/notification-rules",
        rule
      );
      setNotificationRules((prev) => [...prev, response.data.rule]);
      toast.success("Notification rule added");
    } catch (error) {
      console.error("Error adding notification rule:", error);
      toast.error("Failed to add notification rule");
    }
  };

  // Handle delete notification rule
  const handleDeleteNotificationRule = async (ruleId) => {
    try {
      await apiService.delete(`/api/security/notification-rules/${ruleId}`);
      setNotificationRules((prev) =>
        prev.filter((rule) => rule._id !== ruleId)
      );
      toast.success("Notification rule deleted");
    } catch (error) {
      console.error("Error deleting notification rule:", error);
      toast.error("Failed to delete notification rule");
    }
  };

  // Handle view log details
  const handleViewLogDetails = (log) => {
    setSelectedLog(log);
    setShowLogDetailsModal(true);
  };

  // Handle apply custom date range
  const handleApplyCustomDate = () => {
    if (!customDateRange.start || !customDateRange.end) {
      toast.error("Please select both start and end dates");
      return;
    }
    setDateFilter("Custom Range");
    setShowCustomDateModal(false);
    // fetchAuditLogs will be triggered by useEffect
  };

  const getStatusColor = (status) => {
    return status === "Success"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
  };

  const getStatusIcon = (status) => {
    return status === "Success" ? "fa-circle-check" : "fa-circle-xmark";
  };

  const getActionColor = (color) => {
    const colors = {
      blue: "text-blue-600",
      purple: "text-purple-600",
      red: "text-red-600",
      orange: "text-orange-600",
    };
    return colors[color] || "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Admin Controls", href: "/home/7", icon: "fa-user-shield" },
          { label: "Security Settings", icon: "fa-shield" },
        ]}
      />

      <div className="w-full p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#111418] mb-2">
              Security Settings
            </h1>
            <p className="text-gray-600">
              Manage system-wide security configurations and monitor audit logs.
            </p>
          </div>
        </div>

        {/* Security Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {settingsLoading ? (
            // Loading skeletons
            [...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-12"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded-lg w-full mt-4"></div>
              </div>
            ))
          ) : (
            <>
              {/* Password Policy */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-key text-blue-600 text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#111418]">
                        Password Policy
                      </h3>
                      <button className="w-6 h-6 rounded-full bg-blue-600 relative flex-shrink-0 mt-1">
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full transition-transform"></span>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Strict rules to ensure strong user credentials.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Min Length</span>
                      <span className="font-semibold text-gray-900">
                        {passwordPolicy.minLength} chars
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Special Chars</span>
                      <span className="font-semibold text-gray-900">
                        Required
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Expiry</span>
                      <span className="font-semibold text-gray-900">
                        {passwordPolicy.expiry} days
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors text-sm"
                  >
                    Configure Rules
                  </button>
                </div>
              </div>

              {/* Multi-Factor Auth */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-mobile-screen text-green-600 text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#111418]">
                        Multi-Factor Auth
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium mt-1">
                        <i className="fa-solid fa-circle-check"></i>
                        Enabled
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Add an extra layer of security for all accounts.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Method</span>
                      <span className="font-semibold text-gray-900">
                        {mfaSettings.method}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Enforcement</span>
                      <span className="font-semibold text-gray-900">
                        {mfaSettings.enforcement}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Grace Period</span>
                      <span className="font-semibold text-gray-900">
                        {mfaSettings.gracePeriod}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowMFAModal(true)}
                    className="w-full mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors text-sm"
                  >
                    Manage Providers
                  </button>
                </div>
              </div>

              {/* Session Control */}
              <div className="bg-white rounded-lg border-2 border-red-300 bg-gradient-to-br from-red-50 to-white overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-clock text-red-600 text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#111418]">
                        Session Control
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium mt-1">
                        Panic Logout
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage timeouts and active device sessions.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Idle Timeout</span>
                      <span className="font-semibold text-gray-900">
                        {sessionControl.idleTimeout} Mins
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Concurrent Sessions</span>
                      <span className="font-semibold text-gray-900">
                        Max {sessionControl.concurrentSessions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Active Users</span>
                      <span className="font-semibold text-gray-900">
                        {sessionControl.activeUsers} Online
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSessionModal(true)}
                    className="w-full mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors text-sm"
                  >
                    View Active Sessions
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* System Activity Logs */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#111418]">
                  System Activity Logs
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  View and export detailed records of all system events.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedLogs.length > 0 && (
                  <>
                    <span className="text-sm text-gray-600">
                      {selectedLogs.length} selected
                    </span>
                    <button
                      onClick={handleBulkExport}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                      <i className="fa-solid fa-download"></i>
                      Export Selected
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLogs([]);
                        setSelectAll(false);
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <i className="fa-solid fa-bell"></i>
                  Alert Rules
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <i className="fa-solid fa-download"></i>
                  Export All
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    if (e.target.value === "Custom Range") {
                      setShowCustomDateModal(true);
                    } else {
                      setDateFilter(e.target.value);
                    }
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option>All Time</option>
                  <option>Last 24 Hours</option>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>Last 90 Days</option>
                  <option>Last 6 Months</option>
                  <option>Last Year</option>
                  <option>Today</option>
                  <option>Yesterday</option>
                  <option>This Week</option>
                  <option>This Month</option>
                  <option>This Quarter</option>
                  <option>Custom Range</option>
                </select>
              </div>

              <div className="flex-1 relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search by user or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="relative">
                <i className="fa-solid fa-filter absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option>All Actions</option>
                  <option>Login</option>
                  <option>Logout</option>
                  <option>Config Update</option>
                  <option>Password Change</option>
                  <option>MFA Enable</option>
                  <option>MFA Disable</option>
                  <option>User Created</option>
                  <option>User Deleted</option>
                  <option>Permission Change</option>
                  <option>Export</option>
                  <option>Import</option>
                  <option>Access Denied</option>
                  <option>Session Terminated</option>
                  <option>Policy Updated</option>
                  <option>Data Access</option>
                </select>
              </div>

              <div className="relative">
                <i className="fa-solid fa-circle-check absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 px-5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option>All Statuses</option>
                  <option>Success</option>
                  <option>Failed</option>
                </select>
              </div>

              <button
                onClick={() => setShowSettingsHistory(true)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <i className="fa-solid fa-history"></i>
                Settings History
              </button>

              <button
                onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                  realTimeEnabled
                    ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
                title={
                  realTimeEnabled
                    ? "Disable real-time updates"
                    : "Enable real-time updates"
                }
              >
                <i
                  className={`fa-solid ${
                    realTimeEnabled ? "fa-wifi" : "fa-wifi text-gray-400"
                  }`}
                ></i>
                {realTimeEnabled ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Live
                  </>
                ) : (
                  "Real-Time"
                )}
              </button>

              <button
                onClick={() => setShowSessionManagement(true)}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <i className="fa-solid fa-users"></i>
                Active Sessions
              </button>

              <button
                onClick={() => setShowAnalyticsDashboard(true)}
                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <i className="fa-solid fa-chart-line"></i>
                Analytics
              </button>

              <button
                onClick={() => setShowExportOptions(true)}
                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <i className="fa-solid fa-file-export"></i>
                Export
              </button>

              <button
                onClick={() => setShowComplianceReports(true)}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <i className="fa-solid fa-clipboard-check"></i>
                Compliance
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logsLoading ? (
                  // Loading skeleton
                  [...Array(5)].map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-40"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                      </td>
                    </tr>
                  ))
                ) : activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <i className="fa-solid fa-inbox text-gray-300 text-4xl"></i>
                        <p className="text-gray-500 font-medium">
                          No activity logs found
                        </p>
                        <p className="text-gray-400 text-sm">
                          Try adjusting your filters
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedLogs.includes(log._id)}
                          onChange={() => handleSelectLog(log._id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <i className="fa-solid fa-clock text-gray-400"></i>
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                            {log.actor?.initials || "??"}
                          </div>
                          <span className="text-sm text-gray-900">
                            {log.actor?.userName || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium ${getActionColor(
                            log.actionColor
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 font-mono">
                          {log.ipAddress || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {log.description}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            log.status
                          )}`}
                        >
                          <i
                            className={`fa-solid ${getStatusIcon(log.status)}`}
                          ></i>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewLogDetails(log)}
                          className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(Math.min(5, pagination.pages))].map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      pagination.page === pageNum
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {pagination.pages > 5 && (
                <>
                  <span className="px-2 text-gray-500">...</span>
                  <button
                    onClick={() => handlePageChange(pagination.pages)}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm"
                  >
                    {pagination.pages}
                  </button>
                </>
              )}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Policy Modal */}
      {showPasswordModal && (
        <PasswordPolicyModal
          passwordPolicy={passwordPolicy}
          onClose={() => setShowPasswordModal(false)}
          onSave={handleUpdatePasswordPolicy}
        />
      )}

      {/* MFA Settings Modal */}
      {showMFAModal && (
        <MFASettingsModal
          mfaSettings={mfaSettings}
          onClose={() => setShowMFAModal(false)}
          onSave={handleUpdateMFASettings}
        />
      )}

      {/* Session Control Modal */}
      {showSessionModal && (
        <SessionControlModal
          sessionControl={sessionControl}
          onClose={() => setShowSessionModal(false)}
          onSave={handleUpdateSessionControl}
          onPanicLogout={handlePanicLogout}
        />
      )}

      {/* Log Details Modal */}
      {showLogDetailsModal && selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          onClose={() => setShowLogDetailsModal(false)}
        />
      )}

      {/* Custom Date Range Modal */}
      {showCustomDateModal && (
        <CustomDateRangeModal
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
          onClose={() => setShowCustomDateModal(false)}
          onApply={handleApplyCustomDate}
        />
      )}

      {/* Notification Rules Modal */}
      {showNotificationModal && (
        <NotificationRulesModal
          notificationRules={notificationRules}
          onClose={() => setShowNotificationModal(false)}
          onAddRule={handleAddNotificationRule}
          onDeleteRule={handleDeleteNotificationRule}
        />
      )}

      {/* Settings History Modal */}
      {showSettingsHistory && (
        <SettingsHistoryModal
          settingsHistory={settingsHistory}
          onClose={() => setShowSettingsHistory(false)}
        />
      )}

      {/* Session Management Modal */}
      {showSessionManagement && (
        <SessionManagementModal
          isOpen={showSessionManagement}
          onClose={() => setShowSessionManagement(false)}
          sessions={activeSessions}
          onKillSession={async (sessionId) => {
            try {
              await apiService.delete(`/api/security/sessions/${sessionId}`);
              toast.success("Session terminated successfully");
              fetchActiveSessions();
            } catch (error) {
              console.error("Error killing session:", error);
              toast.error("Failed to terminate session");
            }
          }}
          onRefresh={fetchActiveSessions}
        />
      )}

      {/* Analytics Dashboard Modal */}
      {showAnalyticsDashboard && (
        <AnalyticsDashboardModal
          isOpen={showAnalyticsDashboard}
          onClose={() => setShowAnalyticsDashboard(false)}
          data={analyticsData}
        />
      )}

      {/* Export Options Modal */}
      {showExportOptions && (
        <ExportOptionsModal
          isOpen={showExportOptions}
          onClose={() => setShowExportOptions(false)}
          onExport={async (options) => {
            try {
              const { format, dateRange, includeMetadata } = options;
              const params = new URLSearchParams();

              if (dateRange !== "all") {
                params.append("dateRange", dateRange);
              }
              if (!includeMetadata) {
                params.append("noMetadata", "true");
              }

              const response = await apiService.get(
                `/api/audit-logs/export/${format}?${params.toString()}`,
                { responseType: "blob" }
              );

              const blob = new Blob([response.data]);
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `audit-logs-${
                new Date().toISOString().split("T")[0]
              }.${format}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);

              toast.success(`Audit logs exported as ${format.toUpperCase()}`);
              setShowExportOptions(false);
            } catch (error) {
              console.error("Error exporting logs:", error);
              toast.error("Failed to export logs");
            }
          }}
        />
      )}

      {/* Compliance Reports Modal */}
      {showComplianceReports && (
        <ComplianceReportsModal
          isOpen={showComplianceReports}
          onClose={() => setShowComplianceReports(false)}
          onGenerate={async (reportType) => {
            try {
              toast.loading("Generating compliance report...");
              const response = await apiService.post(
                "/api/security/compliance-report",
                {
                  type: reportType,
                }
              );

              toast.dismiss();
              toast.success("Compliance report generated successfully");

              // Download the report
              const blob = new Blob([JSON.stringify(response.data, null, 2)]);
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${reportType}-compliance-report-${
                new Date().toISOString().split("T")[0]
              }.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);

              setShowComplianceReports(false);
            } catch (error) {
              toast.dismiss();
              console.error("Error generating compliance report:", error);
              toast.error("Failed to generate compliance report");
            }
          }}
        />
      )}

      {/* 2FA Setup Wizard Modal */}
      {show2FAWizard && (
        <TwoFAWizardModal
          isOpen={show2FAWizard}
          onClose={() => setShow2FAWizard(false)}
          onComplete={async (config) => {
            try {
              await apiService.post("/api/security/2fa-setup", config);
              toast.success("2FA setup completed successfully");
              setShow2FAWizard(false);
            } catch (error) {
              console.error("Error setting up 2FA:", error);
              toast.error("Failed to setup 2FA");
            }
          }}
        />
      )}
    </div>
  );
};

// Password Policy Modal Component
const PasswordPolicyModal = ({ passwordPolicy, onClose, onSave }) => {
  const [formData, setFormData] = useState(passwordPolicy);

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Password Policy Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) =>
                  setFormData({ ...formData, enabled: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-lg font-semibold text-gray-900">
                Enable Password Policy
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Length <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.minLength}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minLength: parseInt(e.target.value),
                })
              }
              min="8"
              max="32"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Password must be at least {formData.minLength} characters long
            </p>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.specialChars}
                onChange={(e) =>
                  setFormData({ ...formData, specialChars: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">
                Require special characters (!@#$%^&*)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Expiry (days)
            </label>
            <input
              type="number"
              value={formData.expiry}
              onChange={(e) =>
                setFormData({ ...formData, expiry: parseInt(e.target.value) })
              }
              min="30"
              max="365"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Users will be prompted to change password after {formData.expiry}{" "}
              days
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// MFA Settings Modal Component
const MFASettingsModal = ({ mfaSettings, onClose, onSave }) => {
  const [formData, setFormData] = useState(mfaSettings);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Multi-Factor Authentication
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) =>
                  setFormData({ ...formData, enabled: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-lg font-semibold text-gray-900">
                Enable MFA
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authentication Method
            </label>
            <select
              value={formData.method}
              onChange={(e) =>
                setFormData({ ...formData, method: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Authenticator App</option>
              <option>SMS</option>
              <option>Email</option>
              <option>Hardware Token</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enforcement Policy
            </label>
            <select
              value={formData.enforcement}
              onChange={(e) =>
                setFormData({ ...formData, enforcement: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All Users</option>
              <option>Admins Only</option>
              <option>Optional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grace Period
            </label>
            <select
              value={formData.gracePeriod}
              onChange={(e) =>
                setFormData({ ...formData, gracePeriod: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>None</option>
              <option>7 Days</option>
              <option>14 Days</option>
              <option>30 Days</option>
            </select>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Session Control Modal Component
const SessionControlModal = ({
  sessionControl,
  onClose,
  onSave,
  onPanicLogout,
}) => {
  const [formData, setFormData] = useState(sessionControl);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Session Control
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Idle Timeout (minutes)
            </label>
            <input
              type="number"
              value={formData.idleTimeout}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  idleTimeout: parseInt(e.target.value),
                })
              }
              min="5"
              max="120"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Automatically log out inactive users after {formData.idleTimeout}{" "}
              minutes
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Concurrent Sessions
            </label>
            <input
              type="number"
              value={formData.concurrentSessions}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  concurrentSessions: parseInt(e.target.value),
                })
              }
              min="1"
              max="10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum number of simultaneous logins per user
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Active Users
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {sessionControl.activeUsers}
              </span>
            </div>
            <p className="text-xs text-gray-500">Currently logged in users</p>
          </div>

          <div className="bg-red-50 border-2 border-red-300 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <i className="fa-solid fa-triangle-exclamation text-red-600 text-xl"></i>
              <h3 className="font-bold text-red-900">Emergency Panic Logout</h3>
            </div>
            <p className="text-sm text-red-700 mb-4">
              This will immediately terminate all active user sessions. Use only
              in emergency situations.
            </p>
            <button
              onClick={onPanicLogout}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-power-off"></i>
              Logout All Users Now
            </button>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Log Details Modal Component
const LogDetailsModal = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Log Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Timestamp
              </label>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Action
              </label>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {log.action}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Actor</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  {log.actor?.initials || "??"}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {log.actor?.userName || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {log.actor?.userEmail || "N/A"}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                IP Address
              </label>
              <p className="text-lg font-mono font-semibold text-gray-900 mt-1">
                {log.ipAddress || "N/A"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Status
              </label>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                  log.status === "Success"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <i
                  className={`fa-solid ${
                    log.status === "Success"
                      ? "fa-circle-check"
                      : "fa-circle-xmark"
                  }`}
                ></i>
                {log.status}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                User Agent
              </label>
              <p className="text-sm text-gray-900 mt-1 break-all">
                {log.userAgent || "N/A"}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Description
            </label>
            <p className="text-gray-900 mt-1">{log.description}</p>
          </div>

          {log.metadata && (
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">
                Additional Metadata
              </label>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm text-gray-900 overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Custom Date Range Modal Component
const CustomDateRangeModal = ({
  customDateRange,
  setCustomDateRange,
  onClose,
  onApply,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Custom Date Range
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) =>
                setCustomDateRange({
                  ...customDateRange,
                  start: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) =>
                setCustomDateRange({ ...customDateRange, end: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// Notification Rules Modal Component
const NotificationRulesModal = ({
  notificationRules,
  onClose,
  onAddRule,
  onDeleteRule,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    event: "Login",
    condition: "Failed",
    recipient: "",
    enabled: true,
  });

  const handleAddRule = () => {
    if (!newRule.name || !newRule.recipient) {
      toast.error("Please fill in all required fields");
      return;
    }
    onAddRule(newRule);
    setNewRule({
      name: "",
      event: "Login",
      condition: "Failed",
      recipient: "",
      enabled: true,
    });
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Notification Rules
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure alerts for specific security events
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              Add New Rule
            </button>
          </div>

          {showAddForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border-2 border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-4">
                New Notification Rule
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) =>
                      setNewRule({ ...newRule, name: e.target.value })
                    }
                    placeholder="e.g., Failed Login Alerts"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    value={newRule.event}
                    onChange={(e) =>
                      setNewRule({ ...newRule, event: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Login</option>
                    <option>Config Update</option>
                    <option>Export</option>
                    <option>Access Denied</option>
                    <option>Password Change</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition
                  </label>
                  <select
                    value={newRule.condition}
                    onChange={(e) =>
                      setNewRule({ ...newRule, condition: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Failed</option>
                    <option>Success</option>
                    <option>Any</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={newRule.recipient}
                    onChange={(e) =>
                      setNewRule({ ...newRule, recipient: e.target.value })
                    }
                    placeholder="admin@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Rule
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {notificationRules.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-bell-slash text-gray-300 text-4xl mb-3"></i>
                <p className="text-gray-500 font-medium">
                  No notification rules configured
                </p>
                <p className="text-gray-400 text-sm">
                  Add a rule to receive alerts for security events
                </p>
              </div>
            ) : (
              notificationRules.map((rule) => (
                <div
                  key={rule._id}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        rule.enabled ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      <i
                        className={`fa-solid fa-bell ${
                          rule.enabled ? "text-green-600" : "text-gray-400"
                        }`}
                      ></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {rule.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Alert on{" "}
                        <span className="font-medium">{rule.event}</span> -{" "}
                        <span className="font-medium">{rule.condition}</span> →{" "}
                        {rule.recipient}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteRule(rule._id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Settings History Modal Component
const SettingsHistoryModal = ({ settingsHistory, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Settings Change History
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Track all changes to security configurations
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6">
          {settingsHistory.length === 0 ? (
            <div className="text-center py-12">
              <i className="fa-solid fa-clock-rotate-left text-gray-300 text-4xl mb-3"></i>
              <p className="text-gray-500 font-medium">
                No settings history available
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {settingsHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded-r-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">
                          {item.setting}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {item.change}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                          {item.changedBy?.initials || "??"}
                        </div>
                        <span className="text-sm text-gray-600">
                          {item.changedBy?.userName || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Session Management Modal Component
const SessionManagementModal = ({
  isOpen,
  onClose,
  sessions,
  onKillSession,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Active Sessions Management</h2>
            <p className="text-blue-100 mt-1">
              View and manage user sessions in real-time
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <i className="fa-solid fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {sessions.length}
              </span>
              <span className="text-gray-600">Active Sessions</span>
            </div>
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <i className="fa-solid fa-rotate"></i>
              Refresh
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <i className="fa-solid fa-users-slash text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500 font-medium">No active sessions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {session.userName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {session.userName}
                          </h3>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {session.userEmail}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-gray-500">IP Address:</span>
                            <p className="font-mono text-gray-900">
                              {session.ipAddress}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Location:</span>
                            <p className="text-gray-900">
                              {session.location || "Unknown"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Device:</span>
                            <p className="text-gray-900">
                              {session.device || "Unknown"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              Last Activity:
                            </span>
                            <p className="text-gray-900">
                              {session.lastActivity}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-gray-500 text-sm">
                            Browser:
                          </span>
                          <p className="text-xs text-gray-600 font-mono">
                            {session.userAgent}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onKillSession(session.id)}
                      className="ml-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                      <i className="fa-solid fa-ban"></i>
                      Kill Session
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Advanced Analytics Dashboard Modal Component
const AnalyticsDashboardModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const { summary, actionStats, dailyActivity, topUsers } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-[1400px] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Security Analytics Dashboard</h2>
            <p className="text-purple-100 mt-1">
              Comprehensive security metrics and insights
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <i className="fa-solid fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">
                    Total Audit Logs
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {summary.totalLogs?.toLocaleString() || 0}
                  </p>
                  <p className="text-blue-100 text-xs mt-2">
                    {summary.recentLogs} in last 30 days
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <i className="fa-solid fa-chart-line text-3xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">
                    Successful Logins
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {summary.successfulLogins?.toLocaleString() || 0}
                  </p>
                  <p className="text-green-100 text-xs mt-2">
                    Authentication succeeded
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <i className="fa-solid fa-check-circle text-3xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">
                    Failed Logins
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {summary.failedLogins?.toLocaleString() || 0}
                  </p>
                  <p className="text-red-100 text-xs mt-2">
                    Authentication failed
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <i className="fa-solid fa-exclamation-triangle text-3xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">
                    Config Changes
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {summary.configChanges?.toLocaleString() || 0}
                  </p>
                  <p className="text-purple-100 text-xs mt-2">
                    System configurations
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <i className="fa-solid fa-cog text-3xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">
                    Access Denied
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {summary.accessDenied?.toLocaleString() || 0}
                  </p>
                  <p className="text-amber-100 text-xs mt-2">
                    Unauthorized attempts
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <i className="fa-solid fa-ban text-3xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm font-medium">
                    Recent Activity
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {summary.recentLogs?.toLocaleString() || 0}
                  </p>
                  <p className="text-cyan-100 text-xs mt-2">Last 30 days</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <i className="fa-solid fa-clock text-3xl"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Action Statistics */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-chart-bar text-purple-600"></i>
                Activity by Action Type
              </h3>
              <div className="space-y-3">
                {actionStats?.slice(0, 8).map((stat, idx) => {
                  const total = actionStats.reduce(
                    (sum, s) => sum + s.count,
                    0
                  );
                  const percentage = ((stat.count / total) * 100).toFixed(1);
                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {stat._id || "Unknown"}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {stat.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-users text-blue-600"></i>
                Top Active Users
              </h3>
              <div className="space-y-3">
                {topUsers?.slice(0, 8).map((user, idx) => {
                  const maxCount = topUsers[0]?.count || 1;
                  const percentage = ((user.count / maxCount) * 100).toFixed(1);
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(user._id || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {user._id || "Unknown"}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {user.count}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-calendar-days text-green-600"></i>
              Daily Activity (Last 7 Days)
            </h3>
            <div className="flex items-end justify-between gap-2 h-48">
              {dailyActivity?.map((day, idx) => {
                const maxCount = Math.max(...dailyActivity.map((d) => d.count));
                const height = (day.count / maxCount) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div className="relative flex-1 w-full flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg hover:from-green-600 hover:to-green-500 transition-all duration-300 cursor-pointer group relative"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {day.count} events
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 font-medium">
                      {new Date(day._id).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
          >
            <i className="fa-solid fa-print"></i>
            Print Report
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Export Options Modal Component
const ExportOptionsModal = ({ isOpen, onClose, onExport }) => {
  const [exportFormat, setExportFormat] = useState("csv");
  const [dateRange, setDateRange] = useState("all");
  const [includeMetadata, setIncludeMetadata] = useState(true);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport({ format: exportFormat, dateRange, includeMetadata });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Export Audit Logs</h2>
            <p className="text-green-100 mt-1">
              Choose your export format and options
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <i className="fa-solid fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Export Format */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "csv",
                  label: "CSV",
                  icon: "fa-file-csv",
                  color: "green",
                },
                {
                  value: "json",
                  label: "JSON",
                  icon: "fa-file-code",
                  color: "blue",
                },
                {
                  value: "xml",
                  label: "XML",
                  icon: "fa-file-code",
                  color: "orange",
                },
                {
                  value: "pdf",
                  label: "PDF",
                  icon: "fa-file-pdf",
                  color: "red",
                },
              ].map((format) => (
                <button
                  key={format.value}
                  onClick={() => setExportFormat(format.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    exportFormat === format.value
                      ? `border-${format.color}-500 bg-${format.color}-50`
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i
                      className={`fa-solid ${format.icon} text-2xl text-${format.color}-600`}
                    ></i>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{format.label}</p>
                      <p className="text-xs text-gray-500">
                        {format.value.toUpperCase()} format
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          {/* Options */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Export Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Include Metadata</p>
                  <p className="text-xs text-gray-500">
                    IP addresses, user agents, and timestamps
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <i className="fa-solid fa-info-circle text-blue-600 text-xl"></i>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Export Information
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  The export will include all audit logs matching your selected
                  filters and date range. Large exports may take a few moments
                  to generate.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
          >
            <i className="fa-solid fa-download"></i>
            Export {exportFormat.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};

// Compliance Reports Modal Component
const ComplianceReportsModal = ({ isOpen, onClose, onGenerate }) => {
  const [selectedReport, setSelectedReport] = useState("");

  if (!isOpen) return null;

  const reports = [
    {
      id: "soc2",
      name: "SOC 2 Compliance",
      description: "System and Organization Controls audit report",
      icon: "fa-shield-halved",
      color: "blue",
    },
    {
      id: "hipaa",
      name: "HIPAA Compliance",
      description: "Health Insurance Portability and Accountability Act",
      icon: "fa-hospital",
      color: "red",
    },
    {
      id: "gdpr",
      name: "GDPR Compliance",
      description: "General Data Protection Regulation report",
      icon: "fa-lock",
      color: "purple",
    },
    {
      id: "iso27001",
      name: "ISO 27001",
      description: "Information Security Management System",
      icon: "fa-certificate",
      color: "green",
    },
    {
      id: "pci-dss",
      name: "PCI-DSS",
      description: "Payment Card Industry Data Security Standard",
      icon: "fa-credit-card",
      color: "amber",
    },
    {
      id: "nist",
      name: "NIST Cybersecurity",
      description: "National Institute of Standards and Technology",
      icon: "fa-flag-usa",
      color: "indigo",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Compliance Reports</h2>
            <p className="text-amber-100 mt-1">
              Generate pre-built compliance audit reports
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <i className="fa-solid fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`p-5 rounded-lg border-2 transition-all text-left ${
                  selectedReport === report.id
                    ? "border-amber-500 bg-amber-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:shadow"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 bg-${report.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}
                  >
                    <i
                      className={`fa-solid ${report.icon} text-${report.color}-600 text-xl`}
                    ></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {report.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {report.description}
                    </p>
                    {selectedReport === report.id && (
                      <div className="mt-3 flex items-center gap-2 text-amber-600">
                        <i className="fa-solid fa-check-circle"></i>
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedReport && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-3">
                <i className="fa-solid fa-circle-check text-green-600 text-xl"></i>
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Report Ready to Generate
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    This report will analyze your audit logs and generate a
                    comprehensive compliance report with recommendations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedReport && onGenerate(selectedReport)}
            disabled={!selectedReport}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-file-contract"></i>
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

// 2FA Setup Wizard Modal Component
const TwoFAWizardModal = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  if (!isOpen) return null;

  const methods = [
    {
      id: "app",
      name: "Authenticator App",
      icon: "fa-mobile-screen",
      description: "Use Google Authenticator or similar app",
    },
    {
      id: "sms",
      name: "SMS Text Message",
      icon: "fa-message",
      description: "Receive codes via text message",
    },
    {
      id: "email",
      name: "Email",
      icon: "fa-envelope",
      description: "Receive codes via email",
    },
  ];

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      onComplete({ method, phoneNumber });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">2FA Setup Wizard</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <i className="fa-solid fa-times text-2xl"></i>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    step >= s
                      ? "bg-white text-blue-600"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s ? "bg-white" : "bg-blue-500"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Step 1: Choose Method */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Choose Your 2FA Method
              </h3>
              <p className="text-gray-600 mb-6">
                Select how you'd like to receive verification codes
              </p>

              <div className="space-y-3">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      method === m.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i
                          className={`fa-solid ${m.icon} text-blue-600 text-xl`}
                        ></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{m.name}</h4>
                        <p className="text-sm text-gray-600">{m.description}</p>
                      </div>
                      {method === m.id && (
                        <i className="fa-solid fa-check-circle text-blue-600 text-xl"></i>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Setup */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Setup Your 2FA
              </h3>

              {method === "app" && (
                <div className="text-center">
                  <div className="bg-white border-4 border-gray-200 rounded-lg p-8 inline-block mb-4">
                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded">
                      <i className="fa-solid fa-qrcode text-gray-400 text-6xl"></i>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Scan this QR code with your authenticator app
                  </p>
                  <p className="text-sm text-gray-500 font-mono bg-gray-100 p-3 rounded">
                    Manual Key: ABCD-EFGH-IJKL-MNOP
                  </p>
                </div>
              )}

              {method === "sms" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    We'll send a verification code to this number
                  </p>
                </div>
              )}

              {method === "email" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <i className="fa-solid fa-envelope text-blue-600 text-4xl mb-4"></i>
                  <p className="text-gray-700 font-medium mb-2">
                    Verification email will be sent to:
                  </p>
                  <p className="text-blue-600 font-bold">user@example.com</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Verify */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Verify Your Setup
              </h3>
              <p className="text-gray-600 mb-6">
                Enter the verification code to complete setup
              </p>

              <div className="max-w-sm mx-auto">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  maxLength="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono tracking-widest"
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Enter the 6-digit code
                </p>
              </div>

              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <i className="fa-solid fa-shield-halved text-green-600 text-xl"></i>
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Enhanced Security
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Two-factor authentication adds an extra layer of security
                      to your account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            onClick={handleNext}
            disabled={step === 1 && !method}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 3 ? "Complete Setup" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
