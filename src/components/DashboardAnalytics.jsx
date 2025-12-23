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
    <div className="container-fluid p-4">
      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Total Modules</p>
                <h3 className="mb-0">{stats.totalModules}</h3>
              </div>
              <div className="fs-1">📦</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Active Users</p>
                <h3 className="mb-0">{stats.activeUsers}</h3>
              </div>
              <div className="fs-1">👥</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Today's Actions</p>
                <h3 className="mb-0">{stats.todayActions}</h3>
              </div>
              <div className="fs-1">⚡</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Alerts</p>
                <h3 className="mb-0 text-warning">{stats.alerts}</h3>
              </div>
              <div className="fs-1">🔔</div>
            </div>
          </div>
        </div>
      </div>

      {/* Material Requests Summary */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <h5 className="mb-3">Material Requests Overview</h5>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Total Requests</p>
                <h3 className="mb-0">{materialRequestsStats.total}</h3>
              </div>
              <div className="fs-1">📋</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Pending</p>
                <h3 className="mb-0 text-warning">
                  {materialRequestsStats.pending}
                </h3>
              </div>
              <div className="fs-1">⏳</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Approved</p>
                <h3 className="mb-0 text-success">
                  {materialRequestsStats.approved}
                </h3>
              </div>
              <div className="fs-1">✅</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Rejected</p>
                <h3 className="mb-0 text-danger">
                  {materialRequestsStats.rejected}
                </h3>
              </div>
              <div className="fs-1">❌</div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Orders Summary */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <h5 className="mb-3">Purchase Orders Overview</h5>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Total Orders</p>
                <h3 className="mb-0">{purchaseOrdersStats.total}</h3>
              </div>
              <div className="fs-1">📦</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Total Value</p>
                <h3 className="mb-0 text-primary">
                  {formatCurrency(purchaseOrdersStats.totalValue)}
                </h3>
              </div>
              <div className="fs-1">💰</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Pending Approval</p>
                <h3 className="mb-0 text-info">
                  {purchaseOrdersStats.pendingApproval}
                </h3>
              </div>
              <div className="fs-1">⏱️</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-secondary mb-1">Received</p>
                <h3 className="mb-0 text-success">
                  {purchaseOrdersStats.received}
                </h3>
              </div>
              <div className="fs-1">✅</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card p-3">
            <h5 className="mb-3">Module Usage</h5>
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
        </div>

        <div className="col-12 col-lg-6">
          <div className="card p-3">
            <h5 className="mb-3">Weekly Activity</h5>
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
        </div>

        <div className="col-12">
          <div className="card p-3">
            <h5 className="mb-3">Module Performance</h5>
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
      </div>

      {/* Recent Activities */}
      <div className="row g-3 mt-2">
        <div className="col-12">
          <div className="card p-3">
            <h5 className="mb-3">Recent Activities</h5>
            <div className="list-group list-group-flush">
              {(data?.recentActivities || []).map((activity) => (
                <div
                  key={activity.id}
                  className="list-group-item border-0 px-0"
                >
                  <div className="d-flex w-100 justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1">{activity.user}</h6>
                      <p className="mb-0 small text-secondary">
                        {activity.action} in{" "}
                        <span className="badge bg-primary">
                          {activity.module}
                        </span>
                      </p>
                    </div>
                    <small className="text-secondary">{activity.time}</small>
                  </div>
                </div>
              ))}
            </div>
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
