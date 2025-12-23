/* eslint-disable */
const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  moduleUsage: [{ name: String, value: Number }],
  recentActivity: [{ date: String, actions: Number }],
  stats: {
    totalModules: Number,
    activeUsers: Number,
    todayActions: Number,
    alerts: Number,
  },
  recentActivities: [{ id: Number, user: String, action: String, module: String, time: String }],
});

module.exports = mongoose.model('Analytics', AnalyticsSchema);
