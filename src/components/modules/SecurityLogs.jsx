import React from "react";
import Breadcrumb from "../Breadcrumb";

const SecurityLogs = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Security Logs", icon: "fa-shield" },
        ]}
      />
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-3">Security Logs</h2>
        <p className="text-gray-600 mb-4">
          Monitor system access, security events, and audit trails.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Today's Logins</h5>
            <p className="text-3xl font-bold mb-0 text-blue-600">156</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Failed Attempts</h5>
            <p className="text-3xl font-bold mb-0 text-yellow-500">8</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Security Alerts</h5>
            <p className="text-3xl font-bold mb-0 text-red-600">2</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Active Sessions</h5>
            <p className="text-3xl font-bold mb-0 text-green-600">89</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-xl font-semibold mb-3">Recent Security Events</h4>
          <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <strong className="text-gray-900">Successful Login</strong>
                  <div className="text-sm text-gray-600">
                    user@example.com - 192.168.1.10
                  </div>
                </div>
                <span className="text-sm text-gray-600 sm:text-right">
                  2 min ago
                </span>
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <strong className="text-yellow-600">
                    Failed Login Attempt
                  </strong>
                  <div className="text-sm text-gray-600">
                    unknown@test.com - 10.0.0.25
                  </div>
                </div>
                <span className="text-sm text-gray-600 sm:text-right">
                  15 min ago
                </span>
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <strong className="text-gray-900">User Logout</strong>
                  <div className="text-sm text-gray-600">
                    admin@example.com - 192.168.1.5
                  </div>
                </div>
                <span className="text-sm text-gray-600 sm:text-right">
                  1 hour ago
                </span>
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <strong className="text-red-600">Security Alert</strong>
                  <div className="text-sm text-gray-600">
                    Unusual activity detected - Multiple login attempts
                  </div>
                </div>
                <span className="text-sm text-gray-600 sm:text-right">
                  2 hours ago
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              View Full Logs
            </button>
            <button className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium">
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityLogs;
