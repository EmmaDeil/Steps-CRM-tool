import React from "react";
import PropTypes from "prop-types";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DashboardAnalytics = ({
  data,
  materialRequests = [],
  purchaseOrders = [],
}) => {
  const COLORS = [
    "#0d6efd",
    "#6c757d",
    "#198754",
    "#ffc107",
    "#dc3545",
    "#0dcaf0",
  ];

  // Use data provided by the backend. If data is not provided, render
  // empty-friendly defaults (no hard-coded sample data in the client).
  const moduleUsageData = data?.moduleUsage || [];
  const activityData = data?.recentActivity || [];
  const stats = data?.stats || {
    totalModules: moduleUsageData.length || 0,
    activeUsers: data?.stats?.activeUsers || 0,
    todayActions: data?.stats?.todayActions || 0,
    alerts: data?.stats?.alerts || 0,
  };

  // Calculate material requests stats
  const materialRequestsStats = {
    total: materialRequests.length,
    pending: materialRequests.filter((r) => r.status === "pending").length,
    approved: materialRequests.filter((r) => r.status === "approved").length,
    rejected: materialRequests.filter((r) => r.status === "rejected").length,
  };

  // Calculate purchase orders stats
  const purchaseOrdersStats = {
    total: purchaseOrders.length,
    totalValue: purchaseOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
    pendingApproval: purchaseOrders.filter((o) => o.status === "submitted")
      .length,
    received: purchaseOrders.filter((o) => o.status === "received").length,
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="w-full px-4 py-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Total Modules</p>
              <h3 className="text-2xl font-bold text-[#111418] dark:text-white">{stats.totalModules}</h3>
            </div>
            <div className="text-3xl">📦</div>
          </div>
        </div>
        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Active Users</p>
              <h3 className="text-2xl font-bold text-[#111418] dark:text-white">{stats.activeUsers}</h3>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Today's Actions</p>
              <h3 className="text-2xl font-bold text-[#111418] dark:text-white">{stats.todayActions}</h3>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>
        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Alerts</p>
              <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.alerts}</h3>
            </div>
            <div className="text-3xl">🔔</div>
          </div>
        </div>
      </div>

      {/* Material Requests Summary */}
      <div className="mb-6">
        <h5 className="text-lg font-bold text-[#111418] dark:text-white mb-4">Material Requests Overview</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Total Requests</p>
                <h3 className="text-2xl font-bold text-[#111418] dark:text-white">{materialRequestsStats.total}</h3>
              </div>
              <div className="text-3xl">📋</div>
            </div>
          </div>
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Pending</p>
                <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{materialRequestsStats.pending}</h3>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </div>
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Approved</p>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{materialRequestsStats.approved}</h3>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Rejected</p>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{materialRequestsStats.rejected}</h3>
              </div>
              <div className="text-3xl">❌</div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Orders Summary */}
      <div className="mb-6">
        <h5 className="text-lg font-bold text-[#111418] dark:text-white mb-4">Purchase Orders Overview</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Total Orders</p>
                <h3 className="text-2xl font-bold text-[#111418] dark:text-white">{purchaseOrdersStats.total}</h3>
              </div>
              <div className="text-3xl">📦</div>
            </div>
          </div>
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Total Value</p>
                <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(purchaseOrdersStats.totalValue)}</h3>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Pending Approval</p>
                <h3 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{purchaseOrdersStats.pendingApproval}</h3>
              </div>
              <div className="text-3xl">⏱️</div>
            </div>
          </div>
          <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#617589] dark:text-gray-400 mb-1">Received</p>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{purchaseOrdersStats.received}</h3>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4">
          <h5 className="text-lg font-bold text-[#111418] dark:text-white mb-4">Module Usage</h5>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={moduleUsageData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {moduleUsageData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4">
          <h5 className="text-lg font-bold text-[#111418] dark:text-white mb-4">Weekly Activity</h5>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="actions"
                stroke="#0d6efd"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4">
          <h5 className="text-lg font-bold text-[#111418] dark:text-white mb-4">Module Performance</h5>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={moduleUsageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0d6efd" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="mt-4">
        <div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] p-4">
          <h5 className="text-lg font-bold text-[#111418] dark:text-white mb-4">Recent Activities</h5>
          <div className="space-y-3">
            {(data?.recentActivities || []).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between border-b border-[#dbe0e6] dark:border-gray-700 pb-3 last:border-b-0">
                <div>
                  <h6 className="text-sm font-semibold text-[#111418] dark:text-white mb-1">{activity.user}</h6>
                  <p className="text-xs text-[#617589] dark:text-gray-400">
                    {activity.action} in{" "}
                    <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                      {activity.module}
                    </span>
                  </p>
                </div>
                <small className="text-xs text-[#617589] dark:text-gray-400">{activity.time}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

DashboardAnalytics.propTypes = {
  data: PropTypes.shape({
    moduleUsage: PropTypes.array,
    recentActivity: PropTypes.array,
    stats: PropTypes.object,
    recentActivities: PropTypes.array,
  }),
  materialRequests: PropTypes.array,
  purchaseOrders: PropTypes.array,
};

export default DashboardAnalytics;
