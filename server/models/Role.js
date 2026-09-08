const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isSystem: {
    type: Boolean,
    default: false, // System roles (like Admin) cannot be deleted
  },
  permissions: {
    userManagement: {
      viewUsers: { type: Boolean, default: false },
      editUsers: { type: Boolean, default: false },
      inviteUsers: { type: Boolean, default: false },
    },
    billingFinance: {
      viewInvoices: { type: Boolean, default: false },
      manageSubscription: { type: Boolean, default: false },
    },
    systemSettings: {
      globalConfiguration: { type: Boolean, default: false },
    },
    security: {
      viewLogs: { type: Boolean, default: false },
      exportLogs: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false },
      manageNotifications: { type: Boolean, default: false },
      viewAnalytics: { type: Boolean, default: false },
      manageSessions: { type: Boolean, default: false },
      generateReports: { type: Boolean, default: false },
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Role', roleSchema);
