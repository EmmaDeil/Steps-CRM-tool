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

const DashboardAnalytics = ({ data }) => {
  const COLORS = [
    "#0d6efd",
    "#6c757d",
    "#198754",
    "#ffc107",
    "#dc3545",
    "#0dcaf0",
  ];

  // Sample data - replace with real data from props
  const moduleUsageData = data?.moduleUsage || [
    { name: "Accounting", value: 45 },
    { name: "Inventory", value: 32 },
    { name: "HR", value: 28 },
    { name: "Attendance", value: 56 },
    { name: "Finance", value: 23 },
  ];

  const activityData = data?.recentActivity || [
    { date: "Mon", actions: 12 },
    { date: "Tue", actions: 19 },
    { date: "Wed", actions: 15 },
    { date: "Thu", actions: 25 },
    { date: "Fri", actions: 22 },
    { date: "Sat", actions: 8 },
    { date: "Sun", actions: 5 },
  ];

  const stats = data?.stats || {
    totalModules: 8,
    activeUsers: 127,
    todayActions: 89,
    alerts: 3,
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
              {(
                data?.recentActivities || [
                  {
                    id: 1,
                    user: "John Doe",
                    action: "Updated inventory item",
                    module: "Inventory",
                    time: "5 mins ago",
                  },
                  {
                    id: 2,
                    user: "Jane Smith",
                    action: "Created new transaction",
                    module: "Accounting",
                    time: "12 mins ago",
                  },
                  {
                    id: 3,
                    user: "Bob Johnson",
                    action: "Checked attendance",
                    module: "Attendance",
                    time: "23 mins ago",
                  },
                  {
                    id: 4,
                    user: "Alice Brown",
                    action: "Generated report",
                    module: "Finance",
                    time: "1 hour ago",
                  },
                ]
              ).map((activity) => (
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
};

export default DashboardAnalytics;
