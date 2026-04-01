const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Acme Corp' },
  contactEmail: { type: String, default: 'admin@acmecorp.com' },
  timezone: { type: String, default: 'UTC' },
  dateFormat: { type: String, default: 'MM/DD/YYYY' },
  currency: { type: String, default: 'NGN' },
  materialRequestTypes: {
    type: [String],
    default: [
      'Internal Transfer',
      'RFQ',
      'Purchase Request',
      'Emergency Purchase',
      'Stock Replenishment',
      'Service Request',
      'IT Equipment Request',
      'Maintenance Supplies',
      'Office Supplies',
      'Capital Expenditure',
    ],
  },
  primaryColor: { type: String, default: '#137fec' },
  logoUrl: { type: String, default: '' },
  slackEnabled: { type: Boolean, default: false },
  emailSmtp: { type: String, default: 'smtp.mailtrap.io' },
  attendanceApiKey: { type: String, default: '' },
  attendanceApiKeyGeneratedAt: { type: Date, default: null },
  attendanceApiKeyLastUsedAt: { type: Date, default: null },
  maintenanceMode: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
