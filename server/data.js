/* eslint-disable */
// Seed data for the backend. These live on the server (not in the client)
// and can be replaced with a real database later.

const modules = [
  { id: 1, name: "Accounting", componentName: "Accounting" },
  { id: 2, name: "Inventory", componentName: "Inventory" },
  { id: 3, name: "HR Management", componentName: "HRManagement" },
  { id: 4, name: "Facility Maintenance", componentName: "FacilityMaintenance" },
  { id: 5, name: "Finance", componentName: "Finance" },
  { id: 6, name: "Security Logs", componentName: "SecurityLogs" },
  { id: 7, name: "Admin Controls", componentName: "AdminControls" },
  { id: 8, name: "Attendance", componentName: "Attendance" },
  { id: 9, name: "Signature Management", componentName: "SignatureManagement" },
  { id: 10, name: "Material Requests", componentName: "MaterialRequests" },
  { id: 11, name: "Purchase Orders", componentName: "PurchaseOrders" },
  { id: 12, name: "Analytics", componentName: "Analytics" },
];

const analytics = {
  moduleUsage: modules.map((m, i) => ({ name: m.name, value: Math.floor(Math.random() * 100) + 10 })),
  recentActivity: [
    { date: "Mon", actions: 12 },
    { date: "Tue", actions: 19 },
    { date: "Wed", actions: 15 },
    { date: "Thu", actions: 25 },
    { date: "Fri", actions: 22 },
    { date: "Sat", actions: 8 },
    { date: "Sun", actions: 5 },
  ],
  stats: {
    totalModules: modules.length,
    activeUsers: 127,
    todayActions: 89,
    alerts: 3,
  },
  recentActivities: [
    { id: 1, user: "John Doe", action: "Updated inventory item", module: "Inventory", time: "5 mins ago" },
    { id: 2, user: "Jane Smith", action: "Created new transaction", module: "Accounting", time: "12 mins ago" },
    { id: 3, user: "Bob Johnson", action: "Checked attendance", module: "Attendance", time: "23 mins ago" },
    { id: 4, user: "Alice Brown", action: "Generated report", module: "Finance", time: "1 hour ago" },
  ],
};

const attendance = [
  { id: 1, user: "John Doe", date: "2025-11-01", status: "present" },
  { id: 2, user: "Jane Smith", date: "2025-11-01", status: "absent" },
];

module.exports = { modules, analytics, attendance };
