import React, { useState } from "react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";

const SecuritySettings = () => {
  // Password Policy State
  const [passwordPolicy] = useState({
    minLength: 12,
    specialChars: true,
    expiry: 90,
  });

  // Multi-Factor Auth State
  const [mfaSettings] = useState({
    enabled: true,
    method: "Authenticator App",
    enforcement: "All Users",
    gracePeriod: "None",
  });

  // Session Control State
  const [sessionControl] = useState({
    idleTimeout: 30,
    concurrentSessions: 3,
    activeUsers: 142,
  });

  // Activity Logs State
  const [activityLogs] = useState([
    {
      id: 1,
      timestamp: "Oct 24, 14:32:01",
      actor: "JD",
      actorName: "jane.doe@acme.com",
      action: "Login",
      actionColor: "blue",
      ipAddress: "192.168.1.45",
      description: "Successful login via MFA",
      status: "Success",
    },
    {
      id: 2,
      timestamp: "Oct 24, 13:15:22",
      actor: "SA",
      actorName: "sysadmin",
      action: "Config Update",
      actionColor: "purple",
      ipAddress: "10.0.0.5",
      description: "Updated Password Policy",
      status: "Success",
    },
    {
      id: 3,
      timestamp: "Oct 24, 11:05:55",
      actor: "??",
      actorName: "unknown_user",
      action: "Access Denied",
      actionColor: "red",
      ipAddress: "82.14.55.12",
      description: "Multiple failed attempts",
      status: "Failed",
    },
    {
      id: 4,
      timestamp: "Oct 23, 16:40:12",
      actor: "MS",
      actorName: "mike.smith@acme.com",
      action: "Export",
      actionColor: "orange",
      ipAddress: "192.168.1.88",
      description: "User Data Export",
      status: "Success",
    },
    {
      id: 5,
      timestamp: "Oct 23, 09:12:05",
      actor: "JD",
      actorName: "jane.doe@acme.com",
      action: "API Key",
      actionColor: "blue",
      ipAddress: "192.168.1.45",
      description: "Regenerated Secret Key",
      status: "Success",
    },
  ]);

  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

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
                  <span className="font-semibold text-gray-900">Required</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Expiry</span>
                  <span className="font-semibold text-gray-900">
                    {passwordPolicy.expiry} days
                  </span>
                </div>
              </div>

              <button className="w-full mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors text-sm">
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

              <button className="w-full mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors text-sm">
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

              <button className="w-full mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors text-sm">
                View Active Sessions
              </button>
            </div>
          </div>
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
                onClick={() => toast.success("Exporting CSV...")}
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <i className="fa-solid fa-clock text-gray-400"></i>
                        {log.timestamp}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                          {log.actor}
                        </div>
                        <span className="text-sm text-gray-900">
                          {log.actorName}
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
                        {log.ipAddress}
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing 1 to 5 of 1,248 results
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                Previous
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                3
              </button>
              <span className="px-2 text-gray-500">...</span>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                8
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
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
