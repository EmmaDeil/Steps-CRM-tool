/* eslint-disable */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  actor: {
    userId: String,
    userName: String,
    userEmail: String,
    initials: String,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'Login',
      'Logout',
      'Failed Login',
      'Config Update',
      'User Created',
      'User Updated',
      'User Deleted',
      'Role Changed',
      'Access Denied',
      'Export',
      'API Key',
      'Password Reset',
      'MFA Enabled',
      'MFA Disabled',
      'Session Terminated',
      'Other'
    ],
  },
  actionColor: {
    type: String,
    enum: ['blue', 'purple', 'red', 'orange', 'green', 'gray'],
    default: 'blue',
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: String,
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Success', 'Failed', 'Warning'],
    default: 'Success',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
