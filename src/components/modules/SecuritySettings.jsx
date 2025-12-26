import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";

const SecuritySettings = () => {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();

  // Loading States
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);

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

  // Modal States (for future implementation)
  // eslint-disable-next-line no-unused-vars
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showMFAModal, setShowMFAModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Old hardcoded data removed - now using API
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

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
        const now = new Date();
        let startDate;

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
          default:
            startDate = null;
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
  ]);

  // Initial load
  useEffect(() => {
    fetchSecuritySettings();
    fetchActiveUsers();
    fetchAuditLogs();
  }, [fetchSecuritySettings, fetchActiveUsers, fetchAuditLogs]);

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
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <i className="fa-solid fa-download"></i>
                Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option>Last 30 Days</option>
                  <option>Last 7 Days</option>
                  <option>Last 24 Hours</option>
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
                  <option>Config Update</option>
                  <option>Export</option>
                  <option>Access Denied</option>
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
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logsLoading ? (
                  // Loading skeleton
                  [...Array(5)].map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
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
                    </tr>
                  ))
                ) : activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
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
    </div>
  );
};

export default SecuritySettings;
